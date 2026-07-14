# HQ.ai - Project Context for Claude Code

## What this is
HQ.ai is an AI-powered HR and recruitment SaaS for Australian SMEs
under the parent brand Humanistiqs (Rayner Consulting Group Pty Ltd).
Owner: Jimmy Rayner. Two self-serve products (HQ People, HQ Recruit)
plus an optional done-for-you human-advisor layer (HR365 / Recruit365).

## Live URL
https://hqai.vercel.app

## GitHub
https://github.com/jraynerhumanistiqs/hqai

## Tech stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v3 with CSS-variable design tokens (tailwind.config.ts)
- Supabase (auth + PostgreSQL) - RLS disabled for beta
- Anthropic Claude API - model IDs centralised in lib/ai-models.ts
  (standard claude-sonnet-4-6, complex claude-opus-4-8, simple
  claude-haiku-4-5-20251001), env-overridable via ANTHROPIC_MODEL_*
- Cloudflare Stream - candidate video upload/playback
- Resend - transactional email (candidate invite + submission notify,
  enterprise inquiry)
- Vercel (hosting)
- Stripe - public subscription checkout is live (app/api/stripe/checkout),
  portal wired; enterprise/HR365 is sales-assisted (invoice, not checkout)

## Design system (dual-theme, Wattle Gold - June 2026 rebrand)
Token source of truth: tailwind.config.ts + app/globals.css + app/layout.tsx.
The old "Uber / DM Sans / black-and-white" system is retired.

### Two palettes, selected by `data-app` on <html>
- `data-app="marketing"` - the non-member site. Dark, warm (Ivory & Clay).
  Set by components/landing/MarketingHeader; never mounts ThemeBoundary.
- `data-app="product"` - the member dashboard. Light base with a `.dark`
  variant (Ink & Amber). Mounted by components/theme/ThemeBoundary, which
  takes `themeMode`: 'dashboard' (defaults dark, with a user light/dark
  toggle via next-themes + components/theme/ThemeToggle) or 'static-light'
  (forces light). Dashboard defaults dark; /prescreen and /review are
  forced-light. next-themes supplies the `.dark` class; storageKey
  "hqai-theme".

### Tokens (never hardcode colours - use these, they flip per theme)
- Surfaces: `bg`, `bg-soft`, `bg-elevated`, `surface-inverse`
- Text: `ink`, `ink-soft`, `ink-muted`, `ink-on-accent`
- Lines: `border`
- Brand accent = Wattle Gold, token name kept as `clay`:
  `clay` (var(--accent-clay, #E8B23A)), `clay-hover` (#D9A52E),
  `clay-soft` (#F7EBCB), `clay-ink` (#8A6D12). One accent only.
- Legacy aliases still resolve to vars (text-charcoal/text-mid/text-muted/
  bg-light). ONLY literal `bg-white`/`bg-black`/`gray-*`/hex break under
  `.dark` - never use them.

### Typography (self-hosted via next/font/google in app/layout.tsx)
- Schibsted Grotesk -> display/headlines (`--font-display`, `font-display`)
- Geist -> body/UI sans (`--font-geist-sans` -> `sans`)
- Geist Mono -> eyebrow/caption micro-labels (`--font-geist-mono`)
- Do NOT reintroduce DM Sans / Bebas Neue / Fraunces (removed)

### Component rules
- Buttons: always rounded-full. Cards: rounded-2xl / rounded-3xl + shadow-card.
- No gradients, no accent stripes / colour bars / underlines.
- One filled clay CTA per section (the primary action); everything else is
  ghost/outline or a text link.
- Plain hyphens ONLY - never em-dashes or en-dashes. ASCII apostrophes.
  Australian English throughout.
- HQ.ai never claims to cite, perform, or advise on employment law. Lead on
  removing busywork, cost and time. Grounding/scope statements ("grounded in
  Australian workplace law") are fine; "gives legal advice" is not.

## Key files
- tailwind.config.ts - design tokens (CSS-var backed)
- app/globals.css - data-app palettes, base styles
- app/layout.tsx - root layout, self-hosted fonts
- components/theme/ThemeBoundary.tsx - mounts product theme + light/dark
- components/theme/ThemeToggle.tsx - light/dark toggle (row/icon variants)
- lib/ai-models.ts - single source of truth for Claude model IDs
- lib/pricing-config.ts - single source of truth for all pricing (C10)
- lib/stripe.ts - env-var-key -> Stripe price id resolver + plan guards
- lib/prompts.ts - AI system prompts and escalation logic
- lib/template-ip.ts - 33 HR/recruitment document templates (ALL_TEMPLATES)
- lib/supabase/server.ts | client.ts | admin.ts - Supabase clients
- lib/email.ts - Resend helpers
- components/sidebar/Sidebar.tsx - 68px auto-collapsing icon hover-rail
  (expands on hover, collapses on navigation)
- components/recruit/RecruitFlowRail.tsx - shared HQ Recruit "click along to
  progress" rail (used by Campaign Coach WizardShell + RoleStepperRail)
- components/chat/ChatInterface.tsx - HQ People AI chat UI
- components/recruit/RecruitDashboard.tsx, RoleDetail.tsx - recruit dashboard
- app/api/chat/route.ts - Claude streaming API route
- app/api/stripe/checkout/route.ts - public subscription checkout
- supabase/schema.sql - full database schema
- supabase/migrations/ - additive migrations (nullable; code retries-without
  and soft-warns if unapplied)

## Supabase
URL: https://rbuxsuuvbeojxcxwxcjf.supabase.co
Keys in environment variables (NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
RLS is disabled - re-enable before commercial launch.
Public candidate writes use supabaseAdmin (service-role, bypasses RLS).

## Environment variables required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL_STANDARD      # optional override (default claude-sonnet-4-6)
ANTHROPIC_MODEL_COMPLEX       # optional override (default claude-opus-4-8)
ANTHROPIC_MODEL_SIMPLE        # optional override (default claude-haiku-4-5-20251001)
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_STREAM_API_TOKEN
RESEND_API_KEY
NEXT_PUBLIC_BASE_URL          # e.g. https://hqai.vercel.app
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Self-serve subscription plans (solo/business ids also power the C10 bundle)
STRIPE_PRICE_ID_SOLO_MONTHLY      # HQ Business bundle, Solo up to 25 ($89/mo)
STRIPE_PRICE_ID_SOLO_ANNUAL       # ($890/yr)
STRIPE_PRICE_ID_BUSINESS_MONTHLY  # HQ Business bundle, up to 150 ($269/mo)
STRIPE_PRICE_ID_BUSINESS_ANNUAL   # ($2,690/yr)
STRIPE_PRICE_ID_RECRUIT_MONTHLY   # standalone HQ Recruit, hiring only ($65/mo)
STRIPE_PRICE_ID_RECRUIT_ANNUAL    # optional; annual recruit not surfaced in UI yet
# Human-advisor layer - sales-assisted only, invoiced (never public checkout)
STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_ANNUAL    # HR365 annual ($9,588/yr = $799/mo equiv)
STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_MONTHLY   # HR365 monthly-rolling ($950/mo, 30-day notice)
STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_ANNUAL   # Recruit365 annual ($10,788/yr = $899/mo equiv)
STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_MONTHLY  # Recruit365 monthly-rolling ($1,070/mo)
STRIPE_PRICE_ID_ENTERPRISE_FULL_ANNUAL      # HR365+Recruit365 annual ($19,188/yr = $1,599/mo equiv)
STRIPE_PRICE_ID_ENTERPRISE_FULL_MONTHLY     # HR365+Recruit365 monthly-rolling ($1,899/mo)
# One-off document SKUs (no signup; $25-$49)
STRIPE_PRICE_ID_LETTER_OF_OFFER          # $25
STRIPE_PRICE_ID_TERMINATION              # $45
STRIPE_PRICE_ID_EMPLOYMENT_CONTRACT      # $49
STRIPE_PRICE_ID_FIRST_FINAL_WARNING      # $35
STRIPE_PRICE_ID_POSITION_DESCRIPTION     # $29
STRIPE_PRICE_ID_PERFORMANCE_PLAN         # $39
STRIPE_PRICE_ID_CASUAL_CONVERSION        # $29
STRIPE_PRICE_ID_RESIGNATION_ACCEPTANCE   # $25
STRIPE_PRICE_ID_PROBATION_OUTCOME        # $35
STRIPE_PRICE_ID_REFERENCE_CHECK          # $25
VOYAGE_API_KEY                # voyage-law-2 embeddings (optional)
COHERE_API_KEY                # Cohere rerank-3 (optional)
```

## Pricing (C10 model - live; single source of truth: lib/pricing-config.ts)
There is NO free trial and NO Foundation offer (both removed July 2026).
Every plan has unlimited logins; no per-seat charge; no lock-in.

- HQ People (HR help): $59/mo team up to 25 ($590/yr) / $179/mo up to 150
  ($1,790/yr). The HR-only low-friction entry - the hero's "From $59/month".
- HQ Recruit (hiring add-on): +$40/mo Light (1 open role) / +$120/mo Pro
  (unlimited roles). Included in HQ Business. Pay when you hire.
- HQ Business (bundle - HR + hiring): $89/mo Solo (up to 25, $890/yr) /
  $269/mo Business (up to 150, $2,690/yr). Reuses the solo/business Stripe
  ids, so standalone HQ People / HQ Recruit checkout SKUs are a follow-up -
  until they exist, all three self-serve choices check out via the bundle.
- One-off document marketplace: 10 SKUs, $25-$49, no signup required.
- Human-advisor layer (sales-assisted, /enterprise inquiry funnel, never
  public checkout - founder runs discovery + invoices via Stripe Invoicing):
  - HR365: $799/mo on annual ($9,588/yr) or $950/mo rolling. Dedicated
    Humanistiqs HR advisor, 3 advisor hours/month, extra at $250/hour.
  - Recruit365: $899/mo on annual ($10,788/yr) or $1,070/mo rolling.
    Dedicated talent advisor, up to 4 concurrent roles.
  - HR365 + Recruit365: $1,599/mo on annual ($19,188/yr) or $1,899/mo rolling.
  - Year-1 hard cap of 10 partnerships; first 5 get a $200/mo inaugural
    concession. Published stepped multiplier bands (headcount / volume /
    entity) let customers self-calculate - see computeEnterprisePrice.

## Build status (indicative - check routes for detail)
WORKING:
- Auth (login, signup, magic link), business onboarding wizard (3 steps;
  no free-trial option - defaults to HQ Business)
- HQ People chat (Claude streaming, 33-template document detection -> form
  -> DOCX), escalation detection with advisor card
- HQ Recruit suite:
  - Campaign Coach (4-step wizard: Brief -> Role profile -> Draft & Coach ->
    Finish; job ad + copy, screening questions, video-vs-phone explainer)
  - CV Scoring Agent (weighted rubric scoring with evidence; hard gates
    surfaced post-score as single-select "considerations", not scored)
  - Shortlist Agent (bulk triage; per-candidate personalised screening
    questions generated on allocation; multi-select move to Interviews)
  - Interviews (AI interview-guide generation, interviewer notes, recording)
  - Candidate prescreen flow (/prescreen/[id], public: gate -> video/phone
    recording -> thank-you), Cloudflare Stream, Resend notifications
- Document library + AI Administrator (DocEditor), HR Templates (33)
- Settings (business profile, logo, billing/Stripe portal; status label
  shows "Beta access")
- Stripe subscription checkout (public solo/business), Command bar (Cmd+K)
- Dual-theme (dark marketing / dark-default dashboard with light toggle)

PARTIAL / PLACEHOLDER (verify per route):
- Compliance assessment + audit, Leadership/Performance tools, Awards
  interpreter, Strategy Coach, Calendly booking embed
- Supabase RLS policies (written, not applied), team seat management

KNOWN ISSUES:
- Post-onboarding redirect to /dashboard can be unreliable on Vercel
  (session cookie not always persisting)
- TypeScript errors suppressed via next.config.js ignoreBuildErrors: true
  (large pre-existing baseline); RLS disabled - enable before launch

## Module architecture
### HQ People (/dashboard/people)
- AI HR advisor chat (Claude streaming); 33-template document detection ->
  form interception -> DOCX generation; escalation -> advisor card

### HQ Recruit (/dashboard/recruit)
- Campaign Coach (components/recruit/campaign-coach/) - job ad creation
- CV Scoring Agent (standalone /dashboard/recruit/cv-screening, and Step 1
  of a role) - CvScreeningClient
- Shortlist Agent - RecruitDashboard, RoleDetail, role-steps/
- A role runs as a left-rail stepper (RecruitFlowRail -> RoleStepperRail):
  1. Score CVs   - CvScreeningClient scoped to the role's prescreen_session_id
  2. Prescreen   - video + phone responses
  3. Shortlist   - bulk triage (shortlisted_at gate); multi-select promote
  4. Interviews  - per-candidate workspace: AI interview guide, notes,
                   recording. (Renamed from "Decision"; the 'offer' outcome
                   is retired - offers/contracts live in HQ People.)
- Bridge columns: cv_screenings.prescreen_session_id,
  prescreen_responses.cv_screening_id / .custom_questions / .interview_guide

### Prescreen flow
1. Staff creates role -> POST /api/prescreen/sessions
2. Staff copies/emails invite link (per-row invites carry ?response=<id>,
   which serves that candidate's personalised custom_questions)
3. Candidate: /prescreen/[id] -> gate -> recording -> thank-you
4. Submit -> POST /api/prescreen/sessions/[id]/responses
5. Staff notified, views videos in RoleDetail

## Brand positioning
Anti-Employsure: the AI takes the busy people-management work off your plate;
the same human advisor handles the hard 20% - no repeating yourself, no
locked-in retainer. Lead on removing busywork, cost and time.
The AI is grounded in Australian employment law (Fair Work Act, NES, Modern
Awards) - a scope statement, never a claim that it gives legal advice.

## Australian employment law context
HQ.ai's AI is grounded in Australian employment law exclusively.
Full prompt architecture in lib/prompts.ts. IP knowledge base covers 33
HR/recruitment document templates in lib/template-ip.ts (ALL_TEMPLATES,
TEMPLATE_CATEGORIES).

## Next build priorities (in order)
1. Enable Supabase RLS (apply supabase/migrations + write policies)
2. Fix post-onboarding redirect (session cookie issue on Vercel)
3. Standalone HQ People / HQ Recruit checkout SKUs (create the Stripe
   products so the C10 split can check out directly, not via the bundle)
4. Compliance assessment + Awards interpreter tools
5. Calendly advisor booking embed (/dashboard/booking)
6. Team seat management + advisory hours tracking
