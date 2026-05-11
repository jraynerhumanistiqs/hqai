-- Manual reviewer overrides on CV screenings. Lets a hiring manager change
-- the AI's band (e.g. Strong yes -> Yes) and next_action (e.g. Phone screen
-- -> Video interview) with an attached comment explaining the reason. The
-- AI's original values stay on the row so we can compute drift later.

alter table public.cv_screenings
  add column if not exists override_band text,
  add column if not exists override_next_action text,
  add column if not exists override_comment text,
  add column if not exists override_at timestamptz,
  add column if not exists override_by uuid references public.profiles(id) on delete set null;

create index if not exists cv_screenings_override_idx
  on public.cv_screenings(override_at desc)
  where override_at is not null;
