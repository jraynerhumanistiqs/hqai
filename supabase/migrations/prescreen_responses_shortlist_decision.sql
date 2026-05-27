-- Step 3 + Step 4 of the Shortlist Agent stepper merge.
--
-- Step 3 (Shortlist):  explicit "promote to shortlist" gate, separate from
--                      the existing stage column so the Shortlist view
--                      shows only candidates the recruiter has positively
--                      curated for the decision maker.
-- Step 4 (Decision):   recruiter's recorded decision for each shortlisted
--                      candidate. Stub for now - real wiring (calendar,
--                      offer letter generation) is a follow-up build.
--
-- Both column groups are additive + nullable so legacy rows keep working.

alter table public.prescreen_responses
  add column if not exists shortlisted_at timestamptz,
  add column if not exists shortlisted_by uuid references auth.users(id) on delete set null,
  add column if not exists decision text,
  add column if not exists decision_reason text,
  add column if not exists decision_at timestamptz,
  add column if not exists decision_by uuid references auth.users(id) on delete set null;

-- Constrain decision to the four supported outcomes. NULL is allowed so
-- rows that haven't reached Step 4 yet read cleanly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'prescreen_responses_decision_check'
  ) then
    alter table public.prescreen_responses
      add constraint prescreen_responses_decision_check
      check (decision is null or decision in ('reject', 'interview_1', 'interview_2', 'offer'));
  end if;
end $$;

-- Index the shortlist gate so Step 3 list queries stay cheap as the
-- candidate pool grows.
create index if not exists prescreen_responses_shortlisted_idx
  on public.prescreen_responses(session_id, shortlisted_at)
  where shortlisted_at is not null;

-- Refresh PostgREST schema cache so the new columns become reachable
-- from the supabase-js client immediately, without waiting on the cron
-- reload.
notify pgrst, 'reload schema';
