# Post-Pilot Security Backlog

Items deliberately deferred during the pilot. Each entry is paste-and-run
ready when the time comes - the analysis is already done so future-you
doesn't need to re-derive anything.

---

## 1. Move pgvector out of `public` into `extensions`

**Advisor lint:** `extension_in_public` (WARN)
**Why deferred:** WARN-only schema-hygiene lint. No known exploit. Move
carries breaking-change risk on the live RAG retrieval path. Not a
pilot-week change.
**Do this:** Post-pilot, in a low-traffic window, with a 30-minute
rollback budget.

### Pre-flight checks

Before applying, confirm no other code path will silently break:

```sql
-- (a) Inventory every column that uses the vector type.
select n.nspname || '.' || c.relname || '.' || a.attname as column,
       format_type(a.atttypid, a.atttypmod) as type
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
where a.attnum > 0
  and not a.attisdropped
  and format_type(a.atttypid, a.atttypmod) like '%vector%';

-- (b) Inventory every function that takes or returns vector.
select n.nspname || '.' || p.proname || '(' ||
       pg_get_function_identity_arguments(p.oid) || ')'           as function,
       pg_get_function_result(p.oid)                              as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where pg_get_function_arguments(p.oid) ilike '%vector%'
   or pg_get_function_result(p.oid)    ilike '%vector%';
```

You should see at least:
- `public.knowledge_chunks.embedding` of type `vector(N)` (N = 384 today,
  or 1024 once Voyage swap lands).
- `public.match_knowledge(...)` taking vector + returning rows.

If anything else shows up, factor it into the search_path patch below.

### The migration

```sql
-- 1. Create extensions schema (Supabase's recommended home).
create schema if not exists extensions;

-- 2. Grant usage on the new schema. Tables that have a vector column
--    don't care - the column's pg_type oid is unchanged, only the
--    schema where the type lives is moving. But callers that resolve
--    'vector' by NAME (in function signatures, in raw cast SQL) do
--    care, and they need extensions on their search_path.
grant usage on schema extensions to anon, authenticated, service_role;

-- 3. Move the extension.
alter extension vector set schema extensions;

-- 4. Patch every function whose search_path needs to find vector now
--    that it lives in extensions. match_knowledge was pinned to
--    'pg_catalog, public, pg_temp' by the function hardening migration;
--    we add 'extensions' so it can still resolve the vector type +
--    operators.
do $$
declare r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'match_knowledge'
  loop
    execute format(
      'alter function public.match_knowledge(%s) set search_path = pg_catalog, extensions, public, pg_temp',
      r.args
    );
  end loop;
end$$;
```

### Smoke test (must pass before declaring done)

1. Sign in to the live app. Open the **AI Advisor** (`/dashboard/people`).
2. Ask a question that triggers RAG retrieval: "What's the redundancy
   pay calculation under the NES?"
3. Confirm the answer streams in with citations — that means
   `match_knowledge` resolved `vector(N)` against the moved type and
   returned real hits.
4. As a belt-and-braces check, run:

   ```sql
   select count(*) from public.knowledge_chunks
   where embedding is not null;
   ```

   Should match the count you saw before the migration. If it dropped
   to zero, the embedding column lost its association — rollback.

### Rollback

```sql
alter extension vector set schema public;
do $$
declare r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'match_knowledge'
  loop
    execute format(
      'alter function public.match_knowledge(%s) set search_path = pg_catalog, public, pg_temp',
      r.args
    );
  end loop;
end$$;
-- (Optional) drop the empty extensions schema if nothing else lives there.
-- drop schema if exists extensions cascade;
```

---

## Items completed during pilot prep (for the record)

| Lint                                                          | Resolved by migration                                   |
|---------------------------------------------------------------|---------------------------------------------------------|
| Security Definer View (`candidate_responses`, `active_prescreen_sessions`, `admin_overview`) | `security_invoker_views.sql`                            |
| Function Search Path Mutable (4 functions)                    | `security_function_hardening.sql`                       |
| Anon / Authenticated Can Execute SECURITY DEFINER Function (5 functions) | `security_function_hardening.sql`                       |
| RLS Enabled No Policy (`prescreen_transcripts`, `prescreen_share_views`) | `rls_policies_for_transcripts_and_share_views.sql`     |
| Leaked Password Protection Disabled                           | Dashboard toggle - Authentication → Providers → Email   |

Two lints remain on the Advisor at the end of pilot prep, both
deferred-by-design:
- `extension_in_public` (vector) - listed above, slated post-pilot.
- `auth_leaked_password_protection` - cleared once the founder
  toggles it in the dashboard.

---

**Last reviewed:** 2026-05-20.
