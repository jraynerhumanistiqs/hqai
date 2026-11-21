-- ============================================================================
-- HQ Performance (PPAD) - 5: manager ratings are withheld until sign-off
-- ----------------------------------------------------------------------------
-- APPLY AFTER ppad_04_admin_rpcs.sql. Idempotent.
--
-- THE DECISION THIS IMPLEMENTS
--   "Can employees see manager ratings and comments before the assessment is
--   finalised? -> Only after manager sign-off."
--
--   Until now that was not enforced anywhere. An employee could read their
--   whole record the moment their manager typed into it - a half-formed 3/10
--   and a blunt comment written before the appraisal conversation.
--
-- WHY IT CANNOT BE DONE IN THE UI
--   The employee's browser holds a token that can select ppad_records
--   directly. Hiding the fields in JavaScript hides them from the honest and
--   nobody else. So reads move behind a function that strips the fields, and
--   the policy that let an employee select their own row is withdrawn.
--
-- THE PART THAT IS EASY TO GET WRONG
--   ppad_save_record compares what the caller SENT to what they were ALLOWED
--   to produce. An employee who can no longer see manager ratings also
--   cannot send them back, so a straight comparison would reject every
--   employee save with "fields outside your permissions". The comparison is
--   therefore made against the same redacted view the caller was given.
--   What gets STORED is still the full record.
--
-- HOW TO ROLL BACK
--   drop function if exists ppad_list_records(), ppad_read_record(text,text),
--     ppad_redact_for(jsonb, boolean);
--   create policy ppad_records_select on ppad_records for select to authenticated
--     using (ppad_can_read_record(business_id, person_id));
-- ============================================================================

-- ── 1. FORCE RLS comes off ppad_records and ppad_people ────────────────────
--
-- FORCE makes the table owner subject to RLS too. That was defence in depth
-- against a SECURITY DEFINER function forgetting to scope its query - but
-- this file adds functions whose entire job is to read rows the CALLER
-- cannot select, and under FORCE those are evaluated against the caller's
-- own policies and return nothing. Whether that bites depends on whether the
-- owner role carries BYPASSRLS, which differs between a local Postgres and
-- Supabase, so it is the kind of difference that passes every test and fails
-- in production.
--
-- The protection FORCE was giving is replaced by an explicit
-- `business_id = ppad_business_id()` in every definer function, which the
-- cross-org tests assert.
alter table ppad_records disable row level security;
alter table ppad_records enable row level security;
alter table ppad_records no force row level security;
alter table ppad_people  no force row level security;

-- ── 2. The redaction ───────────────────────────────────────────────────────
--
-- p_show_manager false strips everything the employee is not entitled to see
-- before their manager has signed. Keys are set to JSON null rather than
-- removed: the client round-trips the document back on save, and a missing
-- key and a null key are different shapes.
create or replace function public.ppad_redact_for(p_data jsonb, p_show_manager boolean)
returns jsonb
language plpgsql immutable set search_path = pg_catalog, public, pg_temp as $$
declare
  v_out   jsonb := p_data;
  v_kpis  jsonb := '[]'::jsonb;
  v_str   jsonb := '[]'::jsonb;
  v_comps jsonb;
  v_cid   text;
  v_k     jsonb;
begin
  if p_show_manager or p_data is null then return p_data; end if;

  -- Manager's view of the work.
  for v_k in select * from jsonb_array_elements(coalesce(p_data->'kpis', '[]'::jsonb)) loop
    v_k := ppad_jset(v_k, '{mgr}', 'null'::jsonb);
    v_k := ppad_jset(v_k, '{result}', '""'::jsonb);
    v_kpis := v_kpis || jsonb_build_array(v_k);
  end loop;
  v_out := ppad_jset(v_out, '{kpis}', v_kpis);

  v_comps := coalesce(p_data->'comps', '{}'::jsonb);
  for v_cid in select jsonb_object_keys(v_comps) loop
    v_comps := ppad_jset(v_comps, array[v_cid, 'mgr'], 'null'::jsonb);
  end loop;
  v_out := ppad_jset(v_out, '{comps}', v_comps);

  for v_k in select * from jsonb_array_elements(coalesce(p_data->'stretch', '[]'::jsonb)) loop
    v_str := v_str || jsonb_build_array(ppad_jset(v_k, '{rating}', 'null'::jsonb));
  end loop;
  v_out := ppad_jset(v_out, '{stretch}', v_str);

  -- The verdict and the words around it.
  v_out := ppad_jset(v_out, '{overall}',        'null'::jsonb);
  v_out := ppad_jset(v_out, '{overallComment}', '""'::jsonb);
  v_out := ppad_jset(v_out, '{achieveComment}', '""'::jsonb);
  v_out := ppad_jset(v_out, '{notAssessed}',    'false'::jsonb);

  -- Check-ins stay. They are a record of conversations the employee was in.
  return v_out;
end;
$$;

-- Does this caller see the manager's half of this record?
-- Managers and reviewers always do. The subject does once their manager has
-- signed. Nobody else can read the record at all.
create or replace function public.ppad_sees_manager_half(p_business uuid, p_person text, p_data jsonb)
returns boolean
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select ppad_is_allocated(p_business, p_person, null)
      or coalesce(p_data #>> '{signoff,manager,date}', '') <> '';
$$;

-- ── 3. Reads move behind functions ─────────────────────────────────────────
--
-- One read path for everyone, so there is a single place the rules live.
-- Returns exactly the rows the caller may see, each already redacted for
-- them, plus updated_at for the optimistic lock.
create or replace function public.ppad_list_records()
returns table (person_id text, cycle_id text, data jsonb, locked_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_biz uuid := ppad_business_id();
begin
  if v_biz is null or not ppad_is_member(v_biz) then
    raise exception 'ppad: not a member of any organisation' using errcode = '42501';
  end if;
  return query
  select r.person_id, r.cycle_id,
         ppad_redact_for(r.data, ppad_sees_manager_half(v_biz, r.person_id, r.data)),
         r.locked_at, r.updated_at
  from ppad_records r
  where r.business_id = v_biz
    and ppad_can_read_record(v_biz, r.person_id);
end;
$$;

create or replace function public.ppad_read_record(p_person_id text, p_cycle_id text)
returns table (person_id text, cycle_id text, data jsonb, locked_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_biz uuid := ppad_business_id();
begin
  if v_biz is null or not ppad_can_read_record(v_biz, p_person_id) then
    raise exception 'ppad: no access to this record' using errcode = '42501';
  end if;
  return query
  select r.person_id, r.cycle_id,
         ppad_redact_for(r.data, ppad_sees_manager_half(v_biz, r.person_id, r.data)),
         r.locked_at, r.updated_at
  from ppad_records r
  where r.business_id = v_biz and r.person_id = p_person_id and r.cycle_id = p_cycle_id;
end;
$$;

-- The direct read is withdrawn. Without this the whole exercise is theatre:
-- an employee could select the unredacted row with the token in their own
-- browser. Managers and reviewers go through the same functions, so there is
-- one code path rather than two.
drop policy if exists ppad_records_select on ppad_records;

-- And take the privilege away as well, not just the policy.
--
-- With the policy gone but SELECT still granted, a direct query returns zero
-- rows: safe, but silent. Revoking the privilege turns it into "permission
-- denied for table ppad_records", which is a much better thing to meet while
-- developing against this schema - it says the read path moved, rather than
-- looking like the record does not exist.
--
-- The definer functions are unaffected: they run as the table owner, and
-- FORCE row level security came off this table in step 1.
revoke select on ppad_records from authenticated;

-- ── 4. Saving against a redacted view ──────────────────────────────────────
create or replace function public.ppad_save_record(
  p_person_id text,
  p_cycle_id text,
  p_data jsonb,
  p_expected_updated_at timestamptz default null
) returns table (updated_at timestamptz, locked_at timestamptz, data jsonb)
language plpgsql volatile security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  v_biz     uuid := ppad_business_id();
  v_self    boolean;
  v_mgr     boolean;
  v_rev     boolean;
  v_old     ppad_records%rowtype;
  v_merged  jsonb;
  v_compare jsonb;
  v_sees    boolean;
  v_signed  boolean;
  v_locked  timestamptz;
begin
  if v_biz is null or not ppad_is_member(v_biz) then
    raise exception 'ppad: not a member of any organisation' using errcode = '42501';
  end if;

  v_self := ppad_is_self(v_biz, p_person_id);
  v_mgr  := ppad_is_allocated(v_biz, p_person_id, 'manager');
  v_rev  := ppad_is_allocated(v_biz, p_person_id, 'reviewer');

  if not (v_self or v_mgr or v_rev) then
    raise exception 'ppad: no access to this record' using errcode = '42501';
  end if;

  select * into v_old from ppad_records
   where business_id = v_biz and person_id = p_person_id and cycle_id = p_cycle_id;

  if found then
    if p_expected_updated_at is null or p_expected_updated_at <> v_old.updated_at then
      raise exception 'ppad: record changed since you loaded it (conflict)'
        using errcode = '40001';
    end if;
    if v_old.locked_at is not null then
      raise exception 'ppad: record is signed off and locked; an admin must unlock it'
        using errcode = '42501';
    end if;
  else
    if not v_mgr then
      raise exception 'ppad: only an allocated manager can start a record'
        using errcode = '42501';
    end if;
    v_old.data := jsonb_build_object(
      'achievements', '',
      'edp',     jsonb_build_object('career', '', 'items', '[]'::jsonb),
      'signoff', jsonb_build_object(
        'employee', jsonb_build_object('name','', 'date',''),
        'manager',  jsonb_build_object('name','', 'date',''),
        'mgrMgr',   jsonb_build_object('name','', 'date','')));
  end if;

  v_merged := ppad_merge_record(coalesce(v_old.data, '{}'::jsonb), p_data, v_self, v_mgr, v_rev);

  -- The caller must send back what they were GIVEN, with their own changes.
  -- An employee reading a record before manager sign-off was handed a
  -- redacted copy, so compare against the redacted merge - otherwise every
  -- employee save fails for "changing" manager fields they never saw.
  -- v_merged, unredacted, is still what gets stored.
  v_sees := ppad_sees_manager_half(v_biz, p_person_id, coalesce(v_old.data, '{}'::jsonb));
  v_compare := ppad_redact_for(v_merged, v_sees);

  if v_compare is distinct from p_data then
    raise exception 'ppad: write rejected, fields outside your permissions: %',
      ppad_diff_keys(v_compare, p_data) using errcode = '42501';
  end if;

  v_signed := coalesce(v_merged#>>'{signoff,employee,date}', '') <> ''
          and coalesce(v_merged#>>'{signoff,manager,date}',  '') <> ''
          and coalesce(v_merged#>>'{signoff,mgrMgr,date}',   '') <> '';
  v_locked := case when v_signed then now() else null end;

  insert into ppad_records as r (business_id, person_id, cycle_id, data, locked_at, updated_at, updated_by)
  values (v_biz, p_person_id, p_cycle_id, v_merged, v_locked, now(), auth.uid())
  on conflict (business_id, person_id, cycle_id) do update
    set data = excluded.data,
        locked_at = excluded.locked_at,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  perform ppad_audit(v_biz, 'record.save', 'record', p_person_id || ':' || p_cycle_id,
    jsonb_build_object('as', jsonb_build_object('self', v_self, 'manager', v_mgr, 'reviewer', v_rev),
                       'locked', v_signed, 'redacted', not v_sees));

  -- Hand back the same view they will keep editing.
  return query
    select r.updated_at, r.locked_at,
           ppad_redact_for(r.data, ppad_sees_manager_half(v_biz, p_person_id, r.data))
      from ppad_records r
     where r.business_id = v_biz and r.person_id = p_person_id and r.cycle_id = p_cycle_id;
end;
$$;

revoke execute on function public.ppad_redact_for(jsonb, boolean),
  public.ppad_sees_manager_half(uuid, text, jsonb) from public, anon, authenticated;

revoke execute on function public.ppad_list_records(), public.ppad_read_record(text, text)
  from public, anon;
grant execute on function public.ppad_list_records(), public.ppad_read_record(text, text)
  to authenticated;
