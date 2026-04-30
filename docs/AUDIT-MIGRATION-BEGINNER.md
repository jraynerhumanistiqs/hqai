# Workplace Compliance Audit Migration - Beginner Walkthrough

This is the click-by-click version of `AUDIT-MIGRATION-RUNBOOK.md`. No prior Supabase or SQL experience assumed. Total time: about 20 minutes including reading.

## What we're actually doing (in plain English)

You have two Supabase projects:

1. **humanistiqs-audits** - the old project where you built audit features a while ago. Has tables full of audit data you want to keep.
2. **HQ.ai (rbuxsuuvbeojxcxwxcjf)** - the project that powers hqai.vercel.app. Has all your current tables (prescreen_sessions, candidates, etc).

We want to copy the audit tables OUT of project 1, and INTO project 2, so the HQ.ai website can show audit data in the "Workplace Compliance Audit" page. After this, project 1 is no longer needed.

To avoid name clashes (e.g. if both projects happened to have a table called `users`), we'll put the audit tables into their own "schema" (think of a schema like a folder inside the database) called `audit`. So instead of `users` it becomes `audit.users`.

There are 5 stages:

- **Stage A**: Get a copy of project 1's tables as a SQL file (a long text file of CREATE TABLE and INSERT INTO commands).
- **Stage B**: Edit that SQL file so the tables go into the `audit` folder instead of the default `public` folder.
- **Stage C**: Run that SQL inside project 2 (HQ.ai). Now the audit tables live in HQ.ai under the `audit` folder.
- **Stage D**: Tell project 2's API to expose the `audit` folder so the website can read it.
- **Stage E**: Send me a one-line list of what tables ended up there, so I can write the right TypeScript types and audit page UI.

Done.

---

## Before you start

Open these in browser tabs and keep them open:

- Old project: https://supabase.com/dashboard - sign in - click `humanistiqs-audits`
- New project: https://supabase.com/dashboard - sign in - click the HQ.ai project (URL ref `rbuxsuuvbeojxcxwxcjf`)
- A plain text editor on your computer. **Notepad++ or VS Code** ideal. Plain Notepad will technically work but will be slower for the find/replace step.

---

## Stage A - Get a copy of the old project's data

Go to the **humanistiqs-audits** tab.

### Option A1 - Easiest (use Supabase's built-in backup)

1. In the left sidebar click **Database**.
2. Click **Backups** (under the Database section).
3. You should see a list of recent automatic backups, one per day. If there are no backups (free tier sometimes has none), skip to A2.
4. Click the **Download** button next to the most recent backup. You'll get a `.sql` file - save it somewhere you can find it. Name it `audits-dump.sql`.

That's it for Stage A.

### Option A2 - If there are no backups available

You'll need to install one small tool. On Windows:

1. Go to https://www.postgresql.org/download/windows/ and run the installer.
2. During install, you can untick most things; only `Command Line Tools` is required. Click through.
3. Once installed, open **PowerShell** (press Windows key, type "powershell", hit Enter).

4. In the **humanistiqs-audits** Supabase dashboard, click the cog icon (Project Settings) at the bottom-left, then **Database**, then scroll to **Connection string**. Select the **URI** tab and copy the long string that starts with `postgresql://postgres:...`. It contains your password - keep it secret.

5. In PowerShell, paste this and replace the URI at the end with what you copied:

   ```
   pg_dump --schema=public --no-owner --no-privileges --no-publications --no-subscriptions --file=audits-dump.sql "PASTE_URI_HERE"
   ```

6. Hit Enter. After 10-30 seconds you'll have `audits-dump.sql` in whatever folder PowerShell was sitting in (run `pwd` to see).

---

## Stage B - Edit the SQL file (rename `public` to `audit`)

Open `audits-dump.sql` in Notepad++ or VS Code.

This file is just text - thousands of lines of `CREATE TABLE`, `INSERT INTO`, `ALTER TABLE` etc. Right now every line that mentions a table looks like `public.something`. We need every one of those to become `audit.something`.

**The safest find/replace - do these 4 in this exact order. Do NOT skip any. Do NOT do them in a different order.**

1. **Press Ctrl+H** to open Find/Replace.
2. **First pass**:
   - Find: `CREATE SCHEMA IF NOT EXISTS public;`
   - Replace with: `CREATE SCHEMA IF NOT EXISTS audit;`
   - Click **Replace All**. (If the message says "0 replacements" that's fine - it just means the line didn't appear.)
3. **Second pass**:
   - Find: `SET search_path = public,`  (note the comma at the end)
   - Replace with: `SET search_path = audit,`
   - Click **Replace All**.
4. **Third pass** - this is the big one:
   - Find: ` public.`  (note the **leading space** before "public" - this is important, it's what stops the rename touching things it shouldn't)
   - Replace with: ` audit.`
   - Click **Replace All**. You should see lots of replacements.
5. **Fourth pass**:
   - Find: `"public"."`
   - Replace with: `"audit"."`
   - Click **Replace All**.

Save the file. You can save over the original or save as `audits-migration.sql` - either works. I'll call it `audits-migration.sql` from here.

> **Sanity check**: scroll through the file. Every `CREATE TABLE` line should now read `CREATE TABLE audit.<tablename>`. If you still see `CREATE TABLE public.<tablename>` somewhere, your third find/replace didn't catch it - run it again.

---

## Stage C - Load the SQL into the HQ.ai project

Switch to your **HQ.ai project** Supabase tab.

### C1 - Prep the audit folder (run this first)

1. In the left sidebar, click the **SQL Editor** icon (looks like a `>_` terminal icon).
2. Click **New query** (top right).
3. Paste this in:

   ```sql
   create schema if not exists audit;
   grant usage on schema audit to anon, authenticated, service_role;
   alter default privileges in schema audit grant all on tables to service_role;
   alter default privileges in schema audit grant select on tables to authenticated;
   ```

4. Click the green **Run** button (or press Ctrl+Enter).
5. You should see "Success. No rows returned." That means the `audit` folder now exists in HQ.ai's database.

### C2 - Add the helper function I wrote

The HQ.ai codebase already calls a small helper function `audit_list_tables()` to check whether the migration has landed. We need to install it.

1. Still in the SQL Editor, click **New query** again.
2. Open the file `supabase/migrations/audit_schema_helpers.sql` from the codebase (I created it for you).
3. Copy its entire contents and paste into the SQL Editor.
4. Click **Run**. Success message expected.

### C3 - Load your audit data

1. Click **New query** one more time.
2. Open `audits-migration.sql` (the file you edited in Stage B) in your text editor.
3. **Select all** (Ctrl+A), **copy** (Ctrl+C).
4. Paste into the SQL Editor.

> **If the file is huge** (more than ~500 KB) the browser SQL editor may struggle. In that case, split it: copy the `CREATE TABLE` chunks first, run, then copy the `INSERT INTO` chunks, run. Or use Path A2's PowerShell with `psql` instead - ask me for the exact command if you hit this.

5. Click **Run**.
6. Watch for errors at the bottom. If you see green "Success", you're done with Stage C. If you see red errors, screenshot the message and send it to me - I'll fix the find/replace pattern.

---

## Stage D - Tell the API the new folder exists

By default, Supabase only exposes the `public` folder over its API. We need to tell it about `audit` too.

1. In the HQ.ai project, click the cog (**Project Settings**) at the bottom-left.
2. Click **API** in the settings list.
3. Scroll down to **Exposed schemas**. There's a comma-separated list, probably reading `public, graphql_public`.
4. Add `audit` to that list - so it becomes `public, graphql_public, audit`.
5. Click **Save**.

---

## Stage E - Tell me what landed

Last step. You're going to run one query that asks the database to list every table that ended up in the `audit` folder, with its columns.

1. Back in the **SQL Editor**, click **New query**.
2. Paste:

   ```sql
   select
     table_name,
     string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position) as columns
   from information_schema.columns
   where table_schema = 'audit'
   group by table_name
   order by table_name;
   ```

3. Click **Run**.
4. The output will look like a small table in the bottom of the SQL editor. It might be 5 rows, might be 20 - depends on how many tables your old project had.
5. **Copy the entire output** (there's usually a small "Copy as JSON" or "Copy as CSV" button near the result, or just click and Ctrl+A inside the table) and paste it into our chat.

That's everything you need to do.

---

## How to know it worked

After Stage D, in your browser go to: `https://hqai.vercel.app/api/audit/health`

You should see a small JSON response like `{"ok": true, "tables": ["assessments", "responses", ...]}`. If you see that, the migration is fully wired and the audit page on the dashboard will switch from "Coming Soon" to a list of connected tables.

If you see `{"ok": false, ...}` or an error page, something in Stages C or D didn't fully work - send me the error and I'll diagnose.

---

## What I do once you've sent me the Stage E output

1. Fill in `lib/audit/types.ts` with the real TypeScript shapes for each audit table.
2. Replace the placeholder UI on `app/dashboard/compliance/audit/page.tsx` with proper assessment views (lists, filters, detail pages).
3. Write `supabase/rls_audit.sql` to lock down the audit tables so each business only sees their own data.
4. Re-add a sidebar link to the audit page (it's currently routable but not in the nav).

You don't need to do anything for those four - they're code on my side once I know the schema.

---

## Things that commonly trip people up

- **Forgetting Stage B** (the find/replace). If you skip it, the SQL will try to write into `public` and either collide with existing HQ.ai tables or just dump everything into the wrong folder. Always verify the find/replace before running C3.
- **Skipping Stage D**. If you don't expose the schema, the API still can't see the tables even though they exist. The audit page will still say "Coming Soon" and the health endpoint will say `{"ok": false}`.
- **Pasting credentials into chat**. Your Supabase password lives inside the connection string from Stage A2. **Never paste the connection string into our chat.** I don't need it. The dump and restore are both run by you locally.
- **"It says my table already exists"**. If you re-run the migration twice without dropping first, you'll get errors. Rollback with `drop schema audit cascade;` and start Stage C again.

If anything looks off at any point, screenshot what you're seeing and drop it in chat - I'd rather diagnose with you mid-flight than have you push through on a broken state.
