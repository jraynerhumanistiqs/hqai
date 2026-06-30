-- Post-score "considerations" on CV screenings. Hard-gate checks like
-- location / AU work rights are assessed but kept OUT of the weighted merit
-- score - they surface as a single-select eligibility tick the recruiter
-- confirms (Eligible / Unclear / Not eligible). This column stores the
-- recruiter-confirmed values; the AI's read is derived on the fly from the
-- hard-gate criteria_scores when this is null.
--
-- Shape: jsonb array of
--   { id, label, status: 'met'|'unclear'|'not_met', ai_status?, note? }

alter table public.cv_screenings
  add column if not exists considerations jsonb;
