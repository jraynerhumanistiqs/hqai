-- ============================================================================
-- HQ Performance - make the first admin of a business
-- ----------------------------------------------------------------------------
-- Run this ONCE per business, after ppad_01..03, to switch the tool on for a
-- real organisation. Safe on production: it writes two rows and flips one
-- boolean, and touches nothing else.
--
-- There is deliberately no self-serve path to becoming the first admin.
-- ppad_set_member requires you to already be an admin, which is correct and
-- also means somebody has to break the circle from outside. That is this
-- file, run by hand with full knowledge of who is being made an admin.
--
-- EDIT THE EMAIL ON THE NEXT LINE, then run the whole file.
-- ============================================================================

do $$
declare
  v_email text := 'jrayner@humanistiqs.com.au';   -- <<< CHANGE ME
  v_user  uuid;
  v_biz   uuid;
  v_name  text;
begin
  -- Preconditions, checked before anything is written.
  --
  -- Without these the first failure is a raw 42703 "column ppad_enabled does
  -- not exist" from twenty lines down, which says nothing about what to do.
  -- Run order matters and this is the file people reach for first.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'ppad_enabled'
  ) then
    raise exception
      'businesses.ppad_enabled is missing. Run ppad_businesses_entitlement.sql first, then this file.';
  end if;

  if to_regclass('public.ppad_members') is null then
    raise exception
      'The ppad_* tables are missing. Run ppad_01_schema.sql, ppad_02_rls.sql and ppad_03_rpcs.sql first, then this file.';
  end if;

  select id into v_user from auth.users where lower(email) = lower(v_email);
  if v_user is null then
    raise exception 'No auth user with email %. They must sign in once first.', v_email;
  end if;

  select p.business_id, b.name into v_biz, v_name
  from public.profiles p join public.businesses b on b.id = p.business_id
  where p.id = v_user;
  if v_biz is null then
    raise exception 'User % has no business_id on their profile.', v_email;
  end if;

  -- 1. Switch the add-on on for that business.
  update public.businesses set ppad_enabled = true where id = v_biz;

  -- 2. Make them a PPAD admin. is_hr_reporting stays false on purpose: it is
  --    a separate grant, and an admin should have to decide to take it.
  insert into public.ppad_members (business_id, user_id, is_admin, is_hr_reporting, created_by)
  values (v_biz, v_user, true, false, v_user)
  on conflict (business_id, user_id) do update set is_admin = true;

  -- 3. Seed an empty org config so the tool opens on its setup screen rather
  --    than erroring on a missing document.
  insert into public.ppad_org_config (business_id, data, updated_by)
  values (v_biz, jsonb_build_object(
    'v', 1,
    'brand', jsonb_build_object('orgName', v_name, 'appName', 'HQ Performance',
      'tagline', 'Plan ~ Perform ~ Assess ~ Develop', 'accent', '#E8B23A',
      'logo', null, 'poweredBy', true),
    'yearStart', 7,
    'bands', jsonb_build_object('low','Under Review','mid','Positive Contributor','high','Exceptional Contributor'),
    'cycles', '[]'::jsonb, 'activeCycle', null,
    'framework', jsonb_build_object('clusters','[]'::jsonb,'comps','[]'::jsonb),
    'profiles', '[]'::jsonb,
    'setup', false), v_user)
  on conflict (business_id) do nothing;

  -- 4. Audited, like every other membership change.
  insert into public.ppad_audit_log (business_id, actor_user_id, action, target_type, target_id, detail)
  values (v_biz, v_user, 'member.bootstrap_admin', 'member', v_user::text,
          jsonb_build_object('email', v_email, 'business', v_name,
                             'note', 'first admin, set by SQL - no self-serve path exists'));

  raise notice 'HQ Performance enabled for "%" and % is now an admin.', v_name, v_email;
end $$;
