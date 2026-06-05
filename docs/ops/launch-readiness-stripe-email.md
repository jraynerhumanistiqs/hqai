# Launch readiness - Stripe + Email activation

Last updated: 2026-06-05. Owner action items for Jimmy. The code is done
and deployed; the items below are dashboard/DNS/env changes only code
cannot do for you. Work top to bottom.

---

## A. Resend - verify the sending domain (unblocks ALL email)

**Status:** API key is set, but `hq.humanistiqs.ai` is NOT verified.
Until it is, every email the app tries to send is rejected or spam-binned.
This is why "Contact HQ Advisor", candidate invites, and all other emails
appear to do nothing.

**Steps:**
1. Log in to https://resend.com -> Domains.
2. If `hq.humanistiqs.ai` is not listed, click "Add Domain" and enter it.
3. Resend shows a set of DNS records (SPF/`TXT`, DKIM/`CNAME` x2-3, and an
   optional DMARC `TXT`). Copy them.
4. Add those exact records to the DNS for `humanistiqs.ai` (wherever the
   domain is managed - e.g. Cloudflare, GoDaddy, Namecheap).
5. Back in Resend, click "Verify". DNS can take minutes to a few hours.
6. When the domain shows a green "Verified" tick, email is live.

**Verify it worked:** In the app, click "Contact HQ Advisor" in the
sidebar, send a test. It should now arrive at jrayner@humanistiqs.com.au.
(The code now returns a clear error instead of a false "sent" if the key
is missing, so you'll know immediately if something's off.)

**Note:** All app email now sends from a single verified sender:
`HQ.ai <noreply@hq.humanistiqs.ai>`. The old mismatched
`hq.ai@humanistiqs.com.au` sender (contact-advisor + daily-digest) has
been removed in code.

---

## B. Stripe - rebuild products + prices as v2 pricing

**Status:** The Stripe dashboard still has the pre-research pricing
(essentials/growth/scale era). The app code now uses the v2 model
(solo/business + Foundation). You need to create the v2 products/prices
in Stripe and paste each resulting price id into Vercel env vars.

**Do this in TEST mode first**, confirm a checkout works end to end, then
repeat in LIVE mode.

### B1. Subscription products + prices

Create these recurring prices (AUD). For each, copy the generated
`price_...` id into the matching Vercel env var.

| Product | Price (AUD) | Interval | Vercel env var |
|---|---|---|---|
| Solo | $89 | month | `STRIPE_PRICE_ID_SOLO_MONTHLY` |
| Solo | $890 | year | `STRIPE_PRICE_ID_SOLO_ANNUAL` |
| Business | $249 | month | `STRIPE_PRICE_ID_BUSINESS_MONTHLY` |
| Business | $2,490 | year | `STRIPE_PRICE_ID_BUSINESS_ANNUAL` |
| Business (Foundation 100) | $2,148 | year | `STRIPE_PRICE_ID_BUSINESS_FOUNDATION` |

Foundation = Business annual at the locked $179/mo-equivalent
($2,148/yr). Make it a separate price on the Business product (or a
dedicated "Foundation 100" product) so only foundation customers are
sent to it.

### B2. Enterprise prices (sales-assisted - invoiced, not self-checkout)

These are never hit by public checkout (they route to /enterprise), but
the env vars should still exist so the pricing config resolves cleanly.
Create as recurring prices on Enterprise products:

| Product | Price (AUD) | Interval | Vercel env var |
|---|---|---|---|
| HQ People Enterprise | $17,940 | year | `STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_ANNUAL` |
| HQ People Enterprise | $1,795 | month | `STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_MONTHLY` |
| HQ Recruit Enterprise | $35,940 | year | `STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_ANNUAL` |
| HQ Recruit Enterprise | $3,495 | month | `STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_MONTHLY` |
| Full Enterprise | $47,940 | year | `STRIPE_PRICE_ID_ENTERPRISE_FULL_ANNUAL` |
| Full Enterprise | $4,495 | month | `STRIPE_PRICE_ID_ENTERPRISE_FULL_MONTHLY` |

### B3. One-off marketplace prices (one-time, not recurring)

| Product | Price (AUD) | Vercel env var |
|---|---|---|
| Letter of Offer | $25 | `STRIPE_PRICE_ID_LETTER_OF_OFFER` |
| Termination | $45 | `STRIPE_PRICE_ID_TERMINATION` |
| Employment Contract | $49 | `STRIPE_PRICE_ID_EMPLOYMENT_CONTRACT` |
| First & Final Warning | $35 | `STRIPE_PRICE_ID_FIRST_FINAL_WARNING` |
| Position Description | $29 | `STRIPE_PRICE_ID_POSITION_DESCRIPTION` |
| Performance Plan (PIP) | $39 | `STRIPE_PRICE_ID_PERFORMANCE_PLAN` |
| Casual Conversion | $29 | `STRIPE_PRICE_ID_CASUAL_CONVERSION` |
| Resignation Acceptance | $25 | `STRIPE_PRICE_ID_RESIGNATION_ACCEPTANCE` |
| Probation Outcome | $35 | `STRIPE_PRICE_ID_PROBATION_OUTCOME` |
| Reference Check | $25 | `STRIPE_PRICE_ID_REFERENCE_CHECK` |

### B4. Core Stripe env vars (must also be set)

| Vercel env var | Where to find it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe -> Developers -> API keys (Secret key) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe -> Developers -> API keys (Publishable key) |
| `STRIPE_WEBHOOK_SECRET` | Stripe -> Developers -> Webhooks -> your endpoint -> Signing secret |
| `NEXT_PUBLIC_BASE_URL` | e.g. `https://hqai.vercel.app` |

### B5. Webhook endpoint

In Stripe -> Developers -> Webhooks, add an endpoint:
- URL: `https://<your-domain>/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### B6. Verify it worked

1. Set all env vars in Vercel (Production) and redeploy.
2. In the app: Settings -> Billing -> Monthly/Annual toggle -> "Choose
   Business". You should land on Stripe Checkout (no more "Invalid
   planId" error).
3. Complete a test payment. After redirect, the webhook should flip
   `businesses.subscription_status` to `active` and grant credits.

**Known gap (not blocking launch):** mid-cycle plan upgrades don't yet
reallocate credits automatically (webhook handles new subs + cancels).
Fine for test users; flag if you want it built.

---

## C. Supabase Auth email templates (brand the auth emails)

The 6 branded templates exist in `docs/auth/*.html` but are NOT applied
to the Supabase dashboard yet, so signup/magic-link/reset emails still
use Supabase defaults.

1. Supabase -> Authentication -> Email Templates.
2. For each of the 6 (Confirm signup, Invite user, Magic Link, Reset
   Password, Change Email, Reauthentication), paste the matching HTML
   from `docs/auth/`.
3. Save each. See `docs/auth/magic-link-setup.md` for the exact mapping.

These use the Clay (#D97757) branded design - the same look as the rest
of the app's emails after the consistency pass.

---

## D. Quick status board

| Item | Code | Your action | Blocks launch? |
|---|---|---|---|
| Email sends at all | Done | Verify Resend domain (A) | YES |
| Contact HQ Advisor email | Done | (covered by A) | YES |
| Candidate / hiring-manager invites | Done | (covered by A) | YES |
| "Invalid planId" checkout error | Fixed | none | was YES, now no |
| Stripe checkout charges card | Done | Create v2 prices + env (B) | YES for paid signups |
| Auth emails branded | Templates ready | Paste into Supabase (C) | No (polish) |
