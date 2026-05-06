-- Custom rubrics for CV Screening v2. Each row holds a full Rubric JSON
-- (matching lib/cv-screening-types.ts:Rubric) so that future weight/anchor
-- changes can be made without a schema migration. The JD source is kept
-- alongside so we can re-suggest the rubric or audit how it was derived.

create table if not exists public.cv_custom_rubrics (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  rubric jsonb not null,
  source_jd text,
  source_campaign_id uuid references public.campaigns(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cv_custom_rubrics_business_idx
  on public.cv_custom_rubrics(business_id, created_at desc);

-- RLS deferred (consistent with cv_screenings).
