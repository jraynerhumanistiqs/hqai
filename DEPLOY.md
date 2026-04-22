# HQ.ai - Deployment Guide
# From zero to live in ~20 minutes

---

## STEP 1 - Get your accounts ready (5 mins)

You need three accounts. All free to start.

### 1a. Supabase (database + auth)
1. Go to supabase.com → Sign up
2. New project → name it `hqai` → set a strong database password → region: Southeast Asia (Sydney)
3. Wait ~2 minutes for it to provision
4. Go to Settings → API
5. Copy: `Project URL` and `anon public` key → paste into .env.local

### 1b. Anthropic API
1. Go to console.anthropic.com → Sign up
2. Go to API Keys → Create key
3. Copy the key → paste into .env.local as ANTHROPIC_API_KEY
4. Add $10 credit to start (Settings → Billing)

### 1c. Vercel (hosting)
1. Go to vercel.com → Sign up with GitHub
2. You'll need a GitHub account - go to github.com if you don't have one

---

## STEP 2 - Set up the database (3 mins)

1. In Supabase → go to SQL Editor → New query
2. Open the file `supabase/schema.sql` from this project
3. Copy the entire contents → paste into the SQL editor
4. Click Run
5. You should see "Success. No rows returned"

---

## STEP 3 - Push code to GitHub (5 mins)

Open Terminal (Mac: Cmd+Space → "Terminal"):

```bash
# Install Node.js if you don't have it: nodejs.org/en/download
# Then:

cd ~/Desktop  # or wherever you want the project
# Download the project folder from Claude and place it here

cd hqai
npm install   # installs all dependencies

# Create a new GitHub repo at github.com → New repository → name it "hqai"
# Then run these commands (replace YOUR_USERNAME):

git init
git add .
git commit -m "Initial HQ.ai build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hqai.git
git push -u origin main
```

---

## STEP 4 - Deploy to Vercel (5 mins)

1. Go to vercel.com → New Project
2. Import your `hqai` GitHub repository
3. Framework Preset: Next.js (auto-detected)
4. Environment Variables - add ALL of these:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon key
   - `ANTHROPIC_API_KEY` → your Anthropic API key
5. Click Deploy
6. Wait ~2 minutes → your app is live at `https://hqai-xxx.vercel.app`

---

## STEP 5 - Configure Supabase auth redirect (2 mins)

1. In Supabase → Authentication → URL Configuration
2. Site URL: `https://your-vercel-url.vercel.app`
3. Redirect URLs: add `https://your-vercel-url.vercel.app/**`
4. Save

---

## STEP 6 - Test it

1. Visit your Vercel URL
2. Click "Sign up free"
3. Enter your email and a password
4. Complete the 3-step onboarding
5. Ask HQ something - "What are my casual conversion obligations?"
6. It should respond with Australian employment law guidance

---

## CUSTOM DOMAIN (optional)

1. Buy `humanistiqs.ai` from a domain registrar (Namecheap, Cloudflare)
2. In Vercel → your project → Settings → Domains → Add domain
3. Follow the CNAME/A record instructions
4. Done - hq.humanistiqs.ai is live

---

## FOR BETA CLIENTS

1. Share your Vercel URL with beta clients
2. They sign up with their work email
3. They complete their own onboarding (their business, their award, etc.)
4. Each business is completely isolated - they can't see each other's data

---

## TROUBLESHOOTING

**"Supabase not connecting"**
→ Check your .env variables in Vercel → Settings → Environment Variables
→ Redeploy after changing env vars

**"Claude API error"**
→ Check your Anthropic API key and account credit at console.anthropic.com

**"Auth redirect not working"**
→ Check Supabase → Authentication → URL Configuration → make sure your Vercel URL is listed

**"Database error on signup"**
→ Re-run the schema.sql file in Supabase SQL Editor

---

## ONGOING COSTS (beta phase)

| Service | Cost |
|---|---|
| Supabase | Free (up to 50,000 monthly active users) |
| Vercel | Free (up to 100GB bandwidth) |
| Anthropic API | ~$0.003 per message (2-5 beta clients = ~$5-20/month) |
| Domain | ~$20/year |
| **Total** | **~$25/month for beta** |
