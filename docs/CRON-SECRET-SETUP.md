# CRON_SECRET Setup

The daily telemetry digest (`/api/telemetry/daily-digest`) checks an `Authorization: Bearer <CRON_SECRET>` header so only Vercel's scheduler can fire it. Without this set, the cron either does nothing useful or returns 401 every time it runs.

5 minute setup.

## 1. Generate a random secret

In any terminal:

```powershell
# PowerShell
[Guid]::NewGuid().ToString() + '-' + [Guid]::NewGuid().ToString()
```

Or just use any password manager to generate a 40+ character random string. Don't reuse a password from elsewhere.

Copy the generated value.

## 2. Add it to Vercel

1. Open Vercel -> the `hqai` project -> **Settings** -> **Environment Variables**.
2. Click **Add New**.
3. Name: `CRON_SECRET`
4. Value: paste the random string from step 1.
5. Environments: tick **Production**, **Preview**, **Development** (all three).
6. Save.

## 3. Redeploy

The new env var only takes effect after a redeploy.

1. Vercel -> **Deployments** tab.
2. Find the most recent production deployment, click the "..." menu, choose **Redeploy**.
3. Wait ~90 seconds for the redeploy to complete.

## 4. Verify

Vercel automatically attaches `Authorization: Bearer <CRON_SECRET>` to every cron invocation, so once the secret is set and the deploy is live the daily 06:00 AEST digest will start firing.

If you want to test it manually right now, in PowerShell:

```powershell
$secret = "paste-your-secret-here"
Invoke-WebRequest -Uri "https://hqai.vercel.app/api/telemetry/daily-digest" `
  -Headers @{ Authorization = "Bearer $secret" } | Select-Object -ExpandProperty Content
```

You should see a JSON response with `"ok": true` and a preview of the digest text. If you see `"error": "Unauthorised"`, the secret value in your script doesn't match what's in Vercel.

The first email lands in James's and Rav's inboxes the morning after the first day with chat traffic.

## 5. Where the secret is used

- `app/api/telemetry/daily-digest/route.ts` reads it from `process.env.CRON_SECRET` and refuses any request without a matching `Authorization` header.
- `vercel.json` tells Vercel to fire the route at `0 20 * * *` UTC (06:00 AEST).
- Vercel itself stores the secret encrypted and only injects it at runtime - it never appears in build logs.

## Rotation

If you ever need to rotate the secret (e.g. you suspect leakage):

1. Generate a fresh random string.
2. Update the Vercel env var.
3. Redeploy.
4. Done. There's no second place to update.
