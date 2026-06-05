# Production schema verification — `add_country_to_businesses` + Steps 3/4

**Date:** 2026-06-05
**Project:** HQ.ai production Supabase — `rbuxsuuvbeojxcxwxcjf` (https://rbuxsuuvbeojxcxwxcjf.supabase.co)
**Trigger:** Internal tester (Bianca) hit "unable to generate my company" at sign-up. Root cause: `/api/onboarding` (`hqai/app/api/onboarding/route.ts`) inserted a `country` column on `businesses` that only exists once `add_country_to_businesses` is applied. Route since hardened with a defensive drop-and-retry insert (commit `e7d8d7d` on `main`).

## Outcome: nothing to apply — all migrations already live in production

Verified directly against the production PostgREST API using the service role key. A `select <col>` returning **HTTP 200** proves the column exists *and* is in PostgREST's schema cache; a missing column returns **HTTP 400 / Postgres `42703`** (validated as a control with a deliberately fake column name).

### `public.businesses`

| Column | Status |
|---|---|
| `country` | ✅ present |
| `state` | ✅ present |
| `award` | ✅ present |
| `headcount` | ✅ present |
| `employment_types` | ✅ present |
| `advisor_name` | ✅ present |
| `plan` | ✅ present |

### `public.prescreen_responses` (Steps 3/4 — `prescreen_responses_shortlist_decision.sql`)

| Column | Status |
|---|---|
| `shortlisted_at` | ✅ present |
| `decision` | ✅ present |

## Conclusions

- `add_country_to_businesses` is **already applied**. `country` values from onboarding persist correctly in production (the "silently dropped country" risk does **not** apply here).
- Because PostgREST already serves `country` (HTTP 200), the schema cache is current — **no `notify pgrst, 'reload schema'` required**.
- The Steps 3/4 shortlist/decision migration is **already applied**.
- **No database action was required.**

## If a future check finds something missing

Both migrations are idempotent (`add column if not exists`). To (re-)apply, paste into the Supabase SQL Editor for project `rbuxsuuvbeojxcxwxcjf`:

### 1. Verify (returns a row only if `country` already exists)

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'businesses'
  and column_name = 'country';
```

### 2. Apply `add_country_to_businesses` (only if step 1 returned no row)

```sql
alter table public.businesses
  add column if not exists country text default 'Australia';

update public.businesses set country = 'Australia' where country is null;
```

### 3. Reload PostgREST schema cache

```sql
notify pgrst, 'reload schema';
```

### 4. Apply Steps 3/4 (`prescreen_responses_shortlist_decision.sql`) if missing

Source of truth: `hqai/supabase/migrations/prescreen_responses_shortlist_decision.sql` (adds `shortlisted_at`, `shortlisted_by`, `decision`, `decision_reason`, `decision_at`, `decision_by` + the `decision` check constraint + shortlist index; ends with its own `notify pgrst, 'reload schema'`). Idempotent — safe to re-run.

---

*Verification method: in-memory probe script reading `SUPABASE_SERVICE_ROLE_KEY` from `hqai/.env.local`; no secrets printed or committed; script deleted after use.*
