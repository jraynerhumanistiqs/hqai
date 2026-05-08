# HQ.ai Auth + Branded Transactional Email Setup

Companion to D1 in `docs/DECISION-LOG.md`. James-action items J3 and J4 in `docs/PHASE-1-ENTRY-WORK.md`.

The code-side magic-link bug is fixed in `app/auth/callback/route.ts` (handles both `?code=` and `?token_hash=&type=` flows). What remains is dashboard configuration that James does in two places: Supabase and Resend. Both must be done before Phase 1 starts.

---

## 1. Verify Supabase URL configuration (5 minutes)

Supabase will only redirect to URLs in its allow-list. If `https://hqai.vercel.app/auth/callback` isn't there, the magic link silently fails.

1. Open Supabase project `rbuxsuuvbeojxcxwxcjf` -> **Authentication** -> **URL Configuration**.
2. **Site URL:** `https://hqai.vercel.app`
3. **Redirect URLs:** must include all of:
   - `https://hqai.vercel.app/auth/callback`
   - `https://hqai.vercel.app/dashboard`
   - `https://hqai.vercel.app/onboarding`
   - `http://localhost:3000/auth/callback` (only if you still develop locally)
4. **Save**.
5. Test from a fresh incognito window: go to `https://hqai.vercel.app/login`, request a magic link, click the link in the email, confirm you land on `/dashboard` signed in.

If the test fails, check **Authentication -> Logs** for the error code (rate-limit, expired, malformed redirect) and report back.

---

## 2. Migrate transactional email from Supabase default to Resend SMTP (15 minutes)

Today, every signup confirmation, magic link, and password reset comes from Supabase's noreply address. We want them to come from `hq.ai@humanistiqs.com.au` under the sender name **HQ.ai**.

### 2a. Verify the humanistiqs.com.au domain in Resend

1. Open Resend -> **Domains** -> **Add Domain**.
2. Enter `humanistiqs.com.au` (apex) or `mail.humanistiqs.com.au` (subdomain - cleaner for marketing-vs-transactional separation).
3. Resend gives you a set of DNS records (SPF, DKIM, DMARC). Add them via your DNS provider.
4. Click **Verify** in Resend. May take up to 60 minutes for DNS to propagate.
5. Once green, create a sending email address: **Settings -> Emails -> Add** -> `hq.ai@humanistiqs.com.au`.

### 2b. Generate Resend SMTP credentials

Resend supports SMTP for use with Supabase Auth's custom email backend.

1. Resend -> **Settings -> SMTP**.
2. Click **Generate SMTP credentials**.
3. Copy the **host**, **port (587)**, **username**, **password (API key)**.
4. Note: this password is shown once. Store it in 1Password under "HQ.ai - Resend SMTP".

### 2c. Configure Supabase to use the Resend SMTP

1. Supabase -> **Project Settings** -> **Auth** -> **SMTP Settings**.
2. **Enable Custom SMTP**.
3. Fill in:
   - **Sender email:** `hq.ai@humanistiqs.com.au`
   - **Sender name:** `HQ.ai`
   - **Host:** `smtp.resend.com`
   - **Port:** `587`
   - **Username:** `resend` (the literal string)
   - **Password:** the API key from step 2b
   - **Min interval:** `60` (seconds between same-recipient sends; Supabase default)
4. **Save**.
5. Test: trigger a fresh magic-link request. Confirm the email arrives from "HQ.ai <hq.ai@humanistiqs.com.au>", not from Supabase's noreply address.

### 2d. Customise the email templates

Authentication -> Email Templates. Replace the default copy on these four templates with the HQ.ai brand voice:

#### Magic Link

```
Subject: Sign in to HQ.ai

Hi {{ .Email }},

Click the button below to sign in to HQ.ai. The link expires in 60 minutes.

[Sign in to HQ.ai] -> {{ .ConfirmationURL }}

Didn't request this? Ignore this email - your account stays where it is.

HQ.ai by Humanistiqs
humanistiqs.com.au
```

#### Confirm signup

```
Subject: Confirm your HQ.ai account

Welcome to HQ.ai. Click below to confirm your email and finish setting up your account.

[Confirm my email] -> {{ .ConfirmationURL }}

The link expires in 24 hours. If you didn't sign up, ignore this email.

HQ.ai by Humanistiqs
humanistiqs.com.au
```

#### Reset password

```
Subject: Reset your HQ.ai password

Hi {{ .Email }},

We received a request to reset your HQ.ai password. Click below to choose a new one. The link expires in 60 minutes.

[Reset my password] -> {{ .ConfirmationURL }}

Didn't request this? Your password stays the same - ignore this email.

HQ.ai by Humanistiqs
humanistiqs.com.au
```

#### Invite user (if/when invites are wired)

```
Subject: You've been invited to HQ.ai

Hi {{ .Email }},

{{ .Data.invited_by_name }} has invited you to join {{ .Data.business_name }} on HQ.ai. Click below to accept and set up your account.

[Accept invite] -> {{ .ConfirmationURL }}

The link expires in 7 days.

HQ.ai by Humanistiqs
humanistiqs.com.au
```

The Supabase template variables are: `{{ .Email }}`, `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Data.* }}` (custom keys from `signUp({ data: { ... } })`). Plain hyphens only - no em-dashes.

---

## 3. Verification checklist

Tick these before signalling "Internal Testing Phase Ready":

- [ ] `https://hqai.vercel.app` is the Site URL in Supabase
- [ ] `https://hqai.vercel.app/auth/callback` is in the Redirect URL allow-list
- [ ] Resend domain verified, all DNS records green
- [ ] `hq.ai@humanistiqs.com.au` is the sender address in Supabase Auth SMTP
- [ ] "HQ.ai" is the sender name
- [ ] Magic link from a fresh incognito window completes and lands on `/dashboard` signed in
- [ ] Email arrives from "HQ.ai <hq.ai@humanistiqs.com.au>", not noreply@supabase
- [ ] All four email templates updated with HQ.ai brand copy

---

## 4. Rollback

If anything in section 2 breaks production sign-up:

1. Supabase -> Auth -> SMTP Settings -> **Disable Custom SMTP**.
2. Supabase falls back to its default sender. Sign-ups work again with the noreply address.
3. Investigate Resend logs at `resend.com -> Logs` for any rejected sends.
