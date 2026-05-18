-- OPTION F + Bias-trigger rule
-- ============================
-- Run in the Supabase SQL editor in two passes.
--
-- 1. Adds the columns needed for dynamic logo injection in generated
--    .docx documents (OPTION F).
-- 2. Adds the columns needed for the auto-anonymise-when-bias-detected
--    rule across CV scoring + Shortlist agents.
--
-- Storage buckets + RLS policies must be added via the Supabase
-- dashboard separately - see docs/OPTION-F-SETUP.md.

-- ── OPTION F: logo + document storage ─────────────────────────────
alter table businesses add column if not exists logo_url text;
alter table documents  add column if not exists storage_path text;

-- ── Bias-trigger rule: auto-anonymise ─────────────────────────────
-- Per-business default. When true, every new role inherits
-- anonymise=true. Recruiters can still flip it off per role.
alter table businesses
  add column if not exists auto_anonymise_candidates boolean default true;

-- Per-role override (prescreen_sessions doubles as the "role" table).
alter table prescreen_sessions
  add column if not exists anonymise_candidates boolean default true;

-- Per-screening signal trace - what tripped the auto-anonymise rule
-- so the UI can render a "why" banner to the recruiter.
alter table cv_screenings
  add column if not exists bias_signals text[];

-- Optional: same trace on the prescreen response row so phone /
-- video screens can independently flag.
alter table prescreen_responses
  add column if not exists bias_signals text[];
