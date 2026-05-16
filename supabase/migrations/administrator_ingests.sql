-- B9 - administrator_ingests stores parsed resume / contract uploads.
-- One row per upload. The original file is NOT stored; we keep the
-- extracted text + the structured payload returned by Claude. If full
-- file retention becomes a regulatory need later we can switch to
-- Supabase Storage with a foreign key on this table.

create table if not exists public.administrator_ingests (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  created_by   uuid references auth.users(id) on delete set null,
  kind         text not null check (kind in ('resume', 'contract')),
  filename     text,
  mime_type    text,
  raw_text     text not null,
  payload      jsonb not null,
  created_at   timestamptz not null default now()
);
create index if not exists administrator_ingests_biz_idx
  on public.administrator_ingests (business_id, created_at desc);
create index if not exists administrator_ingests_kind_idx
  on public.administrator_ingests (kind, created_at desc);

alter table public.administrator_ingests enable row level security;
drop policy if exists "administrator_ingests_business_select" on public.administrator_ingests;
create policy "administrator_ingests_business_select" on public.administrator_ingests
  for select using (
    business_id = (select business_id from public.profiles where id = auth.uid())
  );
drop policy if exists "administrator_ingests_business_insert" on public.administrator_ingests;
create policy "administrator_ingests_business_insert" on public.administrator_ingests
  for insert with check (
    business_id = (select business_id from public.profiles where id = auth.uid())
  );
drop policy if exists "administrator_ingests_business_delete" on public.administrator_ingests;
create policy "administrator_ingests_business_delete" on public.administrator_ingests
  for delete using (
    business_id = (select business_id from public.profiles where id = auth.uid())
  );
