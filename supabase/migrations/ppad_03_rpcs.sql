-- ============================================================================
-- HQ Performance (PPAD) - 3 of 3: RPCs
-- ----------------------------------------------------------------------------
-- APPLY AFTER ppad_01_schema.sql and ppad_02_rls.sql. Idempotent.
--
-- WHY RPCS AND NOT POLICIES
--   RLS answers "may you touch this row". It cannot answer "may you change
--   THIS FIELD of this row", and the whole access model here is field-level:
--   an employee writes their self-rating but not the manager's, a reviewer
--   writes one sign-off and nothing else. ppad_records therefore has no write
--   policy at all and ppad_save_record is the only writer.
--
--   The matrix is enforced by construction, not by inspection. The function
--   rebuilds the document the caller is ALLOWED to produce, then compares it
--   to what they sent. Any difference is a field they were not allowed to
--   touch, and the write is rejected naming the field. There is no list of
--   forbidden paths to keep in step with the UI.
--
-- HOW TO ROLL BACK
--   drop function if exists ppad_save_record(text,text,jsonb,timestamptz),
--     ppad_start_cycle(text,text,text,jsonb), ppad_set_allocation(text,uuid,text),
--     ppad_end_allocation(uuid), ppad_set_member(uuid,boolean,boolean),
--     ppad_unlock_record(text,text), ppad_report_summary(text);
-- ============================================================================

-- ── Internal helpers ───────────────────────────────────────────────────────

-- Mirrors the client's uid(): 6 random base36 chars + 4 from the clock.
-- Ids only have to be unique inside one document, and carryForward mints new
-- ones for every carried KPI and development action so ratings cannot follow
-- an id into the next cycle.
create or replace function public.ppad_uid()
returns text
language sql volatile set search_path = pg_catalog, public, pg_temp as $$
  select substr(md5(random()::text), 1, 6)
      || substr(md5(clock_timestamp()::text), 1, 4);
$$;

create or replace function public.ppad_audit(
  p_business uuid, p_action text, p_target_type text, p_target_id text, p_detail jsonb
) returns void
language sql volatile security definer set search_path = pg_catalog, public, pg_temp as $$
  insert into public.ppad_audit_log (business_id, actor_user_id, action, target_type, target_id, detail)
  values (p_business, auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_detail, '{}'::jsonb));
$$;

-- jsonb_set returns NULL if the value is NULL, which would silently blank the
-- whole document. Always write a JSON null instead.
create or replace function public.ppad_jset(p_target jsonb, p_path text[], p_val jsonb)
returns jsonb
language sql immutable set search_path = pg_catalog, public, pg_temp as $$
  select jsonb_set(p_target, p_path, coalesce(p_val, 'null'::jsonb), true);
$$;

revoke execute on function public.ppad_uid(), public.ppad_audit(uuid,text,text,text,jsonb),
  public.ppad_jset(jsonb,text[],jsonb) from public, anon, authenticated;

-- ── The field matrix ───────────────────────────────────────────────────────
--
-- Rebuilds the document the caller is permitted to produce from p_old and
-- p_new. Everything the caller may write is taken from p_new; everything else
-- is held at p_old.
--
-- Self-ratings follow the KPI's ID, not its position. A manager may add,
-- remove or reorder KPIs in the same save, so index-based merging would move
-- an employee's rating onto a different KPI.
create or replace function public.ppad_merge_record(
  p_old jsonb, p_new jsonb, p_self boolean, p_mgr boolean, p_rev boolean
) returns jsonb
language plpgsql immutable set search_path = pg_catalog, public, pg_temp as $$
declare
  v_out   jsonb;
  v_kpis  jsonb := '[]'::jsonb;
  v_k     jsonb;
  v_oldk  jsonb;
  v_comps jsonb;
  v_cid   text;
begin
  -- Manager owns the body of the record, so start from what they sent and
  -- claw back the fields they do not own. Otherwise start from the stored
  -- record and let the narrower roles write their own fields onto it.
  v_out := case when p_mgr then p_new else p_old end;

  if p_mgr then
    -- Employee-owned scalars stay as stored.
    v_out := ppad_jset(v_out, '{achievements}',      p_old->'achievements');
    v_out := ppad_jset(v_out, '{edp,career}',        p_old#>'{edp,career}');
    v_out := ppad_jset(v_out, '{signoff,employee}',  p_old#>'{signoff,employee}');
    -- The reviewer's sign-off is not the manager's to set either.
    v_out := ppad_jset(v_out, '{signoff,mgrMgr}',    p_old#>'{signoff,mgrMgr}');

    -- kpis[].self follows the kpi id.
    for v_k in select * from jsonb_array_elements(coalesce(p_new->'kpis', '[]'::jsonb)) loop
      select e into v_oldk
      from jsonb_array_elements(coalesce(p_old->'kpis', '[]'::jsonb)) e
      where e->>'id' = v_k->>'id'
      limit 1;
      -- A KPI the manager has just added has no stored self-rating; null is
      -- correct, and matches newRecord().
      v_kpis := v_kpis || jsonb_build_array(
        ppad_jset(v_k, '{self}', coalesce(v_oldk->'self', 'null'::jsonb)));
    end loop;
    v_out := ppad_jset(v_out, '{kpis}', v_kpis);

    -- comps is keyed by competency id, so no reordering problem - but the
    -- self rating is still the employee's.
    v_comps := coalesce(v_out->'comps', '{}'::jsonb);
    for v_cid in select jsonb_object_keys(v_comps) loop
      v_comps := ppad_jset(v_comps, array[v_cid, 'self'],
        coalesce(p_old#>array['comps', v_cid, 'self'], 'null'::jsonb));
    end loop;
    v_out := ppad_jset(v_out, '{comps}', v_comps);
  end if;

  if p_self then
    v_out := ppad_jset(v_out, '{achievements}',     p_new->'achievements');
    v_out := ppad_jset(v_out, '{edp,career}',       p_new#>'{edp,career}');
    v_out := ppad_jset(v_out, '{signoff,employee}', p_new#>'{signoff,employee}');

    v_kpis := '[]'::jsonb;
    for v_k in select * from jsonb_array_elements(coalesce(v_out->'kpis', '[]'::jsonb)) loop
      select e into v_oldk
      from jsonb_array_elements(coalesce(p_new->'kpis', '[]'::jsonb)) e
      where e->>'id' = v_k->>'id'
      limit 1;
      v_kpis := v_kpis || jsonb_build_array(
        ppad_jset(v_k, '{self}', coalesce(v_oldk->'self', v_k->'self', 'null'::jsonb)));
    end loop;
    v_out := ppad_jset(v_out, '{kpis}', v_kpis);

    v_comps := coalesce(v_out->'comps', '{}'::jsonb);
    for v_cid in select jsonb_object_keys(v_comps) loop
      v_comps := ppad_jset(v_comps, array[v_cid, 'self'],
        coalesce(p_new#>array['comps', v_cid, 'self'], 'null'::jsonb));
    end loop;
    v_out := ppad_jset(v_out, '{comps}', v_comps);
  end if;

  if p_rev then
    v_out := ppad_jset(v_out, '{signoff,mgrMgr}', p_new#>'{signoff,mgrMgr}');
  end if;

  return v_out;
end;
$$;

revoke execute on function public.ppad_merge_record(jsonb,jsonb,boolean,boolean,boolean)
  from public, anon, authenticated;

-- Names the top-level keys that differ, for the rejection message. Never
-- returns a VALUE - an error string must not leak a rating the caller is not
-- allowed to read.
create or replace function public.ppad_diff_keys(a jsonb, b jsonb)
returns text
language sql immutable set search_path = pg_catalog, public, pg_temp as $$
  select coalesce(string_agg(k, ', ' order by k), '(none)')
  from (
    select k from jsonb_object_keys(coalesce(a,'{}'::jsonb)) k
    union
    select k from jsonb_object_keys(coalesce(b,'{}'::jsonb)) k
  ) ks
  where (a->k) is distinct from (b->k);
$$;

revoke execute on function public.ppad_diff_keys(jsonb,jsonb) from public, anon, authenticated;

-- ── ppad_save_record ───────────────────────────────────────────────────────
--
-- The only writer of ppad_records.
--
-- p_expected_updated_at is the optimistic lock. Pass the updated_at the client
-- last read; a mismatch means someone else saved in between and the write is
-- refused rather than silently overwriting them. Pass null only when creating.
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
  v_signed  boolean;
  v_locked  timestamptz;
begin
  if v_biz is null or not ppad_is_member(v_biz) then
    raise exception 'ppad: not a member of any organisation' using errcode = '42501';
  end if;

  v_self := ppad_is_self(v_biz, p_person_id);
  v_mgr  := ppad_is_allocated(v_biz, p_person_id, 'manager');
  v_rev  := ppad_is_allocated(v_biz, p_person_id, 'reviewer');

  -- Being an admin grants nothing here. An admin writes a record only through
  -- an allocation, which ppad_set_allocation audits when they give it to
  -- themselves.
  if not (v_self or v_mgr or v_rev) then
    raise exception 'ppad: no access to this record' using errcode = '42501';
  end if;

  select * into v_old from ppad_records
   where business_id = v_biz and person_id = p_person_id and cycle_id = p_cycle_id;

  if found then
    -- Optimistic lock. The client reloads and shows the conflict rather than
    -- clobbering the other session.
    if p_expected_updated_at is null or p_expected_updated_at <> v_old.updated_at then
      raise exception 'ppad: record changed since you loaded it (conflict)'
        using errcode = '40001';
    end if;
    if v_old.locked_at is not null then
      raise exception 'ppad: record is signed off and locked; an admin must unlock it'
        using errcode = '42501';
    end if;
  else
    -- Creating. Only a manager starts a record - an employee cannot conjure
    -- their own, and a reviewer has nothing to review yet.
    if not v_mgr then
      raise exception 'ppad: only an allocated manager can start a record'
        using errcode = '42501';
    end if;
    -- Seed the EMPLOYEE-owned fields at their newRecord() defaults rather
    -- than at '{}'. The merge holds those fields at their stored value, and
    -- against an empty document "stored" is JSON null - so a manager starting
    -- a record would be rejected for sending the blank string and empty
    -- sign-off blocks that newRecord() itself produces. Only these fields
    -- need seeding; everything else on a new record is the manager's to set.
    v_old.data := jsonb_build_object(
      'achievements', '',
      'edp',     jsonb_build_object('career', '', 'items', '[]'::jsonb),
      'signoff', jsonb_build_object(
        'employee', jsonb_build_object('name','', 'date',''),
        'manager',  jsonb_build_object('name','', 'date',''),
        'mgrMgr',   jsonb_build_object('name','', 'date','')));
  end if;

  v_merged := ppad_merge_record(coalesce(v_old.data, '{}'::jsonb), p_data, v_self, v_mgr, v_rev);

  -- What they were allowed to produce must equal what they sent. Anything
  -- else is a field outside their half of the matrix.
  if v_merged is distinct from p_data then
    raise exception 'ppad: write rejected, fields outside your permissions: %',
      ppad_diff_keys(v_merged, p_data) using errcode = '42501';
  end if;

  -- Lock once all three sign-offs carry a date.
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
                       'locked', v_signed));

  return query
    select r.updated_at, r.locked_at, r.data from ppad_records r
     where r.business_id = v_biz and r.person_id = p_person_id and r.cycle_id = p_cycle_id;
end;
$$;

-- ── carryForward, ported ───────────────────────────────────────────────────
--
-- Faithful port of newRecord() and carryForward() from the client. Both are
-- reproduced here rather than called from the app because starting a cycle
-- writes a record for every active person, and the browser must not be able
-- to write ppad_records at all.
--
-- Parity with the JS is covered by tests/ppad/carry-forward-parity.mjs, which
-- compares output for the same input ignoring generated ids (both sides mint
-- random ones).
create or replace function public.ppad_new_record(p_org jsonb, p_person jsonb, p_pd jsonb)
returns jsonb
language plpgsql immutable set search_path = pg_catalog, public, pg_temp as $$
declare
  v_prof  jsonb;
  v_src   jsonb := '{}'::jsonb;
  v_comps jsonb := '{}'::jsonb;
  v_kpis  jsonb := '[]'::jsonb;
  v_c     jsonb;
  v_k     jsonb;
begin
  select e into v_prof
  from jsonb_array_elements(coalesce(p_org->'profiles', '[]'::jsonb)) e
  where e->>'id' = p_person->>'profileId'
  limit 1;

  -- A linked PD wins over the role profile, matching newRecord().
  if p_pd is not null then v_src := coalesce(p_pd->'targets', '{}'::jsonb);
  elsif v_prof is not null then v_src := coalesce(v_prof->'targets', '{}'::jsonb);
  end if;

  for v_c in select * from jsonb_array_elements(coalesce(p_org#>'{framework,comps}', '[]'::jsonb)) loop
    v_comps := ppad_jset(v_comps, array[v_c->>'id'], jsonb_build_object(
      'target', coalesce(v_src->(v_c->>'id'), '0'::jsonb),
      'self', null, 'mgr', null));
  end loop;

  if p_pd is not null then
    for v_k in select * from jsonb_array_elements(coalesce(p_pd->'kpis', '[]'::jsonb)) loop
      -- `.filter(k => k.name)` - unnamed PD rows are placeholders.
      if coalesce(v_k->>'name', '') <> '' then
        v_kpis := v_kpis || jsonb_build_array(jsonb_build_object(
          'id', ppad_uid(), 'name', v_k->'name', 'target', v_k->'target',
          'weight', coalesce(v_k->'weight', 'null'::jsonb),
          'area', coalesce(v_k->'area', '""'::jsonb),
          'self', null, 'mgr', null, 'result', ''));
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'pdId', case when p_pd is null then null else p_pd->'id' end,
    'kpis', v_kpis, 'comps', v_comps, 'useComps', true,
    'stretch', '[]'::jsonb, 'planAgreed', null, 'checkins', '[]'::jsonb,
    'achievements', '', 'achieveComment', '',
    'overall', null, 'overallComment', '', 'notAssessed', false,
    'edp', jsonb_build_object('career', '', 'items', '[]'::jsonb),
    'signoff', jsonb_build_object(
      'employee', jsonb_build_object('name','', 'date',''),
      'manager',  jsonb_build_object('name','', 'date',''),
      'mgrMgr',   jsonb_build_object('name','', 'date','')));
end;
$$;

create or replace function public.ppad_carry_forward(
  p_org jsonb, p_person jsonb, p_pd jsonb, p_prev jsonb, p_opts jsonb
) returns jsonb
language plpgsql volatile set search_path = pg_catalog, public, pg_temp as $$
declare
  v_r     jsonb := ppad_new_record(p_org, p_person, p_pd);
  v_kpis  jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_comps jsonb;
  v_cid   text;
  v_k     jsonb;
  v_i     jsonb;
begin
  if p_prev is null then return v_r; end if;

  -- KPIs carry name/target/weight/area. New ids, and every rating cleared -
  -- a carried KPI starts the year unrated.
  if coalesce((p_opts->>'kpis')::boolean, true) then
    for v_k in select * from jsonb_array_elements(coalesce(p_prev->'kpis', '[]'::jsonb)) loop
      v_kpis := v_kpis || jsonb_build_array(jsonb_build_object(
        'id', ppad_uid(), 'name', v_k->'name', 'target', v_k->'target',
        'weight', coalesce(v_k->'weight', 'null'::jsonb),
        'area', coalesce(v_k->'area', '""'::jsonb),
        'self', null, 'mgr', null, 'result', ''));
    end loop;
    v_r := ppad_jset(v_r, '{kpis}', v_kpis);
  end if;

  -- Competency TARGETS carry; the assessments do not.
  if coalesce((p_opts->>'comps')::boolean, true) then
    v_comps := coalesce(v_r->'comps', '{}'::jsonb);
    for v_cid in select jsonb_object_keys(v_comps) loop
      if p_prev#>array['comps', v_cid] is not null then
        v_comps := ppad_jset(v_comps, array[v_cid, 'target'],
          p_prev#>array['comps', v_cid, 'target']);
      end if;
    end loop;
    v_r := ppad_jset(v_r, '{comps}', v_comps);
    v_r := ppad_jset(v_r, '{useComps}', coalesce(p_prev->'useComps', 'true'::jsonb));
  end if;

  -- Unfinished development actions follow the person into the new cycle.
  if coalesce((p_opts->>'edp')::boolean, true) then
    for v_i in select * from jsonb_array_elements(coalesce(p_prev#>'{edp,items}', '[]'::jsonb)) loop
      if coalesce(v_i->>'status', '') <> 'Done' then
        v_items := v_items || jsonb_build_array(ppad_jset(v_i, '{id}', to_jsonb(ppad_uid())));
      end if;
    end loop;
    v_r := ppad_jset(v_r, '{edp,items}', v_items);
  end if;

  -- Career goals carry regardless of the options, matching the client.
  v_r := ppad_jset(v_r, '{edp,career}', coalesce(p_prev#>'{edp,career}', '""'::jsonb));
  return v_r;
end;
$$;

revoke execute on function public.ppad_new_record(jsonb,jsonb,jsonb),
  public.ppad_carry_forward(jsonb,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;

-- ── ppad_start_cycle ───────────────────────────────────────────────────────
-- Admin only. Appends the cycle to the org config, makes it active, and
-- drafts a record for every active person from their previous one.
create or replace function public.ppad_start_cycle(
  p_cycle_id text, p_start text, p_label text, p_opts jsonb default '{"kpis":true,"comps":true,"edp":true}'::jsonb
) returns integer
language plpgsql volatile security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  v_biz    uuid := ppad_business_id();
  v_org    jsonb;
  v_person record;
  v_prev   jsonb;
  v_pd     jsonb;
  v_n      integer := 0;
begin
  if v_biz is null or not ppad_is_admin(v_biz) then
    raise exception 'ppad: admin only' using errcode = '42501';
  end if;

  select data into v_org from ppad_org_config where business_id = v_biz;
  if v_org is null then raise exception 'ppad: no org config'; end if;

  if exists (select 1 from jsonb_array_elements(coalesce(v_org->'cycles','[]'::jsonb)) c
             where c->>'id' = p_cycle_id or c->>'start' = p_start) then
    raise exception 'ppad: that cycle already exists';
  end if;

  v_org := ppad_jset(v_org, '{cycles}', coalesce(v_org->'cycles','[]'::jsonb)
    || jsonb_build_array(jsonb_build_object('id', p_cycle_id, 'start', p_start, 'label', p_label)));
  v_org := ppad_jset(v_org, '{activeCycle}', to_jsonb(p_cycle_id));

  update ppad_org_config
     set data = v_org, updated_at = now(), updated_by = auth.uid()
   where business_id = v_biz;

  for v_person in
    select person_id, profile from ppad_people
     where business_id = v_biz and active and deleted_at is null
  loop
    -- Most recent prior record for this person, by the cycle order held in
    -- the org config - matching the client, which walks cycles backwards.
    select r.data into v_prev
      from ppad_records r
      join lateral (
        select ord from jsonb_array_elements(coalesce(v_org->'cycles','[]'::jsonb))
             with ordinality t(c, ord)
         where t.c->>'id' = r.cycle_id
      ) o on true
     where r.business_id = v_biz and r.person_id = v_person.person_id
       and r.cycle_id <> p_cycle_id
     order by o.ord desc
     limit 1;

    select d.data into v_pd from ppad_position_descriptions d
     where d.business_id = v_biz and d.pd_id = v_person.profile->>'pdId'
       and d.deleted_at is null;

    insert into ppad_records (business_id, person_id, cycle_id, data, updated_at, updated_by)
    values (v_biz, v_person.person_id, p_cycle_id,
            ppad_carry_forward(v_org, v_person.profile, v_pd, v_prev, p_opts),
            now(), auth.uid())
    on conflict (business_id, person_id, cycle_id) do nothing;

    v_n := v_n + 1;
  end loop;

  perform ppad_audit(v_biz, 'cycle.start', 'cycle', p_cycle_id,
    jsonb_build_object('label', p_label, 'people', v_n, 'options', p_opts));
  return v_n;
end;
$$;

-- ── Allocations ────────────────────────────────────────────────────────────
create or replace function public.ppad_set_allocation(
  p_person_id text, p_user_id uuid, p_type text
) returns uuid
language plpgsql volatile security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  v_biz uuid := ppad_business_id();
  v_id  uuid;
begin
  if v_biz is null or not ppad_is_admin(v_biz) then
    raise exception 'ppad: admin only' using errcode = '42501';
  end if;
  if p_type not in ('manager','reviewer') then
    raise exception 'ppad: type must be manager or reviewer';
  end if;
  if not exists (select 1 from ppad_people
                  where business_id = v_biz and person_id = p_person_id and deleted_at is null) then
    raise exception 'ppad: no such person in this organisation';
  end if;
  if not exists (select 1 from ppad_members
                  where business_id = v_biz and user_id = p_user_id and status = 'active') then
    raise exception 'ppad: that user is not an active member of this organisation';
  end if;

  insert into ppad_allocations (business_id, allocated_user_id, person_id, type, created_by)
  values (v_biz, p_user_id, p_person_id, p_type, auth.uid())
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from ppad_allocations
     where business_id = v_biz and allocated_user_id = p_user_id
       and person_id = p_person_id and type = p_type and ended_at is null;
  end if;

  -- An admin granting themselves access to a record is the one move this
  -- model cannot prevent, so it is recorded distinctly rather than buried in
  -- the ordinary allocation entries.
  perform ppad_audit(v_biz,
    case when p_user_id = auth.uid() then 'allocation.self_grant' else 'allocation.create' end,
    'allocation', v_id::text,
    jsonb_build_object('person_id', p_person_id, 'user_id', p_user_id, 'type', p_type));
  return v_id;
end;
$$;

create or replace function public.ppad_end_allocation(p_allocation_id uuid)
returns void
language plpgsql volatile security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  v_biz uuid := ppad_business_id();
  v_row ppad_allocations%rowtype;
begin
  if v_biz is null or not ppad_is_admin(v_biz) then
    raise exception 'ppad: admin only' using errcode = '42501';
  end if;
  update ppad_allocations set ended_at = now()
   where id = p_allocation_id and business_id = v_biz and ended_at is null
   returning * into v_row;
  if not found then raise exception 'ppad: no live allocation with that id'; end if;

  perform ppad_audit(v_biz, 'allocation.end', 'allocation', p_allocation_id::text,
    jsonb_build_object('person_id', v_row.person_id, 'user_id', v_row.allocated_user_id, 'type', v_row.type));
end;
$$;

-- ── Membership ─────────────────────────────────────────────────────────────
create or replace function public.ppad_set_member(
  p_user_id uuid, p_is_admin boolean, p_is_hr_reporting boolean
) returns void
language plpgsql volatile security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  v_biz uuid := ppad_business_id();
  v_was ppad_members%rowtype;
begin
  if v_biz is null or not ppad_is_admin(v_biz) then
    raise exception 'ppad: admin only' using errcode = '42501';
  end if;

  -- An admin cannot remove their own admin flag. Without this a single-admin
  -- org can lock itself out, and the only way back is a service-role query.
  if p_user_id = auth.uid() and not p_is_admin then
    raise exception 'ppad: you cannot remove your own admin access';
  end if;

  select * into v_was from ppad_members where business_id = v_biz and user_id = p_user_id;

  insert into ppad_members (business_id, user_id, is_admin, is_hr_reporting, created_by)
  values (v_biz, p_user_id, p_is_admin, p_is_hr_reporting, auth.uid())
  on conflict (business_id, user_id) do update
    set is_admin = excluded.is_admin, is_hr_reporting = excluded.is_hr_reporting;

  perform ppad_audit(v_biz, 'member.set', 'member', p_user_id::text,
    jsonb_build_object(
      'from', jsonb_build_object('is_admin', v_was.is_admin, 'is_hr_reporting', v_was.is_hr_reporting),
      'to',   jsonb_build_object('is_admin', p_is_admin, 'is_hr_reporting', p_is_hr_reporting)));
end;
$$;

-- ── Unlock ─────────────────────────────────────────────────────────────────
create or replace function public.ppad_unlock_record(p_person_id text, p_cycle_id text)
returns void
language plpgsql volatile security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_biz uuid := ppad_business_id();
begin
  if v_biz is null or not ppad_is_admin(v_biz) then
    raise exception 'ppad: admin only' using errcode = '42501';
  end if;
  update ppad_records set locked_at = null, updated_at = now(), updated_by = auth.uid()
   where business_id = v_biz and person_id = p_person_id and cycle_id = p_cycle_id
     and locked_at is not null;
  if not found then raise exception 'ppad: no locked record to unlock'; end if;

  -- Reopening a signed-off appraisal is the kind of thing that gets asked
  -- about later, so it is audited loudly.
  perform ppad_audit(v_biz, 'record.unlock', 'record', p_person_id || ':' || p_cycle_id, '{}'::jsonb);
end;
$$;

-- ── Org-wide reporting ─────────────────────────────────────────────────────
--
-- The HR reporting role, and nothing else, reads ratings across the business.
-- Scores only: no comments, no check-in notes, no development detail, no
-- self-appraisal text. That is the whole reason this is a function returning
-- named columns rather than a relaxed policy on ppad_records.
create or replace function public.ppad_report_summary(p_cycle_id text)
returns table (
  -- `position` is reserved in Postgres (position(x in y)) and cannot be an
  -- unquoted column name here.
  person_id text, name text, position_title text, team text,
  kpi_score numeric, overall integer, not_assessed boolean,
  employee_signed text, manager_signed text, reviewer_signed text,
  locked boolean
)
language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_biz uuid := ppad_business_id();
begin
  if v_biz is null or not ppad_is_hr_reporting(v_biz) then
    raise exception 'ppad: the HR reporting role is required' using errcode = '42501';
  end if;

  perform ppad_audit(v_biz, 'report.summary', 'cycle', p_cycle_id, '{}'::jsonb);

  return query
  select
    p.person_id,
    trim(coalesce(p.profile->>'first','') || ' ' || coalesce(p.profile->>'last','')),
    p.profile->>'position',
    p.profile->>'dept',
    (select round(sum((k->>'mgr')::numeric * coalesce(nullif(k->>'weight','')::numeric, 1))
                / nullif(sum(coalesce(nullif(k->>'weight','')::numeric, 1)), 0), 1)
       from jsonb_array_elements(coalesce(r.data->'kpis','[]'::jsonb)) k
      where k->>'mgr' is not null),
    nullif(r.data->>'overall','')::integer,
    coalesce((r.data->>'notAssessed')::boolean, false),
    nullif(r.data#>>'{signoff,employee,date}',''),
    nullif(r.data#>>'{signoff,manager,date}',''),
    nullif(r.data#>>'{signoff,mgrMgr,date}',''),
    r.locked_at is not null
  from ppad_people p
  left join ppad_records r
    on r.business_id = p.business_id and r.person_id = p.person_id and r.cycle_id = p_cycle_id
  where p.business_id = v_biz and p.deleted_at is null and p.active
  order by 2;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
-- These seven are the browser's entire write and reporting surface. Signed-in
-- users only; anon gets nothing.
revoke execute on function
  public.ppad_save_record(text,text,jsonb,timestamptz),
  public.ppad_start_cycle(text,text,text,jsonb),
  public.ppad_set_allocation(text,uuid,text),
  public.ppad_end_allocation(uuid),
  public.ppad_set_member(uuid,boolean,boolean),
  public.ppad_unlock_record(text,text),
  public.ppad_report_summary(text)
from public, anon;

grant execute on function
  public.ppad_save_record(text,text,jsonb,timestamptz),
  public.ppad_start_cycle(text,text,text,jsonb),
  public.ppad_set_allocation(text,uuid,text),
  public.ppad_end_allocation(uuid),
  public.ppad_set_member(uuid,boolean,boolean),
  public.ppad_unlock_record(text,text),
  public.ppad_report_summary(text)
to authenticated;
