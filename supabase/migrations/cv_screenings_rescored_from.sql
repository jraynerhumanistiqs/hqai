-- cv_screenings: add a rescored_from breadcrumb column
-- =====================================================
--
-- The rescore route now INSERTS a new cv_screenings row each time a
-- candidate is rescored against a newer rubric version (previously it
-- UPDATEd the row in place, destroying v1's audit trail). This column
-- captures which v1 row a v2 (or later) row was derived from, so the
-- founder can trace lineage when a candidate appears in multiple
-- version tabs.
--
-- The route handles the column being absent (catches the error and
-- retries the INSERT without it), so applying this migration is
-- optional. Apply when you want the breadcrumb available in the DB.
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste + run. Idempotent.

alter table public.cv_screenings
  add column if not exists rescored_from uuid references public.cv_screenings(id) on delete set null;

create index if not exists cv_screenings_rescored_from_idx
  on public.cv_screenings(rescored_from);
