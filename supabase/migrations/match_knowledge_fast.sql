-- Make hybrid retrieval use its indexes. ADDITIVE and non-destructive: this
-- creates match_knowledge_fast ALONGSIDE match_knowledge and changes nothing
-- the app calls. Compare the two, then swap deliberately.
--
-- WHY THE CURRENT FUNCTION IS SLOW (measured: ~2.3s in-database per query,
-- against a ~108ms network floor, on only 4,275 rows)
--
-- match_knowledge cannot use either index, by construction:
--
--   1. The HNSW vector index is never consulted. HNSW only accelerates
--      `ORDER BY embedding <=> query LIMIT n`. The function computes
--      `1 - (kc.embedding <=> query_embedding)` for EVERY row inside a CTE
--      with no ORDER BY and no LIMIT, then filters on the computed value in
--      the outer query. That is 4,275 cosine distances over 1536 dimensions
--      on every call.
--
--   2. The GIN full-text index is also unusable, and is probably the larger
--      cost. knowledge_chunks_content_fts indexes the EXPRESSION
--      to_tsvector('english', source_title || section || content), but the
--      query only ever calls ts_rank_cd(to_tsvector(...), ...). ts_rank_cd
--      is a ranking function, not a match operator; GIN only accelerates
--      `@@`. So Postgres re-parses the full content of all 4,275 chunks into
--      a tsvector on every query.
--
-- `vacuum analyze` does not help either problem - there is no index path for
-- the planner to choose. It only reduces variance.
--
-- WHAT THIS CHANGES
--
--   - Adds a STORED generated tsvector column so the text is parsed once at
--     write time instead of on every read, with a GIN index on the column
--     (usable by `@@`, unlike the expression index).
--   - Retrieves candidates per arm with ORDER BY ... LIMIT so both indexes
--     are actually used, then scores the union exactly as before.
--
-- BEHAVIOURAL RISK - read before swapping
--
-- The original scans everything, so ANY row with fts_rank > 0.05 can surface
-- regardless of its vector rank. This version considers the top CANDIDATES
-- per arm. With the default that is 200 candidates for a top-4 result, so the
-- same rows should come back - but "should" is not "does". Compare the two
-- functions on real questions before switching the app over. The comparison
-- query is at the bottom of this file.
--
-- Run in the Supabase SQL Editor. Safe to re-run.

-- 1. Parse the text once, at write time, instead of on every query.
alter table public.knowledge_chunks
  add column if not exists tsv tsvector
  generated always as (
    to_tsvector('english',
      coalesce(source_title,'') || ' ' || coalesce(section,'') || ' ' || content)
  ) stored;

-- 2. GIN on the COLUMN, which `@@` can use. (The old expression index stays;
--    drop it only once nothing references the expression form.)
create index if not exists knowledge_chunks_tsv_gin
  on public.knowledge_chunks using gin (tsv);

-- 3. Make sure the vector index exists and is cosine, matching how the
--    function scores (1 - (embedding <=> q)).
create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

analyze public.knowledge_chunks;

-- 4. The index-using equivalent.
create or replace function public.match_knowledge_fast(
  query_embedding vector(1536),
  query_text       text,
  match_count      int     default 6,
  min_similarity   float   default 0.55,
  source_filter    text    default null,
  jurisdiction_filter text default null,
  candidates       int     default 200
)
returns table (
  id           bigint,
  source       text,
  source_url   text,
  source_title text,
  section      text,
  content      text,
  similarity   float,
  fts_rank     float,
  hybrid_score float,
  metadata     jsonb
)
language sql stable as $$
  with q as (
    select websearch_to_tsquery('english', query_text) as tsq
  ),
  -- Vector arm: ORDER BY ... LIMIT is what lets HNSW do its job.
  vec as (
    select kc.id
    from public.knowledge_chunks kc
    where kc.embedding is not null
      and (source_filter is null or kc.source = source_filter)
      and (jurisdiction_filter is null or kc.jurisdiction = jurisdiction_filter)
    order by kc.embedding <=> query_embedding
    limit candidates
  ),
  -- Text arm: `@@` is what lets the GIN index do its job.
  fts as (
    select kc.id
    from public.knowledge_chunks kc, q
    where kc.tsv @@ q.tsq
      and (source_filter is null or kc.source = source_filter)
      and (jurisdiction_filter is null or kc.jurisdiction = jurisdiction_filter)
    order by ts_rank_cd(kc.tsv, q.tsq) desc
    limit candidates
  ),
  cand as (
    select id from vec union select id from fts
  ),
  scored as (
    select
      kc.id, kc.source, kc.source_url, kc.source_title, kc.section, kc.content,
      1 - (kc.embedding <=> query_embedding) as similarity,
      ts_rank_cd(kc.tsv, q.tsq) as fts_rank,
      kc.metadata
    from public.knowledge_chunks kc
    join cand on cand.id = kc.id, q
  )
  select
    s.id, s.source, s.source_url, s.source_title, s.section, s.content,
    s.similarity, s.fts_rank,
    (0.7 * s.similarity) + (0.3 * least(s.fts_rank, 1.0)) as hybrid_score,
    s.metadata
  from scored s
  where s.similarity >= min_similarity or s.fts_rank > 0.05
  order by hybrid_score desc
  limit match_count;
$$;

-- 5. COMPARE BEFORE SWAPPING. Paste a real 1536-dim embedding in place of
--    $1 (scripts/smoke-rag.mjs prints one if you log it), or just run the
--    node comparison harness instead, which does this for five questions:
--
--      explain analyze select id from public.match_knowledge(
--        $1::vector(1536), 'what notice do I give after three years', 4, 0.4, null, null);
--      explain analyze select id from public.match_knowledge_fast(
--        $1::vector(1536), 'what notice do I give after three years', 4, 0.4, null, null);
--
--    Expect the old plan to show a Seq Scan on knowledge_chunks, and the new
--    one to show an Index Scan using knowledge_chunks_embedding_hnsw_idx and
--    a Bitmap Index Scan on knowledge_chunks_tsv_gin.
--
-- 6. ONLY when the rows match and the latency is better, point the app at it:
--    change the rpc name in lib/rag.ts:searchKnowledge from 'match_knowledge'
--    to 'match_knowledge_fast'. Keep the old function in place so the change
--    is a one-line revert.
