# HQ Performance - dev Supabase setup

Stand up a dev project, apply the migrations, seed the access-matrix fixture,
point the app at it. **About 25 minutes**, most of it waiting for the project
to provision.

Nothing here touches production. The seed script refuses to run against the
production project ref, and the migration order was verified against a
simulated empty project before this was written.

---

## 1. Create the project (~8 min, mostly waiting)

Supabase dashboard -> New project.

| Field | Value |
|---|---|
| Name | `hqai-dev` |
| Region | **Southeast Asia (Sydney) ap-southeast-2** - must match production |
| Database password | generate one, put it in your password manager |

Wait for it to finish provisioning before step 2.

## 2. Copy three values (~2 min)

Project Settings -> API:

- **Project URL** - `https://<ref>.supabase.co`
- **anon / publishable key**
- **service_role key** - dev only, and it never goes in the repo

## 3. Apply the migrations (~5 min)

SQL Editor -> New query. Paste and run each file **in this order**, waiting
for each to succeed:

1. `supabase/migrations/ppad_00_dev_prereqs.sql`
2. `supabase/migrations/ppad_businesses_entitlement.sql`
3. `supabase/migrations/ppad_01_schema.sql`
4. `supabase/migrations/ppad_02_rls.sql`
5. `supabase/migrations/ppad_03_rpcs.sql`

File 1 is **dev only**. It creates the minimum `businesses` and `profiles`
that PPAD's foreign keys need; production already has the real ones, where
it is a no-op.

All five are idempotent - re-running them is safe and changes nothing.

## 4. Turn off public sign-up on the dev project (~1 min)

Authentication -> Sign In / Providers -> **disable** "Allow new users to sign
up".

Only on dev. Production keeps it on - the paid self-serve funnel depends on
it, which is why PPAD enforces invite-only at the membership layer instead.

## 5. Write the credentials file (~2 min)

Create `hqai/.env.ppad-dev` (already gitignored):

```bash
PPAD_DEV_SUPABASE_URL=https://<your-dev-ref>.supabase.co
PPAD_DEV_SERVICE_ROLE_KEY=<dev service_role key>
PPAD_DEV_SEED=yes
```

The seed script reads `PPAD_DEV_*` rather than the app's own
`NEXT_PUBLIC_SUPABASE_*` on purpose: a stray `.env.local` cannot point it at
production by accident.

## 6. Seed the fixture (~1 min)

```bash
npm run ppad:seed
```

Creates two orgs and nine accounts, all with password
`ppad-dev-password-2026`:

| Sign in as | Should see |
|---|---|
| `ppad-admin@dev.local` | the directory and **zero** records |
| `ppad-m1@dev.local` | Eli, Erin, and their own record |
| `ppad-m2@dev.local` | Evan and Mia - **not** Eli or Erin |
| `ppad-r1@dev.local` | Eli, sign-off only |
| `ppad-e1@dev.local` | their own record only |
| `ppad-badmin@dev.local` | nothing from org A |

The admin is deliberately allocated to nobody. That is the case the whole
model turns on, so do not "fix" it by allocating them.

## 7. Point the app at dev (~2 min)

Create `hqai/.env.development.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-dev-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev anon key>
SUPABASE_SERVICE_ROLE_KEY=<dev service_role key>
```

Next loads `.env.development.local` ahead of `.env.local` in dev, so
`npm run dev` hits dev while anything built for production still hits prod.
**Delete this file when you are done**, or you will wonder why your local
dashboard is empty.

Then:

```bash
rm -rf .next && npm run dev
```

Sign in at `http://localhost:3000/login` and open HQ Tools -> HQ Performance.

## 8. Run the security advisors (~2 min)

Supabase dashboard -> Advisors -> Security. Expect zero findings against the
`ppad_*` objects. Send me anything it flags.

---

## What I need back

1. The dev **project URL** and **anon key** (not the service role key - I do
   not need it and should not have it).
2. Whether step 8 flagged anything.
3. Any error from steps 3 or 6, verbatim.

With those I can verify the signed-in path end to end: that load/split/merge
actually reassembles `person.records[cycleId]` correctly against a real
database, which is the one part of the adapter still unproven.

## Rollback

Delete the dev project. Nothing in this runbook touches production, and the
only repo artefacts are `.env.ppad-dev` and `.env.development.local`, both
gitignored and both safe to delete.
