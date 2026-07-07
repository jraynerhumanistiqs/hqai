-- Step 4 of the role workflow stepper (Shortlist Agent) - Interviews
-- (formerly "Decision").
--
-- Adds the columns needed to run the interview stage per candidate:
--   interview_guide          - the AI-generated structured interview
--                               guide (5-8 questions + what a good
--                               answer looks like), captured as jsonb so
--                               the shape can evolve without a migration.
--   interview_notes          - freeform interviewer notes, saved as the
--                               interviewer types (debounced on blur).
--   interview_recording_url  - optional recording link (Zoom/Teams/
--                               Cloudflare) or a short note that a
--                               recording exists. Deliberately just a
--                               text field - no in-browser recording.
--
-- Additive + nullable so legacy rows and any in-flight code that hasn't
-- picked up the migration yet keep working. The write API
-- (app/api/prescreen/responses/[id]/route.ts) retries without these
-- columns if this migration hasn't been applied, so saves never hard-fail.

alter table public.prescreen_responses
  add column if not exists interview_guide jsonb,
  add column if not exists interview_notes text,
  add column if not exists interview_recording_url text;

-- Refresh PostgREST schema cache so the new columns become reachable
-- from the supabase-js client immediately, without waiting on the cron
-- reload.
notify pgrst, 'reload schema';
