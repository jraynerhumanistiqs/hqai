-- ============================================================================
-- HQ.ai Phase 2 - Kanban stage column
-- ----------------------------------------------------------------------------
-- APPLY MANUALLY: Open Supabase Dashboard -> SQL Editor -> New Query.
-- Paste this entire file and run. Idempotent: safe to re-run.
-- Adds a workflow `stage` to prescreen_responses for the kanban view.
-- ============================================================================

ALTER TABLE prescreen_responses
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new'
    CHECK (stage IN ('new','in_review','shortlisted','rejected'));

UPDATE prescreen_responses SET stage = 'new' WHERE stage IS NULL;
