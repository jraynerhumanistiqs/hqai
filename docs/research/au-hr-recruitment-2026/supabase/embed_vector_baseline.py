#!/usr/bin/env python3
"""Embed the challenge corpus + gold questions with the REAL all-MiniLM-L6-v2 (384d,
onnx) and emit 08_vector_baseline.sql: challenge/gold embedding tables + run_vector_baseline().
Fair comparison to the lexical baseline - same challenge document text, same gold, same metrics."""
import csv, os
from fastembed import TextEmbedding

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

def challenge_doc(r):
    parts = [r["title"], r.get("sub_domain") or "", r["stage"], r["stream"]]
    return ". ".join(p for p in parts if p)

with open("hr_challenges.csv", encoding="utf-8") as f:
    challenges = list(csv.DictReader(f))
with open("hr_eval_gold.csv", encoding="utf-8") as f:
    gold = list(csv.DictReader(f))

model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")

def embed(texts):
    return [v.tolist() for v in model.embed(texts)]

print(f"embedding {len(challenges)} challenge docs + {len(gold)} gold questions...")
ch_vecs = embed([challenge_doc(r) for r in challenges])
gold_vecs = embed([g["question_text"] for g in gold])

def vlit(vec):
    return "'[" + ",".join(f"{x:.6f}" for x in vec) + "]'"

with open("08_vector_baseline.sql", "w", encoding="utf-8") as f:
    f.write("-- HQ.ai | Vector baseline. REAL all-MiniLM-L6-v2 (onnx, 384d) embeddings of the\n"
            "-- challenge corpus + gold questions. Run AFTER 07_retrieval_baseline.sql.\n"
            "-- Proves the pgvector retrieval path and quantifies the lift over lexical.\n\n")
    f.write("create extension if not exists vector;\n\n")
    f.write("drop table if exists public.hr_challenge_embedding cascade;\n"
            "create table public.hr_challenge_embedding (\n"
            "  code text primary key references public.hr_challenges(code) on update cascade,\n"
            "  embedding vector(384) not null);\n\n")
    f.write("drop table if exists public.hr_gold_embedding cascade;\n"
            "create table public.hr_gold_embedding (\n"
            "  ext_id text primary key,\n"
            "  embedding vector(384) not null);\n\n")

    f.write("insert into public.hr_challenge_embedding (code,embedding) values\n")
    f.write(",\n".join("  ('{}',{})".format(r["code"], vlit(v))
                       for r, v in zip(challenges, ch_vecs)))
    f.write(";\n\n")

    f.write("insert into public.hr_gold_embedding (ext_id,embedding) values\n")
    f.write(",\n".join("  ('{}',{})".format(g["ext_id"], vlit(v))
                       for g, v in zip(gold, gold_vecs)))
    f.write(";\n\n")

    f.write("create index if not exists hr_ce_hnsw on public.hr_challenge_embedding\n"
            "  using hnsw (embedding vector_cosine_ops);\n\n")

    f.write(r"""create or replace function public.run_vector_baseline(p_label text)
returns uuid language plpgsql as $$
declare v_run uuid;
begin
  insert into public.hr_eval_runs(label, model_name, notes)
  values (p_label, 'all-MiniLM-L6-v2 (onnx, 384d)',
          'Vector baseline: cosine over challenge embeddings; same gold + metrics + escalation gate as lexical.')
  returning id into v_run;

  insert into public.hr_eval_results
    (run_id, gold_id, predicted_challenge_code, retrieved_codes,
     predicted_intent, predicted_escalation, answer_grounded, latency_ms)
  select v_run, g.id,
    (select ce.code from public.hr_challenge_embedding ce, public.hr_gold_embedding ge
       where ge.ext_id = g.ext_id order by ce.embedding <=> ge.embedding limit 1),
    array(select ce.code from public.hr_challenge_embedding ce, public.hr_gold_embedding ge
       where ge.ext_id = g.ext_id order by ce.embedding <=> ge.embedding limit 5),
    null,
    public.predict_escalation(g.question_text),
    case when g.requires_source then exists (
        select 1 from public.hr_challenge_answers a
        where a.challenge_code = (select ce.code from public.hr_challenge_embedding ce, public.hr_gold_embedding ge
                                    where ge.ext_id = g.ext_id order by ce.embedding <=> ge.embedding limit 1)
          and coalesce(array_length(a.source_refs,1),0) > 0)
      else true end,
    0
  from public.hr_eval_gold g;
  return v_run;
end; $$;
""")

print("wrote 08_vector_baseline.sql")
print(f"file size: {os.path.getsize('08_vector_baseline.sql')//1024} KB")
