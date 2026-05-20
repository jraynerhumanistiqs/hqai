-- ============================================================================
-- HQ.ai - Restore EXECUTE on RLS helper functions
-- ----------------------------------------------------------------------------
-- URGENT FIX
--   security_function_hardening.sql revoked EXECUTE on five SECURITY
--   DEFINER functions from anon + authenticated + PUBLIC. Two of those
--   functions are called from RLS policy expressions across most of the
--   schema, including the policy on `public.profiles`:
--
--     create policy "profiles_self_or_same_business_select" on public.profiles
--       for select using (
--         id = auth.uid() or business_id = public.current_business_id()
--       );
--
--   PostgreSQL evaluates both sides of the OR. Without EXECUTE on
--   current_business_id() the second clause raises a permission error,
--   the whole policy fails, the user's profile lookup returns null,
--   and app/dashboard/layout.tsx redirects them to /onboarding.
--
--   This migration restores EXECUTE on the two RLS helpers ONLY -
--   current_business_id() and current_business_member_ids(). The other
--   three functions (handle_new_user, rls_auto_enable,
--   get_session_response_counts) stay revoked because they're not used
--   as RLS predicates - they were correctly identified by the Advisor
--   as unwanted /rest/v1/rpc/ surface.
--
-- WHY THE ADVISOR LINT WILL FIRE AGAIN AFTER THIS
--   The Advisor flags ANY SECURITY DEFINER function exposed at
--   /rest/v1/rpc/<name>. current_business_id() and
--   current_business_member_ids() will trip the lint again because
--   the only thing they reveal is the CALLING user's own business
--   context (which the caller already has access to via their profile
--   row). This is a deliberate, accepted, documented exception. See
--   docs/SECURITY-FUNCTION-HARDENING-RUNBOOK.md.
--
-- HOW TO APPLY
--   Supabase Dashboard -> SQL Editor -> paste this file -> run.
--   Idempotent.
--
-- VERIFY
--   1. Log out and back in to /dashboard - you land on the dashboard,
--      not /onboarding.
--   2. SQL: select grantee, privilege_type
--          from information_schema.routine_privileges
--          where specific_schema = 'public'
--            and routine_name in ('current_business_id', 'current_business_member_ids')
--          order by routine_name, grantee;
--      The result must include rows for `authenticated` with
--      `privilege_type = 'EXECUTE'` on both functions.
-- ============================================================================

do $$
declare
  fn record;
  target text;
begin
  for fn in
    select p.proname as name,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'current_business_id',
        'current_business_member_ids'
      )
  loop
    target := format('public.%I(%s)', fn.name, fn.args);
    -- Re-grant to the roles that need to evaluate RLS predicates.
    -- anon needs it too because the public prescreen flow at
    -- /prescreen/[id] uses the anon key and reads through views that
    -- may call these helpers.
    execute format('grant execute on function %s to anon',           target);
    execute format('grant execute on function %s to authenticated',  target);
    -- service_role already has execute via the earlier migration; this
    -- is just a belt-and-braces re-grant.
    execute format('grant execute on function %s to service_role',   target);
  end loop;
end$$;
