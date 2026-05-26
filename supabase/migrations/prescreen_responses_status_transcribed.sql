-- Allow 'transcribed' status on prescreen_responses.
--
-- Bug (Jess Harvey pilot upload, May 2026): commit 1d44434 added status
-- writes of 'transcribed' from the transcribe pipeline route, but the
-- CHECK constraint from phase1_ai_scoring.sql never included it. New
-- uploads 500 at the status update step; the after() callback that
-- chains transcribe -> score silently halts. Old uploads predate the
-- regression and are intact.
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste + run. Idempotent.

alter table public.prescreen_responses
  drop constraint if exists prescreen_responses_status_check;

alter table public.prescreen_responses
  add constraint prescreen_responses_status_check
  check (status in (
    'submitted',
    'transcribing',
    'transcribed',
    'evaluating',
    'scored',
    'staff_reviewed',
    'shared'
  ));
