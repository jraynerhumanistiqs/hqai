-- ============================================================================
-- businesses: retire the legacy "Users see own business" FOR ALL policy
-- ----------------------------------------------------------------------------
-- The original schema.sql created a single FOR ALL policy on businesses:
--
--   create policy "Users see own business" on businesses for all
--     using (id = (select business_id from profiles where id = auth.uid()));
--
-- A later migration (rls_extend_prescreen_and_core.sql) added the cleaner
-- pair businesses_owner_select + businesses_owner_write but did NOT drop
-- the original. The two co-exist today, which is harmless for SELECT but
-- means any INSERT into businesses is evaluated against BOTH policies.
--
-- During onboarding the user's profile.business_id is still NULL, so the
-- legacy policy's USING/CHECK reduces to `id = NULL` -> NULL -> not true.
-- PostgreSQL OR-combines permissive policies, so this alone is not the
-- root cause of Bianca's "row violates RLS" error - but it is fragile
-- noise and a likely contributor to confusing later migrations.
--
-- Onboarding inserts now route through /api/onboarding using the
-- service-role admin client (bypasses RLS entirely), so this cleanup is
-- belt-and-braces: keep the policy surface on businesses minimal and
-- predictable for the remaining user-facing reads/updates.
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste + run. Idempotent.
-- ============================================================================

drop policy if exists "Users see own business" on public.businesses;

-- Re-confirm the canonical pair is in place. These are no-ops if
-- rls_extend_prescreen_and_core.sql has been applied; here as a
-- safety net in case this file is run before that one.
drop policy if exists "businesses_owner_select" on public.businesses;
create policy "businesses_owner_select" on public.businesses
  for select
  using (id = public.current_business_id());

drop policy if exists "businesses_owner_write" on public.businesses;
create policy "businesses_owner_write" on public.businesses
  for update
  using (id = public.current_business_id())
  with check (id = public.current_business_id());

-- Note: there is intentionally no INSERT policy on businesses now -
-- new businesses are created server-side via /api/onboarding using the
-- service-role client. This is the correct architectural pattern for
-- privileged one-shot setup operations and removes a whole class of
-- chicken-and-egg RLS races.

-- Sanity check (read-only):
--   select policyname, cmd
--   from   pg_policies
--   where  schemaname = 'public' and tablename = 'businesses'
--   order  by policyname;
-- Expected: businesses_owner_select, businesses_owner_write (2 rows).
