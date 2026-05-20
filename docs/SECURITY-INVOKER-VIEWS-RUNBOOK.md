# Security Invoker Views - Runbook

## What this is

The Supabase Database Advisor flagged the lint **"Security Definer View"**
on three views in the `public` schema. By default a Postgres view runs
with the privileges of the role that CREATED it, not the role that
QUERIES it. When that view sits over an RLS-protected base table, every
caller (including the anon key and authenticated users) effectively
bypasses the row-level policies on the underlying table - they see
whatever the view owner can see, not what their own RLS context allows.

The fix is to set `security_invoker = true` on each affected view so the
view honours the CALLER's RLS context. The view definition itself does
not change; only the option on the view object changes.

Three views are currently affected in the `public` schema:

| View                                  | Base table / purpose                          | Source                                      |
|---------------------------------------|------------------------------------------------|---------------------------------------------|
| `public.candidate_responses`          | back-compat over `public.prescreen_responses` | `phase1_ai_scoring.sql`                     |
| `public.active_prescreen_sessions`    | helper over `public.prescreen_sessions`       | `add_soft_delete_prescreen.sql`             |
| `public.admin_overview`               | admin / reporting view (cross-tenant rollup)  | created directly in Supabase SQL Editor *   |

\* `admin_overview` does not exist as a file in `supabase/migrations/`.
The migration treats it as a special case - it gets BOTH
`security_invoker = true` AND has its `select` grant revoked from `anon`
and `authenticated`. The net effect is that even if a future change
introduces an anon/authenticated caller that hits this view, the call
returns a "permission denied" at the PostgREST layer rather than relying
on RLS as the only defence. Service role still works because it bypasses
RLS by design.

For the prescreen views, both base tables are RLS-hardened (see
`rls_extend_prescreen_and_core.sql`), so once `security_invoker = true`
is set, callers will see the same rows through the view as they do
through the base table.

## How to apply

1. Open the Supabase Dashboard for the project at
   `https://rbuxsuuvbeojxcxwxcjf.supabase.co`.
2. Go to **SQL Editor** -> **New query**.
3. Paste the entire contents of `supabase/migrations/security_invoker_views.sql`.
4. Click **Run**. The migration is idempotent - safe to re-run, and safe
   to apply to an environment where one or more of the views have not
   been created yet (the `do $$ ... end$$` blocks short-circuit on
   missing views).
5. Confirm there are no errors in the SQL Editor result panel.

## How to verify

### 1. Inspect the view definitions (sanity check)

```sql
select schemaname, viewname, definition
from pg_views
where schemaname = 'public'
  and viewname in ('candidate_responses', 'active_prescreen_sessions', 'admin_overview');
```

You should see three rows with the original `select ...` definitions
unchanged. Save the `admin_overview` definition for your records - it
was created outside the migrations folder so this is the canonical copy.

### 2. Confirm `security_invoker=true` is set on each view

```sql
select n.nspname               as schemaname,
       c.relname               as viewname,
       c.reloptions            as options,
       'security_invoker=true' = any(coalesce(c.reloptions, '{}'::text[]))
                               as security_invoker_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'v'
  and n.nspname = 'public'
  and c.relname in ('candidate_responses', 'active_prescreen_sessions', 'admin_overview')
order by c.relname;
```

Every row in the result must show `security_invoker_enabled = true`. If
any row shows `false` or `reloptions` is `NULL`, the alter did not stick -
re-run the migration and re-check.

### 3. Confirm grants on `admin_overview` are locked down

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name   = 'admin_overview'
order by grantee, privilege_type;
```

`anon` and `authenticated` must NOT appear in the result. `service_role`
(and `postgres`) may appear with `SELECT`. If you see `anon` or
`authenticated` rows, re-run the migration.

### 4. Re-run the Supabase Advisor

Dashboard -> **Database** -> **Advisors** -> **Security**. The "Security
Definer View" lint for `public.candidate_responses`,
`active_prescreen_sessions` and `admin_overview` should all be gone. If
a new view is added later without `security_invoker = true`, the lint
will fire again - add the new view name to
`supabase/migrations/security_invoker_views.sql` and re-apply.

## Follow-up: capture `admin_overview` in source control

This view was created directly in the Supabase SQL Editor and has no
corresponding file in `supabase/migrations/`. To prevent drift, run this
once and save the output into a new migration file:

```sql
select 'create or replace view public.admin_overview with (security_invoker = true) as ' || definition
from pg_views
where schemaname = 'public' and viewname = 'admin_overview';
```

Paste the result into `supabase/migrations/admin_overview.sql` (wrap in
a `do $$ ... end$$;` block for idempotency). If the view is no longer
needed, drop it instead with:

```sql
drop view if exists public.admin_overview;
```
