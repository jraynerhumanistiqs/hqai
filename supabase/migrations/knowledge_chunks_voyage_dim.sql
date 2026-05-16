-- B1 - Rebuild knowledge_chunks.embedding for voyage-law-2 (1024 dims).
--
-- Source: docs/research/2026-05-16_ai-doc-creation-teardown.md section
-- 6.6 + implementation brief Part B1.
--
-- DESTRUCTIVE - drops the existing 1536-dim embedding column AND any
-- index on it. Anything not re-ingested after running this will be
-- searchable by lexical / hybrid signal only, with no vector recall,
-- until the ingest scripts repopulate the column.
--
-- Order of operations (run ONCE, in this order, after VOYAGE_API_KEY
-- has been provisioned in the Supabase + Vercel envs):
--   1. Apply this migration (drops column + index).
--   2. Run scripts/ingest/ingest-awards.ts, ingest-fwo.ts, ingest-act.ts
--      against the new column. They embed via lib/voyage.ts.
--   3. After ingest completes and tests/eval/run-eval.ts shows recall
--      improvement, repoint lib/rag.ts:embedQuery at lib/voyage.ts.
--
-- Do NOT apply this migration ahead of step 2 in production unless you
-- can take RAG offline for the duration of the re-ingest. Staging is
-- safer to validate this end-to-end first.

-- Optional safety: capture row count so the re-ingest can be cross-
-- checked. Logged via Supabase migration history; no permanent change.
do $$
declare
  n int;
begin
  select count(*) into n from public.knowledge_chunks;
  raise notice 'knowledge_chunks rows before voyage rebuild: %', n;
end $$;

-- Drop the existing vector index (if any) before dropping the column.
-- Both ivfflat and hnsw indexes share the same name pattern in the
-- supabase project; the conditional drops are belt-and-braces.
drop index if exists public.knowledge_chunks_embedding_ivfflat_idx;
drop index if exists public.knowledge_chunks_embedding_hnsw_idx;
drop index if exists public.knowledge_chunks_embedding_idx;

alter table public.knowledge_chunks drop column if exists embedding;

alter table public.knowledge_chunks add column embedding vector(1024);

-- HNSW is the modern default for high-recall vector search at HQ.ai's
-- corpus size (<10M chunks). Cosine distance matches the Voyage docs
-- recommendation; if a future migration switches Voyage models the
-- operator class may need to change to vector_l2_ops or vector_ip_ops.
create index knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

-- If the match_knowledge RPC hard-codes the embedding dimension, the
-- function signature must be regenerated to expect a 1024-element
-- argument. Inspect with:
--   \df public.match_knowledge
-- and update the `query_embedding vector(...)` parameter accordingly.
-- (Left as a manual follow-up rather than blindly recreating here -
-- the RPC body in supabase/match_knowledge.sql also references the
-- column and may have hand-tuned cutoffs we don't want to clobber.)
