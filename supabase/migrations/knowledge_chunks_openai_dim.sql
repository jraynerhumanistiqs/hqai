-- Restore knowledge_chunks.embedding to vector(1536) for OpenAI
-- text-embedding-3-small, and put back the vector index.
--
-- WHY: knowledge_chunks_voyage_dim.sql was applied to production, but only
-- step 1 of its own three-step runbook. Steps 2 and 3 (provision
-- VOYAGE_API_KEY, re-run the ingest) never happened. That left the column
-- at vector(1024) while EVERYTHING ELSE in the system is still 1536:
--   - public.match_knowledge is declared query_embedding vector(1536)
--     (enable_pgvector_rag.sql:46) and was never regenerated - the voyage
--     migration left that as a manual follow-up that was not done.
--   - scripts/ingest/*.ts embed with text-embedding-3-small (1536).
--   - lib/rag.ts:embedQuery uses OpenAI unless VOYAGE_API_KEY is set,
--     and it is not set.
-- So the column is the single odd one out. Moving it back to 1536 makes
-- the system internally consistent again with no new vendor dependency.
--
-- Switching to voyage-law-2 later is still worth doing (~10% recall lift
-- on legal text). It is a deliberate upgrade, not this fix, and it needs
-- all three of: the key, this column at 1024, AND match_knowledge
-- regenerated to accept vector(1024).
--
-- SAFETY: this ABORTS if any row already holds an embedding, so it can
-- never silently destroy a populated corpus. Today every row is NULL.
--
-- Run once in the Supabase SQL Editor, then:
--   npx tsx scripts/ingest/backfill-embeddings.ts

do $$
declare
  embedded_rows bigint;
  total_rows    bigint;
begin
  select count(*) into total_rows from public.knowledge_chunks;
  select count(*) into embedded_rows
    from public.knowledge_chunks where embedding is not null;

  raise notice 'knowledge_chunks: % rows, % already embedded', total_rows, embedded_rows;

  if embedded_rows > 0 then
    raise exception
      'ABORTED: % of % rows already have an embedding. Dropping the column would destroy them. If you really intend to re-embed from scratch, clear them deliberately first.',
      embedded_rows, total_rows;
  end if;
end $$;

-- Drop whichever vector index is present (names have varied across migrations).
drop index if exists public.knowledge_chunks_embedding_ivfflat;
drop index if exists public.knowledge_chunks_embedding_ivfflat_idx;
drop index if exists public.knowledge_chunks_embedding_hnsw_idx;
drop index if exists public.knowledge_chunks_embedding_idx;

alter table public.knowledge_chunks drop column if exists embedding;
alter table public.knowledge_chunks add column embedding vector(1536);

-- HNSW over cosine, matching how match_knowledge scores
-- (1 - (kc.embedding <=> query_embedding)).
create index knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

-- match_knowledge already declares query_embedding vector(1536), so it
-- needs no change. Confirm before backfilling:
--   select pg_get_function_identity_arguments(oid)
--   from pg_proc where proname = 'match_knowledge';
-- The first argument must read "vector(1536)". If it reads vector(1024),
-- someone regenerated it for Voyage and it must be moved back too.

-- After the backfill completes, build the index statistics:
--   vacuum analyze public.knowledge_chunks;
