-- ============================================================================
-- HQ Performance (PPAD) - 1 of 3: schema
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Creates the six tables behind HQ Performance. No policies and no RPCs -
--   those are ppad_02_rls.sql and ppad_03_rpcs.sql, which MUST be applied in
--   that order. This file alone leaves every table RLS-disabled and therefore
--   unreachable from the browser (no grants), which is the safe half-state.
--
-- TENANCY
--   There is no `organisations` table. HQ.ai already has one tenancy model -
--   `businesses` + `profiles.business_id` - and running a second one in the
--   same database would mean two answers to "who is in this tenant" and two
--   sets of RLS to keep in step. Every table here keys on business_id.
--
--   PPAD-specific roles do NOT go on `profiles`. `ppad_members` holds them, so
--   a core table is not reshaped for one add-on and a business without the
--   add-on has no PPAD rows at all.
--
-- WHY jsonb FOR THE DOCUMENTS
--   The app reads and writes whole documents (`org`, `p_<id>`, `d_<id>`) and
--   its shapes are defined by newRecord() / newPd() in the client. Shredding
--   those into columns would mean re-modelling the app, which is explicitly
--   out of scope. The security boundary does not depend on the shape: field
--   permissions are enforced in ppad_save_record, not by column grants.
--
-- THE ONE SHAPE CHANGE
--   In the app, a person's records live at `person.records[cycleId]`. Here
--   they are split into their own table. That split IS the security boundary:
--   it is what lets an admin read the staff directory without reading anyone's
--   performance record. ppad_people holds directory data only.
--
-- HOW TO APPLY
--   Supabase Dashboard -> SQL Editor -> New Query, paste, run. Then 02, then
--   03. Idempotent - safe to re-run.
--
-- HOW TO ROLL BACK
--   drop table if exists ppad_audit_log, ppad_allocations, ppad_records,
--     ppad_people, ppad_position_descriptions, ppad_org_config, ppad_members
--     cascade;
--   (The businesses.ppad_enabled column is ppad_businesses_entitlement.sql.)
-- ============================================================================

-- ── MEMBERS ────────────────────────────────────────────────────────────────
-- Who can use PPAD inside a business, and in what capacity.
--
-- Being a member is NOT being able to read records. Allocation does that.
-- is_admin manages the org; is_hr_reporting reads ratings org-wide through
-- ppad_report_summary and nothing else. Both are additive and independent:
-- an admin with neither an allocation nor the reporting flag can see the
-- directory and the framework, and no assessments at all.
create table if not exists ppad_members (
  business_id     uuid not null references businesses(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  is_admin        boolean not null default false,
  is_hr_reporting boolean not null default false,
  status          text not null default 'active' check (status in ('active','suspended')),
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  primary key (business_id, user_id)
);

comment on table ppad_members is
  'PPAD membership and roles. Membership alone grants no access to any performance record - see ppad_allocations.';
comment on column ppad_members.is_hr_reporting is
  'Reads ratings org-wide via ppad_report_summary only. Never reads comments, check-in notes, EDP detail or self-appraisal text.';

-- ── ORG CONFIG ─────────────────────────────────────────────────────────────
-- The app's `org` document: brand, cycles, bands, competency framework and
-- role profiles. One row per business.
create table if not exists ppad_org_config (
  business_id uuid primary key references businesses(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

-- ── POSITION DESCRIPTIONS ──────────────────────────────────────────────────
-- pd_id is the app's own id ('d' + uid()), not a uuid, because the client
-- mints it and every record references it by that value.
create table if not exists ppad_position_descriptions (
  business_id uuid not null references businesses(id) on delete cascade,
  pd_id       text not null,
  data        jsonb not null default '{}'::jsonb,
  deleted_at  timestamptz,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id),
  primary key (business_id, pd_id)
);

-- ── PEOPLE (directory only) ────────────────────────────────────────────────
-- NO performance data here. `profile` is name, position, team, location,
-- employee number, start date, linked PD and role profile.
--
-- `manager` is deliberately NOT stored. It used to be free text typed into
-- the person's details and shown in exports and the appraisal PDF, which
-- could disagree with who actually had access. It is now derived from the
-- active manager allocation.
--
-- user_id links a login to exactly one person per business. It is nullable:
-- a person can exist in the directory, and be managed, before they are ever
-- invited. Postgres treats NULLs as distinct in a unique constraint, which is
-- what we want - many un-invited people, at most one row per login.
create table if not exists ppad_people (
  business_id uuid not null references businesses(id) on delete cascade,
  person_id   text not null,
  user_id     uuid references auth.users(id) on delete set null,
  profile     jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  deleted_at  timestamptz,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id),
  primary key (business_id, person_id),
  unique (business_id, user_id)
);

comment on column ppad_people.profile is
  'Directory data only. Performance data lives in ppad_records - that split is the security boundary that lets an admin run the directory without reading assessments.';

-- ── RECORDS (the performance data) ─────────────────────────────────────────
-- One row per person per cycle. Split out of person.records[cycleId].
--
-- locked_at is set by ppad_save_record once all three sign-offs carry a date,
-- and cleared only by ppad_unlock_record (admin, audited). While it is set the
-- record is read-only to everyone.
create table if not exists ppad_records (
  business_id uuid not null references businesses(id) on delete cascade,
  person_id   text not null,
  cycle_id    text not null,
  data        jsonb not null default '{}'::jsonb,
  locked_at   timestamptz,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id),
  primary key (business_id, person_id, cycle_id),
  foreign key (business_id, person_id)
    references ppad_people(business_id, person_id) on delete cascade
);

-- ── ALLOCATIONS (the access grant) ─────────────────────────────────────────
-- The only thing that grants access to someone else's record.
--
-- Never hard-deleted: ending an allocation sets ended_at, so history survives
-- and "who could see this record in March" stays answerable. Access is
-- evaluated on ended_at is null, so ending one removes access immediately,
-- including to past cycles.
create table if not exists ppad_allocations (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  allocated_user_id uuid not null references auth.users(id) on delete cascade,
  person_id         text not null,
  type              text not null check (type in ('manager','reviewer')),
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  ended_at          timestamptz,
  foreign key (business_id, person_id)
    references ppad_people(business_id, person_id) on delete cascade
);

-- One live allocation per (user, person, type). Past ones are unconstrained so
-- the same pairing can be ended and re-created over the years.
create unique index if not exists ppad_allocations_live_uniq
  on ppad_allocations (business_id, allocated_user_id, person_id, type)
  where ended_at is null;

-- The access check runs on every record read, so index the way it reads.
create index if not exists ppad_allocations_lookup
  on ppad_allocations (business_id, allocated_user_id, type)
  where ended_at is null;

create index if not exists ppad_allocations_person
  on ppad_allocations (business_id, person_id)
  where ended_at is null;

-- ── AUDIT LOG (append only) ────────────────────────────────────────────────
-- Every allocation change, membership change, record write, unlock and
-- org-wide report call. Append-only is enforced in ppad_02_rls.sql: there is
-- no update or delete policy and the privileges are revoked.
create table if not exists ppad_audit_log (
  id            bigint generated always as identity primary key,
  business_id   uuid not null references businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action        text not null,
  target_type   text,
  target_id     text,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists ppad_audit_log_business_time
  on ppad_audit_log (business_id, created_at desc);

-- ── Lookup indexes ─────────────────────────────────────────────────────────
create index if not exists ppad_people_user on ppad_people (user_id)
  where user_id is not null;
create index if not exists ppad_records_person
  on ppad_records (business_id, person_id);
