-- ============================================================================
-- HQ.ai - Function Search Path + Execute Grant Hardening
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Addresses two Supabase Database Advisor lints in one pass:
--
--   1. function_search_path_mutable - a SECURITY DEFINER function that
--      doesn't set search_path can be tricked into resolving a name
--      (table, operator, type) to a malicious object in another schema
--      the attacker controls. Fix: pin search_path on each function so
--      the resolution path is deterministic.
--
--   2. anon_security_definer_function_executable +
--      authenticated_security_definer_function_executable - SECURITY
--      DEFINER functions in the `public` schema are auto-exposed at
--      /rest/v1/rpc/<name> and callable by `anon` and `authenticated`
--      Postgres roles. None of these functions are meant to be called
--      that way; they exist for RLS policies, triggers, and server-side
--      logic. Fix: REVOKE EXECUTE from anon + authenticated + PUBLIC.
--
-- WHY NOW
--   See https://supabase.com/docs/guides/database/database-advisors -
--   specifically lints 0011 (search_path_mutable), 0028 (anon-callable
--   SECURITY DEFINER) and 0029 (authenticated-callable SECURITY DEFINER).
--
-- HOW TO APPLY
--   Open Supabase Dashboard -> SQL Editor -> New Query, paste this entire
--   file, and run. Idempotent - safe to re-run.
--
-- HOW TO ROLL BACK
--   For search_path:
--     alter function public.<name>(...) reset search_path;
--   For grants (re-exposes the function to anon / authenticated):
--     grant execute on function public.<name>(...) to anon, authenticated;
--
-- INTERNAL CALLERS ARE NOT AFFECTED
--   RLS policies that call these functions run as the policy owner, not
--   as anon/authenticated. Triggers run as the trigger owner. Service
--   role bypasses these grants entirely. So revoking EXECUTE only blocks
--   the unintended /rest/v1/rpc/<name> exposure - it does not break any
--   business logic.
-- ============================================================================

-- 1. Pin search_path on the four mutable-path functions ----------------------
-- pg_catalog first (so built-in operators always resolve correctly), then
-- public (where our types and tables live). pg_temp last is the secure
-- default - it ensures no attacker-created temp object can shadow a
-- public name.
do $$
begin
  if exists (select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'update_updated_at') then
    execute 'alter function public.update_updated_at() set search_path = pg_catalog, public, pg_temp';
  end if;
end$$;

do $$
begin
  if exists (select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'match_knowledge') then
    -- match_knowledge is overloaded by signature (pgvector RAG retrieval).
    -- The ALTER applies to ALL overloads in the public schema by issuing
    -- one statement per detected signature.
    perform 1 from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'match_knowledge';
    declare r record;
    begin
      for r in
        select p.oid, pg_get_function_identity_arguments(p.oid) as args
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'match_knowledge'
      loop
        execute format(
          'alter function public.match_knowledge(%s) set search_path = pg_catalog, public, pg_temp',
          r.args
        );
      end loop;
    end;
  end if;
end$$;

do $$
begin
  if exists (select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'owns_business') then
    declare r record;
    begin
      for r in
        select pg_get_function_identity_arguments(p.oid) as args
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'owns_business'
      loop
        execute format(
          'alter function public.owns_business(%s) set search_path = pg_catalog, public, pg_temp',
          r.args
        );
      end loop;
    end;
  end if;
end$$;

do $$
begin
  if exists (select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'get_session_response_counts') then
    declare r record;
    begin
      for r in
        select pg_get_function_identity_arguments(p.oid) as args
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'get_session_response_counts'
      loop
        execute format(
          'alter function public.get_session_response_counts(%s) set search_path = pg_catalog, public, pg_temp',
          r.args
        );
      end loop;
    end;
  end if;
end$$;

-- 2. Revoke EXECUTE on internal SECURITY DEFINER functions -------------------
-- These functions are meant to be called by RLS policies, triggers, and
-- server-side logic - never as RPC. Revoking EXECUTE from anon +
-- authenticated + PUBLIC closes the /rest/v1/rpc/<name> attack surface
-- without breaking any internal caller.
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
        'current_business_member_ids',
        'get_session_response_counts',
        'handle_new_user',
        'rls_auto_enable'
      )
  loop
    target := format('public.%I(%s)', fn.name, fn.args);
    execute format('revoke execute on function %s from public',         target);
    execute format('revoke execute on function %s from anon',           target);
    execute format('revoke execute on function %s from authenticated',  target);
    -- Defensive: ensure service_role can still call (it bypasses RLS
    -- anyway, but explicit beats implicit).
    execute format('grant  execute on function %s to service_role',     target);
  end loop;
end$$;
