-- Phase 1 entry-gate migrations: roles, feature flags, telemetry, feedback loop.
-- Apply via Supabase SQL Editor in this exact order.

-- ── ROLES ─────────────────────────────────────────────────────────────
-- Existing profiles.role defaults to 'owner'. Tighten the model:
--   owner       -> James only, full edit rights
--   test_admin  -> Humanistiqs directors, read-only across all surfaces
--   member      -> regular client account
-- The CHECK constraint replaces any prior implicit values.

alter table public.profiles
  add column if not exists role_check_added boolean default false;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'profiles' and constraint_name = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('owner', 'test_admin', 'member'));
  end if;
end $$;

-- Default new accounts to 'member' going forward.
alter table public.profiles alter column role set default 'member';

-- Seed the four directors as test_admin and James as owner.
-- Idempotent: only updates if the email matches an existing profile.
update public.profiles set role = 'owner'
  where lower(email) = 'jrayner@humanistiqs.com.au';

update public.profiles set role = 'test_admin'
  where lower(email) in (
    'rprasad@humanistiqs.com.au',
    'srayner@humanistiqs.com.au',
    'bhayes@humanistiqs.com.au',
    'jharvey@humanistiqs.com.au'
  );

-- ── CHAT TELEMETRY (D2) ───────────────────────────────────────────────
create table if not exists public.chat_telemetry (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conversation_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  turn_index int,
  module text,
  query_chars int,
  query_tokens int,
  tools_called text[],
  retrieval_chunks int,
  tier_classification text,
  input_tokens int,
  output_tokens int,
  total_ms int,
  model text,
  triage_category text,
  errored boolean default false,
  error_message text
);

create index if not exists chat_telemetry_business_idx
  on public.chat_telemetry(business_id, created_at desc);
create index if not exists chat_telemetry_user_idx
  on public.chat_telemetry(user_id, created_at desc);
create index if not exists chat_telemetry_perf_idx
  on public.chat_telemetry(created_at desc, total_ms desc);

-- ── CAMPAIGN COACH FIELD-EDIT FEEDBACK LOOP (D4) ──────────────────────
create table if not exists public.coach_field_edits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  campaign_id uuid,
  step text,
  field_name text not null,
  ai_value jsonb,
  final_value jsonb,
  edited boolean default false,
  edit_distance int
);

create index if not exists coach_field_edits_field_idx
  on public.coach_field_edits(field_name, created_at desc);
create index if not exists coach_field_edits_business_idx
  on public.coach_field_edits(business_id, created_at desc);

-- ── CV SCREENING OUTPUT FEEDBACK LOOP (D4) ────────────────────────────
create table if not exists public.cv_screening_outputs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  screening_id uuid,
  rubric_id text,
  ai_scores jsonb,
  ai_evidence jsonb,
  final_scores jsonb,
  staff_edits_count int default 0
);

create index if not exists cv_screening_outputs_rubric_idx
  on public.cv_screening_outputs(rubric_id, created_at desc);
create index if not exists cv_screening_outputs_business_idx
  on public.cv_screening_outputs(business_id, created_at desc);

-- ── CLEANUP ───────────────────────────────────────────────────────────
alter table public.profiles drop column if exists role_check_added;
