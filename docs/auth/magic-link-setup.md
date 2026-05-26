# Supabase Auth Email Templates - Setup

All six Supabase Auth email templates rebuilt to match the HQ.ai brand (white card on warm-grey background, clay clay-coloured CTA, charcoal text, Humanistiqs footer). Default Supabase emails are unbranded and Jess flagged them as feeling phishy - this is the founder-side fix that closes that gap across every Auth touchpoint.

## What to do (one-off, ~10 minutes for all six)

1. Open the Supabase Dashboard for the HQ.ai project (https://supabase.com/dashboard/project/rbuxsuuvbeojxcxwxcjf).
2. Navigate to **Authentication** -> **Email Templates**.
3. For each template below: select the template in the dropdown, open the matching HTML file in this folder, copy the entire contents, paste into the "Message (HTML)" body field, set the matching subject, click **Save**.

| Template (Supabase name) | HTML file (sibling) | Subject heading |
|---|---|---|
| Confirm signup | `confirm-signup-email-template.html` | `Confirm your HQ.ai email address` |
| Invite user | `invite-user-email-template.html` | `You have been invited to HQ.ai` |
| Magic Link | `magic-link-email-template.html` | `Sign in to HQ.ai` |
| Change Email Address | `change-email-address-email-template.html` | `Confirm your new HQ.ai email address` |
| Reset Password | `reset-password-email-template.html` | `Reset your HQ.ai password` |
| Reauthentication | `reauthentication-email-template.html` | `Your HQ.ai verification code` |

4. After each template is saved, hit **Send test email** (top right of the template editor in Supabase) - sends to your account email. Spot-check it lands clean in Gmail, Outlook desktop, and on mobile (especially the Reauthentication code block - mono font rendering varies).

## Variables Supabase substitutes server side

Each template uses only the variables it needs - the rest are available if you ever want to expand the copy.

- `{{ .ConfirmationURL }}` - the action URL (used by every template except Reauthentication).
- `{{ .Token }}` - 6-digit OTP code. Used by **Reauthentication only**.
- `{{ .TokenHash }}` - hashed OTP (not used in any current template).
- `{{ .Email }}` - the recipient email (available for personalising the greeting).
- `{{ .NewEmail }}` - the new address the user is switching to. Used by **Change Email Address only**.
- `{{ .SiteURL }}` - the project Site URL configured in Supabase Auth settings.
- `{{ .Data }}` - the user's `raw_user_meta_data` JSON (e.g. `{{ .Data.full_name }}`).

The templates use `{{ .ConfirmationURL }}` for action templates, `{{ .Token }}` for Reauthentication, and `{{ .NewEmail }}` inside the Change Email body so the user sees which address they're switching to.

## Brand consistency

All six templates share:
- Outer table layout, max 520px content width, warm-grey `#f5f5f4` body background.
- White card with 12px rounded corners.
- HQ.ai wordmark + "A Humanistiqs product" eyebrow at the top, hairline divider beneath.
- 22px H1 in charcoal, 15px body copy in `#404040`.
- Clay clay-coloured pill button (`#D97757`, `border-radius:9999px`, white text, 14x28 padding) - except Reauthentication which renders a 32px monospace code block instead.
- 13px muted copy for the expiry/safety paragraph.
- 12px footer attribution.

If you ever need to tweak any of these globally (e.g. change the accent colour, update the wordmark), grep `D97757` across the folder and update all six together.

## Optional - switch to Resend SMTP later

Long term, switch Supabase Auth to send via Resend (the SMTP provider already wired into the app at `lib/email.ts`). Benefits: same sender domain as your transactional emails (`no-reply@hq.humanistiqs.ai`), bounce + reputation handling moves to Resend, and you can move the templates into code where they live alongside the rest of the brand emails and version in git.

Path: Supabase Dashboard -> Project Settings -> Auth -> SMTP Settings:
- Host: `smtp.resend.com`
- Port: `465` (SSL) or `587` (STARTTLS)
- Username: `resend`
- Password: your Resend API key
- Sender email: `no-reply@hq.humanistiqs.ai` (must be a verified Resend sending identity)
- Sender name: `HQ.ai`

The template bodies still live in Supabase even after the SMTP switch - only the transport changes. To fully move templates into code, you'd switch from Supabase-managed Auth emails to your own Resend-triggered emails fired from custom routes, which is a bigger change and out of scope for now.

## Sender domain

Confirm `hq.humanistiqs.ai` is verified in Resend (SPF, DKIM, DMARC records) before flipping the SMTP switch. The current default Supabase sender `no-reply@mail.app.supabase.io` works without any DNS setup but lacks brand continuity; once you move to Resend the From: address matches everything else.
