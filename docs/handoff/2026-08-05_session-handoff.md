# HQ.ai - Session Handoff (2026-08-05)

Self-contained handoff for resuming the HQ.ai project in a new Claude Code
session. Written to survive without the originating chat. Read this top to
bottom, then work the **Resume checklist** and the **Context-review checklist**.

---

## 0. TL;DR - current state

- **Product is at the "client test" line.** The self-serve funnel (marketing
  site -> signup -> onboarding -> Stripe checkout) is built, deployed, and
  wired to a **LIVE** Stripe catalogue.
- **Live Stripe catalogue created + verified**: 22 prices, all active, AUD,
  correct amounts; live Checkout Sessions create successfully for every plan.
- **RLS is applied** in Supabase (was previously disabled). Live Stripe secret
  key rotated + in `.env.local` and Vercel. Stripe Customer Portal activated
  in live mode.
- **The only thing not yet done: a real human end-to-end payment test** (real
  account + real card). That cannot be automated (account creation / card
  entry / live charge are out of scope for the agent). See Resume checklist.
- Build is **green with typechecking enforced** (`ignoreBuildErrors: false`).

**Repo:** github.com/jraynerhumanistiqs/hqai  |  **Live:** https://hqai.vercel.app
**HEAD at handoff:** `ee2425f` (== origin/main; working tree clean apart from
gitignored secrets).

### CRITICAL layout gotcha (new agents get this wrong)
There are **two directories**:
- **Workspace root:** `C:\Users\JamesRayner\.claude\projects\C--Users-JamesRayner-hqai\`
  - NOT a git repo. Accumulates 0-byte junk scratch files (names like `,`, `({`,
    `people-standalone`) from background agents - safe to delete, never commit.
- **The app + git repo:** `...\C--Users-JamesRayner-hqai\hqai\`  <- **cd here for everything.**
  All git, npm, builds, and file paths below are relative to `hqai/`.

---

## 1. How this engagement progressed (timeline)

1. **Co-owner website feedback** (23-line spreadsheet): marketing copy fixes,
   removed the Foundation offer, removed the free trial entirely (incl. the
   onboarding funnel), FAQ dedupe, pricing clarity, one-primary-CTA hierarchy,
   tightened section spacing. Delivered via parallel file-disjoint agents.
2. **Hero polish**: removed the "Done in minutes" popover.
3. **Docs**: rewrote then trimmed `CLAUDE.md` to a lean ~135-line context file;
   dual-theme Wattle Gold system, C10 pricing, no-trial.
4. **Plans section revamp**: three equal-size cards; **HQ Recruit became a
   standalone $65/mo plan** (wired end-to-end: pricing-config, stripe catalogue,
   checkout guards, onboarding option, card CTA, webhook credit allocation);
   info-icon perk ($40 add-on exclusive to HQ People subscribers).
5. **Backlog day** ("get it all done today"): shipped A10 (3-tier model router),
   B1-B5 (2024-26 law-currency grounding), E5 (/roadmap + /changelog + 2 draft
   pages), A9 (legacy cleanup + drove tsc to 0 and enforced typecheck), A4 (RLS
   readiness SQL), A1-A3 (one-off ladder re-price + 2 packs), and re-baselined
   the action register. Several agents died on API/session/spend limits and
   were resumed; work was committed incrementally.
6. **Stripe go-live**: rotated a leaked key (see Bugs), built idempotent `.ts`
   setup scripts (key stays in `.env.local`, never on the command line), and
   created the full **live** catalogue after fixing a key-precedence bug.
7. **Fixes batch**: billing-portal error surfacing, onboarding "done for you"
   copy leaning into HR365/Recruit365, de-personalised "Jimmy" -> "our team"
   across CTAs, removed the free "test the platform" back-out on the payment
   step, renamed `/enterprise` -> `/outsourcing` (with a permanent redirect).
8. **Tooling**: added `@vercel/analytics`; cloned `obra/superpowers`; set up
   Context7 MCP for Claude Code (verified working).
9. **Verification**: confirmed live catalogue + live Checkout Sessions + routes
   + auth gates. Handoff written.

---

## 2. What we accomplished (all committed + pushed to `main`)

Commit trail (newest first):
```
ee2425f  live Stripe catalogue + checkout verification script
f452ed2  @vercel/analytics + <Analytics /> in root layout
4796d7b  rename /enterprise -> /outsourcing (+ redirect) and de-name last CTA
67942d9  billing-portal error surfacing, onboarding copy, de-personalise CTAs
02b8772  robust live-preferring Stripe key resolver + diagnostic
f7264d3  subscriptions .ts setup script + prefer STRIPE_SECRET_KEY
54efc4b  one-command setup script for the one-off ladder + packs
4945eb8  A9 complete: clear last 9 tsc errors, enforce typecheck
60acb07  one-off ladder re-price (A1-A3), RLS readiness (A4), tsc 28->9, register re-baseline
1317b76  model router (A10), law-currency grounding (B1-B5), roadmap/changelog (E5), legacy cleanup
fe190d7  Recruit: score-meaning guide polish
1dc46da  Onboarding: product-based plan picker, Support step, People standalone
9233ab7  Sales: wire payment into the self-serve funnel
77e5473 / d95a1bf  HQ Recruit standalone $65 + equal-size Plans cards
b81ec9e  Hero: remove "Done in minutes" popover
f25ad7d / 91568d8  CLAUDE.md rewrite + trim
8e5ab08 / 2770502  marketing spacing + single primary CTA + subpage rhythm
```

Pricing model (C10, live): HQ People $59 (to 25) / $179 (to 150); HQ Recruit
standalone $65/mo (or +$40 add-on for People subscribers); HQ Business bundle
$89 / $269; one-offs $39-$129 + Employment Pack $349 + Award Pack $599; HR365
$799 / Recruit365 $899 / combined $1,599 (sales-assisted). No free trial. No
Foundation offer.

---

## 3. Critical files created / modified (why)

**Pricing + Stripe (money path):**
- `lib/pricing-config.ts` - single source of truth. One-off ladder re-priced +
  2 packs; HQ Recruit `standaloneMonthly: 65` + `standalonePlanId: 'recruit'`.
- `lib/stripe.ts` - plan catalogue + `getStripePriceId`. Added the standalone
  `recruit` plan + `PEOPLE_*` entries; env-key-driven price resolution.
- `app/api/stripe/checkout/route.ts` - public checkout; sales-assisted plans
  redirect to `/outsourcing`.
- `app/api/stripe/portal/route.ts` - now try/catch wraps the portal-session
  create and returns the real error (was a generic "check your connection").
- `app/api/stripe/webhook/route.ts` - allocates 500 credits for a `recruit`
  subscription (was falling back to Business's 2500).
- `scripts/stripe-key.ts` (new) - robust resolver: scans process.env +
  `.env.local`, **prefers a live key**, prints only the mode. Fixes a stale
  `STRIPE_API_KEY=sk_test` shadowing the live `STRIPE_SECRET_KEY`.
- `scripts/stripe-subscriptions-setup.ts` (new), `stripe-oneoff-ladder-setup.ts`
  (new), `stripe-recruit-standalone-setup.ts`, `stripe-people-standalone-setup.ts`
  - idempotent live catalogue creators; key read from `.env.local`, never on CLI.
- `scripts/verify-live-catalogue.ts` (new) - re-runnable verifier: asserts every
  price is active/AUD/correct + creates unpaid live Checkout Sessions.
- `scripts/stripe-*-price-ids.env` (untracked, gitignored) - generated LIVE
  price ids; source of truth for what must be pasted into Vercel.

**Marketing site + funnel:**
- `components/landing/PricingSection.tsx` - equal-size cards; standalone $65
  Recruit + info-icon perk; $39 "from" anchor; `/outsourcing` link.
- `components/landing/HeroSection.tsx` - reworded hero; removed Cited popover.
- `components/landing/MarketingFooter.tsx` / `MarketingHeader.tsx` - roadmap/
  changelog links; `/outsourcing`.
- `app/outsourcing/page.tsx` - **renamed from `app/enterprise/page.tsx`**;
  de-personalised CTAs.
- `app/onboarding/page.tsx` - free-trial removed; product-based plan picker
  (incl. standalone Recruit); "done for you" copy leans into HR365/Recruit365;
  de-Jimmy'd; payment back-out replaced with a retention CTA (no free access).
- `app/roadmap/page.tsx`, `app/changelog/page.tsx` (new) - E5 trust pages.
- Marketing copy fixes across ProblemSection, PersonaBand, ToolExplorer,
  CustomerStory, FounderNote, ComparisonSection, FaqSection, about page.

**AI + platform:**
- `lib/model-router.ts` (new) + `tests/model-router.test.ts` (new) - 3-tier
  Haiku/Sonnet/Opus router; doc-gen + escalation never routed to Haiku.
- `app/api/chat/route.ts` - router wired into HQ People chat.
- `lib/prompts.ts` - 2024-26 reform grounding (Right to Disconnect,
  psychosocial WHS, wage theft, Employee Choice Pathway, same-job-same-pay +
  payday super) + strengthened escalation triggers.

**Config / infra / docs:**
- `next.config.js` - `typescript.ignoreBuildErrors: false` (typecheck now
  enforced); permanent `/enterprise -> /outsourcing` redirect.
- `tsconfig.json` - `target: ES2017` (cleared the Set/Map iteration errors).
- `app/layout.tsx` - `<Analytics />` (+ existing `<SpeedInsights />`).
- `CLAUDE.md` - rewritten + trimmed to ~135 lines (current design system,
  pricing, models, structure).
- `supabase/migrations/2026-07-14_enable_rls_consolidated.sql` +
  `2026-07-14_rls_rollback.sql` (new) - the RLS enable/rollback (APPLIED).
- `docs/research/drafts/2026-07-14_ai-standard-page-draft.md` +
  `2026-07-14_employsure-comparison-draft.md` (new) - founder-review drafts.
- `docs/research/action-register/` - re-baselined backlog.

**Deletions:** legacy recruit components (PrescreenDashboard, QuestionsPanel,
ResponsesPanel, RoleSetupPanel, SessionSwitcher, RecruitTabs,
EditableCandidateName); stray root duplicates (`Sidebar.tsx`, `ChatInterface.tsx`,
`CommandBar.tsx`); `components/landing/ReserveSpotModal.tsx`;
`app/api/marketplace/reserve/route.ts`; dead `lib/batches.ts`.

---

## 4. Unresolved bugs / blockers / caveats

- **BLOCKER (human-only): live end-to-end payment test not yet run.** Needs a
  real account + real card. See Resume checklist step 1.
- **Verify the Vercel redeploy actually happened AFTER the env vars were added**
  - Vercel env changes only take effect on a new deploy. All Stripe-side checks
  pass; the running deployment resolving the env vars can only be confirmed by
  an authed checkout (the human test). If checkout 503s "billing not
  configured", the redeploy is the cause.
- **`.env.local` may still hold stale TEST one-off/subscription price ids** for
  local dev (the setup scripts append-but-don't-overwrite). Vercel has the LIVE
  ids. Only affects local dev; reconcile from `scripts/stripe-*-price-ids.env`
  if you test checkout locally.
- **Duplicate live Stripe products** "HQ.ai Solo" x2 and "HQ.ai HQ Business" x2
  (Stripe product-search lag during creation). Cosmetic only - price ids are
  correct and checkout works. Archive the empties in the Stripe dashboard if
  you want a tidy catalogue.
- **Post-onboarding -> /dashboard redirect** is intermittently unreliable on
  Vercel (session cookie). Pre-existing known issue; worth watching in the test.
- **Enterprise/HR365/Recruit365 (6 Stripe prices) NOT created** - sales-assisted
  / invoiced manually, deliberately excluded from auto-setup.
- **~6 unpaid live Checkout Sessions** left by the verifier - auto-expire, no
  action needed.
- `docxtemplater-image-module-free` pulls a deprecated `xmldom` (CVE-2021-21366)
  transitively - low priority, revisit later.
- ESLint is still `ignoreDuringBuilds: true` (separate baseline from tsc).

---

## 5. Resume checklist (exact next actions)

**A. Finish the client-test gate (founder-run, ~5 min):**
1. [ ] Confirm Vercel **redeployed** after the price-id env vars were added.
2. [ ] Sign up with a real email -> complete onboarding -> land on dashboard
   (proves onboarding + RLS-authed access).
3. [ ] Run a real checkout (e.g. HQ Business $269) with a real card -> confirm:
   correct live price shown, success redirect, Settings shows plan **Active**,
   webhook set `subscription_status: active`.
4. [ ] Test **Manage billing** -> Stripe portal opens.
5. [ ] RLS smoke test (ideally 2 accounts): member sees own data only.
6. [ ] Refund the test charge in Stripe.

**B. Optional cleanups (agent can do):**
7. [ ] Archive the duplicate "HQ.ai Solo/Business" products in Stripe (or
   improve `stripe-subscriptions-setup.ts` to reuse one product per plan).
8. [ ] Reconcile `.env.local` local price ids to live from the output files.
9. [ ] Publish the two `docs/research/drafts/` pages if founder approves.

**C. Post-pilot backlog** lives in `docs/research/action-register/` (42 items
still open: compliance tool, payroll connector, SSO/audit logs, SOC 2, accuracy
dashboard, PI insurance, IP deed, etc.). Do NOT start these without the founder
picking them - they are launch-hardening, not test blockers.

**Re-verify anytime:** `cd hqai && npx tsx scripts/verify-live-catalogue.ts`

---

## 6. Context-review checklist (a new agent MUST read these first)

Before any work, read, in order:
1. [ ] **`hqai/CLAUDE.md`** - project rules, design tokens, pricing, structure.
2. [ ] **This file** (`hqai/docs/handoff/2026-08-05_session-handoff.md`).
3. [ ] **Auto-memory** (persists across sessions):
   `C:\Users\JamesRayner\.claude\projects\C--Users-JamesRayner--claude-projects-C--Users-JamesRayner-hqai\memory\MEMORY.md`
   and the individual files it indexes - especially `project_pricing_hr365.md`,
   `feedback_autonomous_progress.md`, `feedback_self_verify.md`,
   `rule_no_em_dashes.md`, `feedback_no_legal_positioning.md`,
   `feedback_marketing_plain_voice.md`, `project_recruit_flow_rail.md`,
   `project_selfserve_funnel.md`, `reference_claude_model_ids.md`.
4. [ ] **Global rules:** `~/.claude/CLAUDE.md` (ruflo), `~/.claude/rules/context7.md`.
5. [ ] **`docs/research/action-register/`** - the master backlog (statuses).
6. [ ] **`docs/research/drafts/`** - founder-review pages pending publish.
7. [ ] **`docs/research/2026-05-21_mission-*.md`** - mission validation context.
8. [ ] **`lib/pricing-config.ts`** + **`lib/stripe.ts`** - pricing/checkout SoT.
9. [ ] **`scripts/stripe-*-price-ids.env`** - the LIVE price ids (what is in Vercel).
10. [ ] `git log --oneline -25` - the recent change history.

### Standing rules (always enforced - from memory + CLAUDE.md)
- Australian English; **plain hyphens only, never em/en dashes**; ASCII apostrophes.
- **Never imply the AI cites/does/advises on employment law** - lead on removing
  busywork/cost/time; grounding/scope statements are fine.
- Design tokens only (bg/ink/border/clay); buttons rounded-full; no gradients/
  stripes; one filled clay CTA per section.
- **Never commit secrets:** `.env.local`, `next-env.d.ts`,
  `scripts/*-price-ids.env`, `scripts/*.env` stay untracked. Stage explicit
  paths or `git add -u`; never `git add -A`.
- Read a file before editing; keep the build green (`npm run build`, typecheck
  enforced); commit + push completed changes to `main` (auto-deploys to Vercel).
- Verify user-visible changes in the Browser pane; MCP servers only load at
  session start (restart to pick up new ones).
- Don't ask permission for routine progress; only pause for genuine multi-option
  decisions. Handle Stripe/live-key ops only via the scripts (key stays in
  `.env.local`) - never take a secret key on the command line or in chat.
