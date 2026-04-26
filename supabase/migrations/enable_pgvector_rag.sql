-- HQ.ai RAG infrastructure: pgvector knowledge base + chat audit log.
-- Run once in the Supabase SQL Editor after enabling the pgvector extension.

-- 1. Enable pgvector (no-op if already enabled)
create extension if not exists vector;

-- 2. Knowledge chunks table
-- Each row is a ~800-token chunk of a source document (Modern Award,
-- Fair Work Ombudsman page, NES summary, template IP, internal playbook).
create table if not exists public.knowledge_chunks (
  id            bigserial primary key,
  source        text not null,                    -- e.g. "fair-work-ombudsman", "modern-award:MA000003", "nes", "internal"
  source_url    text,                             -- canonical URL for citation
  source_title  text not null,                    -- human-readable label, used in citation chips
  section       text,                             -- e.g. "Clause 21.3", "Section 87", "Overview"
  content       text not null,                    -- raw chunk text
  token_count   int,                              -- approximate token count (for budget planning)
  jurisdiction  text default 'AU',                -- AU / state code
  last_verified date,                             -- lawyer/editor review date
  embedding     vector(1536),                     -- OpenAI text-embedding-3-small
  metadata      jsonb default '{}'::jsonb,        -- anything else (award code, effective_from, tags)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3. Indexes
-- Full-text (BM25-ish) via Postgres tsvector for keyword search
create index if not exists knowledge_chunks_content_fts
  on public.knowledge_chunks
  using gin (to_tsvector('english', coalesce(source_title,'') || ' ' || coalesce(section,'') || ' ' || content));

-- Vector similarity (cosine) via ivfflat.
-- Lists=100 is fine up to ~100k chunks; re-run `vacuum analyze` after bulk insert.
create index if not exists knowledge_chunks_embedding_ivfflat
  on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Metadata filter helpers
create index if not exists knowledge_chunks_source_idx on public.knowledge_chunks (source);
create index if not exists knowledge_chunks_jurisdiction_idx on public.knowledge_chunks (jurisdiction);

-- 4. Hybrid search function
-- Combines full-text rank and vector cosine similarity with a weighted score.
-- Returns top_n chunks above a minimum similarity floor.
create or replace function public.match_knowledge(
  query_embedding vector(1536),
  query_text       text,
  match_count      int     default 6,
  min_similarity   float   default 0.55,
  source_filter    text    default null,
  jurisdiction_filter text default null
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
  with scored as (
    select
      kc.id,
      kc.source,
      kc.source_url,
      kc.source_title,
      kc.section,
      kc.content,
      1 - (kc.embedding <=> query_embedding) as similarity,
      ts_rank_cd(
        to_tsvector('english', coalesce(kc.source_title,'') || ' ' || coalesce(kc.section,'') || ' ' || kc.content),
        plainto_tsquery('english', query_text)
      ) as fts_rank,
      kc.metadata
    from public.knowledge_chunks kc
    where kc.embedding is not null
      and (source_filter is null or kc.source = source_filter)
      and (jurisdiction_filter is null or kc.jurisdiction = jurisdiction_filter)
  )
  select
    s.id, s.source, s.source_url, s.source_title, s.section, s.content,
    s.similarity, s.fts_rank,
    (0.7 * s.similarity) + (0.3 * least(s.fts_rank, 1.0)) as hybrid_score,
    s.metadata
  from scored s
  -- Pass if EITHER vector similarity clears the floor OR full-text rank is
  -- meaningful. Keyword-only matches (e.g. "section 87") survive even when
  -- the chunk's embedding is mediocre because it sits next to off-topic text.
  where s.similarity >= min_similarity or s.fts_rank > 0.05
  order by hybrid_score desc
  limit match_count;
$$;

-- 5. Chat audit log
-- Every HQ People chat turn persists here so we can later replay, measure
-- grounding drift, and satisfy the "what did the bot actually say?" audit.
create table if not exists public.chat_audit_log (
  id               bigserial primary key,
  user_id          uuid references auth.users(id) on delete set null,
  business_id      uuid,
  conversation_id  uuid,
  module           text not null default 'people',
  user_message     text not null,
  assistant_text   text not null,
  citations        jsonb default '[]'::jsonb,     -- [{n, label, url, chunk_id?, source?}]
  tool_calls       jsonb default '[]'::jsonb,     -- [{name, input, output_summary}]
  escalated        boolean not null default false,
  doc_type         text,
  latency_ms       int,
  model            text,
  created_at       timestamptz not null default now()
);

create index if not exists chat_audit_log_user_idx on public.chat_audit_log (user_id, created_at desc);
create index if not exists chat_audit_log_conv_idx on public.chat_audit_log (conversation_id, created_at desc);

-- RLS intentionally left disabled for beta (matches existing project posture).
-- Re-enable alongside the other tables before commercial launch.
