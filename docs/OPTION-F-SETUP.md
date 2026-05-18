# OPTION F - Dynamic logo injection + bias-trigger anonymisation

Two-step setup the founder runs in the Supabase dashboard. The code
side is already shipped; these are the manual data-layer steps.

## 1. Run the migration

Open the SQL editor in Supabase and paste the contents of:

  supabase/migrations/option_f_logo_and_bias.sql

It is idempotent (every `add column` is `if not exists`).

## 2. Create the storage buckets

In the Supabase Storage UI, create two buckets:

| Name        | Public | Purpose                                       |
|-------------|--------|-----------------------------------------------|
| `logos`     | YES    | Stores client logos. Read via public URL.     |
| `documents` | NO     | Stores generated .docx. Read via signed URL.  |

## 3. Add the storage RLS policies

Paste this into the SQL editor:

```sql
create policy "Authenticated upload to logos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos');

create policy "Authenticated update logos" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos');

create policy "Authenticated delete logos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos');

create policy "Public read logos" on storage.objects
  for select using (bucket_id = 'logos');

create policy "Authenticated upload to documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents');

create policy "Authenticated read documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents');
```

## 4. Smoke test

1. Log in to HQ.ai.
2. Settings → Upload logo (PNG or JPG). Confirm preview renders.
3. AI Administrator → generate any document (eg Letter of Offer).
4. Download the .docx and confirm the logo appears in the header.

## Bias-trigger anonymisation - what changed

- `businesses.auto_anonymise_candidates` (default `true`) - flips the
  whole tenant into anonymous-by-default mode.
- `prescreen_sessions.anonymise_candidates` (default `true`) - per
  role override. Toggle off if a role genuinely needs name-visible
  shortlists (eg internal mobility where the recruiter already knows
  the people).
- `cv_screenings.bias_signals` / `prescreen_responses.bias_signals`
  text arrays - the scoring agents write the list of signals that
  tripped the rule (eg `{'photo_in_cv','dob_disclosed'}`).

The UI reads these flags and:
- masks candidate names in lists, scoring reports and AI summaries
- still shows the real name on the candidate detail page so the
  recruiter can call / email
- surfaces a one-line banner explaining why anonymisation engaged
