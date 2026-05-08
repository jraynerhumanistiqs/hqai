# Phase 1 Entry-Gate Work Plan

Generated 8 May 2026 from the ratified decisions in `docs/DECISION-LOG.md`. Engineering executes every item in this list, then signals **"Internal Testing Phase Ready"** to James.

Items marked **(James)** are dashboard tasks James does himself - they cannot be automated by code.

---

## Code work (Engineering executes)

### Group A - Authentication and email branding (D1)

- [ ] Audit `app/auth/callback/route.ts` (or equivalent) - verify magic-link redirect handler completes the session set
- [ ] Verify `NEXT_PUBLIC_BASE_URL` is `https://hqai.vercel.app` in Vercel production env
- [ ] Add or fix any missing redirect handling on the auth callback
- [ ] Document the SMTP migration steps for **(James)** to set up in Supabase dashboard:
  - Resend SMTP creds for `hq.ai@humanistiqs.com.au`
  - Sender name "HQ.ai"
  - Updated email templates (magic link, signup confirmation, password reset)

### Group B - Telemetry and feedback loops (D2, D4)

- [ ] Migration: `chat_telemetry` table
- [ ] Insert per-turn telemetry from `app/api/chat/route.ts` (fire-and-forget so it never blocks the user)
- [ ] Migration: `coach_field_edits` table
- [ ] Capture AI output and user-edited final value from Campaign Coach Step 2 confirm
- [ ] Migration: `cv_screening_outputs` table
- [ ] Capture AI scores + final scores from CV Screening confirm
- [ ] Daily 06:00 AEST cron emails James + Rav a one-page Markdown summary

### Group C - Roles and feature flags (D7)

- [ ] Add `role` enum column to `profiles` table - values: `owner`, `test_admin`, `member`
- [ ] Migration to seed:
  - `jrayner@humanistiqs.com.au` -> `owner`
  - `rprasad@humanistiqs.com.au`, `srayner@humanistiqs.com.au`, `bhayes@humanistiqs.com.au`, `jharvey@humanistiqs.com.au` -> `test_admin`
- [ ] Server-side helper `requireOwner()` for any mutation route - all write/edit/delete endpoints check
- [ ] Frontend - read-only mode for `test_admin` role: action buttons hidden or disabled with tooltip "Read-only - owner approval required"
- [ ] Feature flags config (env var + per-role override): hide Strategy Coach, Team Development, Awards Interpreter, Compliance Audit from `member` role; show all to `owner` and `test_admin`

### Group D - RLS dress rehearsal (D8)

- [ ] Write RLS policies for `cv_screenings`, `cv_custom_rubrics`, `documents`, `conversations`, `messages`, `chat_audit_log`, `campaigns`, `prescreen_evaluations`
- [ ] Place in `supabase/migrations/rls_all_tables.sql`
- [ ] Add a smoke-test script that signs in as a non-admin user and tries to read another business's rows - must return zero
- [ ] Apply on staging only for Phase 1; production application is the Phase 2 entry gate

### Group E - Security alert review (D9)

- [ ] Spawn agent to review Supabase Security advisors and dashboard issues, identify all Critical alerts, propose fixes
- [ ] Output report at `docs/SUPABASE-SECURITY-REVIEW.md`

---

## James-action items (cannot be automated)

### J1 - Anthropic budget configuration (D13)

- [ ] Anthropic console -> Settings -> Limits
- [ ] Set monthly cap to $100 USD
- [ ] Set email alert at $80 USD per month
- [ ] Confirm production key name; rename if unclear

### J2 - Anthropic key separation (D14)

- [ ] Generate a second Anthropic API key in the console, label it `hqai-staging`
- [ ] Add to Vercel as `ANTHROPIC_API_KEY_STAGING` for Preview environment only
- [ ] Production env keeps existing `ANTHROPIC_API_KEY`

### J3 - Supabase SMTP migration (D1)

After Engineering provides the SMTP guide:

- [ ] Authentication -> Email Templates -> swap to custom SMTP
- [ ] Resend account: create domain verification for `humanistiqs.com.au`, generate SMTP credentials
- [ ] Sender name: HQ.ai
- [ ] Sender email: hq.ai@humanistiqs.com.au
- [ ] Customise the magic-link, signup-confirmation, and password-reset email bodies to use the HQ.ai brand voice

### J4 - Vercel auth URL config (D1)

- [ ] Vercel project -> Settings -> Environment Variables
- [ ] Verify `NEXT_PUBLIC_BASE_URL` is `https://hqai.vercel.app`
- [ ] Supabase project -> Authentication -> URL Configuration
- [ ] Site URL: `https://hqai.vercel.app`
- [ ] Redirect URLs include `https://hqai.vercel.app/auth/callback`

---

## Sequencing

Engineering can run Groups A, B, C, D, E in parallel - they touch different files.

James-action items can be done at any point but ideally before Engineering pushes the final commit so the magic-link flow can be tested with the new SMTP config.

---

## Definition of done

Phase 1 entry trigger fires when:

1. All items in Groups A through D pushed and deployed
2. Group E security review report committed
3. Engineering posts: "Internal Testing Phase Ready"
4. James completes J1-J4

At that point, James sends the kickoff message to Rav, Steve, Bianca, and Jess and Phase 1 begins.
