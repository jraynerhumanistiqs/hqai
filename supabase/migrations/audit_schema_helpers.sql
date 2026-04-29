-- Audit schema helpers for the Workplace Compliance Audit integration.
--
-- Run this against the HQ.ai Supabase project AFTER applying the
-- humanistiqs-audits dump per docs/AUDIT-MIGRATION-RUNBOOK.md.
--
-- Provides a service-role-only RPC that lists tables under the `audit`
-- schema, used by /api/audit/health to verify the migration landed.

create schema if not exists audit;

grant usage on schema audit to anon, authenticated, service_role;
alter default privileges in schema audit grant all on tables to service_role;
alter default privileges in schema audit grant select on tables to authenticated;

create or replace function public.audit_list_tables()
returns table (table_name text)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select t.table_name::text
  from information_schema.tables t
  where t.table_schema = 'audit'
    and t.table_type = 'BASE TABLE'
  order by t.table_name;
$$;

revoke all on function public.audit_list_tables() from public;
grant execute on function public.audit_list_tables() to service_role;

comment on function public.audit_list_tables() is
  'Lists base tables under the audit schema. Used by /api/audit/health to verify migration.';
