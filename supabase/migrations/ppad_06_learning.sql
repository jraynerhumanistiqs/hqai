-- HQ Performance - per-user learning progress (the Learn course).
--
-- WHY THIS TABLE EXISTS AT ALL.
--
-- The course arrived from a standalone single-browser build that kept its
-- progress in the org config: S.org.learn = {done, score, certs, name}. That
-- works when one browser is one person. Here it does not, twice over:
--
--   1. ppad_org_config is ONE ROW PER BUSINESS. Every member would read and
--      overwrite everyone else's quiz scores, and a person's name and results
--      would sit in a row the whole business reads.
--   2. ppad_org_config_write is `using (ppad_is_admin(business_id))`, so a
--      non-admin finishing a quiz would simply be refused. The feature could
--      never have worked for the employees it is written for.
--
-- So progress lives here instead: one row per person per business, readable
-- and writable only by that person.
--
-- Additive and safe to re-run. Applying it is NOT required for the Learn
-- screens to render - the adapter soft-degrades to in-memory progress and
-- says so, per the repo convention for an unapplied migration.

-- ── Preconditions ──────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.ppad_members') is null then
    raise exception
      'ppad_members is missing. Run ppad_01_schema.sql first, then ppad_02_rls.sql.';
  end if;
  if to_regprocedure('public.ppad_is_member(uuid)') is null then
    raise exception
      'ppad_is_member() is missing. Run ppad_02_rls.sql before this file.';
  end if;
end $$;

-- ── Table ──────────────────────────────────────────────────────────────────
create table if not exists public.ppad_learning (
  business_id uuid        not null references public.businesses(id) on delete cascade,
  user_id     uuid        not null references auth.users(id)        on delete cascade,
  -- {done:{moduleId:true}, score:{moduleId:0..3}, certs:{pathId:date}, name:''}
  -- Kept as one document because the client owns its shape, exactly as it
  -- does for ppad_org_config and ppad_records.
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);

comment on table public.ppad_learning is
  'Per-user Learn course progress. One row per person per business; nobody reads another person''s row directly - see ppad_learning_summary() for the admin view.';

-- ── Privileges ─────────────────────────────────────────────────────────────
-- Explicit, not inherited. A policy mistake alone must not make this table
-- readable: the grant has to agree as well.
revoke all on public.ppad_learning from public, anon, authenticated;
grant select, insert, update on public.ppad_learning to authenticated;
-- No delete. Progress is not something a user needs to erase row-wise, and
-- keeping the grant off means a mistaken policy cannot expose one.

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.ppad_learning enable row level security;

-- Your row, and only ever your own. Not managers, not reviewers, not admins -
-- an admin who wants completion figures uses ppad_learning_summary() below,
-- which returns no scores and no names.
drop policy if exists ppad_learning_self on public.ppad_learning;
create policy ppad_learning_self on public.ppad_learning for all to authenticated
  using      (user_id = auth.uid() and public.ppad_is_member(business_id))
  with check (user_id = auth.uid() and public.ppad_is_member(business_id));

-- ── Admin / HR reporting view ──────────────────────────────────────────────
-- Completion only. Deliberately NOT the scores and NOT the name typed on the
-- certificate: "has this person done the training" is a compliance question
-- and a reasonable thing for an admin to ask; "what did they score on module
-- three" is not, and the separation matches ppad_report_summary(), which
-- returns ratings but never comments.
create or replace function public.ppad_learning_summary()
returns table (
  user_id          uuid,
  modules_complete integer,
  paths_certified  text[],
  last_activity    timestamptz
)
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select l.user_id,
         (select count(*)::integer
            from jsonb_each(coalesce(l.data->'done', '{}'::jsonb)) d
           where d.value = 'true'::jsonb),
         (select coalesce(array_agg(c.key order by c.key), '{}'::text[])
            from jsonb_each(coalesce(l.data->'certs', '{}'::jsonb)) c),
         l.updated_at
    from public.ppad_learning l
   where l.business_id = public.ppad_business_id()
     and (public.ppad_is_admin(public.ppad_business_id())
          or public.ppad_is_hr_reporting(public.ppad_business_id()));
$$;

revoke all on function public.ppad_learning_summary() from public, anon;
grant execute on function public.ppad_learning_summary() to authenticated;

comment on function public.ppad_learning_summary() is
  'Completion figures for admins and HR reporting. Never returns quiz scores or the name on a certificate.';
