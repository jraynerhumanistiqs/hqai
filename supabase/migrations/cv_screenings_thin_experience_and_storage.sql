-- Additive, nullable columns on cv_screenings (safe to apply any time;
-- code retries-without and soft-warns while unapplied).
--
-- 1. thin_experience: role titles whose experience entries listed only a
--    job title, employer and date range - no responsibilities. Surfaced
--    post-score as a "Responsibilities not listed for: ..." consideration
--    instead of silently dragging the score down. Shape: jsonb array of
--    strings, e.g. ["Office Manager (Acme)", "Team Leader"].
--
-- 2. cv_storage_path: path of the ORIGINAL uploaded CV file in the
--    private 'cvs' storage bucket ("{business_id}/{uuid}/{filename}").
--    Streamed back by GET /api/cv-screening/screenings/[id]/cv. NULL for
--    candidates scored before original-file storage landed - the UI
--    offers the Formatted CV export instead.

alter table public.cv_screenings
  add column if not exists thin_experience jsonb;

alter table public.cv_screenings
  add column if not exists cv_storage_path text;
