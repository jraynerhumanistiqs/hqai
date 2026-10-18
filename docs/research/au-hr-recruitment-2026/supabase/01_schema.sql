-- HQ.ai | Australian HR/Recruitment Challenge Register
-- Supabase (PostgreSQL) schema. Generated from the master challenge register.
-- Run in the Supabase SQL editor or via `supabase db push` as a migration.

-- ============================================================
-- Table: hr_challenges  (People + Recruitment + Cross-cutting)
-- ============================================================
create table if not exists public.hr_challenges (
    code           text primary key,                 -- natural key, e.g. 'PF11', 'RS22'
    title          text not null,
    stream         text not null check (stream in ('People','Recruitment','Cross-cutting')),
    stage          text not null,                     -- sub-stream, e.g. 'Foundations','Screen-Onboard'
    sub_domain     text,
    prevalence     text check (prevalence in ('High','Med-High','Medium','Emerging')),
    prevalence_rank smallint,                         -- 4=High .. 1=Emerging, for sorting
    trending       text check (trending in ('established','trending_up','trending_sharp','new')),
    section_ref    text,                              -- pointer into the full report
    tags           text[] default '{}',               -- free tagging for question-gen
    is_active      boolean not null default true,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

comment on table public.hr_challenges is
    'Master register of AU HR/People & Recruitment challenges (SME lens). One row per distinct challenge; full extraction schema lives in the report section named in section_ref.';
comment on column public.hr_challenges.trending is
    'established | trending_up | trending_sharp | new  (mapped from E / T / T! / N).';
comment on column public.hr_challenges.prevalence_rank is
    'Numeric mirror of prevalence for ORDER BY: High=4, Med-High=3, Medium=2, Emerging=1.';

create index if not exists hr_challenges_stream_idx     on public.hr_challenges (stream);
create index if not exists hr_challenges_stage_idx      on public.hr_challenges (stage);
create index if not exists hr_challenges_prevalence_idx on public.hr_challenges (prevalence_rank desc);
create index if not exists hr_challenges_trending_idx   on public.hr_challenges (trending);
create index if not exists hr_challenges_tags_idx       on public.hr_challenges using gin (tags);

-- ============================================================
-- Table: hr_regulatory_watchlist  (Section 3 watchlist)
-- ============================================================
create table if not exists public.hr_regulatory_watchlist (
    code        text primary key,                     -- 'REG1'..'REGn'
    item        text not null,
    commenced   text,                                 -- free-text (dates + staged commencement)
    sme_status  text,
    section_ref text not null default 'Section 3',
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.hr_regulatory_watchlist is
    'Regulatory reform watchlist with commencement + SME status, current as at Aug 2026. Several items are on active reform trajectories - review on a cadence.';

-- ============================================================
-- updated_at trigger (shared)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_hr_challenges_updated on public.hr_challenges;
create trigger trg_hr_challenges_updated before update on public.hr_challenges
    for each row execute function public.set_updated_at();

drop trigger if exists trg_hr_reg_updated on public.hr_regulatory_watchlist;
create trigger trg_hr_reg_updated before update on public.hr_regulatory_watchlist
    for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security: read-only to authenticated; writes via service_role only
-- (matches the project's RLS-on posture). Adjust roles to taste.
-- ============================================================
alter table public.hr_challenges           enable row level security;
alter table public.hr_regulatory_watchlist enable row level security;

drop policy if exists hr_challenges_read on public.hr_challenges;
create policy hr_challenges_read on public.hr_challenges
    for select to authenticated using (true);

drop policy if exists hr_reg_read on public.hr_regulatory_watchlist;
create policy hr_reg_read on public.hr_regulatory_watchlist
    for select to authenticated using (true);
-- service_role bypasses RLS, so the seed below (or your ETL) can write freely.
