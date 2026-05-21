-- ============================================================================
-- prescreen_responses.candidate_email - drop NOT NULL
-- ----------------------------------------------------------------------------
-- The phone-screen recorder (components/recruit/PhoneRecorder.tsx) treats
-- candidate_email as OPTIONAL because the recruiter is on a live call and
-- usually does not have the candidate's email captured at that moment. The
-- UI sends `null` when the field is blank, which then fails the legacy
-- NOT NULL constraint inherited from the candidate-facing video flow:
--
--   null value in column "candidate_email" of relation "prescreen_responses"
--   violates not-null constraint
--
-- The candidate-facing flow (CandidateGate -> RecordingFlow) still validates
-- email at the UI layer, so loosening this constraint does not regress that
-- path - it just stops blocking the recruiter-driven phone screen path.
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste + run. Idempotent.
-- ============================================================================

alter table public.prescreen_responses
  alter column candidate_email drop not null;
