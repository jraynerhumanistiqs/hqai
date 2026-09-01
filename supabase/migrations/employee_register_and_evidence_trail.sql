-- HQ People - employee register + evidence trail
--
-- Adds the first employee record model to HQ.ai. Two tables:
--   employees          - the register the compliance clock will derive dates from
--   compliance_events  - the evidence trail (what was done, when, by whom)
--
-- RLS is enabled here from the first migration, deliberately. These rows hold
-- personal information about people who are NOT users of the product and have
-- not consented to us directly, so business-scoped isolation is a hard
-- requirement rather than a pre-launch task. See docs/product/compliance-clock/
-- ASSUMPTIONS.md (B4).
--
-- Date of birth is intentionally NOT collected. The only v1 rule that needs it
-- is the over-45 extra week of notice, which is handled as a prompt at the
-- moment of termination instead. Keeps the PII surface minimal.
--
-- Additive and idempotent, consistent with the project's migration convention.

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,

  first_name        text not null,
  last_name         text,
  email             text,
  job_title         text,

  -- the clock inputs
  start_date        date not null,
  end_date          date,
  employment_type   text not null default 'full_time'
                      check (employment_type in
                        ('full_time','part_time','casual','fixed_term','contractor')),
  fixed_term_end    date,

  -- award/classification: never blocking. "not sure" is a first-class answer,
  -- because identifying the right award is itself one of the top SME pain
  -- points - we must not require the user to solve it to use the product.
  award             text,
  classification    text,
  award_confirmed   boolean not null default false,

  state             text check (state in ('NSW','VIC','QLD','WA','SA','TAS','ACT','NT')),

  status            text not null default 'active'
                      check (status in ('active','ended')),
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.employees is
  'Employee register for HQ People. Source of truth for compliance clock dates. No DOB by design - see migration header.';
comment on column public.employees.award_confirmed is
  'False when the user selected "not sure". Clocks that depend on the award stay dormant until confirmed.';

create index if not exists employees_business_idx    on public.employees (business_id);
create index if not exists employees_status_idx      on public.employees (business_id, status);
create index if not exists employees_start_date_idx  on public.employees (start_date);

-- ---------------------------------------------------------------------------
-- compliance_events - the evidence trail
-- ---------------------------------------------------------------------------
-- Append-only by policy (no UPDATE grant): the value of this record is that it
-- was written at the time, not reconstructed afterwards. That is precisely what
-- the reverse onus of proof turns on in a wage dispute.
create table if not exists public.compliance_events (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  employee_id       uuid references public.employees(id) on delete cascade,

  event_type        text not null,          -- e.g. 'contract_issued', 'probation_review', 'fwis_provided'
  title             text not null,
  detail            text,

  -- when the thing actually happened (may differ from when it was recorded)
  occurred_at       timestamptz not null default now(),
  recorded_by       uuid references public.profiles(id) on delete set null,

  document_id       uuid references public.documents(id) on delete set null,
  bmp_code          text,                    -- links to the bare-minimum process register (BMP-001..021)
  metadata          jsonb not null default '{}'::jsonb,

  created_at        timestamptz not null default now()
);

comment on table public.compliance_events is
  'Append-only evidence trail. Records what was done, when, by whom, with any document. Contemporaneous by design - no UPDATE policy.';
comment on column public.compliance_events.bmp_code is
  'Optional link to the bare-minimum process register (BMP-001..BMP-021).';

create index if not exists compliance_events_business_idx on public.compliance_events (business_id, occurred_at desc);
create index if not exists compliance_events_employee_idx on public.compliance_events (employee_id, occurred_at desc);
create index if not exists compliance_events_type_idx     on public.compliance_events (event_type);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_employee_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_employees_updated on public.employees;
create trigger trg_employees_updated
  before update on public.employees
  for each row execute function public.set_employee_updated_at();

-- ---------------------------------------------------------------------------
-- RLS - business-scoped, using the project's existing helper
-- ---------------------------------------------------------------------------
alter table public.employees         enable row level security;
alter table public.compliance_events enable row level security;

drop policy if exists "employees_business_select" on public.employees;
create policy "employees_business_select" on public.employees
  for select using (business_id = public.current_business_id());

drop policy if exists "employees_business_insert" on public.employees;
create policy "employees_business_insert" on public.employees
  for insert with check (business_id = public.current_business_id());

drop policy if exists "employees_business_update" on public.employees;
create policy "employees_business_update" on public.employees
  for update using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

drop policy if exists "employees_business_delete" on public.employees;
create policy "employees_business_delete" on public.employees
  for delete using (business_id = public.current_business_id());

-- Evidence trail: readable and appendable by the owning business; never
-- updatable. Deletion is allowed only so a business can exercise erasure.
drop policy if exists "compliance_events_business_select" on public.compliance_events;
create policy "compliance_events_business_select" on public.compliance_events
  for select using (business_id = public.current_business_id());

drop policy if exists "compliance_events_business_insert" on public.compliance_events;
create policy "compliance_events_business_insert" on public.compliance_events
  for insert with check (business_id = public.current_business_id());

drop policy if exists "compliance_events_business_delete" on public.compliance_events;
create policy "compliance_events_business_delete" on public.compliance_events
  for delete using (business_id = public.current_business_id());
-- deliberately no UPDATE policy: the trail is append-only.
