-- Add a link from CV screenings to the Shortlist Agent video pre-screen
-- session they were batch-handed-off into. Used by the Candidate Summary
-- report to join CV scoring with video pre-screen scoring for the same
-- candidate.

alter table public.cv_screenings
  add column if not exists prescreen_session_id uuid
  references public.prescreen_sessions(id) on delete set null;

create index if not exists cv_screenings_prescreen_idx
  on public.cv_screenings(prescreen_session_id)
  where prescreen_session_id is not null;
