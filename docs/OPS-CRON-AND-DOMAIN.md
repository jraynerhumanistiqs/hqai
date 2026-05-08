# Operations: CRON_SECRET, Custom Domain, Telemetry Cron

Companion to D2/D14 in `docs/DECISION-LOG.md`. Two James-action items that need the Vercel and Supabase dashboards.

---

## 1. CRON_SECRET - what it is and how to deploy it

The `/api/telemetry/daily-digest` route runs on a Vercel cron (06:00 AEST). It checks `Authorization: Bearer <CRON_SECRET>` so only Vercel's scheduler can trigger it (anyone with the URL otherwise could spam-fire the digest email).

### Steps

1. Open https://vercel.com/dashboard, click into the **hqai** project.
2. **Settings -> Environment Variables**.
3. Click **Add New**.
4. Name: `CRON_SECRET`
5. Value: any random string. Pick at least 32 characters. Quick way to generate one: open your password manager, generate a fresh password, paste it.
6. Apply to: **Production** (tick it). Don't tick Preview or Development - cron only fires in Production.
7. **Save**.
8. **Redeploy** to pick up the new env var. Go to **Deployments** tab -> latest -> "..." menu -> **Redeploy**. Wait ~90 seconds.

Vercel automatically generates this header for cron-triggered requests using the `CRON_SECRET` env var, so once it's set there's nothing else to wire.

### Verify it's working

After Friday's first 06:00 AEST fire, check:

- Vercel project -> **Logs** tab -> filter by `/api/telemetry/daily-digest`. Should show one 200 response per day at 20:00 UTC.
- Your inbox + Rav's inbox at `jrayner@humanistiqs.com.au` and `rprasad@humanistiqs.com.au`. Subject: `HQ.ai daily digest - DD/MM/YYYY`.

If nothing arrives in 24 hours:
1. Check Vercel **Cron Jobs** tab - confirm the job is listed and enabled.
2. Check the Logs filter - if you see 401 Unauthorised, the `CRON_SECRET` env var isn't matching the one Vercel sends. Redeploy.
3. Check the Resend dashboard for delivery failures (the email send step is the most likely failure mode if `RESEND_API_KEY` isn't set).

---

## 2. Vercel custom domain - swap `hqai.vercel.app` for `humanistiqs.ai`

Right now `NEXT_PUBLIC_BASE_URL` is `https://hqai.vercel.app`, which means every shareable URL the app generates (Shortlist Agent video pre-screen invites, Campaign Coach handoff URLs, Resend transactional email links) uses that vercel.app subdomain. The Shortlist Agent URLs you flagged are showing the vercel.app host because of this.

To switch to a humanistiqs.ai-hosted URL, the domain needs to be added as a Vercel custom domain.

### Steps

1. Confirm you own `humanistiqs.ai`. If yes:
2. Vercel project -> **Settings -> Domains** -> **Add**.
3. Enter `humanistiqs.ai` (or a subdomain like `app.humanistiqs.ai` if you want to keep the apex for marketing).
4. Vercel shows DNS records you need to add at your domain registrar:
   - For apex domain: `A` record `76.76.21.21`
   - For subdomain: `CNAME` record `cname.vercel-dns.com`
5. Add the records at your registrar. Wait for DNS propagation (5 minutes to 24 hours, usually 15 minutes).
6. Vercel auto-issues an SSL certificate when the records are detected.
7. Once green, change `NEXT_PUBLIC_BASE_URL` env var in Vercel from `https://hqai.vercel.app` to `https://humanistiqs.ai` (or your chosen subdomain).
8. **Redeploy**.

After redeploy, all generated URLs use the humanistiqs.ai host. Old links remain valid because Vercel keeps the vercel.app URL working alongside the custom domain.

### Where the URL is used

Just so you know what's affected:

- Shortlist Agent video pre-screen candidate links (per the issue you flagged)
- Campaign Coach handoff -> careers microsite URL
- All transactional emails sent via Resend that reference the platform
- The OG image / share URLs on the careers microsite

### Update the Supabase auth allow-list at the same time

When you change the base URL, the Supabase auth callback allow-list also needs to know about the new host. In Supabase -> Authentication -> URL Configuration:

- Set **Site URL** to the new domain
- Add `https://humanistiqs.ai/auth/callback` to the redirect URL allow-list (keep the old one for the transition period)

Without this, magic links will fail in the same way they did pre-fix.

---

## 3. Quick checklist

- [ ] `CRON_SECRET` env var set in Vercel Production, redeploy triggered
- [ ] First daily digest email received the morning after deploy
- [ ] `humanistiqs.ai` (or subdomain) added as Vercel custom domain
- [ ] DNS records green at registrar
- [ ] `NEXT_PUBLIC_BASE_URL` updated and redeploy triggered
- [ ] Supabase auth Site URL + redirect URLs updated for the new host
- [ ] Test a fresh magic link from the new host - confirm it lands at `/dashboard` signed in
- [ ] Test a Shortlist Agent video pre-screen invite - confirm the link uses humanistiqs.ai
