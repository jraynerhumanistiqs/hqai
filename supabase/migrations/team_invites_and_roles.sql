-- HQ People - phase 2b: the team. Invites, owner/admin roles, scoped admin
-- access, and the reporting line that makes "User's Team Only" mean something.
--
-- Decisions (owner):
--   - Roles: owner (existing default) and admin. Admin = everything except
--     billing and role management. Only the owner grants or revokes.
--   - Admin access is scoped per employee: all / a selected list / "their
--     team" (the people who report to them). The reporting line lives on the
--     register (employees.reports_to), and a login is tied to its own register
--     entry (employees.profile_id) so we know who "they" are.
--   - Invites by email; accept-to-join a business with the role and scope the
--     owner chose.
--
-- Access is enforced in RLS via SECURITY DEFINER helpers (they read profiles
-- and employees without re-triggering RLS, which avoids policy recursion).
-- The API routes check roles too, but the database is the boundary.
--
-- No CHECK constraint is added to profiles.role: the live database may hold
-- legacy values (e.g. test roles), and a constraint would fail the migration.
-- Role semantics are enforced by the helper functions below instead.
--
-- Additive and idempotent.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Register: reporting line + link to a login
-- ---------------------------------------------------------------------------
alter table public.employees
  add column if not exists reports_to uuid references public.employees(id) on delete set null;
alter table public.employees
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

comment on column public.employees.reports_to is 'The employee this person reports to. Drives the "User''s Team Only" admin scope.';
comment on column public.employees.profile_id is 'The login (profile) that is this person, if they use HQ.ai. Lets an admin''s "team" be resolved.';

create index if not exists employees_reports_to_idx on public.employees (reports_to);
create unique index if not exists employees_profile_uidx
  on public.employees (business_id, profile_id) where profile_id is not null;

-- ---------------------------------------------------------------------------
-- Profiles: admin scope mode
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists admin_scope text not null default 'all';
-- values: 'all' | 'selected' | 'team'  (only meaningful when role = 'admin')

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------
create table if not exists public.business_invites (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  email              text not null,
  role               text not null default 'admin' check (role in ('admin','member')),
  admin_scope        text not null default 'all' check (admin_scope in ('all','selected','team')),
  scope_employee_ids uuid[] not null default '{}',
  token              text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by         uuid references public.profiles(id) on delete set null,
  expires_at         timestamptz not null default now() + interval '7 days',
  accepted_at        timestamptz,
  accepted_by        uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now()
);
comment on table public.business_invites is 'Email invites to join a business with a role and admin scope. Accepted server-side by token.';
create index if not exists business_invites_business_idx on public.business_invites (business_id, created_at desc);
create index if not exists business_invites_email_idx    on public.business_invites (lower(email));

-- ---------------------------------------------------------------------------
-- Admin scopes: which employees a "selected" admin can access
-- ---------------------------------------------------------------------------
create table if not exists public.admin_scopes (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (profile_id, employee_id)
);
create index if not exists admin_scopes_business_idx on public.admin_scopes (business_id, profile_id);

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER - no RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_business_owner()
returns boolean language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

create or replace function public.can_manage_records()
returns boolean language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','admin'));
$$;

-- The one that matters: may the caller see/touch this employee's record?
create or replace function public.can_access_employee(p_employee uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  with me as (
    select p.id, p.business_id, p.role, p.admin_scope
    from public.profiles p where p.id = auth.uid()
  ),
  e as (
    select x.id, x.business_id, x.reports_to
    from public.employees x where x.id = p_employee
  ),
  mine as (
    -- the caller's own register entry, if linked
    select x.id from public.employees x, me
    where x.profile_id = me.id and x.business_id = me.business_id
    limit 1
  )
  select coalesce((
    select case
      when me.business_id is null or e.business_id is null or me.business_id <> e.business_id then false
      when me.role = 'owner' then true
      when me.role <> 'admin' then false
      when me.admin_scope = 'all' then true
      when me.admin_scope = 'selected' then
        exists (select 1 from public.admin_scopes s where s.profile_id = me.id and s.employee_id = e.id)
      when me.admin_scope = 'team' then
        e.id = (select id from mine) or e.reports_to = (select id from mine)
      else false
    end
    from me, e
  ), false);
$$;

create or replace function public.business_headcount()
returns integer language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select count(*)::int from public.employees
  where business_id = public.current_business_id() and status = 'active';
$$;

grant execute on function public.is_business_owner()            to anon, authenticated, service_role;
grant execute on function public.can_manage_records()           to anon, authenticated, service_role;
grant execute on function public.can_access_employee(uuid)      to anon, authenticated, service_role;
grant execute on function public.business_headcount()           to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS: employees + compliance_events now respect role and scope
-- ---------------------------------------------------------------------------
drop policy if exists "employees_business_select" on public.employees;
create policy "employees_business_select" on public.employees
  for select using (business_id = public.current_business_id() and public.can_access_employee(id));

drop policy if exists "employees_business_insert" on public.employees;
create policy "employees_business_insert" on public.employees
  for insert with check (business_id = public.current_business_id() and public.can_manage_records());

drop policy if exists "employees_business_update" on public.employees;
create policy "employees_business_update" on public.employees
  for update using (business_id = public.current_business_id() and public.can_access_employee(id))
  with check (business_id = public.current_business_id());

drop policy if exists "employees_business_delete" on public.employees;
create policy "employees_business_delete" on public.employees
  for delete using (business_id = public.current_business_id() and public.can_access_employee(id));

drop policy if exists "compliance_events_business_select" on public.compliance_events;
create policy "compliance_events_business_select" on public.compliance_events
  for select using (
    business_id = public.current_business_id()
    and ((employee_id is null and public.can_manage_records()) or public.can_access_employee(employee_id))
  );

drop policy if exists "compliance_events_business_insert" on public.compliance_events;
create policy "compliance_events_business_insert" on public.compliance_events
  for insert with check (
    business_id = public.current_business_id()
    and ((employee_id is null and public.can_manage_records()) or public.can_access_employee(employee_id))
  );

drop policy if exists "compliance_events_business_delete" on public.compliance_events;
create policy "compliance_events_business_delete" on public.compliance_events
  for delete using (
    business_id = public.current_business_id()
    and ((employee_id is null and public.can_manage_records()) or public.can_access_employee(employee_id))
  );

-- ---------------------------------------------------------------------------
-- RLS: invites and scopes (owner-managed; accept runs server-side)
-- ---------------------------------------------------------------------------
alter table public.business_invites enable row level security;
alter table public.admin_scopes     enable row level security;

drop policy if exists "invites_owner_all" on public.business_invites;
create policy "invites_owner_all" on public.business_invites
  for all using (business_id = public.current_business_id() and public.is_business_owner())
  with check (business_id = public.current_business_id() and public.is_business_owner());

drop policy if exists "scopes_owner_all" on public.admin_scopes;
create policy "scopes_owner_all" on public.admin_scopes
  for all using (business_id = public.current_business_id() and public.is_business_owner())
  with check (business_id = public.current_business_id() and public.is_business_owner());

drop policy if exists "scopes_self_select" on public.admin_scopes;
create policy "scopes_self_select" on public.admin_scopes
  for select using (profile_id = auth.uid());
