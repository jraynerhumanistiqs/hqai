-- Per-candidate screening-method opt-ins for the Shortlist Agent.
--
-- A role's prescreen_sessions.interview_types sets the default screening
-- methods (video / phone) for every candidate on the role. This column
-- lets a recruiter additionally enable a method for ONE candidate - eg
-- record a phone screen for a candidate on a video-only role - without
-- changing the role default. The UI treats a candidate's available
-- methods as union(session.interview_types, preferred_screen_methods).
--
-- Nullable + additive: null means "inherit the role default", and the
-- PATCH /api/prescreen/responses/[id] route strips the column and
-- retries if this migration has not been applied yet, so nothing breaks
-- on an unmigrated environment.

alter table public.prescreen_responses
  add column if not exists preferred_screen_methods text[];

-- Refresh PostgREST schema cache so the new column becomes reachable from
-- the supabase-js client immediately, without waiting on the cron reload.
notify pgrst, 'reload schema';
