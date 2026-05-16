-- Extends rls_all_tables.sql to cover tables the original migration
-- missed. These are the highest-value gaps to close because they
-- contain candidate PII, business profile data, and the audit trail
-- itself.
--
-- NOTE: prescreen_sessions does NOT have a business_id column - it has
-- a created_by user id, and the business is resolved via
-- profiles.business_id. The same applies transitively to
-- prescreen_responses (joined through session_id). Earlier draft of
-- this migration assumed a direct business_id and failed with
-- 42703 "column business_id does not exist".
--
-- Apply order:
--   1. rls_all_tables.sql first (defines public.current_business_id())
--   2. this migration
-- Apply on STAGING first, smoke-test cross-tenant isolation with two
-- business accounts, then apply to production.
--
-- Tables covered here:
--   - prescreen_sessions (role-level data, gated via created_by ->
--     profiles.business_id)
--   - prescreen_responses (candidate video + scoring, gated via
--     session_id -> prescreen_sessions -> created_by -> profiles)
--   - prescreen_scoring_audit (AI scoring decisions audit)
--   - prescreen_recommendations (AI recommendations audit)
--   - businesses (business profile)
--   - profiles (user profile)
--   - privacy_requests (admin-only)

-- Short-circuit if the helper from rls_all_tables.sql has not been
-- created yet.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'current_business_id') then
    raise notice 'public.current_business_id() not found - run rls_all_tables.sql first.';
  end if;
end $$;

-- Helper: list of profile ids that share the caller's business. Used to
-- gate prescreen_sessions.created_by without exposing the join inline.
create or replace function public.current_business_member_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles
  where business_id = public.current_business_id()
$$;

-- 1. prescreen_sessions ------------------------------------------------------
-- Gate on created_by being a member of the caller's business. This
-- mirrors the existing rls_prescreen.sql shape, just bundled with the
-- rest of the tenant policies.
alter table if exists public.prescreen_sessions enable row level security;
drop policy if exists "prescreen_sessions_business_select" on public.prescreen_sessions;
create policy "prescreen_sessions_business_select" on public.prescreen_sessions
  for select using (created_by in (select public.current_business_member_ids()));
drop policy if exists "prescreen_sessions_business_write" on public.prescreen_sessions;
create policy "prescreen_sessions_business_write" on public.prescreen_sessions
  for all
  using (created_by in (select public.current_business_member_ids()))
  with check (created_by = auth.uid());

-- Public read needed for the /prescreen/[id] candidate-facing flow.
-- Service-role admin client (used by /api/prescreen/sessions/[id]/route.ts)
-- bypasses RLS so the public anonymous candidate can still fetch the
-- session by id without authenticating.

-- 2. prescreen_responses ----------------------------------------------------
alter table if exists public.prescreen_responses enable row level security;
drop policy if exists "prescreen_responses_business_select" on public.prescreen_responses;
create policy "prescreen_responses_business_select" on public.prescreen_responses
  for select using (
    session_id in (
      select id from public.prescreen_sessions
      where created_by in (select public.current_business_member_ids())
    )
  );
drop policy if exists "prescreen_responses_business_update" on public.prescreen_responses;
create policy "prescreen_responses_business_update" on public.prescreen_responses
  for update using (
    session_id in (
      select id from public.prescreen_sessions
      where created_by in (select public.current_business_member_ids())
    )
  );
drop policy if exists "prescreen_responses_business_delete" on public.prescreen_responses;
create policy "prescreen_responses_business_delete" on public.prescreen_responses
  for delete using (
    session_id in (
      select id from public.prescreen_sessions
      where created_by in (select public.current_business_member_ids())
    )
  );
-- INSERT is intentionally permitted via service-role admin only (public
-- candidate submission endpoint). No anon insert policy.

-- 3. prescreen_scoring_audit (if present in env) ---------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'prescreen_scoring_audit') then
    execute 'alter table public.prescreen_scoring_audit enable row level security';
    execute 'drop policy if exists "prescreen_scoring_audit_business_select" on public.prescreen_scoring_audit';
    execute $p$create policy "prescreen_scoring_audit_business_select" on public.prescreen_scoring_audit
      for select using (
        response_id in (
          select pr.id from public.prescreen_responses pr
          join public.prescreen_sessions ps on ps.id = pr.session_id
          where ps.created_by in (select public.current_business_member_ids())
        )
      )$p$;
  end if;
end $$;

-- 4. prescreen_recommendations (if present in env) -------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'prescreen_recommendations') then
    execute 'alter table public.prescreen_recommendations enable row level security';
    execute 'drop policy if exists "prescreen_recommendations_business_select" on public.prescreen_recommendations';
    execute $p$create policy "prescreen_recommendations_business_select" on public.prescreen_recommendations
      for select using (
        response_id in (
          select pr.id from public.prescreen_responses pr
          join public.prescreen_sessions ps on ps.id = pr.session_id
          where ps.created_by in (select public.current_business_member_ids())
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
-- Privacy requests are admin-only via the service-role client. Lock down
-- any authenticated access; the admin client bypasses RLS.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'privacy_requests') then
    execute 'alter table public.privacy_requests enable row level security';
    execute 'drop policy if exists "privacy_requests_no_anon" on public.privacy_requests';
    execute 'create policy "privacy_requests_no_anon" on public.privacy_requests for select using (false)';
  end if;
end $$;

-- Cross-tenant smoke test (run as two different business accounts):
--   select count(*) from prescreen_sessions where created_by not in (select public.current_business_member_ids());
--   -- should return 0 for both accounts
--   select count(*) from prescreen_responses;
--   -- should match own sessions only
