-- ============================================================================
-- HQ.ai - CONSOLIDATED RLS ENABLE (action-register A4)
-- ----------------------------------------------------------------------------
-- ONE idempotent script that brings the production database to the intended
-- Row Level Security state, REGARDLESS of which of the earlier RLS/security
-- fragments were already applied. Every policy is DROP-then-CREATE, every
-- covered table gets `enable row level security`, and every helper the
-- policies depend on is (re)created and re-granted. Safe to re-run.
--
-- HOW TO APPLY
--   Supabase Dashboard -> SQL Editor -> New Query -> paste this whole file
--   -> Run. Apply on STAGING first, run the smoke-test checklist, then
--   production. A rollback escape hatch lives in
--   2026-07-14_rls_rollback.sql (disables RLS, leaves policies intact).
--
-- DESIGN DECISIONS (why this is the "intended state")
--   1. TENANT MODEL. A signed-in user belongs to exactly one business via
--      profiles.business_id. public.current_business_id() resolves it.
--      prescreen_* tables have NO business_id column; they resolve tenancy
--      through prescreen_sessions.created_by -> profiles.business_id, exposed
--      as public.current_business_member_ids().
--
--   2. WRITES ARE BUSINESS-SCOPED, NOT OWNER-ONLY. rls_all_tables.sql gated
--      writes on role = 'owner'. But roles_and_telemetry.sql set the DEFAULT
--      profile role to 'member', and the live app writes documents /
--      conversations with the AUTHENTICATED client (app/api/documents/route.ts
--      POST+DELETE, app/api/conversations/route.ts POST,
--      app/dashboard/settings/page.tsx). An owner-only write policy would
--      BREAK document save, chat history and settings edits for every member
--      account. This script therefore scopes writes on business_id membership
--      only (no role sub-gate). Tenant isolation is fully preserved; the
--      role gate is intentionally dropped. If per-role write locking is
--      wanted later, add it as a separate, tested migration.
--
--   3. SERVICE-ROLE PATHS ARE UNAFFECTED. All public / candidate writes
--      (prescreen response submission, onboarding business insert, Stripe
--      webhook, enterprise + privacy + marketplace captures, careers/doc
--      public reads) go through lib/supabase/admin.ts (service role), which
--      bypasses RLS by design. Those tables therefore keep anon closed.
--
--   4. FOUNDER-ONLY tables (enterprise_inquiries, privacy_requests,
--      marketplace_reservations, funnel_events) get RLS ON with NO tenant
--      policy => default-deny for anon/authenticated; service role still
--      reads/writes.
--
--   5. knowledge_chunks is shared public-domain corpus: read-only to any
--      authenticated user; writes are service-role.
-- ============================================================================

begin;

-- ──────────────────────────────────────────────────────────────────────────
-- 0. HELPER FUNCTIONS (RLS predicates depend on these)
-- ──────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so the predicate can read profiles regardless of the
-- caller's own RLS view of profiles. search_path pinned (advisor lint 0011).
create or replace function public.current_business_id()
returns uuid
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select business_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_business_member_ids()
returns setof uuid
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select id from public.profiles where business_id = public.current_business_id()
$$;

-- EXECUTE must be granted to anon + authenticated: PostgreSQL evaluates BOTH
-- sides of an OR in a policy USING clause, and the anon prescreen flow reads
-- through security_invoker views that may call these. Without EXECUTE the
-- profiles policy raises a permission error and the whole app 500s /
-- bounces users to /onboarding (see restore_rls_helper_function_execute.sql).
grant execute on function public.current_business_id()          to anon, authenticated, service_role;
grant execute on function public.current_business_member_ids()  to anon, authenticated, service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. CORE TENANT TABLES (guaranteed to exist per schema.sql)
-- ──────────────────────────────────────────────────────────────────────────

-- businesses -----------------------------------------------------------------
-- SELECT/UPDATE own business. INSERT is service-role only (onboarding runs
-- server-side via /api/onboarding); we deliberately drop any legacy INSERT /
-- FOR ALL policy so the surface stays minimal (businesses_legacy_policy_cleanup).
alter table public.businesses enable row level security;
drop policy if exists "Users see own business"      on public.businesses;
drop policy if exists "businesses_owner_insert"      on public.businesses;
drop policy if exists "businesses_owner_select"      on public.businesses;
drop policy if exists "businesses_owner_write"       on public.businesses;
create policy "businesses_owner_select" on public.businesses
  for select using (id = public.current_business_id());
create policy "businesses_owner_write" on public.businesses
  for update using (id = public.current_business_id())
  with check (id = public.current_business_id());

-- profiles -------------------------------------------------------------------
-- See self + teammates in same business; update only self. INSERT is done by
-- the handle_new_user() SECURITY DEFINER trigger (bypasses RLS), so no INSERT
-- policy is needed.
alter table public.profiles enable row level security;
drop policy if exists "Users manage own profile"                on public.profiles;
drop policy if exists "Users see teammate profiles"             on public.profiles;
drop policy if exists "profiles_self_or_same_business_select"   on public.profiles;
drop policy if exists "profiles_self_update"                    on public.profiles;
create policy "profiles_self_or_same_business_select" on public.profiles
  for select using (id = auth.uid() or business_id = public.current_business_id());
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- conversations --------------------------------------------------------------
-- Business-scoped read + write (app/api/conversations POST inserts via the
-- authenticated client; app/dashboard reads via it).
alter table public.conversations enable row level security;
drop policy if exists "Business sees own conversations"   on public.conversations;
drop policy if exists "conversations_business_select"      on public.conversations;
drop policy if exists "conversations_business_write"       on public.conversations;
create policy "conversations_business_select" on public.conversations
  for select using (business_id = public.current_business_id());
create policy "conversations_business_write" on public.conversations
  for all using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- messages -------------------------------------------------------------------
-- Reached through conversation -> business_id.
alter table public.messages enable row level security;
drop policy if exists "Business sees own messages"   on public.messages;
drop policy if exists "messages_business_select"      on public.messages;
drop policy if exists "messages_business_write"       on public.messages;
create policy "messages_business_select" on public.messages
  for select using (
    conversation_id in (select id from public.conversations
                        where business_id = public.current_business_id()));
create policy "messages_business_write" on public.messages
  for all using (
    conversation_id in (select id from public.conversations
                        where business_id = public.current_business_id()))
  with check (
    conversation_id in (select id from public.conversations
                        where business_id = public.current_business_id()));

-- documents ------------------------------------------------------------------
-- Business-scoped full CRUD. NOTE (decision 2): writes are member-permissive,
-- NOT owner-only, because app/api/documents/route.ts POST+DELETE run with the
-- authenticated (default 'member') client. Public /doc/[id] preview reads via
-- service role, so it is unaffected.
alter table public.documents enable row level security;
drop policy if exists "Business sees own documents"    on public.documents;
drop policy if exists "documents_business_select"       on public.documents;
drop policy if exists "documents_business_write"        on public.documents;
drop policy if exists "documents_business_insert"       on public.documents;
drop policy if exists "documents_business_update"       on public.documents;
drop policy if exists "documents_business_delete"       on public.documents;
create policy "documents_business_select" on public.documents
  for select using (business_id = public.current_business_id());
create policy "documents_business_insert" on public.documents
  for insert with check (business_id = public.current_business_id());
create policy "documents_business_update" on public.documents
  for update using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());
create policy "documents_business_delete" on public.documents
  for delete using (business_id = public.current_business_id());

-- ──────────────────────────────────────────────────────────────────────────
-- 2. KNOWLEDGE CORPUS (shared, read-only)
-- ──────────────────────────────────────────────────────────────────────────
-- Fair Work Act / NES / Modern Award chunks are public-domain and shared
-- across all tenants. Read to any signed-in user; writes are service-role.
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='knowledge_chunks') then
    execute 'alter table public.knowledge_chunks enable row level security';
    execute 'drop policy if exists "knowledge_chunks_auth_select" on public.knowledge_chunks';
    execute 'create policy "knowledge_chunks_auth_select" on public.knowledge_chunks
             for select using (auth.uid() is not null)';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. CV SCREENING (recruit)
-- ──────────────────────────────────────────────────────────────────────────
-- Reads happen via the authenticated client (dashboard cv-screening page +
-- Step1ScoreCvs browser component) scoped by business_id -> matched by the
-- SELECT policy. Writes/scoring run through supabaseAdmin, but we allow
-- business-scoped writes so any future authenticated write also works.
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='cv_screenings') then
    execute 'alter table public.cv_screenings enable row level security';
    execute 'drop policy if exists "cv_screenings_business_select" on public.cv_screenings';
    execute 'drop policy if exists "cv_screenings_business_write"  on public.cv_screenings';
    execute 'create policy "cv_screenings_business_select" on public.cv_screenings
             for select using (business_id = public.current_business_id())';
    execute 'create policy "cv_screenings_business_write" on public.cv_screenings
             for all using (business_id = public.current_business_id())
             with check (business_id = public.current_business_id())';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='cv_custom_rubrics') then
    execute 'alter table public.cv_custom_rubrics enable row level security';
    execute 'drop policy if exists "cv_custom_rubrics_business_select" on public.cv_custom_rubrics';
    execute 'drop policy if exists "cv_custom_rubrics_business_write"  on public.cv_custom_rubrics';
    execute 'create policy "cv_custom_rubrics_business_select" on public.cv_custom_rubrics
             for select using (business_id = public.current_business_id())';
    execute 'create policy "cv_custom_rubrics_business_write" on public.cv_custom_rubrics
             for all using (business_id = public.current_business_id())
             with check (business_id = public.current_business_id())';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. CAMPAIGNS (Campaign Coach)
-- ──────────────────────────────────────────────────────────────────────────
-- Business-scoped. Public careers pages read via service role, so RLS here
-- only affects the authenticated dashboard views.
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='campaigns') then
    execute 'alter table public.campaigns enable row level security';
    execute 'drop policy if exists "campaigns_business_select" on public.campaigns';
    execute 'drop policy if exists "campaigns_business_write"  on public.campaigns';
    execute 'create policy "campaigns_business_select" on public.campaigns
             for select using (business_id = public.current_business_id())';
    execute 'create policy "campaigns_business_write" on public.campaigns
             for all using (business_id = public.current_business_id())
             with check (business_id = public.current_business_id())';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. PRESCREEN CORE (created_by -> profiles.business_id chain)
-- ──────────────────────────────────────────────────────────────────────────
-- prescreen_sessions: business members read/update; authenticated users may
-- create their own (created_by = auth.uid()). Public candidate reads of a
-- single session go through service role, so no anon SELECT policy.
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='prescreen_sessions') then
    execute 'alter table public.prescreen_sessions enable row level security';
    execute 'drop policy if exists "Business sees own sessions"            on public.prescreen_sessions';
    execute 'drop policy if exists "Auth users create sessions"            on public.prescreen_sessions';
    execute 'drop policy if exists "Business updates own sessions"         on public.prescreen_sessions';
    execute 'drop policy if exists "prescreen_sessions_business_select"    on public.prescreen_sessions';
    execute 'drop policy if exists "prescreen_sessions_business_write"     on public.prescreen_sessions';
    execute 'drop policy if exists "prescreen_sessions_business_insert"    on public.prescreen_sessions';
    execute 'create policy "prescreen_sessions_business_select" on public.prescreen_sessions
             for select using (created_by in (select public.current_business_member_ids()))';
    execute 'create policy "prescreen_sessions_business_insert" on public.prescreen_sessions
             for insert with check (auth.uid() is not null and created_by = auth.uid())';
    execute 'create policy "prescreen_sessions_business_update" on public.prescreen_sessions
             for update using (created_by in (select public.current_business_member_ids()))
             with check (created_by in (select public.current_business_member_ids()))';
    execute 'create policy "prescreen_sessions_business_delete" on public.prescreen_sessions
             for delete using (created_by in (select public.current_business_member_ids()))';
  end if;
end $$;

-- prescreen_responses: business members read/update/delete via session chain.
-- INSERT is service-role only (anonymous candidate submission via admin) - no
-- anon insert policy.
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='prescreen_responses') then
    execute 'alter table public.prescreen_responses enable row level security';
    execute 'drop policy if exists "Business reads own responses"          on public.prescreen_responses';
    execute 'drop policy if exists "Business updates own responses"        on public.prescreen_responses';
    execute 'drop policy if exists "prescreen_responses_business_select"   on public.prescreen_responses';
    execute 'drop policy if exists "prescreen_responses_business_update"   on public.prescreen_responses';
    execute 'drop policy if exists "prescreen_responses_business_delete"   on public.prescreen_responses';
    execute 'create policy "prescreen_responses_business_select" on public.prescreen_responses
             for select using (session_id in (
               select id from public.prescreen_sessions
               where created_by in (select public.current_business_member_ids())))';
    execute 'create policy "prescreen_responses_business_update" on public.prescreen_responses
             for update using (session_id in (
               select id from public.prescreen_sessions
               where created_by in (select public.current_business_member_ids())))';
    execute 'create policy "prescreen_responses_business_delete" on public.prescreen_responses
             for delete using (session_id in (
               select id from public.prescreen_sessions
               where created_by in (select public.current_business_member_ids())))';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. PRESCREEN DERIVATIVES (response_id -> response -> session -> created_by)
-- ──────────────────────────────────────────────────────────────────────────
-- All of these: business members SELECT via the response chain; INSERT/UPDATE/
-- DELETE are service-role only (transcribe / score / share / outcome routes
-- all use supabaseAdmin). One helper loop keeps the SELECT policy shape
-- identical across every table that keys on response_id.
do $$
declare
  t text;
  response_tables text[] := array[
    'prescreen_transcripts',
    'prescreen_evaluations',
    'prescreen_scoring_audit',
    'prescreen_recommendations',
    'prescreen_notes',
    'prescreen_outcome_events',
    'prescreen_interview_bookings'
  ];
begin
  foreach t in array response_tables loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', t||'_business_select', t);
      execute format($f$
        create policy %I on public.%I
          for select using (
            response_id in (
              select pr.id
              from public.prescreen_responses pr
              join public.prescreen_sessions  ps on ps.id = pr.session_id
              where ps.created_by in (select public.current_business_member_ids())))
      $f$, t||'_business_select', t);
    end if;
  end loop;
end $$;

-- prescreen_share_links: keyed on response_id (same chain as above).
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='prescreen_share_links') then
    execute 'alter table public.prescreen_share_links enable row level security';
    execute 'drop policy if exists "prescreen_share_links_business_select" on public.prescreen_share_links';
    execute 'create policy "prescreen_share_links_business_select" on public.prescreen_share_links
             for select using (
               response_id in (
                 select pr.id from public.prescreen_responses pr
                 join public.prescreen_sessions ps on ps.id = pr.session_id
                 where ps.created_by in (select public.current_business_member_ids())))';
  end if;
end $$;

-- prescreen_share_views: keyed on link_id -> share_link -> response -> session.
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='prescreen_share_views')
     and exists (select 1 from pg_tables where schemaname='public' and tablename='prescreen_share_links') then
    execute 'alter table public.prescreen_share_views enable row level security';
    execute 'drop policy if exists "prescreen_share_views_business_select" on public.prescreen_share_views';
    execute 'create policy "prescreen_share_views_business_select" on public.prescreen_share_views
             for select using (
               link_id in (
                 select psl.id from public.prescreen_share_links psl
                 join public.prescreen_responses pr on pr.id = psl.response_id
                 join public.prescreen_sessions  ps on ps.id = pr.session_id
                 where ps.created_by in (select public.current_business_member_ids())))';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 7. CREDITS
-- ──────────────────────────────────────────────────────────────────────────
-- Read-only to the owning business; all mutations are service-role (Stripe
-- webhook + lib/credits.ts server paths).
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='credit_ledger') then
    execute 'alter table public.credit_ledger enable row level security';
    execute 'drop policy if exists "credit_ledger_business_select" on public.credit_ledger';
    execute 'create policy "credit_ledger_business_select" on public.credit_ledger
             for select using (business_id = public.current_business_id())';
  end if;
  if exists (select 1 from pg_tables where schemaname='public' and tablename='credit_allocations') then
    execute 'alter table public.credit_allocations enable row level security';
    execute 'drop policy if exists "credit_allocations_business_select" on public.credit_allocations';
    execute 'create policy "credit_allocations_business_select" on public.credit_allocations
             for select using (business_id = public.current_business_id())';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 8. AI ADMINISTRATOR INGESTS
-- ──────────────────────────────────────────────────────────────────────────
-- Contains parsed resume/contract PII. Business members read/insert/delete
-- their own; UPDATE is not exposed (ingests are immutable append records).
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='administrator_ingests') then
    execute 'alter table public.administrator_ingests enable row level security';
    execute 'drop policy if exists "administrator_ingests_business_select" on public.administrator_ingests';
    execute 'drop policy if exists "administrator_ingests_business_insert" on public.administrator_ingests';
    execute 'drop policy if exists "administrator_ingests_business_delete" on public.administrator_ingests';
    execute 'create policy "administrator_ingests_business_select" on public.administrator_ingests
             for select using (business_id = public.current_business_id())';
    execute 'create policy "administrator_ingests_business_insert" on public.administrator_ingests
             for insert with check (business_id = public.current_business_id())';
    execute 'create policy "administrator_ingests_business_delete" on public.administrator_ingests
             for delete using (business_id = public.current_business_id())';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 9. TELEMETRY / FEEDBACK (read-only to owning business; service-role writes)
-- ──────────────────────────────────────────────────────────────────────────
-- These tables carry business_id and are written only by server-side
-- telemetry paths (service role). Expose a business-scoped SELECT so a
-- business can see its own analytics; deny anon.
do $$
declare
  t text;
  telem_tables text[] := array[
    'chat_audit_log',
    'chat_telemetry',
    'coach_field_edits',
    'cv_screening_outputs'
  ];
begin
  foreach t in array telem_tables loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', t||'_business_select', t);
      execute format('create policy %I on public.%I
                      for select using (business_id = public.current_business_id())',
                     t||'_business_select', t);
    end if;
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 10. FOUNDER-ONLY / SERVICE-ROLE-ONLY CAPTURE TABLES (default-deny)
-- ──────────────────────────────────────────────────────────────────────────
-- RLS ON with NO tenant policy => anon + authenticated are fully denied.
-- Service role bypasses RLS and is the only reader/writer. privacy_requests
-- additionally gets an explicit deny-all SELECT policy for clarity.
do $$
declare
  t text;
  founder_tables text[] := array[
    'enterprise_inquiries',
    'privacy_requests',
    'marketplace_reservations',
    'funnel_events'
  ];
begin
  foreach t in array founder_tables loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;

  if exists (select 1 from pg_tables where schemaname='public' and tablename='privacy_requests') then
    execute 'drop policy if exists "privacy_requests_no_anon" on public.privacy_requests';
    execute 'create policy "privacy_requests_no_anon" on public.privacy_requests
             for select using (false)';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 11. SECURITY-INVOKER VIEWS (honour caller RLS, do not bypass it)
-- ──────────────────────────────────────────────────────────────────────────
-- Views over RLS-hardened base tables must run as the invoker, else they
-- leak rows past the policies (Supabase advisor: Security Definer View).
do $$
declare
  v text;
  inv_views text[] := array['candidate_responses','active_prescreen_sessions'];
begin
  foreach v in array inv_views loop
    if exists (select 1 from pg_views where schemaname='public' and viewname=v) then
      execute format('alter view public.%I set (security_invoker = true)', v);
    end if;
  end loop;

  -- admin_overview: invoker + lock to service role (created outside migrations).
  if exists (select 1 from pg_views where schemaname='public' and viewname='admin_overview') then
    execute 'alter view public.admin_overview set (security_invoker = true)';
    execute 'revoke all on public.admin_overview from anon';
    execute 'revoke all on public.admin_overview from authenticated';
    execute 'grant select on public.admin_overview to service_role';
  end if;
end $$;

commit;

-- ──────────────────────────────────────────────────────────────────────────
-- 12. Reload PostgREST schema cache so the API picks up the new policies.
-- ──────────────────────────────────────────────────────────────────────────
notify pgrst, 'reload schema';

-- ============================================================================
-- POST-APPLY CROSS-TENANT PROBES (run signed in as a non-owner member of one
-- business; every probe must return 0):
--   select count(*) from documents           where business_id <> public.current_business_id();
--   select count(*) from cv_screenings        where business_id <> public.current_business_id();
--   select count(*) from campaigns            where business_id <> public.current_business_id();
--   select count(*) from prescreen_sessions   where created_by not in (select public.current_business_member_ids());
--   select count(*) from enterprise_inquiries;   -- expect 0 (founder-only)
-- If any probe returns > 0, HALT and run 2026-07-14_rls_rollback.sql.
-- ============================================================================
