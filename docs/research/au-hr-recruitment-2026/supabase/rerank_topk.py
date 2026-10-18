#!/usr/bin/env python3
"""Cross-encoder reranker over the hybrid top-8 candidates.
Reads candidates.tsv (ext_id, question, comma-codes) + hr_challenges.csv, scores each
(question, challenge_doc) pair with ms-marco-MiniLM-L-6-v2, reorders, and emits
10_rerank_run.sql (a new eval run). Also prints a quick self-check vs the gold labels."""
import csv, os, sys
from fastembed.rerank.cross_encoder import TextCrossEncoder

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

def arg(flag, default):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default

CANDIDATES = arg("--candidates", "candidates.tsv")
DOCS_TSV   = arg("--docs-tsv", None)          # if set, code\tdoc; else terse from challenges.csv
LABEL      = arg("--label", "rerank-ce-v1")
OUT        = arg("--out", "10_rerank_run.sql")

def challenge_doc(r):
    parts = [r["title"], r.get("sub_domain") or "", r["stage"], r["stream"]]
    return ". ".join(p for p in parts if p)

docs = {}
if DOCS_TSV:
    with open(DOCS_TSV, encoding="utf-8") as f:
        for line in f:
            code, _, doc = line.rstrip("\n").partition("\t")
            if code:
                docs[code] = doc
else:
    with open("hr_challenges.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            docs[r["code"]] = challenge_doc(r)

gold_expected = {}
with open("hr_eval_gold.csv", encoding="utf-8") as f:
    for g in csv.DictReader(f):
        gold_expected[g["ext_id"]] = g["expected_challenge_code"]

rows = []
with open(CANDIDATES, encoding="utf-8") as f:
    for line in f:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 3:
            continue
        ext_id, question, codes = parts[0], parts[1], parts[2].split(",")
        rows.append((ext_id, question, codes))

ce = TextCrossEncoder(model_name="Xenova/ms-marco-MiniLM-L-6-v2")

def sql_arr(xs):
    return "array[" + ",".join("'" + x + "'" for x in xs) + "]"

preds = []           # (ext_id, predicted, retrieved_top5)
hit1 = rec5 = 0
for ext_id, question, codes in rows:
    cand_docs = [docs.get(c, c) for c in codes]
    scores = list(ce.rerank(question, cand_docs))
    ranked = [c for c, _ in sorted(zip(codes, scores), key=lambda t: t[1], reverse=True)]
    top1, top5 = ranked[0], ranked[:5]
    preds.append((ext_id, top1, top5))
    exp = gold_expected.get(ext_id)
    hit1 += (top1 == exp)
    rec5 += (exp in top5)

n = len(preds)
print(f"reranked {n} gold questions")
print(f"self-check  routing_top1 = {hit1/n:.4f}   recall@5 = {rec5/n:.4f}")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("-- HQ.ai | Reranker eval run. Cross-encoder (ms-marco-MiniLM-L-6-v2) reranks the\n"
            "-- hybrid top-8 candidates; predicted = top-1 after rerank, retrieved = top-5 after rerank.\n"
            "-- Regenerate with rerank_topk.py.\n\n")
    f.write("insert into public.hr_eval_runs(label, model_name, notes)\n"
            "values ('{}', 'hybrid RRF -> ms-marco-MiniLM-L-6-v2 cross-encoder',\n"
            "        'Rerank of hybrid top-8; same gold + metrics + escalation gate.');\n\n".format(LABEL))
    f.write("insert into public.hr_eval_results\n"
            "  (run_id, gold_id, predicted_challenge_code, retrieved_codes,\n"
            "   predicted_intent, predicted_escalation, answer_grounded, latency_ms)\n")
    f.write("with stage(ext_id, predicted_code, retrieved) as (values\n")
    vals = []
    for ext_id, top1, top5 in preds:
        vals.append("  ('{}','{}',{})".format(ext_id, top1, sql_arr(top5)))
    f.write(",\n".join(vals))
    f.write("\n)\n")
    f.write(
        "select r.id, g.id, s.predicted_code, s.retrieved, null,\n"
        "       public.predict_escalation(g.question_text),\n"
        "       case when g.requires_source then exists (\n"
        "           select 1 from public.hr_challenge_answers a\n"
        "           where a.challenge_code = s.predicted_code\n"
        "             and coalesce(array_length(a.source_refs,1),0) > 0)\n"
        "         else true end,\n"
        "       0\n"
        "from stage s\n"
        "join public.hr_eval_gold g on g.ext_id = s.ext_id\n"
        "cross join (select id from public.hr_eval_runs where label='{}') r;\n".format(LABEL))

print(f"wrote {OUT}")
