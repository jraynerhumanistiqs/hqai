# Workplace Compliance Audit - Migration Runbook (Option A)

Migrates the `humanistiqs-audits` Supabase project into the main HQ.ai Supabase project under an `audit` schema, so a single client and one set of RLS policies covers everything.

**Time required: 10-15 minutes. You run the SQL; I've prepped the codebase to pick it up.**

---

## Why a separate `audit` schema (not just dumping into `public`)

- Keeps audit tables namespaced and obvious in the dashboard.
- No collision risk with existing HQ.ai tables (`prescreen_sessions`, `candidate_responses`, `campaigns`, etc).
- Easy to drop/re-run if the migration goes sideways.
- Supabase API exposes named schemas via the `pg_graphql` config; we'll add `audit` to the exposed list.

---

## Step 1 - Dump from `humanistiqs-audits`

Pick whichever path matches your comfort level.

### Path 1a (recommended, no install) - Supabase Dashboard SQL Editor

1. Open `humanistiqs-audits` project in the Supabase dashboard.
2. **Database -> Backups**. Click **"Download backup"** for the latest daily backup (it's a `.sql` file).
3. If backups aren't enabled, jump to Path 1b.

### Path 1b - `pg_dump` from your terminal

You need `pg_dump` (ships with PostgreSQL, also in `psql.app` on Mac, or via `choco install postgresql` on Windows).

In `humanistiqs-audits` dashboard: **Project Settings -> Database -> Connection string**. Copy the `URI` value (starts `postgresql://postgres:...`).

```bash
pg_dump \
  --schema=public \
  --no-owner \
  --no-privileges \
  --no-publications \
  --no-subscriptions \
  --exclude-schema='auth' \
  --exclude-schema='storage' \
  --exclude-schema='extensions' \
  --exclude-schema='graphql*' \
  --exclude-schema='realtime' \
  --exclude-schema='supabase_*' \
  --exclude-schema='pgsodium*' \
  --exclude-schema='vault' \
  --file=audits-dump.sql \
  "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
```

You should now have `audits-dump.sql` containing only the application tables.

---

## Step 2 - Rewrite the dump to live under `audit` schema

Open `audits-dump.sql` in a text editor and do these find/replace passes:

1. Find: `CREATE SCHEMA IF NOT EXISTS public;`  -> Replace: `CREATE SCHEMA IF NOT EXISTS audit;`
   (or just delete the `public` create line - HQ.ai already has it.)
2. Find: `SET search_path = public,`  -> Replace: `SET search_path = audit,`
3. Find: ` public.`  -> Replace: ` audit.`  (note the leading space - this catches `CREATE TABLE public.foo`, `ALTER TABLE public.foo`, `REFERENCES public.foo`, etc. without nuking the `pg_catalog` references)
4. Find: `"public"."`  -> Replace: `"audit"."`

Save as `audits-migration.sql`.

> If your editor supports regex, a single pass `\bpublic\.` -> `audit.` is cleaner.

---

## Step 3 - Apply to HQ.ai Supabase

1. Open the HQ.ai project (`https://rbuxsuuvbeojxcxwxcjf.supabase.co`) in the dashboard.
2. **SQL Editor -> New query**.
3. First run this prep block:

   ```sql
   create schema if not exists audit;
   grant usage on schema audit to anon, authenticated, service_role;
   alter default privileges in schema audit grant all on tables to service_role;
   alter default privileges in schema audit grant select on tables to authenticated;
   ```

4. Paste the contents of `audits-migration.sql` into a new query and **Run**.
5. **Project Settings -> API -> Exposed schemas** -> add `audit` to the list (next to `public`). Save.

You can verify with:

```sql
select table_name from information_schema.tables where table_schema = 'audit' order by 1;
select count(*) from audit.<one_of_your_tables>;
```

---

## Step 4 - Tell me the schema

Paste the output of this back into chat:

```sql
select
  table_name,
  string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'audit'
group by table_name
order by table_name;
```

Once I have that, I'll wire `app/dashboard/compliance/audit/page.tsx` to actually read and render audit data (it currently shows a "Connecting your audit data" splash - see `lib/audit/client.ts` for the scaffold).

---

## Step 5 - RLS (after the cutover)

Audit data is sensitive (it'll contain individual employees' details). Once we've confirmed the schema, I'll write `supabase/rls_audit.sql` with policies scoped to `business_id` matching the signed-in user's business profile. For now the audit schema is wide-open behind the service role key; **do not surface real client data on the audit page until RLS is on**.

---

## Rollback

If the migration goes wrong:

```sql
drop schema audit cascade;
```

Wipes the entire audit schema. Original `humanistiqs-audits` project is untouched. Re-run from Step 3.

---

## What's already in place on the codebase side

- `lib/audit/client.ts` - thin Supabase client wrapper that defaults `db.schema = 'audit'` so queries like `auditAdmin.from('assessments')` Just Work.
- `lib/audit/types.ts` - placeholder type definitions; I'll fill these in once Step 4 lands.
- `app/dashboard/compliance/audit/page.tsx` - now shows a "Connecting your audit data" interstitial with a smoke-test query, so we'll instantly know if the schema is reachable post-migration.
- `app/api/audit/health/route.ts` - server endpoint that returns `{ ok: true, tables: [...] }` if it can see the audit schema.

You can hit `/api/audit/health` after Step 3 to sanity-check the migration before sending me the schema dump in Step 4.
