# Supabase Security Review - Critical Alert Triage and Remediation

**Project:** HQ.ai (`https://rbuxsuuvbeojxcxwxcjf.supabase.co`)
**Author:** Engineering (security review agent)
**Date:** 8 May 2026
**Scope:** Read-only configuration audit. Decision (per `docs/POST-DEMO-REPORT-NATHAN.md` issue 3.6 and `docs/PHASE-1-ENTRY-WORK.md` Group E) is to **stay on Supabase** and action every Critical-tier alert via review. Neon migration is rejected.

This document satisfies Group E (D9) of the Phase 1 entry work plan. It is the security gate James must clear before flipping the production switch on RLS for Phase 2.

---

## 1. Configuration audit (read-only)

The following table captures the current posture of the Supabase project as inferred from the repo (`CLAUDE.md`, `lib/supabase/*`, `supabase/schema.sql`, `supabase/rls_prescreen.sql`, `supabase/migrations/*`). Items marked **Pending Owner verification** require James to log into the Supabase dashboard and confirm; the agent cannot reach the project from outside.

| Area | Current state (inferred) | Risk | Verification step for James |
|---|---|---|---|
| **Auth - providers** | Email + magic link in use (per `docs/POST-DEMO-REPORT-NATHAN.md` 3.1). | Low if email-only; medium if anonymous sign-in is silently enabled. | Authentication -> Providers - confirm only Email is on, Anonymous is OFF. |
| **Auth - Site URL / redirects** | `NEXT_PUBLIC_BASE_URL=https://hqai.vercel.app` per `CLAUDE.md`. | Magic-link bug in 3.1 suggests Site URL or redirect allow-list may be wrong. | Authentication -> URL Configuration. Site URL = `https://hqai.vercel.app`. Redirect URLs include `/auth/callback` and any Vercel preview pattern needed. |
| **Auth - email confirmation** | Unknown - no code reference. | Without confirmation, anyone can sign up with a typo'd or someone else's email. | Authentication -> Providers -> Email - "Confirm email" must be ON. **Pending Owner verification.** |
| **Auth - password leak detection** | Default off in older projects. | Users can reuse known-breached passwords. | Authentication -> Policies / Password Protection - turn ON "Leaked password protection". **Pending Owner verification.** |
| **Auth - OTP expiry** | Default Supabase value is 1 hour. Project default may be longer if changed. | OTP / magic-link tokens valid too long broaden the phishing window. | Authentication -> Email -> "Email OTP expiry" - set to 600 seconds (10 minutes) or less. **Pending Owner verification.** |
| **Auth - rate limits** | Default Supabase limits. | Default limits are permissive for production. | Authentication -> Rate Limits - review per-endpoint limits. **Pending Owner verification.** |
| **RLS state per table** | **Disabled on every table except via `rls_prescreen.sql` which is drafted but not applied.** Confirmed by `CLAUDE.md` ("RLS is disabled - re-enable before commercial launch"). | **Critical.** Any logged-in user can read/write any row. | Database -> Tables - every public-schema table must show `RLS enabled`. See section 3 for the remediation script. |
| **Exposed schemas (PostgREST)** | Default `public` schema is exposed. | Tables with no RLS are reachable from `anon` and `authenticated` JWT in the browser. | Settings -> API -> Exposed schemas - keep `public` only. Move helper tables to a private schema (e.g. `internal`) where appropriate. |
| **API key exposure** | `SUPABASE_SERVICE_ROLE_KEY` is server-only - confirmed by Grep across `components/`, all client-side files. Only `lib/supabase/admin.ts` uses it. The anon key has the `NEXT_PUBLIC_` prefix and is correctly client-side. | Low (correctly configured). | None. Continue to never reference `SUPABASE_SERVICE_ROLE_KEY` from any file under `app/`, `components/`, `pages/` that lacks `'server-only'` import. |
| **CORS** | Default Supabase wildcard for the API. | Acceptable for PostgREST; relies on RLS to enforce row access. | None. RLS is the actual control. |
| **`SECURITY DEFINER` functions** | Project uses pgvector helpers and audit helpers (`audit_schema_helpers.sql`, `enable_pgvector_rag.sql`). | If any function is `SECURITY DEFINER` without `SET search_path = ''`, an attacker can hijack via the search path. | Database -> Functions - audit each user-defined function. **Pending Owner verification.** |
| **Foreign tables / extensions** | `pgvector` confirmed enabled. | `pgvector` is fine. Foreign data wrappers (e.g. `postgres_fdw`, `wrappers`) are dangerous if exposed via PostgREST. | Database -> Extensions - confirm only required extensions are on. **Pending Owner verification.** |
| **Storage policies** | Cloudflare Stream is the video store, not Supabase Storage. Logo upload route uses service-role client (`app/api/upload-logo/route.ts`). | Low if Storage is unused for sensitive content. | Storage -> Policies - confirm no public buckets contain candidate or business data. **Pending Owner verification.** |
| **Database webhooks / cron** | Daily 06:00 AEST cron is planned (Group B telemetry digest). | Webhooks signed with weak secrets are a privilege-escalation vector. | Database -> Webhooks - check signing secret length and rotation. **Pending Owner verification.** |

---

## 2. Common Supabase Critical-tier alerts and remediation

Supabase's Security Advisor (Database -> Advisors -> Security) lints the project nightly and flags issues in three tiers: ERROR (Critical), WARN, INFO. The list below covers the alerts HQ.ai should expect to see on first run, with remediation for each. Cited URLs go to the upstream Supabase guidance.

### 2.1 Tables without RLS enabled (ERROR / Critical)

Lint name: `rls_disabled_in_public`. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

**Why it matters.** When a table lives in the `public` schema and is exposed via PostgREST, any holder of the anon or authenticated JWT can `select`, `insert`, `update`, `delete` rows via `supabase-js` directly from the browser. That includes scripts running on a tab that has logged in.

**Tables in HQ.ai expected to trip this:** `profiles`, `businesses`, `prescreen_sessions`, `candidate_responses`, `cv_screenings`, `cv_custom_rubrics`, `documents`, `conversations`, `messages`, `chat_audit_log`, `campaigns`, `prescreen_evaluations`, `chat_telemetry` (new), `coach_field_edits` (new), `cv_screening_outputs` (new).

Remediation - see section 3.1.

### 2.2 Public schema exposure to the anon role (ERROR / Critical)

Lint name: `policy_exists_rls_disabled` or `rls_enabled_no_policy`. Reference: https://supabase.com/docs/guides/database/postgres/row-level-security

If RLS is enabled on a table but no policies exist, every read returns zero rows. If RLS is disabled and the schema is exposed, the anon role can read everything. Both are common during migrations.

Remediation - section 3.2.

### 2.3 Function `SECURITY DEFINER` without `search_path` set (ERROR / Critical)

Lint name: `function_search_path_mutable`. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

`SECURITY DEFINER` functions execute with the owner's privileges. If `search_path` is not pinned, an attacker who can create objects in a schema higher in the search path (e.g. `pg_temp`) can override functions like `lower()` and execute arbitrary SQL as the function owner.

Remediation - section 3.3.

### 2.4 Missing email confirmation (WARN promoted to Critical for production)

Reference: https://supabase.com/docs/guides/auth/auth-email#enable-email-confirmations

If "Confirm email" is off, attackers can sign up with a victim's email, occupy that account, and harvest password-reset emails sent later. For HQ.ai's pilot users this would let a bad actor pre-register `someone@bigclient.com.au`.

Remediation - dashboard toggle, section 3.4.

### 2.5 Auth password leak detection disabled (WARN / Critical pre-launch)

Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Supabase can check newly chosen passwords against the HaveIBeenPwned database. Off by default in older projects.

Remediation - dashboard toggle, section 3.5.

### 2.6 Unused indexes contributing to slow queries (INFO / Performance)

Lint name: `unused_index`. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

Not Critical for security but slow queries amplify a DoS. Cleaning up indexes after migration tightens the slowest endpoints (chat history fetch, telemetry rollups).

Remediation - section 3.6.

### 2.7 Auth OTP long expiry (WARN / Critical)

Reference: https://supabase.com/docs/guides/auth/auth-email#configuring-otp-and-magic-link-expiry

A 24-hour OTP is the worst-case default in some projects. The magic-link issue Nathan flagged (3.1) compounds this - long-lived links sitting in inboxes are phishable.

Remediation - dashboard, section 3.7.

### 2.8 Auth Anonymous Sign-in enabled when not needed (WARN / Critical for HQ.ai)

Reference: https://supabase.com/docs/guides/auth/auth-anonymous

HQ.ai does not use anonymous auth. The candidate prescreen flow uses the service-role client server-side, not anonymous sessions. If this provider is on, an attacker can spin up unlimited disposable identities to probe RLS policies.

Remediation - section 3.8.

### 2.9 Service role key embedded client-side (Critical, verified clean)

**Verification result.** Grep across the repo confirms `SUPABASE_SERVICE_ROLE_KEY` appears only in:
- `lib/supabase/admin.ts` (server-only client)
- `lib/rag.ts`, `lib/audit/client.ts` (server modules)
- API routes under `app/api/...` (server-only)
- Ingest scripts under `scripts/ingest/*` (Node CLI, not bundled)

No occurrences in `components/` or in any file that ships to the browser. **Status: PASS.** Continue this discipline. Add a CI grep to fail the build if `SUPABASE_SERVICE_ROLE_KEY` appears in a file with a `'use client'` directive.

### 2.10 Foreign tables exposed via PostgREST (ERROR / Critical if hit)

Lint name: `foreign_table_in_api`. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0017_foreign_table_in_api

If `postgres_fdw` or the `wrappers` extension is enabled and a foreign table sits in `public`, PostgREST publishes it. Best practice is to keep foreign tables in a private schema.

Remediation - section 3.10.

### 2.11 Insufficient rate limits on auth endpoints (Critical pre-launch)

Reference: https://supabase.com/docs/guides/auth/rate-limits

Default rate limits are friendly for development. For a production HR/recruitment tool we should tighten:
- Magic-link / OTP requests per IP per hour
- Sign-up attempts per IP per hour
- Password reset requests per email per hour

Remediation - dashboard, section 3.11.

---

## 3. Remediation steps (copy-paste ready)

Apply each via Supabase **SQL Editor** (Database -> SQL Editor -> New query) unless noted. Run on staging first, then production once Phase 1 internal pilot completes.

### 3.1 Enable RLS on every public table

```sql
-- Loop helper - enables RLS on every base table in public schema.
-- Run this once. Idempotent.
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end$$;
```

Then apply the per-table policies. The base pattern for HQ.ai is `business_id = (select business_id from profiles where id = auth.uid())`. The drafted policies in `supabase/rls_prescreen.sql` cover `prescreen_sessions` and `candidate_responses`. Replicate for each remaining table - the policy file targeted by Group D (`supabase/migrations/rls_all_tables.sql`) is the home for these.

Smoke test from Group D must run green before flipping production.

### 3.2 Confirm every RLS-enabled table has at least one policy

```sql
-- Tables with RLS on but no policies = silently empty for non-superusers.
select t.schemaname, t.tablename
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
  and t.rowsecurity = true
  and p.policyname is null;
```

If this query returns rows, those tables need policies before deploy.

### 3.3 Pin `search_path` on every `SECURITY DEFINER` function

```sql
-- Audit
select n.nspname as schema, p.proname as function, p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef = true;
```

For each row returned, alter the function:

```sql
alter function public.<function_name>(<args>) set search_path = '';
```

When writing new functions, always include:

```sql
create or replace function public.example()
returns void
language plpgsql
security definer
set search_path = ''      -- mandatory
as $$ begin ... end; $$;
```

### 3.4 Turn on email confirmation (dashboard)

Authentication -> Providers -> Email -> toggle **Confirm email** to ON. Save. Existing accounts are unaffected; new sign-ups must click the confirmation link.

### 3.5 Turn on leaked password protection (dashboard)

Authentication -> Policies (or Password Protection in newer UI) -> toggle **Leaked password protection** ON. Reference: https://supabase.com/docs/guides/auth/password-security

### 3.6 Drop unused indexes

```sql
-- Show indexes that have never been used since last stats reset.
select s.schemaname, s.relname as table, s.indexrelname as index,
       pg_size_pretty(pg_relation_size(s.indexrelid)) as size, s.idx_scan
from pg_stat_user_indexes s
where s.idx_scan = 0
  and s.schemaname = 'public'
order by pg_relation_size(s.indexrelid) desc;
```

Drop carefully (some are needed for foreign keys even if `idx_scan = 0`):

```sql
drop index if exists public.<index_name>;
```

Wait at least 7 days of production traffic before pruning, otherwise low-traffic indexes look unused.

### 3.7 Shorten OTP / magic-link expiry (dashboard)

Authentication -> Email Templates / Settings -> **Email OTP expiry** - set to `600` (seconds). Same screen, **Magic link expiry** - set to `600`. Save.

### 3.8 Disable anonymous sign-in (dashboard)

Authentication -> Providers -> Anonymous -> toggle OFF. If it shows "already disabled", note that in the verification log.

### 3.9 (Reserved - service-role key already verified clean.)

Add this guard to CI (e.g. `.github/workflows/security.yml`):

```yaml
- name: Forbid service-role key in client code
  run: |
    ! grep -rE "SUPABASE_SERVICE_ROLE_KEY" components/ app/ \
        --include="*.tsx" --include="*.ts" \
      | grep -v "server-only" \
      | grep -v "app/api/"
```

### 3.10 Hide foreign tables from PostgREST

```sql
-- Check
select foreign_table_schema, foreign_table_name
from information_schema.foreign_tables
where foreign_table_schema = 'public';
```

If anything appears, move it:

```sql
create schema if not exists private;
alter foreign table public.<name> set schema private;
```

Then in Settings -> API -> Exposed schemas, ensure `private` is **not** listed.

### 3.11 Tighten auth rate limits (dashboard)

Authentication -> Rate Limits. Recommended starting values for HQ.ai's pilot scale:

| Endpoint | Recommended | Notes |
|---|---|---|
| Sign-up | 30 per hour per IP | Tightens drive-by registration |
| Sign-in (password) | 30 per hour per IP | Slows credential stuffing |
| OTP / magic link | 30 per hour per IP and 5 per hour per email | Prevents inbox flooding |
| Password reset | 5 per hour per email | Prevents reset-link bombing |
| Token refresh | 1800 per hour per IP | Generous for legitimate usage |

Reference: https://supabase.com/docs/guides/auth/rate-limits

---

## 4. Pre-Phase-2 production RLS checklist

Tick every item before flipping production RLS. Each line is a single dashboard click or one SQL block from section 3.

- [ ] **Staging RLS soak.** All policies from `supabase/migrations/rls_all_tables.sql` applied to staging for at least 5 calendar days with at least 100 staff API requests logged and zero `403`/`PGRST` policy errors in Vercel logs.
- [ ] **Smoke test green.** Group D smoke-test script (signs in as `test_admin` from business A, queries business B rows) returns zero rows on every table.
- [ ] **Security Advisor cleared.** Database -> Advisors -> Security shows zero ERROR-tier findings on staging.
- [ ] **Service-role guard.** CI step from 3.9 added and passing.
- [ ] **Auth toggles.** Email confirmation ON, leaked-password protection ON, anonymous OFF, OTP expiry <= 600s.
- [ ] **Rate limits.** Section 3.11 values applied.
- [ ] **Search-path audit.** Query in 3.3 returns zero rows where `prosecdef = true and search_path is null`.
- [ ] **Foreign tables.** Query in 3.10 returns zero rows in `public`.
- [ ] **API surface review.** Settings -> API -> Exposed schemas contains only `public`.
- [ ] **Backups verified.** Database -> Backups - daily backups enabled and the last 7 are healthy. Test restore on a staging branch.
- [ ] **Owner sign-off.** James reviews the staging Security Advisor screen and signs the line below in the Decision Log.
- [ ] **Rollback plan written.** One-line revert path for each policy file documented in the migration commit message.
- [ ] **Production switch.** Apply `rls_all_tables.sql` to production during a low-traffic window (Saturday morning AEST). Watch Vercel logs for 30 minutes.

---

## 5. Risk register - medium today, Critical post-launch

| ID | Risk | Today's severity | Post-launch severity | Trigger that promotes it | Mitigation cadence |
|---|---|---|---|---|---|
| R1 | RLS gaps on tables added after Phase 2 (forgetting to enable RLS on a new migration). | Medium | Critical | First new table merged after Phase 2. | CI job that fails the build if any new `public.*` table lacks `enable row level security` in the same migration. |
| R2 | Service-role key rotation. The current key has been live since project creation. | Medium | Critical at >50 paying users. | First production paying customer. | Rotate every 90 days. Calendar reminder owned by James. Use Vercel env-var versioning to pre-stage the new key. |
| R3 | Anon key rotation. Less sensitive but still a fingerprint for the project. | Low | Medium | Public marketing launch (Step F). | Rotate every 12 months or after any suspected leak. |
| R4 | Audit log retention. `chat_audit_log` and `chat_telemetry` will grow unbounded. | Low | Medium | First 1M rows. | Add a partitioning or rolling-window retention policy. 90 days for chat content, 13 months for aggregate telemetry. |
| R5 | Backup restore drill never run. | Medium | Critical at first paid customer. | Phase 2 production cutover. | Quarterly restore drill on a staging branch. Document RTO/RPO. |
| R6 | `SECURITY DEFINER` proliferation as we add RPC helpers. | Low | High | Adding any RPC for cross-business analytics. | Section 3.3 query added to the same CI job as R1. |
| R7 | PostgREST schema sprawl. Adding `internal` or `analytics` schemas and accidentally exposing them. | Low | High | Any future analytics work. | Settings -> API change requires a code review tag in the migration PR. |
| R8 | Magic-link phishing. Long expiry plus a successful spoof of the `humanistiqs.com.au` domain. | Medium | High | First high-value client onboarded. | SPF/DKIM/DMARC on `humanistiqs.com.au` (covered by Resend setup in J3). Combine with section 3.7. |
| R9 | Storage bucket leakage if Supabase Storage is later adopted. Currently mitigated by using Cloudflare Stream. | Low | Critical if buckets are added | First time we move a candidate document into Supabase Storage. | Default-deny bucket policy template; never create a public bucket. |
| R10 | Postgres version drift. Supabase periodically deprecates older versions. | Low | Medium | Any deprecation notice. | Subscribe James to Supabase status emails. Plan a maintenance window once a year. |
| R11 | Unused indexes plus large telemetry tables degrade query latency, opening DoS amplification. | Low | Medium | After 3 months of telemetry. | Run section 3.6 query monthly. |
| R12 | Cron / database webhook secrets stored as plain env vars. | Low | High | First webhook receiver added. | Use Supabase Vault for secrets above the anon-key tier. Reference: https://supabase.com/docs/guides/database/vault |
| R13 | OAuth providers added later (Google, Microsoft) without redirect-URL hygiene. | Not present today | Critical the day a provider is added | Decision to add SSO. | Re-run section 1 and lint redirect URLs before merging the provider config. |

---

## 6. References

- Supabase database linter index: https://supabase.com/docs/guides/database/database-linter
- Row Level Security guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Auth email confirmation: https://supabase.com/docs/guides/auth/auth-email
- Password security and leak detection: https://supabase.com/docs/guides/auth/password-security
- Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits
- Anonymous sign-in: https://supabase.com/docs/guides/auth/auth-anonymous
- Vault (secret storage): https://supabase.com/docs/guides/database/vault
- Production checklist: https://supabase.com/docs/guides/platform/going-into-prod

---

## 7. Sign-off

This review concludes that staying on Supabase is acceptable provided every item in section 4 is ticked before Phase 2 production cutover. The single largest residual risk is R1 (RLS regressions on future migrations); the proposed CI guard closes that loop.

Owner verification items remain - they are listed inline in section 1 and require James to log into the Supabase dashboard. Once those are confirmed, Engineering can sign off Group E (D9) of the Phase 1 entry-gate work.
