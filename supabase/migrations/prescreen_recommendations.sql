-- AI Recommendation columns on prescreen_evaluations.
-- Run after the existing prescreen tables exist.

alter table public.prescreen_evaluations
  add column if not exists recommendation_action text,
  add column if not exists recommendation_rationale text;

-- Constrain values once data is backfilled (defer if existing rows are NULL).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'prescreen_evaluations'
      and constraint_name = 'prescreen_evaluations_recommendation_action_check'
  ) then
    alter table public.prescreen_evaluations
      add constraint prescreen_evaluations_recommendation_action_check
      check (
        recommendation_action is null
        or recommendation_action in ('progress_to_shortlist', 'consider_with_caution', 'reject')
      );
  end if;
end $$;
