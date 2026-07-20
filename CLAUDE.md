# HQ.ai - Project Context for Claude Code

Kept lean (architecture, tech stack, style). Deeper reference lives in the
code's single-source-of-truth files (noted below) and docs/.

## What this is
HQ.ai is an AI-powered HR + recruitment SaaS for Australian SMEs, under the
parent brand Humanistiqs (Rayner Consulting Group Pty Ltd). Owner: Jimmy
Rayner. Two self-serve products (HQ People, HQ Recruit) plus an optional
done-for-you human-advisor layer (HR365 / Recruit365).

- Live: https://hqai.vercel.app  (auto-deploys from GitHub `main` on push)
- Repo: https://github.com/jraynerhumanistiqs/hqai

## Tech stack
- Next.js 16 (App Router) + TypeScript; Tailwind v3 with CSS-variable tokens
- Supabase (auth + Postgres; RLS disabled for beta)
- Anthropic Claude API - model IDs centralised in lib/ai-models.ts
  (standard sonnet-4-6, complex opus-4-8, simple haiku-4-5; env-overridable
  via ANTHROPIC_MODEL_*)
- Cloudflare Stream (candidate video), Resend (email), Stripe (public
  subscription checkout is live; enterprise/HR365 is sales-assisted/invoiced)
- Vercel hosting. next.config.js has ignoreBuildErrors/ignoreDuringBuilds
  true (large pre-existing tsc baseline) - a green `npm run build` is the gate.

## Project structure (idiomatic Next.js - do NOT restructure into /src)
- app/ (routes + API), components/, lib/, public/ at the ROOT; the `@/*`
  path alias maps to the project root. Moving these or renaming PascalCase
  component files breaks every import - keep the layout as-is.
- docs/ (research + specs), supabase/ (schema + migrations), scripts/,
  data/ (award files). .claude/ holds agents/commands/skills/settings.

## Design system (dual-theme, Wattle Gold - June 2026 rebrand)
Token source of truth: tailwind.config.ts + app/globals.css + app/layout.tsx.
The old "Uber / DM Sans / black-and-white" system is retired.

### Two palettes, selected by `data-app` on <html>
- `data-app="marketing"` - non-member site. Dark, warm (Ivory & Clay). Set
  by components/landing/MarketingHeader; never mounts ThemeBoundary.
- `data-app="product"` - member dashboard. Light base + `.dark` variant (Ink
  & Amber). Mounted by components/theme/ThemeBoundary (`themeMode`:
  'dashboard' = defaults dark with a light/dark toggle; 'static-light' =
  forces light). Dashboard defaults dark; /prescreen and /review forced-light.
  next-themes supplies the `.dark` class; storageKey "hqai-theme".

### Tokens (never hardcode colours - these flip per theme)
- Surfaces: `bg`, `bg-soft`, `bg-elevated`, `surface-inverse`
- Text: `ink`, `ink-soft`, `ink-muted`, `ink-on-accent`; lines: `border`
- Accent = Wattle Gold, token name `clay`: `clay` (#E8B23A), `clay-hover`
  (#D9A52E), `clay-soft` (#F7EBCB), `clay-ink` (#8A6D12). One accent only.
- Legacy aliases (text-charcoal/mid/muted, bg-light) resolve to vars. ONLY
  literal bg-white/bg-black/text-gray-*/hex break under `.dark` - never use.

### Typography (self-hosted via next/font/google in app/layout.tsx)
- Schibsted Grotesk -> display/headlines (`font-display`)
- Geist -> body/UI sans; Geist Mono -> eyebrow/caption micro-labels
- Do NOT reintroduce DM Sans / Bebas Neue / Fraunces (removed)

### Component + copy rules (core style - always enforce)
- Buttons: always rounded-full. Cards: rounded-2xl / rounded-3xl + shadow-card.
- No gradients, no accent stripes / colour bars / underlines.
- One filled clay CTA per section (the primary action); everything else is
  ghost/outline or a text link.
- Plain hyphens ONLY - never em/en dashes. ASCII apostrophes. Australian
  English throughout.
- HQ.ai NEVER claims to cite/perform/advise on employment law. Lead on
  removing busywork, cost and time. Grounding/scope statements ("grounded in
  Australian workplace law") are fine; "gives legal advice" is not.

## Key files (single sources of truth)
- lib/ai-models.ts - Claude model IDs
- lib/pricing-config.ts - all pricing (C10 self-serve + enterprise); the
  runtime resolver lib/stripe.ts maps plan ids -> Stripe price env vars
- lib/prompts.ts - AI system prompts + escalation logic
- lib/template-ip.ts - 33 HR/recruitment document templates (ALL_TEMPLATES)
- lib/supabase/{server,client,admin}.ts - Supabase clients
- lib/email.ts - Resend helpers
- tailwind.config.ts + app/globals.css + app/layout.tsx - design tokens/fonts
- components/theme/ThemeBoundary.tsx / ThemeToggle.tsx - theming
- components/sidebar/Sidebar.tsx - 68px auto-collapsing icon hover-rail
- components/recruit/RecruitFlowRail.tsx - shared HQ Recruit progress rail
- app/api/chat/route.ts - Claude streaming; app/api/stripe/* - checkout/webhook
- supabase/schema.sql + supabase/migrations/ (additive/nullable; code
  retries-without and soft-warns if a migration is unapplied)

## Supabase
Project rbuxsuuvbeojxcxwxcjf. Keys in env (NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY). RLS disabled -
re-enable before commercial launch. Public candidate writes use supabaseAdmin
(service-role). Never commit secrets (scripts/stripe-c10-price-ids.env,
next-env.d.ts stay untracked).

## Environment variables
Full set + inline notes live in lib/stripe.ts and .env.local. Categories:
Supabase, ANTHROPIC_API_KEY (+ optional ANTHROPIC_MODEL_*), Cloudflare
Stream, Resend, Stripe (STRIPE_SECRET_KEY / _WEBHOOK_SECRET / publishable +
per-plan price ids: SOLO/BUSINESS/RECRUIT monthly+annual, the six ENTERPRISE
keys, and the one-off document SKUs incl. the two packs
STRIPE_PRICE_ID_EMPLOYMENT_PACK / _AWARD_PACK). NB standalone HQ Recruit
needs STRIPE_PRICE_ID_RECRUIT_MONTHLY, and the re-priced one-off ladder +
packs need their Stripe prices (re)created, before those checkouts can charge.

## Pricing (C10 - live; single source lib/pricing-config.ts)
No free trial and no Foundation offer (both removed July 2026). Unlimited
logins on every plan; no per-seat charge; no lock-in.
- HQ People (HR only): $59/mo up to 25 / $179/mo up to 150.
- HQ Recruit (hiring only): standalone $65/mo (a real self-serve plan, no HR
  sub needed); Pro unlimited roles $120/mo. HQ People subscribers can add 1
  role for $40/mo (exclusive perk, shown via the card info icon).
- HQ Business (bundle, HR + hiring): $89/mo Solo (up to 25) / $269/mo up to
  150. Reuses the solo/business Stripe ids.
- One-off documents: 10 SKUs, $25-$49, no signup.
- Human layer (sales-assisted, /enterprise inquiry, invoiced): HR365 $799/mo,
  Recruit365 $899/mo, HR365+Recruit365 $1,599/mo (annual equivalents).

## HQ Recruit workflow
A role runs as a left-rail stepper (RecruitFlowRail -> RoleStepperRail):
1. Score CVs (CvScreeningClient; hard gates -> post-score "considerations",
   not scored) 2. Prescreen (video + phone) 3. Shortlist (bulk triage,
   multi-select promote; per-candidate personalised screening questions
   generated on allocation) 4. Interviews (AI interview guide, notes,
   recording; "offer" retired - contracts live in HQ People).
Campaign Coach = 4-step job-ad wizard (Brief -> Role profile -> Draft & Coach
-> Finish). Bridge cols: cv_screenings.prescreen_session_id,
prescreen_responses.cv_screening_id / .custom_questions / .interview_guide.

## Positioning
Anti-Employsure: the AI takes the busy people-management work off your plate;
the same human advisor handles the hard 20% - no repeating yourself, no
locked-in retainer. The AI is grounded in Australian employment law (Fair
Work Act, NES, Modern Awards) as a scope statement, never legal advice.

## Working rules
- Read a file before editing; keep the build green; commit + push completed
  changes to `main` (auto-deploys). Verify user-visible changes in a preview.
- Prefer editing existing files; do not create docs/*.md unless asked.
- Never commit secrets or .env files.
