-- ============================================================================
-- HQ Performance (PPAD) - 4 of 4: admin screen support
-- ----------------------------------------------------------------------------
-- APPLY AFTER ppad_03_rpcs.sql. Idempotent.
--
-- WHY THESE EXIST
--   The "Users and access" screen has to show a roster: who is a member, what
--   they can do, which person they are linked to. None of that is readable
--   from the browser today and that is deliberate -
--
--     ppad_members carries only user_id, no name or email.
--     profiles is readable by `id = auth.uid()` only, so one user cannot
--     read another's name - correct, and it means the roster cannot be
--     assembled client-side.
--     auth.users is not exposed to PostgREST at all.
--
--   Rather than loosen any of that, two admin-only SECURITY DEFINER
--   functions return exactly the columns the screen needs and nothing else.
--   An admin learns the names and emails of people in their own business,
--   which they already know, and no performance data travels with it.
--
-- HOW TO ROLL BACK
--   drop function if exists ppad_list_members(), ppad_list_allocations();
-- ============================================================================

-- ── Roster ─────────────────────────────────────────────────────────────────
create or replace function public.ppad_list_members()
returns table (
  user_id uuid, email text, name text,
  is_admin boolean, is_hr_reporting boolean, status text,
  person_id text, person_name text
)
language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_biz uuid := ppad_business_id();
begin
  if v_biz is null or not ppad_is_admin(v_biz) then
    raise exception 'ppad: admin only' using errcode = '42501';
  end if;

  return query
  select
    m.user_id,
    u.email::text,
    coalesce(pr.full_name, '')::text,
    m.is_admin,
    m.is_hr_reporting,
    m.status,
    pe.person_id,
    case when pe.person_id is null then null
         else trim(coalesce(pe.profile->>'first','') || ' ' || coalesce(pe.profile->>'last','')) end
  from public.ppad_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles pr on pr.id = m.user_id
  left join public.ppad_people pe
    on pe.business_id = m.business_id and pe.user_id = m.user_id and pe.deleted_at is null
  where m.business_id = v_biz
  order by m.is_admin desc, 3, 2;
end;
$$;

-- ── Allocation history ─────────────────────────────────────────────────────
--
-- RLS already lets an admin select ppad_allocations, but the raw rows carry
-- user ids and person ids and nothing a human can read. This is the same
-- rows with names attached, ended ones included - the history is the point,
-- which is why allocations are never hard-deleted.
create or replace function public.ppad_list_allocations(p_include_ended boolean default true)
returns table (
  id uuid, person_id text, person_name text,
  allocated_user_id uuid, allocated_name text, allocated_email text,
  type text, created_at timestamptz, ended_at timestamptz
)
language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_biz uuid := ppad_business_id();
begin
  if v_biz is null or not ppad_is_admin(v_biz) then
    raise exception 'ppad: admin only' using errcode = '42501';
  end if;

  return query
  select
    a.id, a.person_id,
    trim(coalesce(pe.profile->>'first','') || ' ' || coalesce(pe.profile->>'last',''))::text,
    a.allocated_user_id,
    coalesce(pr.full_name, '')::text,
    u.email::text,
    a.type, a.created_at, a.ended_at
  from public.ppad_allocations a
  left join public.ppad_people pe
    on pe.business_id = a.business_id and pe.person_id = a.person_id
  left join public.profiles pr on pr.id = a.allocated_user_id
  left join auth.users u on u.id = a.allocated_user_id
  where a.business_id = v_biz
    and (p_include_ended or a.ended_at is null)
  order by a.ended_at nulls first, a.created_at desc;
end;
$$;

-- ── Link a login to a person ───────────────────────────────────────────────
--
-- Separate from ppad_set_member because it is a different decision with a
-- different blast radius: linking a user to a person is what makes that
-- person's record THEIR record, visible to them forever after.
--
-- Pass p_person_id null to unlink.
create or replace function public.ppad_link_person(p_user_id uuid, p_person_id text)
returns void
language plpgsql volatile security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  v_biz uuid := ppad_business_id();
  v_was text;
begin
  if v_biz is null or not ppad_is_admin(v_biz) then
    raise exception 'ppad: admin only' using errcode = '42501';
  end if;
  if not exists (select 1 from public.ppad_members
                  where business_id = v_biz and user_id = p_user_id and status = 'active') then
    raise exception 'ppad: that user is not an active member of this organisation';
  end if;

  select person_id into v_was from public.ppad_people
   where business_id = v_biz and user_id = p_user_id and deleted_at is null;

  -- One login per person and one person per login. Clear the old link first
  -- so re-linking does not trip the unique constraint.
  update public.ppad_people set user_id = null, updated_at = now(), updated_by = auth.uid()
   where business_id = v_biz and user_id = p_user_id;

  if p_person_id is not null then
    if not exists (select 1 from public.ppad_people
                    where business_id = v_biz and person_id = p_person_id and deleted_at is null) then
      raise exception 'ppad: no such person in this organisation';
    end if;
    update public.ppad_people
       set user_id = p_user_id, updated_at = now(), updated_by = auth.uid()
     where business_id = v_biz and person_id = p_person_id;
  end if;

  perform ppad_audit(v_biz, 'person.link', 'person', coalesce(p_person_id, v_was),
    jsonb_build_object('user_id', p_user_id, 'from', v_was, 'to', p_person_id));
end;
$$;

revoke execute on function
  public.ppad_list_members(), public.ppad_list_allocations(boolean), public.ppad_link_person(uuid, text)
from public, anon;

grant execute on function
  public.ppad_list_members(), public.ppad_list_allocations(boolean), public.ppad_link_person(uuid, text)
to authenticated;
