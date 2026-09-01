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
- _archive/ holds withdrawn product code kept for reference. It is excluded
  from tsconfig and eslint and is NOT wired to anything - never import from
  it, and do not "fix" errors inside it.

## Withdrawn products (do not resurrect without a decision)
AI Administrator, the AI HR document-generation product, was removed in Aug
2026 and archived to _archive/ai-administrator/ (see its README). Chat is
now Q&A ONLY - it does not generate documents.

Shared doc plumbing SURVIVED under neutral names and is still load-bearing
for HQ Recruit, the documents library and public /doc/[id] shares:
components/docs/* (DocEditor), /api/documents/[id]/render(-html),
/api/documents/contract, /api/documents/download, lib/render/*.
/dashboard/documents still works at its URL but is intentionally unlinked
from all navigation.

## Design system (one accent, two surface palettes - Aug 2026)
Token source of truth: tailwind.config.ts + app/globals.css + app/layout.tsx.
The old "Uber / DM Sans / black-and-white" system is retired.

ONE BRAND COLOUR: Wattle Gold #E8B23A, on marketing AND product. The two
surfaces briefly diverged (product ran the shadcn preset's yellow #FDC700
while marketing kept the gold), which meant the brand changed colour the
moment a customer signed in. Unified back onto gold Aug 2026.

What still differs between the surfaces is the SURFACE RAMP and the
typeface, not the accent. Marketing is a fixed dark warm slab; product is a
neutral ramp with a light/dark toggle.

### Two surface palettes, selected by `data-app` on <html>
- `data-app="marketing"` - non-member site. Dark, warm. Wattle Gold CTAs,
  near-black secondary accent, Schibsted Grotesk + Geist.
  Set by components/landing/MarketingHeader; never mounts ThemeBoundary.
- `data-app="product"` - dashboard AND /prescreen AND /review. Neutral
  shadcn-preset ramp (b1YmvCmim surfaces) carrying the gold accent.
  Mounted by components/theme/ThemeBoundary (`themeMode`:
  'dashboard' = defaults dark with a light/dark toggle; 'static-light' =
  forces light). Dashboard defaults dark; /prescreen and /review
  forced-light. next-themes supplies `.dark`; storageKey "hqai-theme".

### Tokens (never hardcode colours - these flip per theme AND per surface)
- Surfaces: `bg`, `bg-soft`, `bg-elevated`, `surface-inverse`
  - product LIGHT ramp is page #FFFFFF -> card #F2F2F2 -> inset #E4E4E4.
    Widened Aug 2026; at the old 10/10 steps the three read as one grey.
  - product DARK lifts off black (page #202020, card #292929, inset
    #262626) with the rail RECESSED below the page at #101010. Do not
    invert that: the pre-Aug ramp had the inset LIGHTER than the card.
- Text: `ink`, `ink-soft`, `ink-muted`, `ink-on-accent`, `ink-on-danger`
- Lines: `border`, `border-strong`, `input`, `ring`
- Accent = Wattle Gold #E8B23A on BOTH surfaces (`accent` and `clay`).
  - Labels on gold are near-black #111111 (9.8:1). NEVER white - white on
    #E8B23A is 1.9:1.
  - Gold as TEXT is NOT #E8B23A on light (1.9:1 on white). Use
    `accent-text` / `clay-ink` #7A6010 (4.9:1). Dark can use the gold
    itself (8.4:1 on the page).
  - marketing keeps a near-black secondary `accent` that inverts light on
    dark; `clay` is the gold on both.
- Semantic (product): `danger` #D0000A / #FF6467 dark, `warning` #A84600 /
  #FF6900 dark. Both are tuned AGAINST the gold, which is the real risk -
  all three are warm. Light warning is deepened so it separates from gold
  by lightness as well as hue. Dark warning stays #FF6900: it already sits
  between gold and danger, and any redder collides with `danger` #FF6467.
- Changing a surface value changes what passes AA on it. The Aug 2026 ramp
  widening broke three pairs (`ink-muted`, `danger`, `warning`) and each
  had to move with it. Re-check every foreground before shipping a
  surface change.
- `sidebar*` and `chart-1..5` (blue ramp) exist as preset tokens.
- Radius (product): --radius 0.625rem with the preset sm..3xl scale.
- Legacy aliases (text-charcoal/mid/muted, bg-light) resolve to vars. ONLY
  literal bg-white/bg-black/text-gray-*/hex break under `.dark` - never use.

### Typography (self-hosted via next/font/google in app/layout.tsx)
- Marketing: Schibsted Grotesk -> display/headlines (`font-display`);
  Geist -> body/UI sans; Geist Mono -> eyebrow/caption micro-labels
- Product: Figtree, scoped via --font-app-sans under [data-app="product"]
- Do NOT reintroduce DM Sans / Bebas Neue / Fraunces (removed)

### Icons
- remixicon (`@remixicon/react`), per the preset. lucide-react is removed -
  do not reintroduce it. Remix Line glyphs render ~9% smaller than lucide's
  equivalents, so size by eye rather than porting classes verbatim.

### Focus indicator (do not remove)
`html[data-app="product"] :focus-visible` in globals.css paints the only
keyboard focus indicator the product has. The ~120 `focus-visible:ring-*/NN`
utilities across the app emit NO CSS: every colour token is a bare `var()`
and Tailwind v3 alpha modifiers need channel triplets. Those controls also
set `outline-none`, so without this rule there is no focus ring at all. The
`html` prefix is load-bearing - it outranks Tailwind's
`focus-visible:outline-none`, which would otherwise tie and win on source
order.

### Motion (do not let animation own visibility)
Content must NEVER depend on an animation completing to be visible. Motion
drives everything off requestAnimationFrame, which does not fire in a
background tab - so anything that starts at `opacity: 0` and animates up
can paint blank and stay blank. This has bitten three times:
- HeroSection: a homepage opened in an unfocused tab rendered a BLANK hero
  and did not recover when the tab was fronted (still opacity 0 four
  seconds after visibilityState went "visible"). Its reveal is now CSS
  keyframes in globals.css (`.hq-hero-rise` / `-lead` / `-backdrop`), which
  run on the document timeline and resolve to the END state via `both`.
- AdaptiveSlider: no `initial`, so the fill painted at zero width whatever
  the value. Fixed with `initial={false}`.
- InlineAction: AnimatePresence exits never completed, leaving stale nodes.

Rules: above-the-fold content uses CSS, not motion, for its entrance. If
motion must animate something in, give it `initial={false}` or make the
resting state the default. Do not reach for `useAnimationControls` as a
fallback - `controls.set()` does not reach children that inherit through
variants, so the parent snaps and the children stay hidden.

### Component + copy rules (core style - always enforce)
- Buttons: always rounded-full. Cards: rounded-2xl / rounded-3xl + shadow-card.
- No gradients, no accent stripes / colour bars / underlines.
- One filled accent CTA per section (the primary action); everything else is
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
- lib/template-ip.ts - 33 HR/recruitment document templates (ALL_TEMPLATES).
  Only the Recruitment-category slice is still surfaced, at
  /dashboard/recruit/templates. The HR Templates page was removed Aug 2026.
- lib/supabase/{server,client,admin}.ts - Supabase clients
- lib/email.ts - Resend helpers
- tailwind.config.ts + app/globals.css + app/layout.tsx - design tokens/fonts
- components/theme/ThemeBoundary.tsx / ThemeToggle.tsx - theming
- components/sidebar/Sidebar.tsx - 68px auto-collapsing icon hover-rail,
  plus a pin toggle (localStorage "hqai:sidebar-locked") that holds it
  open. Flat service nav since Aug 2026 - one tab per service (AI Advisor,
  AI Assistant, Campaign Coach, CV Scoring Agent, Shortlist Agent), no
  HQ People / HQ Recruit parents. Tools and Recruitment Templates are
  hidden pre-MVP; their routes still work, only the tabs are gone.
- components/ui/PortalMenu.tsx - row action menus render to <body>. The
  recruit lists clip (overflow-hidden for the rounded row fill, inside the
  overflow-y-auto role switcher), so an absolutely-positioned menu got cut
  off. Use this for any new dropdown inside a list.
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
keys). NB standalone HQ Recruit needs STRIPE_PRICE_ID_RECRUIT_MONTHLY.
The STRIPE_PRICE_ID_* one-off document vars still exist in Vercel but are
DEAD: the checkout that consumed them was removed and all 12 one-off
products are archived in Stripe (Aug 2026). Do not wire anything to them.

## Pricing (C10 - live; single source lib/pricing-config.ts)
No free trial and no Foundation offer (both removed July 2026). Unlimited
logins on every plan; no per-seat charge; no lock-in.
- HQ People (HR only): $59/mo up to 25 / $179/mo up to 150.
- HQ Recruit (hiring only): standalone $65/mo (a real self-serve plan, no HR
  sub needed); Pro unlimited roles $120/mo. HQ People subscribers can add 1
  role for $40/mo (exclusive perk, shown via the card info icon).
- HQ Business (bundle, HR + hiring): $89/mo Solo (up to 25) / $269/mo up to
  150. Reuses the solo/business Stripe ids.
- Human layer (sales-assisted, /enterprise inquiry, invoiced): HR365 $799/mo,
  Recruit365 $899/mo, HR365+Recruit365 $1,599/mo (annual equivalents).
- One-off documents: WITHDRAWN Aug 2026. The /offer funnel is removed, the
  public /marketplace is a Coming Soon stub, and the 12 Stripe products are
  archived. PRICING.oneOffs still exists in lib/pricing-config.ts but has no
  live consumer - do not re-surface it without a new product decision.

## HQ Recruit workflow
A role runs as a left-rail stepper (RecruitFlowRail -> RoleStepperRail):
1. Score CVs (CvScreeningClient; hard gates -> post-score "considerations",
   not scored) 2. Prescreen (video + phone) 3. Shortlist (bulk triage,
   multi-select promote; per-candidate personalised screening questions
   generated on allocation) 4. Interviews (AI interview guide, notes,
   recording; "offer" retired - HQ.ai no longer generates contracts at all,
   see Withdrawn products below).
CV Formatter lives at /dashboard/recruit/ingest (POST /api/recruit/ingest).
It moved out of HQ People in Aug 2026; CvScreeningClient links to it twice.
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
