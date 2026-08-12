# COMPREHENSIVE PRODUCT & UX AUDIT REPORT
### HQ.ai Dashboard - Home (`/dashboard`) & Settings (`/dashboard/settings`)

*Scope: the two named surfaces, benchmarked against the HQ People and HQ Recruit modules and the shipped design system.*
*Date: 2026-08-12. Auditor: Staff Product Engineer / Principal UX. Hand-off target: UX implementation agent.*

---

## 1. EXECUTIVE SUMMARY & SAAS COMPETITIVE STANDING

**The design system is genuinely competitive; the two audited pages are the two surfaces that predate and bypass it.** This is the single most important finding, and it reframes everything below.

The foundations are strong and Mercury/Linear-tier:

- A mature dual-theme token system (`app/globals.css`) - `:root` / `[data-app="marketing"]` / `[data-app="product"]` / `[data-app="product"].dark` - with rationed Wattle Gold, refined semantic colours (deliberately moved off the `#EF4444`/`#F59E0B` "AI-default tell", `app/globals.css:180-186`), a global `prefers-reduced-motion` kill-switch (`app/globals.css:321-335`), and WCAG touch-target tokens (`tailwind.config.ts:172-177`).
- A real primitive layer: `Button` (cva, correct `focus-visible:ring-2 ring-accent ring-offset-2`, `components/ui/button.tsx:30`), `EmptyState`, `StatusPill`, `Spinner` (reduced-motion-aware).
- The flagship modules are on-system. HQ Recruit's `RecruitFlowRail` is a properly-built, `aria-current`-aware stepper reused three ways; HQ People's `AdministratorClient` gallery (filter pills + search + card grid + `FormField` renderer) is near-exemplary token discipline.

Against that backdrop, **Home and Settings read as older, hand-rolled scaffolding.** Neither page imports a single shared primitive - not `Button`, not `EmptyState`, not `StatusPill`, not `Spinner`. Both score **0 `focus-visible` occurrences** (`grep -c` on each). The Home page ships a **broken news module** (an `image` prop that is never rendered, pointing at a `public/news/` directory that does not exist) presented as "Curated by your HQ.ai advisory team. Updated regularly." Settings is a **454-line monolith** with an empty `components/settings/` folder beside it, no loading state (form pops in), no save-error handling, and an accessibility defect in its paywall overlay.

Where it lapses into generic/incomplete patterns: hand-rolled empty states instead of the shared component; inconsistent page-header grammar between the two pages (different h1 font, different eyebrow style, different max-width); placeholder content dressed as live data; and interactive controls that strip the focus outline without replacing it.

**Net competitive standing:** the shell, navigation rail, and two core modules would hold up in a demo against Employsure-class incumbents and modern HR SaaS. The **first screen a user lands on (Home)** and the **screen they configure their workspace in (Settings)** are the weakest, most "AI-slop-adjacent" surfaces in the product - precisely the two under review. Closing the gap is mostly *adoption of what already exists*, not net-new design.

---

## 2. SYSTEMIC COMPONENT & DESIGN TOKEN DEVIATIONS ("ANTI-SLOP AUDIT")

### Arbitrary Value & Token Breaches

Color-token discipline on the two pages is actually **clean** - a `grep` for hex / `bg-white` / `text-gray-*` / `text-black` across both returned **zero** hits. Credit where due. The breaches are structural, not chromatic:

- **Dead orphan stylesheet - `globals.css` (repo root, 141 lines).** Imported nowhere (`app/layout.tsx:5` imports `./globals.css` = `app/globals.css`). It still defines a **green `--accent: #6F8F7A`**, imports **Fraunces + DM Sans**, and declares a `.focus-accent` with green glow - the entire retired "Uber" system. It is a live rot/confusion trap for any agent that greps for tokens. **Delete it.**
- **Legacy-alias mixing on both pages.** Settings interleaves the current vocabulary (`text-ink`, `text-ink-soft`, `text-ink-muted`, `bg-bg-elevated`) with the legacy alias set (`text-charcoal` x7, `text-mid`, `text-muted`, `bg-light`, e.g. `settings/page.tsx:195,221,229,265,289,333,349,375`). Home does the same (`text-charcoal` at `page.tsx:113,151,230`; `text-muted` throughout). Both resolve via CSS vars so nothing *breaks*, but two names for one token is exactly how drift starts - and the People/Recruit audits flagged the identical smell in `ProcessFlowTracker`, the Documents modal, and the recruit `bin` page. **Standardise on `ink`/`ink-soft`/`ink-muted` + one accent name.**
- **Accent-name divergence.** The codebase uses both `accent`/`accent-hover`/`accent-soft` (`tailwind.config.ts:40-42`) and `clay`/`clay-hover`/`clay-soft` (`:47-49`) for the same Wattle Gold. Home's greeting uses `text-clay` (`LocalGreeting.tsx:21`); Settings' CTAs use `bg-accent` (`settings/page.tsx:326`). Pick one as canonical.
- **Arbitrary sizing (minor, cosmetic):** `min-h-[320px]` (`page.tsx:100`), `text-[11px]` (`page.tsx:211`, `LocalGreeting.tsx:21`), `text-[10px]` x3 (`settings/page.tsx:280,405,409`), `tracking-[0.06em]` (`LocalGreeting.tsx:21`). Fold the two micro-sizes into the type scale (`text-xs` = 12px exists) or an intentional `text-[10px]` caption token.

### Interactive State Failures

This is the most consequential anti-slop category on these two pages.

- **Zero `focus-visible` on either page.** `grep -c focus-visible app/dashboard/page.tsx` -> `0`; same for settings. Every interactive control here - the three `QuickAction` link-cards (`page.tsx:200`), "Start your first chat" (`page.tsx:128`), the `NewsCard`s, the settings inputs/selects, "Save changes" (`settings/page.tsx:325`), the plan-picker cards, "Manage billing", the monthly/annual toggle - has **no visible keyboard-focus state.** Two controls actively strip the outline with a bare `focus:outline-none` and no ring replacement (`settings/page.tsx`, plan-picker `:399`). Contrast with the *rest of the app*, where the house pattern `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30` is applied consistently (Sidebar `:522,566`, ThemeToggle `:55,70`, UnpaidPlanBanner `:89`, booking `:61`, and every Recruit button). **Home and Settings are the outliers.**
- **The `Button` primitive already solves this and is unused here.** `components/ui/button.tsx:30` bakes in the correct ring. Both pages hand-roll `<button>`/`<a>`/`<Link>` instead of importing it.
- **Weak input focus.** `inputCls` (`settings/page.tsx:25`) relies on `focus:border-ink` only (a 1px underline colour shift) with `outline-none` - insufficient as the sole focus signal, and no `:focus-visible` ring. `selectCls` (`:26`) is the same.
- **Missing disabled semantics on the async save.** "Save changes" toggles `disabled:opacity-60` but never sets `aria-busy` (`settings/page.tsx:325-328`) - again, the app already does this correctly on `UnpaidPlanBanner:88`.

### Visual Micro-Patterns ("AI-looking" placeholders)

- **The `NewsCard` is a placeholder masquerading as content (P0 slop).** `NewsCard` (`page.tsx:219-234`) accepts an `image` prop that is **never rendered** - the JSX only ever draws a static newspaper SVG (`:222-227`). The screenshots confirm this: three identical grey newspaper glyphs. The `image` values point at `/news/*.jpg`, and `public/news/` **does not exist**. The cards are also **non-interactive** (no `href`), yet the section footer reads "Curated by your HQ.ai advisory team. Updated regularly." - implying a live, editorial feed that is in fact three hardcoded strings (`page.tsx:173-187`). This is the textbook "generic AI layout" tell on the product's landing screen.
- **Hand-rolled empty states instead of the shared component.** Home draws two bespoke empties (`page.tsx:125-133` conversations, `:159-164` documents); Settings has none but *should* show one while loading. The app has `EmptyState` (`components/ui/EmptyState.tsx`) and `app/dashboard/booking/page.tsx:46-68` is the reference implementation (tinted icon tile + display headline + soft body + action). Home reinvents a thinner version.
- **Hand-rolled status pill.** The "Escalated" chip (`page.tsx:118-120`) is inline `bg-warning/10 text-warning` - that is exactly what `StatusPill` (`tone="warning"`) exists to standardise.
- **Header grammar is inconsistent between the two pages** (a subtle but real "two different authors" tell):

| | Home | Settings |
|---|---|---|
| h1 font | `font-display` (`LocalGreeting.tsx:25`) | `font-sans` (`settings:186`) |
| Eyebrow | `font-mono` gold + dash rule (`LocalGreeting.tsx:21-24`) | `font-bold` grey, no rule (`settings:183-185`) |
| Section headings | Title case, `tracking-tight` (`page.tsx:76`) | UPPERCASE, `tracking-wider` (`settings:195`) |
| Content width | `max-w-6xl` (`page.tsx:69`) | `max-w-2xl` (`settings:180`) |

Navigating Home -> Settings visibly jumps the content column and re-styles the title. Both are defensible in isolation; together they read as unsystematic.

---

## 3. CORE ROUTE BREAKDOWNS & USER INTENT ANALYSIS

### A. HQ People Page *(context/benchmark for Home & Settings)*

- **Inferred User Purpose:** Not a directory, org-chart, or people database - there is **no `employees` model queried anywhere** under `people/`. `app/dashboard/people/page.tsx` is a **pure server redirect** (`:22`) to `people/advisor`. HQ People is a **two-surface AI HR toolkit**: **AI Advisor** (RAG-grounded, citation- and escalation-aware chat, `components/chat/ChatInterface.tsx`) and **AI Administrator** (a 33-template HR document generator -> TipTap editor -> PDF/DOCX, `administrator/AdministratorClient.tsx:183` "Every HR document you need, in under 3 minutes."), plus a CV Formatter ingest tool.
- **Current Technical & Visual State:** The two client files are **near-exemplary token discipline** - fully semantic tokens, `rounded-2xl/3xl`, `shadow-card`, correct type scale, no hardcoded colour. Real patterns worth harvesting: the gallery (**filter pills + search + card grid + empty**, `AdministratorClient.tsx:162-221`), the **`FormField` renderer** (one component for text/textarea/select/date/number, `:419-469`), the Documents **collapsible accordion + `StatusPill` + `aria-expanded`/`role="region"`** (`documents/page.tsx:176-199`), and `EditorSkeleton` as a real loading skeleton. The best async-state handling in the app lives here (`ChatInterface` `__STATUS__`/`__API_ERROR__` sentinels + 60s timeout escalation).
- **Critical Gaps & UX Enhancements (relevant to the two audited pages):** Token debt is concentrated in the TipTap `DocEditor` (`:205-342` `<style jsx>` block **duplicates token hex** - `#E8B23A`, `#F7EBCB`, `#1F1F1F` - a drift risk) and leftover legacy aliases in the Documents edit modal. h1 font treatment is *itself* inconsistent within the segment (`font-sans` in Administrator/Ingest vs `font-display` in Documents/Advisor) - the same disease as Home<->Settings. **Takeaway: People proves the system applies cleanly, but every surface re-hand-rolls the same empty-state / search / form-field / skeleton rather than sharing them. Home and Settings should consume, not reinvent.**

### B. HQ Recruit Page *(context/benchmark for Home & Settings)*

- **Inferred User Purpose:** A **linear 3-tool funnel** ("Three tools, one funnel", `recruit/page.tsx:44`) - Campaign Coach (job-ad wizard) -> CV Scoring Agent -> Shortlist Agent - where each role internally runs a **4-step stepper** (`RoleStepperRail`: Score CVs / Prescreen / Shortlist / Interviews). It is an ATS-lite pipeline whose connective tissue is URL/session hand-offs, not one shared board.
- **Current Technical & Visual State:** The landing page is a **static 3-tile launcher** - no active-roles list, no board, no empty state (the role list lives one level down in `RecruitDashboard`). There **is** drag-and-drop, but confined to an optional Kanban view using **native HTML5 DnD, no library** (`ResponsesKanban.tsx:83-137`); List is the default (`RoleDetail.tsx:136`). The primary stage mechanic is **explicit buttons + bulk multi-select** (`Step3Shortlist.tsx`, `BulkActionFooter.tsx`), plus a review-only keyboard layer (`hooks/useRecruitKeyboardShortcuts.ts`: J/K, 1-5, A/R). `focus-visible` is **strong and consistent on buttons**, and `EmptyState` is used for real (`RoleDetail.tsx:886`). The flagship reusable is **`RecruitFlowRail`** - the canonical, accessible progress rail.
- **Critical Gaps & UX Enhancements (relevant to the two audited pages):** Two bugs the Home page very likely shares: (1) **link-cards have no focus ring** (`recruit/page.tsx:54-68` landing tiles, `ResponsesKanban.tsx:113` cards) - identical to Home's `QuickAction`/`NewsCard`; (2) **errors are frequently console-only** in the dashboard layer (`RecruitDashboard.tsx:48,150`) while CV Screening has the good user-facing pattern - the same "silent failure" shape Home's server queries and Settings' `save()` exhibit. Recruit also carries **four-plus competing stage/status vocabularies** - if the Home dashboard ever surfaces role progress, it must pick one (reuse `StatusPill` + `ProcessFlowTracker`).

### C. Core Dashboard & Settings Framework *(primary target)*

**State Integrity (Supabase layouts):**

- **Home (`app/dashboard/page.tsx`)** is a server component that `await`s three queries (`:11,37,50`). It never distinguishes **error from empty**: a failed `recentConvos`/`recentDocs` query returns `null` and is rendered as the "No conversations/documents yet" empty state (`:106,141`) - a fetch failure looks identical to a genuinely empty account. No error surface, no retry. Because it's server-rendered there's no skeleton need, which is fine - but the null-collapse hides outages.
- **Settings (`app/dashboard/settings/page.tsx`)** is a client component with real gaps:
  - **No loading state.** `load()` (`:54-79`) populates `form` after an async round-trip; until then every field renders empty, then **pops in** - a visible content shift on the workspace screen. No `Spinner`, no skeleton (the app ships both; `booking/page.tsx:38-44` is the pattern).
  - **`save()` swallows errors** (`:81-89`): it `await`s two Supabase `update`s but checks neither `error`; on failure it still flips to "Saved". The user is told the save worked when it may not have.
  - **No dirty/unsaved-changes state and no navigation guard** - edit fields, click a sidebar item, changes are gone silently.
  - **Paywall overlay a11y defect (P0).** The free-plan gate (`:267-274`) is a blurred sibling `<div>` over the Advisor section, but the fields behind it stay in the DOM and **remain keyboard-focusable** (no `inert` / `pointer-events-none` / `tabIndex=-1` on the underlying fieldset). Keyboard and screen-reader users tab straight into "locked" fields. Its CTA also calls `openPortal()` (`:269`), which hits `/api/stripe/portal` - a free user has **no `stripe_customer_id`**, so the portal call fails; it should launch checkout / the plan picker.
- **Theme hydration flash (both pages).** `ThemeBoundary` (`components/theme/ThemeBoundary.tsx:14-18`, self-documented) renders server HTML with neither `data-app` nor the `.dark` class, so first paint is `:root` **light**, then the client hydrates the dashboard to its **dark** default - a visible light->dark flash on every cold dashboard load.

**Settings Hierarchy:**

- The page is a **single 454-line scroll with no tabs and no section nav.** The brief asks about "settings tab synchronization" - there is nothing to synchronise; `components/settings/` exists but is **empty**, so the monolith owns all logic (form state, logo upload, Stripe checkout, portal, plan picker, upgrade modal) in one file.
- Ordering is slightly off: the primary **"Save changes"** button sits **mid-page** (`:325`) between the Advisor section and the Billing section, so it's easy to miss below the fold and it visually appears to "belong to" Billing (which has its own separate actions). It isn't sticky.
- The information architecture itself is sound (Logo -> Profile -> Business -> Advisor -> Billing) and maps cleanly to the screenshots - it just needs sectioning/anchoring and a persistent save affordance to feel like a workspace settings surface rather than a long form.

---

## 4. ACTIONABLE IMPLEMENTATION TICKETS FOR THE UX AGENT

*Prioritised P0 (broken/embarrassing on a flagship surface) -> P3 (hygiene).*

### DASH-01 (P0): Fix or remove the broken "Recent news" module

- **Target Files:** `app/dashboard/page.tsx:169-234`, `public/news/` (missing)
- **UX Issue:** `NewsCard` never renders its `image` prop (always the placeholder SVG), the referenced `/news/*.jpg` assets don't exist, cards aren't clickable, and the section claims to be a live "curated, regularly updated" feed while being three hardcoded strings. This is the most AI-slop-looking block on the first screen.
- **Technical Refactor Blueprint:**

```tsx
// Decision first: is this a real feed or not? Two honest paths.

// (A) Keep it static but make it TRUE and useful - render the image,
//     make cards links, drop the "updated regularly" claim.
function NewsCard({ image, title, date, href }: { image: string; title: string; date: string; href: string }) {
  return (
    <Link href={href}
      className="group block bg-bg-elevated border border-border rounded-3xl overflow-hidden transition-all
                 hover:-translate-y-0.5 hover:border-ink/30
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
      <div className="h-36 bg-bg-soft overflow-hidden">
        {/* next/image with a real asset; keep the SVG only as onError fallback */}
        <Image src={image} alt="" width={480} height={144} className="h-36 w-full object-cover" />
      </div>
      <div className="p-4">
        <p className="text-xs text-ink-muted mb-1">{date}</p>
        <p className="text-sm font-medium text-ink leading-snug line-clamp-2">{title}</p>
      </div>
    </Link>
  )
}
// ...and change the footer line to the truthful "Curated by your HQ.ai advisory team." (drop "Updated regularly").

// (B) If there is no feed yet, DELETE the section rather than fake it.
//     A shorter, honest dashboard beats a placeholder wall.
```

### DASH-02 (P0): Restore keyboard focus states + adopt the `Button` primitive across both pages

- **Target Files:** `app/dashboard/page.tsx` (`QuickAction:197-217`, `:128-131`), `app/dashboard/settings/page.tsx` (`:325`, plan picker `:394-414`, toggle `:376-385`, inputs `:25-26`)
- **UX Issue:** 0 `focus-visible` on either page; two controls strip the outline outright. Keyboard users have no visible focus anywhere on the landing and settings screens, while the rest of the app has a consistent ring.
- **Technical Refactor Blueprint:**

```tsx
import { Button } from '@/components/ui/button'

// Hand-rolled CTA -> primitive (gets ring + disabled + tokens for free):
<Button asChild size="md">
  <Link href="/dashboard/people">Start your first chat</Link>
</Button>

// Save button:
<Button onClick={save} disabled={saving} aria-busy={saving}>
  {saving ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
</Button>

// For elements that must stay bespoke (QuickAction/NewsCard links, plan cards),
// append the house focus ring - never leave a bare focus:outline-none:
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"

// Inputs - add a real focus-visible ring, not just a border shift:
const inputCls = "w-full border-b border-ink/30 bg-transparent px-1 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-accent/30 rounded-sm"
```

### SET-03 (P0): Fix the Settings paywall overlay a11y + wrong CTA

- **Target Files:** `app/dashboard/settings/page.tsx:264-274`
- **UX Issue:** Fields behind the "Upgrade to unlock" blur remain focusable (keyboard users tab into locked inputs); the CTA calls `openPortal()`, which fails for free users who have no Stripe customer.
- **Technical Refactor Blueprint:**

```tsx
// Make the whole gated group inert so it's neither focusable nor read by SR,
// and route the CTA to checkout (the plan picker), not the billing portal.
<section className="... relative">
  <h2>Advisor details</h2>
  <p>...</p>
  {plan === 'free' && (
    <div className="absolute inset-0 bg-bg/40 backdrop-blur-[1.5px] rounded-3xl flex items-center justify-center z-10">
      <Button onClick={() => document.getElementById('billing')?.scrollIntoView({ behavior: 'smooth' })}>
        Upgrade to unlock
      </Button>
    </div>
  )}
  {/* @ts-expect-error inert is valid HTML, types lag */}
  <div className="space-y-4" inert={plan === 'free' ? '' : undefined}>
    {/* advisor fields */}
  </div>
</section>
// (add id="billing" to the Billing <section> so the CTA lands on the plan picker)
```

### SET-04 (P1): Make `save()` honest - error handling, dirty-state, sticky save bar

- **Target Files:** `app/dashboard/settings/page.tsx:81-89, 325-328`
- **UX Issue:** Saves report success even on failure; no unsaved-changes signal; primary action is stranded mid-page.
- **Technical Refactor Blueprint:**

```tsx
const [dirty, setDirty] = useState(false)
const [saveError, setSaveError] = useState('')
// mark dirty in every onChange (or diff form/userName against the loaded snapshot)

async function save() {
  if (!bizId || !userId) return
  setSaving(true); setSaveError('')
  const [{ error: bizErr }, { error: profErr }] = await Promise.all([
    supabase.from('businesses').update(form).eq('id', bizId),
    supabase.from('profiles').update({ full_name: userName }).eq('id', userId),
  ])
  setSaving(false)
  if (bizErr || profErr) { setSaveError('Could not save your changes. Please try again.'); return }
  setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
}

// Sticky action bar so Save is always reachable on the long form:
<div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-bg/90 backdrop-blur border-t border-border flex items-center gap-3">
  <Button onClick={save} disabled={saving || !dirty} aria-busy={saving}>
    {saving ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
  </Button>
  {dirty && <span className="text-xs text-ink-muted">Unsaved changes</span>}
  {saveError && <span className="text-xs text-danger">{saveError}</span>}
</div>
// + warn on route change while dirty (beforeunload / router guard).
```

### SET-05 (P1): Add a Settings loading skeleton (kill the field pop-in)

- **Target Files:** `app/dashboard/settings/page.tsx:37-79, 178+`
- **UX Issue:** Fields render empty then fill after the Supabase round-trip - a content shift on the workspace screen. The app already ships `Spinner`/`EmptyState` and `booking/page.tsx:38-44` is the precedent.
- **Technical Refactor Blueprint:**

```tsx
const [loading, setLoading] = useState(true)
// in load(): finally { setLoading(false) }

if (loading) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 space-y-5">
      <div className="skeleton h-10 w-2/3" />       {/* .skeleton util already exists */}
      {[0,1,2].map(i => <div key={i} className="skeleton h-40 w-full rounded-3xl" />)}
    </div>
  )
}
```

### DASH-06 (P1): Unify the page-header system across Home & Settings

- **Target Files:** `components/dashboard/LocalGreeting.tsx`, `app/dashboard/settings/page.tsx:180-191`; new `components/dashboard/PageHeader.tsx`
- **UX Issue:** Different h1 font (`font-display` vs `font-sans`), different eyebrow (gold mono + dash vs grey bold), different section-heading case, and different `max-w` (6xl vs 2xl) make the two core pages feel authored by different people.
- **Technical Refactor Blueprint:**

```tsx
// One header primitive; both pages consume it. Locks eyebrow + h1 grammar.
export function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
        <span aria-hidden className="h-px w-5 bg-clay" />{eyebrow}
      </p>
      <h1 className="font-display text-2xl sm:text-h1 font-bold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="text-sm sm:text-body text-ink-soft mt-1">{subtitle}</p>}
    </div>
  )
}
// Settings: <PageHeader eyebrow="Settings" title="Your HQ.ai workspace." subtitle="Update your business profile, advisor handoff details and billing plan." />
// Pick ONE content width for dashboard pages (recommend max-w-5xl) and apply to both.
// Pick ONE section-heading treatment (recommend Title-case tracking-tight, matching Home) and apply to Settings' 5 <h2>s.
```

### DASH-07 (P1): Replace hand-rolled empties/pills with the shared primitives

- **Target Files:** `app/dashboard/page.tsx:106-133, 159-164, 118-120`
- **UX Issue:** Home reinvents `EmptyState` and `StatusPill`, diverging from People/Recruit/booking.
- **Technical Refactor Blueprint:**

```tsx
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/ui/StatusPill'

// Conversations empty:
<EmptyState
  tone="bg-clay-soft text-clay-ink"
  icon={<ChatSvg />}
  title="No conversations yet"
  description="Ask your AI Advisor an HR question to get started."
  action={<Button asChild><Link href="/dashboard/people">Start your first chat</Link></Button>}
/>

// Escalated chip:
{c.escalated && <StatusPill tone="warning" label="Escalated" />}
```

### SET-08 (P2): Componentise Settings + add section anchoring

- **Target Files:** `app/dashboard/settings/page.tsx` -> `components/settings/{ProfileSection,BusinessSection,AdvisorSection,BillingSection,LogoSection}.tsx`
- **UX Issue:** 454-line monolith, empty `components/settings/`; no way to jump between sections; "tab synchronisation" has nothing to sync.
- **Technical Refactor Blueprint:** Extract each `<section>` into `components/settings/*`; lift shared `form`/`save` into a small `useSettingsForm()` hook. Add a lightweight left anchor-nav (`Profile - Business - Advisor - Billing`) using in-page `#anchors` + `IntersectionObserver` to highlight the active section - the cheap, robust version of tabs for a save-once form. Reuse the `FormField` renderer already proven in `AdministratorClient.tsx:419-469` instead of the local `Field`.

### DASH-09 (P2): Distinguish error from empty on the Home server queries

- **Target Files:** `app/dashboard/page.tsx:37, 50`
- **UX Issue:** A failed Supabase query renders identically to a genuinely empty account, hiding outages with a friendly "nothing here yet."
- **Technical Refactor Blueprint:**

```tsx
const { data: recentConvos, error: convoErr } = await convoQuery
const { data: recentDocs,  error: docErr }  = await docQuery
// pass errors into the panels; render a distinct, calm error state
// (icon + "Couldn't load your recent activity. Refresh to try again.") when set,
// separate from the empty state.
```

### CHR-10 (P2): Eliminate the theme hydration flash

- **Target Files:** `app/layout.tsx` (head), `components/theme/ThemeBoundary.tsx`
- **UX Issue:** Server paints light, client hydrates dashboard dark -> visible flash on cold loads.
- **Technical Refactor Blueprint:** Add a tiny pre-hydration inline script in `<head>` that reads `localStorage['hqai-theme']` (default `dark` for dashboard routes) and stamps `data-app="product"` + the `.dark` class on `<html>` before first paint - the standard next-themes anti-FOUC shim. This removes the self-documented flash in `ThemeBoundary.tsx:14-18`.

### CHR-11 (P3): Delete dead code

- **Target Files:** repo-root `globals.css` (orphan); `components/sidebar/Sidebar.tsx:132-134` (`planLabel` referencing retired `essentials/growth/scale`), unused `SearchIcon` (`:752`)
- **UX Issue:** No user-facing effect, but the orphan stylesheet (green accent, Fraunces/DM Sans) and stale plan map are active traps for any human or agent grepping for tokens/plan ids. Remove them; the live token source is `app/globals.css` and plan ids are `free/solo/business` (`settings/page.tsx:14-18`).

---

## Ticket Priority Summary

| Ticket | Pri | Title | Type |
|---|---|---|---|
| DASH-01 | P0 | Fix/remove broken "Recent news" module | Correctness / slop |
| DASH-02 | P0 | Restore focus states + adopt `Button` primitive | A11y / consistency |
| SET-03 | P0 | Paywall overlay a11y (inert) + wrong CTA | A11y / correctness |
| SET-04 | P1 | Honest `save()` - errors, dirty-state, sticky bar | Correctness / UX |
| SET-05 | P1 | Settings loading skeleton | CLS / polish |
| DASH-06 | P1 | Unify page-header system (eyebrow/h1/width) | Consistency |
| DASH-07 | P1 | Use `EmptyState` + `StatusPill` primitives | Consistency |
| SET-08 | P2 | Componentise Settings + section anchoring | Architecture |
| DASH-09 | P2 | Distinguish error vs empty on Home | Robustness |
| CHR-10 | P2 | Kill theme hydration flash | Polish |
| CHR-11 | P3 | Delete dead code (orphan CSS, stale plan map) | Hygiene |

**One-line handoff for the UX Agent:** almost none of this is net-new design - it is *adopting the system the app already has* (`Button`, `EmptyState`, `StatusPill`, `Spinner`, `RecruitFlowRail`, the token vocabulary, the house focus-ring) on the two pages that currently bypass it, plus three genuine correctness fixes (broken news module, silent save, focusable paywalled fields).
