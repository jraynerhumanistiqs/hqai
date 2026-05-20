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
--   The specific view that triggered it for us is
--   `public.candidate_responses`, a back-compat view over the RLS-hardened
--   `public.prescreen_responses` table created in
--   `phase1_ai_scoring.sql`. We also sweep `public.active_prescreen_sessions`
--   (created in `add_soft_delete_prescreen.sql`) which sits over the
--   RLS-hardened `public.prescreen_sessions` table and has the same defect.
--
-- HOW TO APPLY
--   Open Supabase Dashboard -> SQL Editor -> New Query, paste this entire
--   file, and run. The migration is idempotent and is safe to apply even
--   in environments where one or both views have not yet been created.
--
-- HOW TO ROLL BACK
--   For any view you want to revert (NOT RECOMMENDED - this re-introduces
--   the RLS bypass):
--     alter view public.candidate_responses set (security_invoker = false);
--     alter view public.active_prescreen_sessions set (security_invoker = false);
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
