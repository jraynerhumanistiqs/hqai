# Supabase Magic Link Email - Setup

The magic-link email Supabase sends today is the default unbranded one, which Jess flagged as feeling phishy. This is the founder-side fix.

## What to do (one-off, 2 minutes)

1. Open the Supabase Dashboard for the HQ.ai project (https://rbuxsuuvbeojxcxwxcjf.supabase.co).
2. Navigate to **Authentication** -> **Email Templates** -> **Magic Link**.
3. Open `magic-link-email-template.html` (sibling file in this folder), copy the entire contents, and paste it into the "Message (HTML)" body field, replacing what's there.
4. Set the **Subject** to: `Sign in to HQ.ai`.
5. Click **Save**.

## Variables Supabase substitutes server side

- `{{ .ConfirmationURL }}` - the magic sign-in URL (used in the button and as a plain-text fallback link).
- `{{ .Email }}` - the recipient email (available if you want to personalise the greeting).
- `{{ .Token }}` - the OTP token (only useful if you want to show a 6-digit code as well as a button).

The template only uses `{{ .ConfirmationURL }}`.

## Optional - switch to Resend SMTP later

Long term, we should switch Supabase Auth to send via Resend (the SMTP provider already wired into the app at `lib/email.ts`). That moves the template into code where it can live alongside the rest of the brand emails and be versioned in git. Path: Supabase Dashboard -> Project Settings -> Auth -> SMTP Settings -> set host `smtp.resend.com`, user `resend`, password = Resend API key, sender = `no-reply@hq.humanistiqs.ai`. Then the template still lives in Supabase but bounce handling and deliverability move to Resend.
