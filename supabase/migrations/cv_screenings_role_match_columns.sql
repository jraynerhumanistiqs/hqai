-- CV screening: persist the CV -> role linkage from the auto-matcher.
--
-- Additive and nullable, matching the repo convention: application code
-- (app/api/cv-screening/score/route.ts) sets these when available and
-- gracefully retries the INSERT without them if this migration has not been
-- applied yet, so deploying the code before the migration never breaks scoring.
--
-- Columns:
--   role_key         - the taxonomy role_key the CV was linked to
--                      (data/rubrics/au-role-taxonomy.json). Null for custom
--                      rubrics with no taxonomy entry.
--   match_source     - how the rubric/role was chosen:
--                      'recruiter' (recruiter-selected, source of truth) |
--                      'auto' | 'ambiguous' (deterministic matcher) |
--                      'bespoke' (generated rubric) | null.
--   match_confidence - 0..1 confidence from lib/rubrics-au/match.ts (null for
--                      recruiter-selected, which is treated as certain = 1).

ALTER TABLE public.cv_screenings
  ADD COLUMN IF NOT EXISTS role_key text,
  ADD COLUMN IF NOT EXISTS match_source text,
  ADD COLUMN IF NOT EXISTS match_confidence numeric;

-- Index the role_key so per-role analytics / filtering stays cheap.
CREATE INDEX IF NOT EXISTS cv_screenings_role_key_idx
  ON public.cv_screenings (role_key);
