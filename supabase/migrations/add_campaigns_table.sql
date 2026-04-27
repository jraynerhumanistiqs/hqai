-- Campaign Coach v1 — persistent record of conversational artifacts.
-- See docs/CAMPAIGN-COACH-RESEARCH.md §5.3.
-- Idempotent: safe to re-run.

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  created_by uuid not null references auth.users(id),
  prescreen_session_id uuid references prescreen_sessions(id) on delete set null,
  role_profile jsonb not null,
  job_ad_draft jsonb not null,
  distribution_plan jsonb not null,
  coach_score jsonb,
  status text not null default 'draft',  -- draft | launched | archived
  created_at timestamptz not null default now(),
  launched_at timestamptz
);

create index if not exists campaigns_business_created_idx
  on campaigns (business_id, created_at desc);
