# Security Function Hardening - Runbook

## What this addresses

Supabase Database Advisor flagged four WARN-level lints in the Security
category. This migration takes care of two of them. The other two are
either out of scope (high-effort refactor with WARN-level risk) or are
dashboard toggles, both documented below.

| Lint id | Title | Action |
|---------|-------|--------|
| 0011    | Function Search Path Mutable                              | **FIXED** by `security_function_hardening.sql` |
| 0028    | Public Can Execute SECURITY DEFINER Function (`anon`)     | **FIXED** by `security_function_hardening.sql` |
| 0029    | Signed-In Users Can Execute SECURITY DEFINER Function     | **FIXED** by `security_function_hardening.sql` |
| 0014    | Extension in Public (`vector`)                            | **DEFERRED** - see below |
| n/a     | Leaked Password Protection Disabled                       | **FOUNDER ACTION** - see below |

## Why each function is treated the way it is

### Search path pinning (lint 0011)

Four functions are missing an explicit `search_path`:

- `public.update_updated_at` - trigger function that updates the
  `updated_at` column on row update.
- `public.match_knowledge` - pgvector similarity-search function for
  the RAG retrieval pipeline.
- `public.owns_business` - RLS helper that returns whether the calling
  user owns the business in question.
- `public.get_session_response_counts` - aggregate helper used by the
  recruit dashboard.

Each is now altered to `set search_path = pg_catalog, public, pg_temp`
which is the standard secure-default ordering (built-in operators
resolve first, our public objects second, and `pg_temp` last so an
attacker-created temporary object can't shadow a public name).

The `match_knowledge` and other potentially-overloaded functions are
handled by enumerating their actual signatures from `pg_proc` and
issuing one ALTER per signature - this is why those blocks have a
small loop rather than a single hardcoded statement.

### EXECUTE grant revocation (lints 0028 + 0029)

Five `SECURITY DEFINER` functions in the `public` schema are exposed at
`/rest/v1/rpc/<name>` by default. None of them are meant to be called
that way:

| Function                          | Called by                                     |
|-----------------------------------|-----------------------------------------------|
| `current_business_id()`           | RLS policies (`business_id = public.current_business_id()`) |
| `current_business_member_ids()`   | RLS policies                                  |
| `get_session_response_counts()`   | Server-side queries from the recruit dashboard |
| `handle_new_user()`               | Trigger on `auth.users` insert                |
| `rls_auto_enable()`               | Admin maintenance only                        |

The migration REVOKEs EXECUTE on each from `public`, `anon`, and
`authenticated`, and explicitly GRANTs EXECUTE to `service_role` for
clarity. This closes the `/rest/v1/rpc/<name>` attack surface.

**Why this doesn't break anything:**

- RLS policies that call these functions run as the policy owner (the
  database owner), not as the calling role. EXECUTE grants on
  `anon`/`authenticated` are irrelevant to RLS evaluation.
- The trigger on `auth.users` that invokes `handle_new_user` runs as
  the trigger owner.
- All server-side calls in the codebase use the service-role client
  (`supabaseAdmin`), which bypasses these grants by design.

## Deferred items

### Extension in Public (lint 0014) - `vector`

The `vector` extension (pgvector) is installed in the `public` schema.
Supabase's recommendation is to move it to a dedicated `extensions`
schema.

Why we are not doing this now: the `vector` type is referenced from
many places (`knowledge_chunks.embedding vector(384)`, the
`match_knowledge` function signature, every embedding insert/select).
Moving the extension requires either re-qualifying every reference as
`extensions.vector` or adjusting the search_path of every caller. For
a WARN-level lint that has no concrete exploit, the breaking-change
risk outweighs the benefit during the pilot. Revisit before commercial
launch.

### Leaked Password Protection Disabled

Pure dashboard toggle, no SQL:

1. Open the Supabase Dashboard for this project.
2. Authentication -> Providers -> Email.
3. Find **"Leaked password protection"** and turn it on.
4. Save.

This enables Supabase Auth to check sign-up + reset passwords against
HaveIBeenPwned and reject any that have appeared in a known breach.

## How to apply the migration

1. Open Supabase Dashboard -> SQL Editor -> New query.
2. Paste the contents of `supabase/migrations/security_function_hardening.sql`.
3. Click Run. Idempotent and safe to re-run.
4. Confirm there are no errors in the result panel.

## How to verify

### 1. Confirm search_path is pinned

```sql
select p.proname as function,
       pg_get_function_identity_arguments(p.oid) as args,
       p.proconfig as settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'update_updated_at',
    'match_knowledge',
    'owns_business',
    'get_session_response_counts'
  )
order by p.proname;
```

Every row must have a `settings` value containing
`search_path=pg_catalog, public, pg_temp` (formatted as an array
element). A `null` settings column means the alter did not stick.

### 2. Confirm EXECUTE is revoked from anon and authenticated

```sql
select grantee,
       routine_name,
       privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name in (
    'current_business_id',
    'current_business_member_ids',
    'get_session_response_counts',
    'handle_new_user',
    'rls_auto_enable'
  )
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by routine_name, grantee;
```

The result should be **empty**. If any row appears, re-run the
migration.

### 3. Re-run Database Advisor

Dashboard -> Database -> Advisors -> Security. Lints 0011, 0028 and
0029 should be gone. 0014 (`vector` in public) will still show -
that's the deferred item. The auth lint clears once you enable
leaked-password protection in the Auth settings.
