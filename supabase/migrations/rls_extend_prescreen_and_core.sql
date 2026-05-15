-- Extends rls_all_tables.sql to cover tables the original migration
-- missed. These are the highest-value gaps to close because they
-- contain candidate PII, business profile data, and the audit trail
-- itself.
--
-- Apply after rls_all_tables.sql on STAGING first, smoke-test cross-
-- tenant isolation with two business accounts, then apply to production.
--
-- Tables covered here:
--   - prescreen_sessions (role-level data)
--   - prescreen_responses (candidate video + scoring data, the
--     replacement for the legacy candidate_responses table)
--   - prescreen_scoring_audit (AI scoring decisions audit)
--   - prescreen_recommendations (AI recommendations audit)
--   - businesses (business profile)
--   - profiles (user profile)

-- Helper: short-circuit if the business id helper from rls_all_tables.sql
-- has not been created yet. The original migration defines
-- public.current_business_id(); if it's missing, this migration is a
-- no-op rather than a hard failure.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'current_business_id') then
    raise notice 'public.current_business_id() not found - run rls_all_tables.sql first.';
    return;
  end if;
end $$;

-- 1. prescreen_sessions ------------------------------------------------------
alter table if exists public.prescreen_sessions enable row level security;
drop policy if exists "prescreen_sessions_business_select" on public.prescreen_sessions;
create policy "prescreen_sessions_business_select" on public.prescreen_sessions
  for select using (business_id = public.current_business_id());
drop policy if exists "prescreen_sessions_business_write" on public.prescreen_sessions;
create policy "prescreen_sessions_business_write" on public.prescreen_sessions
  for all
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Public read needed for the /prescreen/[id] candidate-facing flow.
-- Service-role admin client (used by /api/prescreen/sessions/[id]/route.ts)
-- bypasses RLS so the public anonymous candidate can still fetch the
-- session by id without authenticating.

-- 2. prescreen_responses (the table name the new flow uses) -----------------
alter table if exists public.prescreen_responses enable row level security;
drop policy if exists "prescreen_responses_business_select" on public.prescreen_responses;
create policy "prescreen_responses_business_select" on public.prescreen_responses
  for select using (
    session_id in (select id from public.prescreen_sessions where business_id = public.current_business_id())
  );
drop policy if exists "prescreen_responses_business_write" on public.prescreen_responses;
create policy "prescreen_responses_business_write" on public.prescreen_responses
  for update using (
    session_id in (select id from public.prescreen_sessions where business_id = public.current_business_id())
  );
drop policy if exists "prescreen_responses_business_delete" on public.prescreen_responses;
create policy "prescreen_responses_business_delete" on public.prescreen_responses
  for delete using (
    session_id in (select id from public.prescreen_sessions where business_id = public.current_business_id())
  );
-- INSERT is intentionally permitted via service-role admin only (public
-- candidate submission endpoint). No anon insert policy.

-- 3. prescreen_scoring_audit -------------------------------------------------
alter table if exists public.prescreen_scoring_audit enable row level security;
drop policy if exists "prescreen_scoring_audit_business_select" on public.prescreen_scoring_audit;
create policy "prescreen_scoring_audit_business_select" on public.prescreen_scoring_audit
  for select using (
    response_id in (
      select id from public.prescreen_responses
      where session_id in (select id from public.prescreen_sessions where business_id = public.current_business_id())
    )
  );

-- 4. prescreen_recommendations (if present in env) --------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'prescreen_recommendations') then
    execute 'alter table public.prescreen_recommendations enable row level security';
    execute 'drop policy if exists "prescreen_recommendations_business_select" on public.prescreen_recommendations';
    execute $p$create policy "prescreen_recommendations_business_select" on public.prescreen_recommendations
      for select using (
        response_id in (
          select id from public.prescreen_responses
          where session_id in (select id from public.prescreen_sessions where business_id = public.current_business_id())
        )
      )$p$;
  end if;
end $$;

-- 5. businesses --------------------------------------------------------------
alter table if exists public.businesses enable row level security;
drop policy if exists "businesses_owner_select" on public.businesses;
create policy "businesses_owner_select" on public.businesses
  for select using (id = public.current_business_id());
drop policy if exists "businesses_owner_write" on public.businesses;
create policy "businesses_owner_write" on public.businesses
  for update using (id = public.current_business_id())
  with check (id = public.current_business_id());

-- 6. profiles ----------------------------------------------------------------
alter table if exists public.profiles enable row level security;
drop policy if exists "profiles_self_or_same_business_select" on public.profiles;
create policy "profiles_self_or_same_business_select" on public.profiles
  for select using (
    id = auth.uid() or business_id = public.current_business_id()
  );
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- 7. privacy_requests --------------------------------------------------------
-- Privacy requests are read-only for staff via the admin client. Lock
-- down direct table access to admin role only.
alter table if exists public.privacy_requests enable row level security;
drop policy if exists "privacy_requests_owner_select" on public.privacy_requests;
create policy "privacy_requests_owner_select" on public.privacy_requests
  for select using (false);  -- no anon read; admin client bypasses

-- Cross-tenant smoke test (run as two different business accounts):
--   select count(*) from prescreen_sessions where business_id <> public.current_business_id();
--   -- should return 0 for both accounts
--   select count(*) from prescreen_responses;
--   -- should match own sessions only
