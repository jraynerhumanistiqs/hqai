-- Phone Screen support for the Shortlist Agent.
--
-- Adds the column shape needed to run a phone-screen alternative to the
-- existing Cloudflare-Stream video pre-screen flow. Existing rows are
-- backfilled with sensible defaults so the migration is safe to apply
-- on populated environments.
--
-- Tables:
--   - prescreen_sessions: which interview types are enabled on the role
--     (one of, or both of, 'video' and 'phone')
--   - prescreen_responses: which type a given response is, plus optional
--     audio_path + duration for phone responses
--   - storage.buckets: a new 'prescreen-audio' private bucket for the
--     audio file blobs

-- 1. Session-level interview-type selector ----------------------------------
alter table public.prescreen_sessions
  add column if not exists interview_types text[]
    not null default array['video']::text[];
-- Constraint added separately so the migration is idempotent and re-runnable.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prescreen_sessions_interview_types_check'
  ) then
    alter table public.prescreen_sessions
      add constraint prescreen_sessions_interview_types_check
      check (
        interview_types <@ array['video','phone']::text[]
        and array_length(interview_types, 1) >= 1
      );
  end if;
end $$;

-- 2. Response-level type + audio fields -------------------------------------
alter table public.prescreen_responses
  add column if not exists response_type text
    not null default 'video',
  add column if not exists audio_path text,
  add column if not exists audio_duration_sec numeric,
  add column if not exists recorded_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prescreen_responses_response_type_check'
  ) then
    alter table public.prescreen_responses
      add constraint prescreen_responses_response_type_check
      check (response_type in ('video','phone'));
  end if;
end $$;

-- Relax video_ids NOT NULL since phone responses won't have video. Tolerate
-- the column already being nullable.
do $$
declare
  is_not_null boolean;
begin
  select is_nullable = 'NO' into is_not_null
  from information_schema.columns
  where table_schema = 'public' and table_name = 'prescreen_responses' and column_name = 'video_ids';
  if is_not_null then
    alter table public.prescreen_responses alter column video_ids drop not null;
  end if;
end $$;

create index if not exists prescreen_responses_type_idx
  on public.prescreen_responses(response_type);

-- 3. Private storage bucket for audio files ---------------------------------
-- Skipped here: Supabase Storage buckets are usually managed via the
-- dashboard / Supabase API. If you prefer to manage them via SQL, the
-- snippet below works but requires the storage schema to be present.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('prescreen-audio', 'prescreen-audio', false)
    on conflict (id) do nothing;
  end if;
end $$;

-- Backfill safety check: confirm any existing rows default cleanly.
-- (no-op SELECT, just for the runbook log)
-- select count(*) from prescreen_sessions where interview_types is null;
-- -- expect 0
-- select count(*) from prescreen_responses where response_type is null;
-- -- expect 0
