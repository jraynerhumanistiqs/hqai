-- ============================================================================
-- HQ.ai Phase 1 - AI Scoring + Transcription Migration
-- ----------------------------------------------------------------------------
-- APPLY MANUALLY: Open Supabase Dashboard -> SQL Editor -> New Query.
-- Paste this entire file and run. Idempotent: safe to re-run.
-- Requires the existing `prescreen_sessions` and `candidate_responses` tables.
-- ============================================================================

-- 1. Rename legacy candidate_responses -> prescreen_responses
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'candidate_responses')
     and not exists (select 1 from information_schema.tables
                     where table_schema = 'public' and table_name = 'prescreen_responses') then
    execute 'alter table public.candidate_responses rename to prescreen_responses';
  end if;
end$$;

-- Back-compat view so older code referring to candidate_responses keeps working.
drop view if exists public.candidate_responses cascade;
create view public.candidate_responses as
  select * from public.prescreen_responses;

-- 2. prescreen_sessions: rubric mode + custom rubric
alter table public.prescreen_sessions
  add column if not exists rubric_mode text not null default 'standard'
    check (rubric_mode in ('standard','custom'));

alter table public.prescreen_sessions
  add column if not exists custom_rubric jsonb null;

-- 3. prescreen_responses: new status state machine
alter table public.prescreen_responses
  alter column status drop default;

update public.prescreen_responses
  set status = 'submitted'
  where status is null or status = 'new';

alter table public.prescreen_responses
  alter column status set default 'submitted';

do $$
declare c_name text;
begin
  for c_name in
    select conname from pg_constraint
    where conrelid = 'public.prescreen_responses'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.prescreen_responses drop constraint %I', c_name);
  end loop;
end$$;

alter table public.prescreen_responses
  add constraint prescreen_responses_status_check
  check (status in ('submitted','transcribing','evaluating','scored','staff_reviewed','shared'));

drop view if exists public.candidate_responses;
create view public.candidate_responses as
  select * from public.prescreen_responses;

-- 4. prescreen_transcripts
create table if not exists public.prescreen_transcripts (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.prescreen_responses(id) on delete cascade,
  provider text not null default 'deepgram',
  raw jsonb,
  text text,
  utterances jsonb,
  created_at timestamptz not null default now()
);
create index if not exists prescreen_transcripts_response_idx
  on public.prescreen_transcripts(response_id);

-- 5. prescreen_evaluations
create table if not exists public.prescreen_evaluations (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.prescreen_responses(id) on delete cascade,
  rubric jsonb not null,
  overall_summary text,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists prescreen_evaluations_response_idx
  on public.prescreen_evaluations(response_id);

-- 6. prescreen_scoring_audit
create table if not exists public.prescreen_scoring_audit (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.prescreen_responses(id) on delete cascade,
  model text,
  prompt_hash text,
  input_hash text,
  output_json jsonb,
  created_at timestamptz not null default now(),
  staff_decision text null check (staff_decision in ('accept','adjust','reject')),
  staff_decision_at timestamptz null,
  staff_user_id uuid null references auth.users(id)
);
create index if not exists prescreen_scoring_audit_response_idx
  on public.prescreen_scoring_audit(response_id);

-- 7. Realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.prescreen_responses';
    exception when duplicate_object then null;
    end;
  end if;
end$$;
