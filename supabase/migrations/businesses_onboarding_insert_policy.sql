-- ============================================================================
-- businesses: add INSERT policy so first-time signup can create their business
-- ----------------------------------------------------------------------------
-- Bug report (Bianca, internal pilot tester, 2026-05-21):
--   "Could not save business details: new row violates row-level security
--    policy table 'businesses'"
--
-- Root cause:
--   rls_extend_prescreen_and_core.sql created businesses_owner_select and
--   businesses_owner_write (UPDATE) policies, but no INSERT policy. The
--   onboarding wizard (app/onboarding/page.tsx) does a client-side
--   `supabase.from('businesses').insert(...)` with the user's anon session,
--   which RLS rejects because no policy permits INSERT.
--
--   It's a chicken-and-egg: at onboarding time profiles.business_id is NULL,
--   so public.current_business_id() returns NULL, so the user can't satisfy
--   any business_id-based check.
--
-- Fix:
--   Allow an authenticated user to INSERT into businesses ONLY if they do
--   not already have a business linked on their profile. That covers the
--   first-business-on-signup case and blocks any later "create extra
--   business" attempt (which would currently break the rest of the app's
--   single-business assumption anyway).
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste + run. Idempotent.
-- ============================================================================

drop policy if exists "businesses_owner_insert" on public.businesses;
create policy "businesses_owner_insert" on public.businesses
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and not exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and business_id is not null
    )
  );

-- Sanity check (read-only): list current businesses policies. Should now
-- show three policies: owner_select, owner_write, owner_insert.
--
--   select policyname, cmd
--   from   pg_policies
--   where  schemaname = 'public' and tablename = 'businesses'
--   order  by policyname;
