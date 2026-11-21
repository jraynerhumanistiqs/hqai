-- ============================================================================
-- HQ Performance (PPAD) - 0 of 4: prerequisites for a FRESH dev project
-- ----------------------------------------------------------------------------
-- RUN THIS FIRST, AND ONLY ON A NEW DEV PROJECT.
--
-- The PPAD migrations key on businesses(id) and read profiles.business_id. A
-- brand new Supabase project has neither, so ppad_01_schema.sql would fail on
-- its first foreign key. This creates the minimum PPAD needs.
--
-- It is NOT a clone of production. supabase/schema.sql is the real
-- definition and carries far more columns; this is trimmed to what PPAD
-- touches plus the handful the dashboard shell reads to let you sign in.
-- Every statement is `if not exists`, so running it against a project that
-- already has the real schema changes nothing.
--
-- DO NOT RUN THIS ON PRODUCTION. It would do nothing there, but the habit is
-- the problem: this file exists so a dev project can be stood up from
-- scratch, and production already has the real thing.
-- ============================================================================

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  industry text,
  state text,
  -- Read by the dashboard layout's paywall check. A dev business needs
  -- subscription_status 'active' (or a stripe_subscription_id) or the layout
  -- bounces you to /onboarding before you ever reach the tool.
  plan text default 'growth',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'trialing',
  advisor_name text default 'Sarah',
  advisor_email text
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  business_id uuid references businesses(id),
  full_name text,
  email text,
  role text default 'owner'
);

alter table businesses enable row level security;
alter table profiles   enable row level security;

-- Minimal policies so a signed-in user can read their own profile and their
-- own business. Production has richer policies; these are only here so the
-- dev dashboard can boot.
drop policy if exists dev_profiles_self on profiles;
create policy dev_profiles_self on profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists dev_businesses_own on businesses;
create policy dev_businesses_own on businesses for select to authenticated
  using (id = (select business_id from profiles where id = auth.uid()));

grant select on businesses, profiles to authenticated;
