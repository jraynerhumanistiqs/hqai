# HQ Performance

Annual performance planning and appraisal. Plan, perform, assess, develop.

Sold as a per-business add-on, not part of any plan.

---

## The one rule

**Nobody reads a performance record unless they are its subject or hold a live
allocation to that person.** Not managers-by-title, not team leads, not
admins.

An admin who wants to read a record must allocate themselves, and doing so
writes an `allocation.self_grant` entry to the audit log. There is no way
around it and that is the point - the rest of this document is detail.

---

## How it is put together

| | |
|---|---|
| Route | `/dashboard/tools/ppad` - an ordinary dashboard page |
| The tool | `public/tools/ppad/app.html` + `app.css` + `app.js`, in a same-origin iframe |
| Storage | `public/tools/ppad/ppad-store.js` - Supabase adapter |
| Session | `/api/ppad/session` |
| Invites | `/api/ppad/invite` |
| Tables | `ppad_members`, `ppad_org_config`, `ppad_position_descriptions`, `ppad_people`, `ppad_records`, `ppad_allocations`, `ppad_audit_log` |

### Why an iframe

The tool is ~1,400 lines written to own a whole document. It binds
`input`/`change`/`click` at the document root and acts on any element with
`data-act`, it routes on `location.hash`, and its CSS is unscoped element
selectors. Inline, it would fire on sidebar clicks, fight the Next router and
leak styles both ways. A same-origin iframe isolates all three while the page
around it stays a normal dashboard route - and being same-origin, the adapter
reads the existing auth cookie, so there is no second login.

### Why records are their own table

The app thinks in `person.records[cycleId]`. The database keeps directory data
(`ppad_people`) and performance data (`ppad_records`) apart. **That split is
the security boundary** - it is what lets an admin run the staff directory
without reading anyone's assessment. The adapter reassembles the two on load
and splits them again on save.

---

## Environment variables

No new ones. It uses what the app already has:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - the browser
  reaches PostgREST directly with the user's own token
- `SUPABASE_SERVICE_ROLE_KEY` - server only, used by `/api/ppad/invite` and
  only after the caller has been proved an admin

`NEXT_PUBLIC_SUPABASE_URL` is also read at build time for the route's CSP
`connect-src`. If it is unset the origin is omitted rather than guessed, which
fails visibly in the browser instead of allowing something wrong.

---

## Adding an organisation

1. Apply the migrations if the project has not had them (see Rollback below
   for the list and order).
2. Edit the email at the top of
   `supabase/migrations/ppad_bootstrap_first_admin.sql` and run it. It enables
   the add-on for that person's business, makes them an admin, seeds an org
   config with a first cycle, and audits itself.
3. Sign in and open **HQ Tools -> HQ Performance**. The setup screen asks for
   the organisation name, colour and logo.
4. The 17 default competencies and 5 role profiles seed themselves on first
   load. Edit them in **Settings**.

There is no self-serve path to becoming the first admin: `ppad_set_member`
requires you to already be one. Breaking that circle is deliberately a manual
act.

### Without the add-on

`businesses.ppad_enabled` defaults false. The HQ Tools tab is visible to every
business by design - it doubles as the upsell - and the route shows an upsell
panel instead of the tool. The flag is a usability gate, **not** the data
boundary: every row is behind RLS regardless.

---

## Inviting users

**Users and access** -> *Invite someone*. They get an email with a link to set
a password.

An invited user sees nothing until you either link them to a person or
allocate them. That is correct, not a bug.

An email that already belongs to an account in **another** business is
refused rather than reassigned - that would hand one customer's staff member
to another customer's org.

Public sign-up stays on for the rest of the site. Invite-only for this tool is
enforced at the membership layer, because the paid self-serve funnel depends
on open sign-up.

---

## Managing allocations

**Users and access** is the whole surface.

- **Is this person** - links a login to a directory row. This is what makes
  that person's record *theirs*. One login per person, one person per login;
  re-linking moves it.
- **Admin** - manages the org. Grants **no** access to any record.
- **HR reporting** - reads ratings org-wide through `ppad_report_summary`.
  Scores only: never comments, check-in notes, development detail or
  self-appraisal text. A separate grant from admin, on purpose.
- **Manages** - a manager allocation. The only way to create or edit someone's
  record.
- **Reviews** - a reviewer allocation. Read the record, write the reviewer
  sign-off, nothing else.

Ending an allocation removes access immediately, **including to past cycles**.
The row is kept with an `ended_at` so "who could see this in March" stays
answerable.

### Who can write what

Enforced in `ppad_save_record`, not the UI. The function rebuilds the document
the caller is allowed to produce and compares it to what they sent; anything
else is refused, naming the field.

| | Employee | Manager | Reviewer | Admin |
|---|---|---|---|---|
| KPI name, target, weight | read | **write** | read | - |
| KPI self-rating | **write** | read | read | - |
| KPI manager rating, result | read* | **write** | read | - |
| Competency target | read | **write** | read | - |
| Competency self / manager | **write** / read* | read / **write** | read | - |
| Achievements (employee) | **write** | read | read | - |
| Manager's comment, overall, rationale | read* | **write** | read | - |
| Check-ins, stretch, development actions | read | **write** | read | - |
| Career goals | **write** | read | read | - |
| Employee sign-off | **write** | read | read | - |
| Manager sign-off | read | **write** | read | - |
| Reviewer sign-off | read | read | **write** | - |

`read*` = **withheld until the manager signs off.** Before that the employee
sees "Your manager's assessment has not been released yet". Withholding is
done server-side in `ppad_redact_for`; the UI only explains it.

Admin has no column because an admin reads and writes a record only through an
allocation, exactly like anyone else.

**Sign-off locks the record.** Once all three dates are set it is read-only;
only an admin can unlock, and the unlock is audited.

---

## Exports

The JSON export in Settings is **scoped to the signed-in user** - the people
and assessments they can see, not the organisation. An admin with no
allocations gets the directory and no assessments, and the file says so in a
`scope` block.

A full-organisation export cannot be produced from inside the tool without
breaking the access rules the tool exists to enforce. That is a database-level
job.

---

## Backups

Point-in-time recovery is **off** on this project (planned closer to launch).
The recovery floor is Supabase's daily backup, so worst case is up to 24 hours
of assessments. Until PITR is on:

- export at the end of each cycle, and
- treat every migration as having no undo - write the rollback first.

Removing a cycle does **not** delete its records. It disappears from the
selector; the rows stay. Deliberate, with no PITR behind it.

---

## Tests

```bash
npm run test:ppad        # 50 node tests - the access model, against real Postgres
npm run test:ppad:e2e    # 24 Playwright tests - what each role is shown
```

`test:ppad` runs the real migrations in PGlite and drives every assertion as
the user, through the same `auth.uid()` mechanism Supabase uses. It proves the
**rules**.

`test:ppad:e2e` stubs the session and PostgREST so a browser can be driven as
any role with no credentials. It proves the **interface honours** them.

Neither substitutes for the other.

```bash
PPAD_E2E_SCREENSHOTS=1 npx playwright test --project=desktop -g @screenshots
```

---

## Rollback

### The route and the link

Revert the branch. The tool is additive: `app/dashboard/tools/ppad/`,
`app/api/ppad/`, `public/tools/ppad/`, `public/vendor/`. Three existing files
change and are the only things a revert touches elsewhere:

- `components/sidebar/Sidebar.tsx` - the HQ Recruit and HQ Tools groups and
  the AI -> HQ renames
- `next.config.js` - the route's headers and CSP
- `app/layout.tsx` - analytics wrapped so this route can be excluded

Reverting the sidebar restores the flat nav and the "AI Advisor" / "AI
Assistant" labels. No route changes, so no links break.

### Turning it off without reverting

```sql
update businesses set ppad_enabled = false;
```

Every business sees the upsell panel instead of the tool. Data untouched.

### The migrations

Applied in this order:

```
ppad_businesses_entitlement.sql
ppad_01_schema.sql
ppad_02_rls.sql
ppad_03_rpcs.sql
ppad_04_admin_rpcs.sql
ppad_05_release_gate.sql
ppad_bootstrap_first_admin.sql   (once per business)
```

`ppad_00_dev_prereqs.sql` is for an empty dev project only and must **never**
run against production - it adds policies to `businesses` and `profiles`.

To reverse, in this order:

```sql
-- 05: restore the direct read
drop function if exists ppad_list_records(), ppad_read_record(text,text),
  ppad_redact_for(jsonb,boolean), ppad_sees_manager_half(uuid,text,jsonb);
grant select on ppad_records to authenticated;
create policy ppad_records_select on ppad_records for select to authenticated
  using (ppad_can_read_record(business_id, person_id));

-- 04
drop function if exists ppad_list_members(), ppad_list_allocations(boolean),
  ppad_link_person(uuid,text);

-- 03
drop function if exists ppad_save_record(text,text,jsonb,timestamptz),
  ppad_start_cycle(text,text,text,jsonb), ppad_set_allocation(text,uuid,text),
  ppad_end_allocation(uuid), ppad_set_member(uuid,boolean,boolean),
  ppad_unlock_record(text,text), ppad_report_summary(text);

-- 02
drop function if exists ppad_business_id(), ppad_is_member(uuid),
  ppad_is_admin(uuid), ppad_is_hr_reporting(uuid), ppad_is_self(uuid,text),
  ppad_is_allocated(uuid,text,text), ppad_can_read_record(uuid,text);

-- 01 - DESTROYS EVERY RECORD. Export first; there is no PITR.
drop table if exists ppad_audit_log, ppad_allocations, ppad_records,
  ppad_people, ppad_position_descriptions, ppad_org_config, ppad_members
  cascade;

-- entitlement
alter table businesses drop column if exists ppad_enabled;
```

Dropping only 01 is enough to remove the feature entirely. Reverting the app
code without dropping anything is safe and reversible - the tables simply sit
unused.
