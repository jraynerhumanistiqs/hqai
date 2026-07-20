-- ============================================================================
-- HQ.ai - RLS EMERGENCY ROLLBACK (action-register A4)
-- ----------------------------------------------------------------------------
-- Escape hatch for 2026-07-14_enable_rls_consolidated.sql. This DISABLES row
-- level security on every table the enable script covered, returning the DB
-- to the beta "RLS off" posture in one shot if production traffic breaks.
--
-- IMPORTANT
--   * Policies are left INTACT (only `disable row level security`). Re-running
--     the enable script (or `alter table ... enable row level security`)
--     re-arms the exact same policy set - no re-create needed.
--   * Helper functions and grants are left in place (harmless when RLS is off).
--   * Every statement is guarded with `if exists` / `alter table if exists`,
--     so this is idempotent and safe to run regardless of what is present.
--
-- HOW TO APPLY
--   Supabase Dashboard -> SQL Editor -> paste -> Run. Ends with a PostgREST
--   schema reload so the API drops policy enforcement immediately.
-- ============================================================================

begin;

do $$
declare
  t text;
  covered_tables text[] := array[
    -- core tenant
    'businesses', 'profiles', 'conversations', 'messages', 'documents',
    -- knowledge corpus
    'knowledge_chunks',
    -- cv screening + campaigns
    'cv_screenings', 'cv_custom_rubrics', 'campaigns',
    -- prescreen core + derivatives
    'prescreen_sessions', 'prescreen_responses', 'prescreen_transcripts',
    'prescreen_evaluations', 'prescreen_scoring_audit', 'prescreen_recommendations',
    'prescreen_notes', 'prescreen_outcome_events', 'prescreen_interview_bookings',
    'prescreen_share_links', 'prescreen_share_views',
    -- credits
    'credit_ledger', 'credit_allocations',
    -- administrator ingests
    'administrator_ingests',
    -- telemetry / feedback
    'chat_audit_log', 'chat_telemetry', 'coach_field_edits', 'cv_screening_outputs',
    -- founder-only / service-role-only
    'enterprise_inquiries', 'privacy_requests', 'marketplace_reservations', 'funnel_events'
  ];
begin
  foreach t in array covered_tables loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('alter table public.%I disable row level security', t);
    end if;
  end loop;
end $$;

commit;

-- Reload PostgREST so enforcement stops immediately.
notify pgrst, 'reload schema';

-- To re-arm after the incident is resolved: re-run
-- 2026-07-14_enable_rls_consolidated.sql (policies were never dropped).
