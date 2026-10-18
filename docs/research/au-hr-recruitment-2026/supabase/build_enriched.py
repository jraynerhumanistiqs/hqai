#!/usr/bin/env python3
"""Enrichment experiment: build richer challenge docs from the report (Description +
practitioner-language exemplars), embed with the real all-MiniLM-L6-v2, and emit
11_enriched.sql (enriched table + enriched lexical/vector/hybrid retrieval + run fns).
Also writes enriched_docs.tsv for the reranker."""
import csv, os, re
from fastembed import TextEmbedding

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
REPORT = ".."  # section files live one level up

# file -> (heading regex, expected count, (stream,stage) key)
FILES = [
    ("04a-people-foundations.md",     r"^### \d+\.\s",            28, ("People","Foundations")),
    ("04b-people-management.md",      r"^### Challenge \d+\s*[—-]", 21, ("People","Management")),
    ("05a-recruit-plan-attract.md",   r"^### [A-E]\d+\.\s",       18, ("Recruitment","Plan-Attract")),
    ("05b-recruit-screen-onboard.md", r"^### [A-J]\d+\.\s",       26, ("Recruitment","Screen-Onboard")),
    ("06-crosscutting.md",            r"^## 6\.\d+\s",             9, ("Cross-cutting","Cross-cutting")),
]

FIELD = re.compile(r"^\s*(?:-\s*)?\*\*[A-Za-z][A-Za-z /]*?:\*\*")
def field_val(line, label):
    m = re.match(r"^\s*(?:-\s*)?\*\*" + re.escape(label) + r":\*\*\s*(.*)$", line)
    return m.group(1).strip() if m else None

def clean_phrase(s):
    s = s.strip().lstrip("-").strip()
    return s.strip('"').strip()

def parse_entry(lines):
    """lines = the entry's lines (excluding heading). Return (description, phrasings_str)."""
    desc, phrases = "", []
    i = 0
    while i < len(lines):
        d = field_val(lines[i], "Description")
        if d is not None and not desc:
            desc = d
        p = field_val(lines[i], "Practitioner language")
        if p is not None:
            # inline quotes on the same line (05b style)
            if p:
                phrases += [clean_phrase(x) for x in re.split(r'"\s*,\s*"|,\s{2,}', p) if x.strip()]
            # following bullet/quote lines (04a/05a style) until next field or heading
            j = i + 1
            while j < len(lines):
                ln = lines[j]
                if FIELD.match(ln) or ln.startswith("#"):
                    break
                if ln.strip():
                    phrases.append(clean_phrase(ln))
                j += 1
            i = j
            continue
        i += 1
    # tidy phrases
    phrases = [re.sub(r'\s+', ' ', x).strip(' "') for x in phrases if x and len(x) > 3]
    return desc, " ".join(phrases[:6])

def parse_file(path, heading_re):
    with open(path, encoding="utf-8") as f:
        lines = f.read().split("\n")
    hre = re.compile(heading_re)
    idxs = [i for i, l in enumerate(lines) if hre.match(l)]
    entries = []
    for a, start in enumerate(idxs):
        end = idxs[a + 1] if a + 1 < len(idxs) else len(lines)
        entries.append(parse_entry(lines[start + 1:end]))
    return entries

# codes in register order, grouped by (stream,stage)
groups = {}
with open("hr_challenges.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        groups.setdefault((r["stream"], r["stage"]), []).append(
            {"code": r["code"], "title": r["title"], "sub": r.get("sub_domain") or ""})

enriched = {}   # code -> doc text
for fname, hre, expected, key in FILES:
    entries = parse_file(os.path.join(REPORT, fname), hre)
    codes = groups[key]
    assert len(entries) == expected == len(codes), \
        f"{fname}: parsed {len(entries)}, expected {expected}, codes {len(codes)}"
    for meta, (desc, phrases) in zip(codes, entries):
        doc = f"{meta['title']}. {meta['sub']}. {desc}"
        if phrases:
            doc += f" Common questions: {phrases}"
        enriched[meta["code"]] = re.sub(r"\s+", " ", doc).strip()

print(f"enriched docs built: {len(enriched)}")
avg = sum(len(d) for d in enriched.values()) / len(enriched)
print(f"avg enriched doc length: {avg:.0f} chars (terse title+subdomain was ~40)")

with open("enriched_docs.tsv", "w", encoding="utf-8") as f:
    for code, doc in enriched.items():
        f.write(f"{code}\t{doc}\n")

# embed
model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
codes = list(enriched.keys())
vecs = [v.tolist() for v in model.embed([enriched[c] for c in codes])]

def sql_str(v):
    return "'" + v.replace("'", "''") + "'"
def vlit(vec):
    return "'[" + ",".join(f"{x:.6f}" for x in vec) + "]'"

FUNCS = r"""
create index if not exists hr_ce_enr_hnsw on public.hr_challenge_enriched
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_challenges_lexical_enr(q text, k int default 5)
returns table(code text, rank real) language sql stable as $$
    with ql as (select nullif(array_to_string(tsvector_to_array(to_tsvector('english', q)), ' | '), '') as orq)
    select e.code, ts_rank(to_tsvector('english', e.doc), to_tsquery('english', ql.orq)) as rank
    from public.hr_challenge_enriched e, ql
    where ql.orq is not null
    order by rank desc, e.code limit k;
$$;

create or replace function public.match_hybrid_enr(p_ext text, k int default 5)
returns table(code text, score numeric) language sql stable as $$
    with lex as (
        select m.code, row_number() over (order by m.rank desc) rn
        from public.match_challenges_lexical_enr((select question_text from public.hr_eval_gold where ext_id=p_ext), 10) m),
    vec as (
        select e.code, row_number() over (order by e.embedding <=> ge.embedding) rn
        from public.hr_challenge_enriched e
        cross join (select embedding from public.hr_gold_embedding where ext_id=p_ext) ge
        order by e.embedding <=> ge.embedding limit 10)
    select u.code, sum(1.0/(60+u.rn)) score
    from (select code,rn from lex union all select code,rn from vec) u
    group by u.code order by score desc, u.code limit k;
$$;

create or replace function public._enr_grounded(p_code text, p_reqsrc boolean)
returns boolean language sql stable as $$
    select case when p_reqsrc then exists(
        select 1 from public.hr_challenge_answers a
        where a.challenge_code = p_code and coalesce(array_length(a.source_refs,1),0)>0)
      else true end;
$$;

create or replace function public.run_lexical_enr(p_label text) returns uuid language plpgsql as $$
declare v uuid; begin
    insert into public.hr_eval_runs(label,model_name,notes)
      values(p_label,'lexical (enriched docs)','Enriched: FTS over Description+exemplars') returning id into v;
    insert into public.hr_eval_results(run_id,gold_id,predicted_challenge_code,retrieved_codes,predicted_escalation,answer_grounded,latency_ms)
    select v,g.id,
      (select code from public.match_challenges_lexical_enr(g.question_text,5) limit 1),
      array(select code from public.match_challenges_lexical_enr(g.question_text,5)),
      public.predict_escalation(g.question_text),
      public._enr_grounded((select code from public.match_challenges_lexical_enr(g.question_text,5) limit 1), g.requires_source),0
    from public.hr_eval_gold g; return v; end; $$;

create or replace function public.run_vector_enr(p_label text) returns uuid language plpgsql as $$
declare v uuid; begin
    insert into public.hr_eval_runs(label,model_name,notes)
      values(p_label,'all-MiniLM-L6-v2 (enriched docs)','Enriched: cosine over enriched embeddings') returning id into v;
    insert into public.hr_eval_results(run_id,gold_id,predicted_challenge_code,retrieved_codes,predicted_escalation,answer_grounded,latency_ms)
    select v,g.id,
      (select e.code from public.hr_challenge_enriched e, public.hr_gold_embedding ge where ge.ext_id=g.ext_id order by e.embedding <=> ge.embedding limit 1),
      array(select e.code from public.hr_challenge_enriched e, public.hr_gold_embedding ge where ge.ext_id=g.ext_id order by e.embedding <=> ge.embedding limit 5),
      public.predict_escalation(g.question_text),
      public._enr_grounded((select e.code from public.hr_challenge_enriched e, public.hr_gold_embedding ge where ge.ext_id=g.ext_id order by e.embedding <=> ge.embedding limit 1), g.requires_source),0
    from public.hr_eval_gold g; return v; end; $$;

create or replace function public.run_hybrid_enr(p_label text) returns uuid language plpgsql as $$
declare v uuid; begin
    insert into public.hr_eval_runs(label,model_name,notes)
      values(p_label,'lexical+MiniLM RRF (enriched docs)','Enriched: RRF of enriched lexical+vector') returning id into v;
    insert into public.hr_eval_results(run_id,gold_id,predicted_challenge_code,retrieved_codes,predicted_escalation,answer_grounded,latency_ms)
    select v,g.id,
      (select code from public.match_hybrid_enr(g.ext_id,5) limit 1),
      array(select code from public.match_hybrid_enr(g.ext_id,5)),
      public.predict_escalation(g.question_text),
      public._enr_grounded((select code from public.match_hybrid_enr(g.ext_id,5) limit 1), g.requires_source),0
    from public.hr_eval_gold g; return v; end; $$;
"""

with open("11_enriched.sql", "w", encoding="utf-8") as f:
    f.write("-- HQ.ai | Enrichment experiment. Challenge docs = title + sub_domain + report\n"
            "-- Description + practitioner-language exemplars, embedded with all-MiniLM-L6-v2 (384d).\n"
            "-- Enriched lexical/vector/hybrid retrieval + run fns. Run AFTER 08_vector_baseline.sql.\n\n")
    f.write("create extension if not exists vector;\n\n")
    f.write("drop table if exists public.hr_challenge_enriched cascade;\n"
            "create table public.hr_challenge_enriched (\n"
            "  code text primary key references public.hr_challenges(code) on update cascade,\n"
            "  doc text not null, embedding vector(384) not null);\n\n")
    f.write("insert into public.hr_challenge_enriched (code,doc,embedding) values\n")
    f.write(",\n".join("  ('{}',{},{})".format(c, sql_str(enriched[c]), vlit(v))
                       for c, v in zip(codes, vecs)))
    f.write(";\n")
    f.write(FUNCS)

print("wrote 11_enriched.sql + enriched_docs.tsv")
