-- HQ.ai | Question items table (the hundreds-of-thousands layer)
-- Each row is one generated question/answer item, linked to a challenge in the
-- master register. Built for hybrid retrieval (vector + keyword) and a QA workflow.
-- Run AFTER 01_schema.sql and 02_seed.sql.

-- pgvector: semantic search. Supabase ships this; name is 'vector'.
create extension if not exists vector;

-- ============================================================
-- Table: hr_question_items
-- Embedding dim 384 = ONNX all-MiniLM-L6-v2 (project default). Change vector(384)
-- if you switch embedding models - and rebuild the HNSW index below.
-- ============================================================
create table if not exists public.hr_question_items (
    id                 uuid primary key default gen_random_uuid(),
    challenge_code     text not null
                         references public.hr_challenges(code)
                         on update cascade on delete restrict,

    -- content
    question_text      text not null,                 -- practitioner-voice question
    answer_text        text,                          -- canonical answer / knowledge snippet
    intent             text check (intent in
                         ('draft','check','explain','decision','calc','escalate')),
    persona            text,                          -- 'accidental_hr','owner','office_manager','manager'
    difficulty         smallint check (difficulty between 1 and 5),
    jurisdiction       text not null default 'federal', -- 'federal' | 'nsw' | 'vic' | ...

    -- safety / compliance (drives the escalate layer + sourcing discipline)
    requires_escalation  boolean not null default false,
    escalation_reason    text,
    compliance_sensitive boolean not null default false, -- answer asserts a compliance fact -> must be sourced
    source_refs          text[] default '{}',            -- citations backing a compliance answer

    -- ML / retrieval
    embedding          vector(384),                   -- populated by your ONNX pipeline
    embedding_model    text,                          -- provenance, e.g. 'all-MiniLM-L6-v2'
    question_tsv       tsvector generated always as
                         (to_tsvector('english', coalesce(question_text,''))) stored,

    -- QA workflow
    status             text not null default 'draft'
                         check (status in ('draft','review','approved','rejected')),
    review_notes       text,
    tags               text[] default '{}',
    dedup_hash         text,                          -- app-computed hash of normalised question, for dedupe

    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

comment on table public.hr_question_items is
    'Generated Q/A items for the HR chatbots. FK challenge_code -> hr_challenges(code). Hybrid retrieval via embedding (HNSW) + question_tsv (GIN). Safety via requires_escalation / compliance_sensitive.';
comment on column public.hr_question_items.compliance_sensitive is
    'TRUE when the answer states a compliance fact; such rows should not be approved without source_refs.';
comment on column public.hr_question_items.embedding is
    'vector(384) = ONNX all-MiniLM-L6-v2. Left NULL until the embedding job runs.';

-- soft-uniqueness for dedupe. Plain unique index: NULLs are treated as distinct
-- (PG default), so rows without a hash are never deduped, while non-null hashes are.
-- Must be a full (non-partial) index so `insert ... on conflict (dedup_hash)` can target it.
create unique index if not exists hr_qi_dedup_uidx
    on public.hr_question_items (dedup_hash);

-- FK / filter indexes
create index if not exists hr_qi_challenge_idx  on public.hr_question_items (challenge_code);
create index if not exists hr_qi_status_idx     on public.hr_question_items (status);
create index if not exists hr_qi_intent_idx     on public.hr_question_items (intent);
create index if not exists hr_qi_escalation_idx on public.hr_question_items (requires_escalation) where requires_escalation;
create index if not exists hr_qi_jurisdiction_idx on public.hr_question_items (jurisdiction);
create index if not exists hr_qi_tags_idx       on public.hr_question_items using gin (tags);

-- keyword search
create index if not exists hr_qi_tsv_idx        on public.hr_question_items using gin (question_tsv);

-- semantic search (HNSW, cosine). Build after some rows exist for best results;
-- CREATE INDEX is safe on an empty table too.
create index if not exists hr_qi_embedding_hnsw
    on public.hr_question_items using hnsw (embedding vector_cosine_ops);

-- reuse the shared updated_at trigger from 01_schema.sql
drop trigger if exists trg_hr_qi_updated on public.hr_question_items;
create trigger trg_hr_qi_updated before update on public.hr_question_items
    for each row execute function public.set_updated_at();

-- RLS: read for authenticated, writes via service_role (ingest pipeline)
alter table public.hr_question_items enable row level security;
drop policy if exists hr_qi_read on public.hr_question_items;
create policy hr_qi_read on public.hr_question_items
    for select to authenticated using (status = 'approved');
-- authenticated users see only approved items; service_role (ingest/QA) sees all.

-- ============================================================
-- Helper view: question items joined to challenge metadata
-- ============================================================
create or replace view public.hr_question_items_enriched as
select q.id, q.challenge_code, c.title as challenge_title,
       c.stream, c.stage, c.sub_domain, c.prevalence, c.prevalence_rank, c.trending,
       q.question_text, q.answer_text, q.intent, q.persona, q.difficulty,
       q.jurisdiction, q.requires_escalation, q.compliance_sensitive,
       q.status, q.tags, q.created_at
from public.hr_question_items q
join public.hr_challenges c on c.code = q.challenge_code;

-- ============================================================
-- Coverage view: how many approved items per challenge (find the gaps)
-- ============================================================
create or replace view public.hr_question_coverage as
select c.code, c.title, c.stream, c.stage, c.prevalence, c.prevalence_rank, c.trending,
       count(q.id) filter (where q.status = 'approved') as approved_items,
       count(q.id)                                      as total_items
from public.hr_challenges c
left join public.hr_question_items q on q.challenge_code = c.code
group by c.code, c.title, c.stream, c.stage, c.prevalence, c.prevalence_rank, c.trending
order by c.prevalence_rank desc, approved_items asc;  -- high-value, low-coverage first

-- ============================================================
-- Semantic search helper: top-k by cosine distance, approved only
-- Call: select * from match_hr_questions('[...384 floats...]'::vector, 10);
-- ============================================================
create or replace function public.match_hr_questions(
    query_embedding vector(384),
    match_count int default 10,
    filter_stream text default null
)
returns table (id uuid, challenge_code text, question_text text,
               answer_text text, similarity float)
language sql stable as $$
    select q.id, q.challenge_code, q.question_text, q.answer_text,
           1 - (q.embedding <=> query_embedding) as similarity
    from public.hr_question_items q
    join public.hr_challenges c on c.code = q.challenge_code
    where q.status = 'approved'
      and q.embedding is not null
      and (filter_stream is null or c.stream = filter_stream)
    order by q.embedding <=> query_embedding
    limit match_count;
$$;

-- ============================================================
-- Sample rows (illustrative; embeddings left NULL for the ingest job to fill).
-- Practitioner-voice questions taken from Appendix A of the report.
-- ============================================================
insert into public.hr_question_items
    (challenge_code, question_text, intent, persona, difficulty, jurisdiction,
     requires_escalation, escalation_reason, compliance_sensitive, source_refs, status, tags)
values
 ('PF11','Do I have to pay penalty rates if my casual works a public holiday?',
    'check','owner',3,'federal',false,null,true,
    array['Fair Work Ombudsman - Penalty rates'],'approved',array['award','penalty-rates']),
 ('PM8','How do I let someone go without getting done for unfair dismissal?',
    'decision','accidental_hr',4,'federal',false,null,true,
    array['Fair Work - Small Business Fair Dismissal Code'],'approved',array['termination','sbfdc']),
 ('PM9','I want to performance-manage someone who just took stress leave - is that a problem?',
    'escalate','manager',5,'federal',true,'Adverse action risk: action close in time to a workplace right (leave). Reverse onus applies.',
    true,array['Fair Work Act s340-361 general protections'],'approved',array['adverse-action','high-risk']),
 ('RA12','Should I put the salary in the job ad or not?',
    'decision','owner',2,'federal',false,null,false,'{}','approved',array['pay-transparency','job-ads']),
 ('RS14','How do I check someone''s legally allowed to work here before I hire them?',
    'explain','office_manager',2,'federal',false,null,true,
    array['Home Affairs VEVO'],'approved',array['right-to-work','vevo']),
 ('PF26','I think I''ve been underpaying a staff member for a year - what do I do now?',
    'escalate','owner',5,'federal',true,'Potential systemic/lengthy underpayment; wage-theft criminal exposure since 1 Jan 2025. Route to advice + voluntary Code.',
    true,array['Fair Work - Voluntary Small Business Wage Compliance Code'],'approved',array['underpayment','wage-theft','high-risk'])
on conflict do nothing;
