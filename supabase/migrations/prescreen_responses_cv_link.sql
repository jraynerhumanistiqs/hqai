-- Link prescreen_responses (Shortlist Agent candidates) back to the CV
-- screening row they were imported from via batch-handoff. Lets the Shortlist
-- Agent surface CV-only candidates immediately on role creation rather than
-- waiting for them to record videos.

alter table public.prescreen_responses
  add column if not exists cv_screening_id uuid
    references public.cv_screenings(id) on delete set null;

create index if not exists prescreen_responses_cv_screening_idx
  on public.prescreen_responses(cv_screening_id)
  where cv_screening_id is not null;
