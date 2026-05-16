-- B10 + B4 - credit ledger + structured-payload column on documents.
--
-- credit_ledger: per-business, per-tool ledger of consumed credits.
--   `cost` is positive for charges, negative for refunds / top-ups.
--   Aggregated by `lib/credits.ts:getCreditBalance` against the
--   active `credit_allocations` row.
-- credit_allocations: how many credits a business has in the current
--   billing period. Stripe webhook adds rows here on subscription
--   activation / renewal; manual top-ups add separate rows.
-- documents.structured_payload: B4 round-trip storage so renderers
--   can regenerate any output format on demand without re-calling
--   the LLM.

create extension if not exists "pgcrypto";

create table if not exists public.credit_allocations (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  allocated     integer not null check (allocated >= 0),
  period_start  timestamptz not null,
  period_end    timestamptz,
  source        text not null check (source in ('subscription', 'top_up', 'one_off', 'manual')) default 'subscription',
  stripe_invoice_id text,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists credit_allocations_biz_period_idx
  on public.credit_allocations (business_id, period_start desc);

do $$ begin
  create type public.credit_tool as enum ('advisor', 'administrator', 'recruit', 'one_off');
exception when duplicate_object then null;
end $$;

create table if not exists public.credit_ledger (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references public.businesses(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  tool            public.credit_tool not null,
  intent          text not null,
  cost            numeric(10,3) not null,
  document_id     uuid,
  response_id     uuid,
  stripe_event_id text,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists credit_ledger_biz_created_idx
  on public.credit_ledger (business_id, created_at desc);
create index if not exists credit_ledger_tool_idx
  on public.credit_ledger (tool, created_at desc);

-- RLS: tenants see their own ledger only.
alter table public.credit_ledger enable row level security;
drop policy if exists "credit_ledger_business_select" on public.credit_ledger;
create policy "credit_ledger_business_select" on public.credit_ledger
  for select using (
    business_id = (select business_id from public.profiles where id = auth.uid())
  );
alter table public.credit_allocations enable row level security;
drop policy if exists "credit_allocations_business_select" on public.credit_allocations;
create policy "credit_allocations_business_select" on public.credit_allocations
  for select using (
    business_id = (select business_id from public.profiles where id = auth.uid())
  );

-- B4 - documents.structured_payload jsonb column for the AI Administrator
-- engine. Optional; existing markdown-content rows continue to render
-- via the legacy code path until they're regenerated.
alter table public.documents
  add column if not exists structured_payload jsonb;
alter table public.documents
  add column if not exists template_id text;
create index if not exists documents_template_idx
  on public.documents (template_id)
  where template_id is not null;
