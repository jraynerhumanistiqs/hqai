# Security Invoker Views - Runbook

## What this is

The Supabase Database Advisor flagged the lint **"Security Definer View"**
on `public.candidate_responses`. By default a Postgres view runs with the
privileges of the role that CREATED it, not the role that QUERIES it. When
that view sits over an RLS-protected base table, every caller (including
the anon key and authenticated users) effectively bypasses the row-level
policies on the underlying table - they see whatever the view owner can
see, not what their own RLS context allows.

The fix is to set `security_invoker = true` on each affected view so the
view honours the CALLER's RLS context. The view definition itself does not
change; only the option on the view object changes.

This repo currently has two such views in the `public` schema:

| View                                  | Base table                  | Migration that created it          |
|---------------------------------------|-----------------------------|------------------------------------|
| `public.candidate_responses`          | `public.prescreen_responses`| `phase1_ai_scoring.sql`            |
| `public.active_prescreen_sessions`    | `public.prescreen_sessions` | `add_soft_delete_prescreen.sql`    |

Both base tables are RLS-hardened (see `rls_extend_prescreen_and_core.sql`),
so once `security_invoker = true` is set, callers will see the same rows
through the view as they do through the base table.

## How to apply

1. Open the Supabase Dashboard for the project at
   `https://rbuxsuuvbeojxcxwxcjf.supabase.co`.
2. Go to **SQL Editor** -> **New query**.
3. Paste the entire contents of `supabase/migrations/security_invoker_views.sql`.
4. Click **Run**. The migration is idempotent - it is safe to re-run, and
   safe to apply to an environment where one or both views have not been
   created yet (the `do $$ ... end$$` blocks short-circuit on missing
   views).
5. Confirm there are no errors in the SQL Editor result panel.

## How to verify

### 1. Inspect the view definitions (sanity check)

```sql
select schemaname, viewname, definition
from pg_views
where schemaname = 'public'
  and viewname in ('candidate_responses', 'active_prescreen_sessions');
```

You should see two rows with the original `select * from ...` definitions
unchanged.

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
  and c.relname in ('candidate_responses', 'active_prescreen_sessions')
order by c.relname;
```

Every row in the result must show `security_invoker_enabled = true`. If
any row shows `false` or `reloptions` is `NULL`, the alter did not stick -
re-run the migration and re-check.

### 3. Re-run the Supabase Advisor

Dashboard -> **Database** -> **Advisors** -> **Security**. The "Security
Definer View" lint for `public.candidate_responses` should be gone. If a
new view is added later without `security_invoker = true`, the lint will
fire again - add the new view name to
`supabase/migrations/security_invoker_views.sql` and re-apply.
