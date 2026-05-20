-- ============================================================================
-- HQ.ai - Security Invoker Views Remediation
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Sets `security_invoker = true` on every view in the `public` schema that
--   was created without it. By default a Postgres view runs with the
--   privileges of its CREATOR (security definer behaviour), which means a
--   view over an RLS-protected base table will BYPASS the row-level
--   policies when called by an unprivileged caller (e.g. via PostgREST
--   with the anon or authenticated key). Setting `security_invoker = true`
--   makes the view honour the CALLER's RLS context, which is the safe
--   default for any view layered over an RLS-hardened table.
--
-- WHY NOW
--   Supabase Database Advisor flags this as the lint
--   "Security Definer View" (see
--   https://supabase.com/docs/guides/database/database-advisors).
--   Three views currently fire the lint for us:
--     1. public.candidate_responses (back-compat view over the RLS-hardened
--        public.prescreen_responses table, created in phase1_ai_scoring.sql).
--     2. public.active_prescreen_sessions (helper view over the RLS-hardened
--        public.prescreen_sessions table, created in
--        add_soft_delete_prescreen.sql).
--     3. public.admin_overview - an admin/reporting view created directly
--        in the Supabase SQL Editor, not via a migration in this repo. We
--        apply DUAL protection: set security_invoker = true AND revoke
--        anon/authenticated grants so it stays service-role-only. See note
--        below the alter blocks for follow-up actions.
--
-- HOW TO APPLY
--   Open Supabase Dashboard -> SQL Editor -> New Query, paste this entire
--   file, and run. The migration is idempotent and safe to re-run.
--
-- HOW TO ROLL BACK
--   For any view you want to revert (NOT RECOMMENDED - this re-introduces
--   the RLS bypass):
--     alter view public.candidate_responses        set (security_invoker = false);
--     alter view public.active_prescreen_sessions  set (security_invoker = false);
--     alter view public.admin_overview             set (security_invoker = false);
--     grant select on public.admin_overview to anon, authenticated;
--
-- VERIFY
--   See docs/SECURITY-INVOKER-VIEWS-RUNBOOK.md for the verification queries.
-- ============================================================================

-- 1. public.candidate_responses (back-compat view over prescreen_responses)
do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'candidate_responses'
  ) then
    execute 'alter view public.candidate_responses set (security_invoker = true)';
  end if;
end$$;

-- 2. public.active_prescreen_sessions (helper view over prescreen_sessions)
do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'active_prescreen_sessions'
  ) then
    execute 'alter view public.active_prescreen_sessions set (security_invoker = true)';
  end if;
end$$;

-- 3. public.admin_overview (admin/reporting view, created outside migrations)
--    Dual-protection because this is an admin surface:
--      (a) security_invoker = true so caller's RLS context applies if the
--          view is ever queried via a non-service-role key.
--      (b) revoke select from anon + authenticated so PostgREST will not
--          expose it at all under the public API keys. Service role still
--          works because the service_role bypasses RLS by design and
--          inherits select via the postgres role.
do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'admin_overview'
  ) then
    execute 'alter view public.admin_overview set (security_invoker = true)';
    execute 'revoke all on public.admin_overview from anon';
    execute 'revoke all on public.admin_overview from authenticated';
    -- Defensive: explicitly grant to service_role so any future
    -- REVOKE ALL ... FROM PUBLIC doesn't strip server-side access too.
    execute 'grant select on public.admin_overview to service_role';
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- NOTE FOR THE FOUNDER
-- public.admin_overview was created directly in the Supabase SQL Editor
-- (no corresponding file in supabase/migrations/). To stay source-control
-- clean, please either:
--   (a) Capture the view's CREATE VIEW definition into a migration file
--       called supabase/migrations/admin_overview.sql, OR
--   (b) Drop the view if it's no longer needed.
-- Run this to inspect the current definition:
--   select definition from pg_views
--   where schemaname = 'public' and viewname = 'admin_overview';
-- ----------------------------------------------------------------------------
