-- C1 - RLS rollout for the tables the AI Administrator engine adds
-- plus the older `documents` and `knowledge_chunks` tables which
-- previous migrations left without policies.
--
-- Source: implementation brief Part C1 + the standing rule that RLS
-- is the pre-launch gate. Run AFTER rls_all_tables.sql +
-- rls_extend_prescreen_and_core.sql + credit_ledger_and_documents_structured.sql.
--
-- All policies follow the same pattern used everywhere else: a tenant
-- can read/write their own business rows, gated on
-- profiles.business_id matching auth.uid().

-- ── documents ──────────────────────────────────────────────────────
alter table if exists public.documents enable row level security;

drop policy if exists "documents_business_select" on public.documents;
create policy "documents_business_select" on public.documents
  for select using (
    business_id = (select business_id from public.profiles where id = auth.uid())
  );

drop policy if exists "documents_business_insert" on public.documents;
create policy "documents_business_insert" on public.documents
  for insert with check (
    business_id = (select business_id from public.profiles where id = auth.uid())
  );

drop policy if exists "documents_business_update" on public.documents;
create policy "documents_business_update" on public.documents
  for update using (
    business_id = (select business_id from public.profiles where id = auth.uid())
  );

drop policy if exists "documents_business_delete" on public.documents;
create policy "documents_business_delete" on public.documents
  for delete using (
    business_id = (select business_id from public.profiles where id = auth.uid())
  );

-- ── knowledge_chunks ───────────────────────────────────────────────
-- Knowledge corpus is shared across all tenants (Fair Work Act,
-- NES, Modern Awards are public domain). Read-only to authenticated
-- users; admin client writes via service role bypassing RLS.
alter table if exists public.knowledge_chunks enable row level security;

drop policy if exists "knowledge_chunks_auth_select" on public.knowledge_chunks;
create policy "knowledge_chunks_auth_select" on public.knowledge_chunks
  for select using (auth.uid() is not null);

-- ── conversations / messages (HR Advisor history) ──────────────────
-- These already had policies in rls_all_tables.sql; reaffirm here
-- in case a deploy applied this migration without the earlier one.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='conversations') then
    execute 'alter table public.conversations enable row level security';
    execute 'drop policy if exists "conversations_business_select" on public.conversations';
    execute $p$create policy "conversations_business_select" on public.conversations
      for select using (
        business_id = (select business_id from public.profiles where id = auth.uid())
      )$p$;
    execute 'drop policy if exists "conversations_business_write" on public.conversations';
    execute $p$create policy "conversations_business_write" on public.conversations
      for all using (
        business_id = (select business_id from public.profiles where id = auth.uid())
      ) with check (
        business_id = (select business_id from public.profiles where id = auth.uid())
      )$p$;
  end if;
end $$;

-- ── credit_allocations / credit_ledger ─────────────────────────────
-- Policies already declared in credit_ledger_and_documents_structured.sql;
-- listed here as a comment so the launch checklist sees them in one
-- place. Re-running that migration is idempotent.

-- ── Cross-tenant smoke test:
--   Connect as a member of business A and run:
--     select count(*) from documents;
--     select count(*) from administrator_ingests;
--     select count(*) from credit_ledger;
--   then connect as a member of business B and verify the counts are
--   each business's own only. (rls_extend_prescreen_and_core.sql
--   documents the same pattern for prescreen tables.)
