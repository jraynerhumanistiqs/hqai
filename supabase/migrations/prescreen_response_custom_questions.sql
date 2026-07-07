-- Per-candidate personalised screening questions for the Shortlist Agent.
--
-- The single-candidate handoff (app/api/cv-screening/handoff/route.ts)
-- already generates questions targeted at that candidate's weakest CV
-- criteria. Bulk-sent candidates (app/api/cv-screening/batch-handoff/
-- route.ts) previously only got the session's shared, population-level
-- question set. This column lets batch-handoff store the same kind of
-- per-candidate targeted questions alongside the shared set, so
-- personalisation survives bulk allocation too.
--
-- Nullable + additive: rows without a value (legacy candidates, or ones
-- created before this migration is applied) simply fall back to the
-- session's shared `questions` array, which is unaffected by this change.

alter table public.prescreen_responses
  add column if not exists custom_questions jsonb;

-- Refresh PostgREST schema cache so the new column becomes reachable from
-- the supabase-js client immediately, without waiting on the cron reload.
notify pgrst, 'reload schema';
