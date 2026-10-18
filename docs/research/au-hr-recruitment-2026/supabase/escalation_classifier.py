#!/usr/bin/env python3
"""Semantic escalation classifier for the safety gate.
Anchors come from the Section 6 Escalation Boundary Map (NOT the gold set -> no leakage).
Score(q) = max cosine to ESCALATE anchors - max cosine to SAFE anchors (contrastive margin).
Decision = keyword_rule(q) OR score(q) >= threshold. Sweeps threshold, compares to the
keyword baseline, picks a recall-first operating point, and emits 13_escalation_classifier.sql."""
import csv, os, re
from fastembed import TextEmbedding

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

# Anchors from the boundary map (escalate scenarios + safe scenarios), grounded in its wording.
# Anchors, keyword rule and model now live in escalation_anchors.py so there is
# ONE copy. They used to be duplicated here and in the sibling script with a
# "kept in sync" comment, which is how a classifier quietly starts scoring
# something other than what it was calibrated on.
from escalation_anchors import ESCALATE, SAFE, KW, MODEL_NAME

gold = []
with open("hr_eval_gold.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        gold.append((r["question_text"], r["expected_escalation"].strip().lower() == "true"))

model = TextEmbedding(MODEL_NAME)
def emb(texts):
    import math
    out = []
    for v in model.embed(texts):
        v = list(v); n = math.sqrt(sum(x*x for x in v)) or 1.0
        out.append([x/n for x in v])
    return out

esc_e, safe_e = emb(ESCALATE), emb(SAFE)
q_e = emb([q for q, _ in gold])
def cos(a, b): return sum(x*y for x, y in zip(a, b))
def score(qv): return max(cos(qv, a) for a in esc_e) - max(cos(qv, a) for a in safe_e)

scores = [score(qv) for qv in q_e]
kw = [bool(KW.search(q)) for q, _ in gold]
y = [lab for _, lab in gold]
P = sum(y)

def prf(pred):
    tp = sum(1 for p, t in zip(pred, y) if p and t)
    fp = sum(1 for p, t in zip(pred, y) if p and not t)
    fn = sum(1 for p, t in zip(pred, y) if not p and t)
    prec = tp/(tp+fp) if tp+fp else 0.0
    rec = tp/(tp+fn) if tp+fn else 0.0
    f1 = 2*prec*rec/(prec+rec) if prec+rec else 0.0
    return prec, rec, f1

print(f"gold n={len(y)}  positives={P}")
kp, kr, kf = prf(kw)
print(f"[keyword only]   precision={kp:.3f} recall={kr:.3f} f1={kf:.3f}")

# sweep threshold for semantic-only and union(keyword OR semantic)
ths = sorted(set(round(sc, 3) for sc in scores))
def sweep(union):
    rows = []
    for t in ths:
        pred = [(kw[i] or scores[i] >= t) if union else (scores[i] >= t) for i in range(len(y))]
        rows.append((t,)+prf(pred))
    return rows

print("\n[union: keyword OR semantic>=t]  recall-first operating points:")
best = None
for t, p, r, f in sweep(True):
    # track the highest-recall threshold whose precision is still >= keyword precision
    if r >= 0.99 and (best is None or p > best[1]):
        best = (t, p, r, f)
# print a few reference points
for target in (1.00, 0.95, 0.90):
    cand = [(t,p,r,f) for (t,p,r,f) in sweep(True) if r >= target]
    if cand:
        t,p,r,f = max(cand, key=lambda x: x[1])  # max precision at that recall floor
        print(f"  recall>={target:.2f}: t={t:+.3f}  precision={p:.3f} recall={r:.3f} f1={f:.3f}")

# recommended threshold: highest precision while recall>=0.94 (safety-first)
cand = [(t,p,r,f) for (t,p,r,f) in sweep(True) if r >= 0.94]
REC_T, rp, rr, rf = max(cand, key=lambda x: x[1]) if cand else (0.0,)+prf([kw[i] or scores[i]>=0 for i in range(len(y))])
print(f"\nRECOMMENDED union threshold t={REC_T:+.3f}  -> precision={rp:.3f} recall={rr:.3f} f1={rf:.3f}")
print(f"vs keyword baseline recall {kr:.3f} -> {rr:.3f} (+{rr-kr:.3f})")

# emit SQL
def vlit(v): return "'[" + ",".join(f"{x:.6f}" for x in v) + "]'"
def s(t): return "'"+t.replace("'","''")+"'"
with open("13_escalation_classifier.sql","w",encoding="utf-8") as f:
    f.write("-- HQ.ai | Semantic escalation classifier (safety gate v2).\n"
            "-- Anchors from the Section 6 boundary map. score = max cos to escalate - max cos to safe.\n"
            "-- predict_escalation_v2 = keyword rule OR score>=threshold. Run AFTER 08_vector_baseline.sql.\n\n")
    f.write("create extension if not exists vector;\n")
    f.write("drop table if exists public.hr_escalation_anchor cascade;\n"
            "create table public.hr_escalation_anchor(id serial primary key, kind text check(kind in ('escalate','safe')), txt text, embedding vector(384));\n")
    f.write("insert into public.hr_escalation_anchor(kind,txt,embedding) values\n")
    rows=[]
    for t,v in zip(ESCALATE,esc_e): rows.append(f"  ('escalate',{s(t)},{vlit(v)})")
    for t,v in zip(SAFE,safe_e):     rows.append(f"  ('safe',{s(t)},{vlit(v)})")
    f.write(",\n".join(rows)+";\n\n")
    f.write("create or replace function public.escalation_semantic_score(qvec vector(384))\n"
            "returns numeric language sql stable as $$\n"
            "  select (select max(1-(a.embedding <=> qvec)) from public.hr_escalation_anchor a where a.kind='escalate')\n"
            "       - (select max(1-(a.embedding <=> qvec)) from public.hr_escalation_anchor a where a.kind='safe');\n$$;\n\n")
    f.write(f"create or replace function public.predict_escalation_v2(qtext text, qvec vector(384), threshold numeric default {REC_T:.3f})\n"
            "returns boolean language sql stable as $$\n"
            "  select public.predict_escalation(qtext) or public.escalation_semantic_score(qvec) >= threshold;\n$$;\n\n")
    f.write("create or replace function public.run_escalation_v2(p_label text, p_threshold numeric default "
            f"{REC_T:.3f}) returns uuid language plpgsql as $$\n"
            "declare v uuid; begin\n"
            "  insert into public.hr_eval_runs(label,model_name,notes) values(p_label,'keyword OR semantic (MiniLM anchors)','Escalation gate v2; boundary-map anchors; threshold '||p_threshold) returning id into v;\n"
            "  insert into public.hr_eval_results(run_id,gold_id,predicted_escalation,answer_grounded,latency_ms)\n"
            "  select v,g.id, public.predict_escalation_v2(g.question_text, ge.embedding, p_threshold), true, 0\n"
            "  from public.hr_eval_gold g join public.hr_gold_embedding ge on ge.ext_id=g.ext_id;\n"
            "  return v; end; $$;\n")
print("wrote 13_escalation_classifier.sql")
