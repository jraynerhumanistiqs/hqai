-- ============================================================================
-- Fix prescreen_responses.session_id foreign key
-- ----------------------------------------------------------------------------
-- The legacy candidate_responses table had a FK pointing at a table called
-- `sessions` which either does not exist or is the wrong parent. This caused
-- every candidate submission to fail with PG 23503 (FK violation).
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste + run. Idempotent.
-- ============================================================================

alter table public.prescreen_responses
  drop constraint if exists candidate_responses_session_id_fkey;

alter table public.prescreen_responses
  drop constraint if exists prescreen_responses_session_id_fkey;

alter table public.prescreen_responses
  add constraint prescreen_responses_session_id_fkey
  foreign key (session_id)
  references public.prescreen_sessions(id)
  on delete cascade;
