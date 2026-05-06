-- CV Screening tables. Apply via Supabase SQL editor.
-- Phase 1 demo scope: single screenings table holds the full screening
-- artefact (cv text, scores, evidence, fairness checks) per candidate per
-- rubric run. Rubric configs themselves live in code (lib/cv-screening-rubrics.ts)
-- so rubric editor work in v2 doesn't require a schema change.

create table if not exists public.cv_screenings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rubric_id text not null,
  candidate_label text not null,
  candidate_email text,
  cv_text text not null,
  cv_filename text,
  overall_score numeric(3,2),
  band text,
  next_action text,
  rationale_short text,
  criteria_scores jsonb default '[]'::jsonb,
  fairness_checks jsonb default '{}'::jsonb,
  status text not null default 'parsing',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists cv_screenings_business_idx on public.cv_screenings(business_id, created_at desc);
create index if not exists cv_screenings_user_idx on public.cv_screenings(user_id, created_at desc);
create index if not exists cv_screenings_rubric_idx on public.cv_screenings(rubric_id);

-- RLS deferred to commercial launch (consistent with prescreen tables per CLAUDE.md).
-- When ready, run: alter table public.cv_screenings enable row level security;
-- with a policy of the shape: business_id = (select business_id from profiles where id = auth.uid()).
