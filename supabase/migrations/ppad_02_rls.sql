-- ============================================================================
-- HQ Performance (PPAD) - 2 of 3: helper functions and RLS
-- ----------------------------------------------------------------------------
-- APPLY AFTER ppad_01_schema.sql. Idempotent - safe to re-run.
--
-- THE RULE THIS FILE ENFORCES
--   Nobody reads a performance record unless they are its subject or hold a
--   live allocation to that person. Not managers-by-title, not team leads,
--   not admins. Allocation is the only grant.
--
--   Admins are deliberately NOT exempt. An admin who wants to read a record
--   must allocate themselves to that person, and ppad_set_allocation writes
--   a self_allocation audit entry when they do.
--
-- WHY SECURITY DEFINER HELPERS
--   A policy on ppad_records that reads ppad_allocations would re-enter RLS
--   on ppad_allocations and recurse. The helpers run as definer so the lookup
--   is a plain read, and each is STABLE so the planner calls it once per
--   statement rather than per row.
--
--   Each pins search_path (lint 0011, function_search_path_mutable) and has
--   EXECUTE revoked from anon/authenticated (lints 0028/0029) - they exist
--   for policies, not for /rest/v1/rpc. Policies run as the policy owner, so
--   revoking does not break them. Same pattern as
--   supabase/migrations/security_function_hardening.sql.
--
-- WRITES
--   ppad_records has NO insert/update/delete policy at all. Every write goes
--   through ppad_save_record in 03, which is the only place the field-level
--   matrix exists. Same for allocations and membership: admin-only RPCs, so
--   every change is audited.
--
-- HOW TO ROLL BACK
--   alter table <t> disable row level security;  -- per table
--   drop function if exists ppad_is_admin(uuid), ...;
-- ============================================================================

-- ── 1. Helpers ─────────────────────────────────────────────────────────────

-- The caller's business. One row per user in profiles; null if they have none
-- (which makes every policy below false, the safe default).
create or replace function public.ppad_business_id()
returns uuid
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select business_id from public.profiles where id = auth.uid();
$$;

create or replace function public.ppad_is_member(p_business uuid)
returns boolean
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists (
    select 1 from public.ppad_members m
    where m.business_id = p_business
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.ppad_is_admin(p_business uuid)
returns boolean
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists (
    select 1 from public.ppad_members m
    where m.business_id = p_business
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.is_admin
  );
$$;

create or replace function public.ppad_is_hr_reporting(p_business uuid)
returns boolean
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists (
    select 1 from public.ppad_members m
    where m.business_id = p_business
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.is_hr_reporting
  );
$$;

-- Is the caller the subject of this person row?
create or replace function public.ppad_is_self(p_business uuid, p_person text)
returns boolean
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists (
    select 1 from public.ppad_people p
    where p.business_id = p_business
      and p.person_id = p_person
      and p.user_id = auth.uid()
  );
$$;

-- Does the caller hold a LIVE allocation of this type to this person?
-- p_type null means "either kind".
create or replace function public.ppad_is_allocated(p_business uuid, p_person text, p_type text default null)
returns boolean
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists (
    select 1 from public.ppad_allocations a
    where a.business_id = p_business
      and a.person_id = p_person
      and a.allocated_user_id = auth.uid()
      and a.ended_at is null
      and (p_type is null or a.type = p_type)
  );
$$;

-- Convenience used by the record policy: self OR any live allocation.
create or replace function public.ppad_can_read_record(p_business uuid, p_person text)
returns boolean
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select public.ppad_is_self(p_business, p_person)
      or public.ppad_is_allocated(p_business, p_person, null);
$$;

-- Start from nothing on all of them.
revoke execute on function
  public.ppad_business_id(),
  public.ppad_is_member(uuid),
  public.ppad_is_admin(uuid),
  public.ppad_is_hr_reporting(uuid),
  public.ppad_is_self(uuid, text),
  public.ppad_is_allocated(uuid, text, text),
  public.ppad_can_read_record(uuid, text)
from public, anon, authenticated;

-- ...then grant back the five that POLICIES reference.
--
-- This corrects an assumption stated in security_function_hardening.sql,
-- which says "RLS policies that call these functions run as the policy
-- owner, not as anon/authenticated". They do not. A policy expression is
-- evaluated with the privileges of the user running the query, so revoking
-- EXECUTE from authenticated makes every policy that calls the function fail
-- with "permission denied for function ..." - which reads like a privilege
-- bug on the TABLE and is genuinely hard to spot. Verified against the real
-- policies in tests/ppad/access-matrix.mjs.
--
-- Exposing them is not a leak. Each answers a question about the CALLER and
-- nobody else: ppad_is_admin tells you whether YOU are an admin, and
-- ppad_is_allocated whether YOU hold an allocation. Neither takes a user id.
--
-- ppad_business_id and ppad_is_self stay revoked: they are only ever called
-- from inside SECURITY DEFINER functions, which run as the definer and so
-- need no grant to the caller.
grant execute on function
  public.ppad_is_member(uuid),
  public.ppad_is_admin(uuid),
  public.ppad_is_hr_reporting(uuid),
  public.ppad_is_allocated(uuid, text, text),
  public.ppad_can_read_record(uuid, text)
to authenticated;

-- ── 2. RLS on, every table ─────────────────────────────────────────────────
alter table ppad_members                enable row level security;
alter table ppad_org_config             enable row level security;
alter table ppad_position_descriptions  enable row level security;
alter table ppad_people                 enable row level security;
alter table ppad_records                enable row level security;
alter table ppad_allocations            enable row level security;
alter table ppad_audit_log              enable row level security;

-- Force RLS for the table owner too, so a definer function that forgets to
-- scope its query cannot quietly read across businesses.
alter table ppad_records   force row level security;
alter table ppad_people    force row level security;
alter table ppad_audit_log force row level security;

-- Privileges, stated explicitly rather than inherited.
--
-- Supabase grants ALL on new public tables to anon and authenticated by
-- default, so a migration that only writes policies is silently depending on
-- that default. Spelled out here instead: revoke everything, then grant back
-- exactly what each role needs. RLS then narrows it per row.
--
-- Two layers, deliberately. A policy mistake alone cannot make ppad_records
-- writable from the browser, because authenticated has no INSERT, UPDATE or
-- DELETE privilege on it at all.
revoke all on ppad_members, ppad_org_config, ppad_position_descriptions,
              ppad_people, ppad_records, ppad_allocations, ppad_audit_log
from anon, authenticated;

-- Read-only to the browser. Every write is an RPC.
grant select on ppad_records, ppad_allocations, ppad_audit_log, ppad_members
  to authenticated;

-- Admin-writable through the policies above.
grant select, insert, update, delete
  on ppad_org_config, ppad_position_descriptions, ppad_people
  to authenticated;

-- Nothing for anon, ever. Left with no privileges at all by the revoke above.

-- ── 3. Policies ────────────────────────────────────────────────────────────
-- Dropped first so the file is re-runnable.

-- MEMBERS: admins see the whole roster; everyone else sees only their own row
-- (the app needs it to know whether to show admin UI).
drop policy if exists ppad_members_select on ppad_members;
create policy ppad_members_select on ppad_members for select to authenticated
  using (ppad_is_admin(business_id) or user_id = auth.uid());
-- Writes: ppad_set_member only. No policy = no direct write.

-- ORG CONFIG: every member reads it. It is the framework, the cycles and the
-- branding - an employee cannot render their own record without it. Nothing
-- in it is personal.
drop policy if exists ppad_org_config_select on ppad_org_config;
create policy ppad_org_config_select on ppad_org_config for select to authenticated
  using (ppad_is_member(business_id));

drop policy if exists ppad_org_config_write on ppad_org_config;
create policy ppad_org_config_write on ppad_org_config for all to authenticated
  using (ppad_is_admin(business_id))
  with check (ppad_is_admin(business_id));

-- POSITION DESCRIPTIONS: every member reads (a PD is the role's own
-- definition and employees are told to review it during planning).
-- Admin-only to write - one PD drives the targets for everyone in that role,
-- so a manager editing one would change records they cannot see.
drop policy if exists ppad_pds_select on ppad_position_descriptions;
create policy ppad_pds_select on ppad_position_descriptions for select to authenticated
  using (ppad_is_member(business_id) and deleted_at is null);

drop policy if exists ppad_pds_write on ppad_position_descriptions;
create policy ppad_pds_write on ppad_position_descriptions for all to authenticated
  using (ppad_is_admin(business_id))
  with check (ppad_is_admin(business_id));

-- PEOPLE (directory): admins and the HR reporting role see everyone;
-- everyone else sees themselves plus the people allocated to them.
drop policy if exists ppad_people_select on ppad_people;
create policy ppad_people_select on ppad_people for select to authenticated
  using (
    deleted_at is null
    and (
      ppad_is_admin(business_id)
      or ppad_is_hr_reporting(business_id)
      or user_id = auth.uid()
      or ppad_is_allocated(business_id, person_id, null)
    )
  );

drop policy if exists ppad_people_write on ppad_people;
create policy ppad_people_write on ppad_people for all to authenticated
  using (ppad_is_admin(business_id))
  with check (ppad_is_admin(business_id));

-- RECORDS: the whole point of the exercise.
--
-- SELECT only. There is no insert, update or delete policy on this table by
-- design - ppad_save_record is the only writer, and it is the only place the
-- field-level matrix lives. A browser with the anon key cannot write here at
-- all, whatever it sends.
--
-- Note what is absent: no admin clause, and no HR reporting clause. An admin
-- reads a record by allocating themselves, which is audited. HR reporting
-- reads ratings through ppad_report_summary, which returns scores and never
-- comments.
drop policy if exists ppad_records_select on ppad_records;
create policy ppad_records_select on ppad_records for select to authenticated
  using (ppad_can_read_record(business_id, person_id));

-- ALLOCATIONS: admins see the full history including ended ones; everyone
-- else sees the allocations they personally hold.
drop policy if exists ppad_allocations_select on ppad_allocations;
create policy ppad_allocations_select on ppad_allocations for select to authenticated
  using (ppad_is_admin(business_id) or allocated_user_id = auth.uid());
-- Writes: ppad_set_allocation / ppad_end_allocation only.

-- AUDIT LOG: admins read, nobody writes from the browser. The RPCs insert as
-- definer. Revoking the privileges as well as omitting the policies means an
-- append-only table even if a policy is added by mistake later.
drop policy if exists ppad_audit_select on ppad_audit_log;
create policy ppad_audit_select on ppad_audit_log for select to authenticated
  using (ppad_is_admin(business_id));

-- Belt and braces: the audit log is append-only even if a policy is added
revoke insert, update, delete on ppad_audit_log from authenticated;
revoke update, delete on ppad_records from authenticated;
revoke insert on ppad_records from authenticated;
