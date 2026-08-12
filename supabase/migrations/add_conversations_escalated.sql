-- Add the escalated + escalation_summary columns to `conversations`.
--
-- These columns are defined in supabase/schema.sql but were never applied to
-- the live DB, so:
--   * the dashboard "Recent conversations" query failed on the missing column
--     (silently empty before DASH-09, a false error card after), and
--   * every escalation write in app/api/chat/route.ts (triage + both stream
--     finalize paths) silently failed inside its try/catch, so the
--     conversations-level `escalated` flag never persisted and the dashboard
--     Escalated dot/pill could never light up.
--
-- Additive, nullable-with-default, and idempotent - safe to run against a live
-- DB and safe to re-run. Matches the definitions in schema.sql (no NOT NULL).
--
-- After applying this, the dashboard query (app/dashboard/page.tsx) picks the
-- column up automatically via its with-escalated-first / retry-without
-- fallback, and chat/route.ts escalation writes start succeeding - no code
-- change required.

alter table conversations
  add column if not exists escalated boolean default false;

alter table conversations
  add column if not exists escalation_summary text;
