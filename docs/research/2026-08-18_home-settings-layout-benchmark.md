# HQ.ai — Home & Settings Layout Benchmark and Rebuild Spec

**Annotated wireframe specification. Ready to hand to a coding agent (Claude Code).**
Date: 18 Aug 2026. Method: four parallel web-research streams (HRIS home dashboards; multi-tenant/consultant account-switching; AI-native chat home states; settings IA + craft), each with a primary-source, dated, confidence-marked evidence standard, synthesised against HQ.ai's current shipped code (this repo's `app/dashboard/page.tsx`, `components/sidebar/Sidebar.tsx`, `app/dashboard/settings/page.tsx` + `components/settings/*`, and the Wattle Gold design system in `tailwind.config.ts` / `app/globals.css`).

Scope: the post-login **Home/dashboard** and the **Settings** area only. Chat-first is a fixed constraint; the question answered here is what wraps around, feeds, and hands off to chat. No new features are proposed — only layout, structure, hierarchy, and the surfacing of what already exists or is already planned (the consultant/Super Admin role is a stated, planned role).

---

## 1. Executive summary (the decisions that matter)

1. **The home screen must actually become chat-first. Today it is not.** The current `/dashboard` shows quick-action cards + Recent conversations + Recent documents, but the chat itself lives one-to-two clicks away at `/dashboard/people/advisor` and inside the Recruit tools. Every AI-native benchmark puts a composer on the landing surface. **Highest-impact change: place a chat composer as the home hero.** (High confidence; 8/8 AI-chat products land on a composer.)

2. **Wrap the composer in a task/status scaffold — do not float a bare box.** No domain-expert AI tool ships a blank input; Harvey wraps it in curated rails (suggestions / most-used sources / recent work), and every ops-first HRIS makes the home a bounded "what needs doing" surface. HQ.ai's home = **centered composer + stream-scoped starter chips + a next-actions/alerts rail + recents**. Chat answers "how"; the rail answers "what's outstanding." Employment Hero's live admin dashboard (captured 18 Aug 2026) is the closest incumbent validation — its Hero AI sits as a prominent panel *beside* a To Do list, a Launchpad action grid and a Connect feed; HQ.ai's deliberate step beyond is to make the composer the hero rather than one widget among many. (High confidence; Harvey + Gusto + Personio + a live Employment Hero capture.)

3. **Drive role differences off content, not separate pages.** All three roles (SME owner, HR practitioner, Super Admin) share one home; vary starter chips, rail density, and guidance copy by role. Gusto-sparse guided view for the novice owner; Personio/Rippling-dense actionable view for the practitioner. (High confidence; role-conditional density is the cluster norm.)

4. **The Super Admin consultant is the biggest architectural gap and the biggest opportunity.** HQ.ai has `owner / test_admin / member` roles but no client-account model, no switcher, and no "which account am I in" signalling. The consultant needs a **Client Command Center** (roster) as their landing when outside a client, and the scaffolded home with **coloured "acting inside {Client}" chrome** when inside one. (High confidence the pattern exists; the strongest anti-error precedent is AWS Console Account Color, Aug 2025, plus impersonation-UX frames.)

5. **"Which account am I in" must be server-enforced, not just painted.** Name-in-header is universal but weak. Ship three layers: (a) per-client accent colour in the persistent chrome, (b) a non-dismissible "acting inside" bar with a "Return to HQ console" exit, (c) **default read-only** for the consultant, with an explicit, logged, time-boxed "act on behalf" elevation — enforced by Supabase RLS keyed off an active-client session claim so a stale tab cannot write to the wrong tenant. (High confidence; Stripe Connect + WorkOS impersonation.)

6. **Escalation should be AI-offered inline, with an open-state chip HQ.ai must design itself.** Intercom Fin's 2026 stance: the model proposes handoff conversationally; there is deliberately no persistent "talk to a human" button. On takeover, switch the message author to the named consultant. Fin under-specifies the *waiting* state — because HQ.ai's escalations are asynchronous (consultant review, not live chat), add a persistent **"Escalation open · consultant reviewing"** chip on the thread and in recents. (High confidence on the inline pattern; the waiting-state is a deliberate HQ.ai design opportunity.)

7. **Turn risky/compliance answers into "things you act on" via an on-demand right panel.** Claude/Perplexity/Notion/Sana all move from conversation to a structured artifact; the convergent mechanism is a right-side panel that appears only when there's something to show. Render generated letters/policies/contracts and candidate scorecards in a split pane with **inline citations to the source document** — a trust necessity for an HR tool. (High confidence on the panel pattern; note the live disagreement — OpenAI retired Canvas back to inline blocks while Claude doubled down on the panel.)

8. **Settings should move from one scrolling page to a scoped left sub-nav.** The convergent settings pattern is a Personal/Workspace split with a left vertical sub-nav (not a single scroll) once volume grows, recurring labels (Profile, Preferences, Notifications, Security / General, Members & roles, Billing, Integrations, Data & API), hybrid save (auto-save low-stakes; explicit + sticky dirty-bar high-stakes), and a GitHub-style type-to-confirm danger zone. (High confidence; 10–11/11 products.)

9. **Billing stays a thin in-app card that hands off to the Stripe Customer Portal.** Current-plan card + seat/usage + one "Manage billing" CTA that opens a Stripe-hosted portal session for payment method, invoices, plan change, and — critically, to avoid the buried-cancellation dark pattern — cancellation. HQ.ai already has `/api/stripe/portal`; this is a placement change, not new plumbing. (High confidence.)

10. **Two proven trust mechanics the AU HRIS incumbents added in 2026 are mandatory here: permission-scoped answers (Employment Hero Hero AI) and cited answers (BambooHR Bamboo AI).** For an Australian tool where a wrong award/Fair Work answer is costly, scope every chat answer to the user's role/permissions and cite the source record/policy — kept framed as removing busywork, never as legal advice (per HQ.ai's own copy rules). Employment Hero's live dashboard confirms the AU surface concretely — an Award Interpretation / Pay Conditions Engine, STP correction notices in the company feed, and a Hero AI "Check cert expiry" starter — so HQ.ai's next-actions rail should carry the same AU signals (award/Fair Work updates, expiring items, compliance notices), quietly and dated. (High confidence.)

---

## 2. Convergent patterns table

| # | Pattern | Products exhibiting | Tier breakdown | Confidence |
|---|---|---|---|---|
| P1 | Home is a bounded "what needs doing" surface (task/inbox), not a data dump | Gusto, Personio, BambooHR, Rippling, ELMO, Deel | T1: 6/8 | High |
| P2 | Feed-first home (culture/who's-out) is the minority archetype | HiBob (EH hybrid) | T1: 1–2/8 | High |
| P3 | AI-native landing = centered composer (task-scoped) or full history (general assistants) | Notion AI, Harvey, Glean, Perplexity / ChatGPT, Claude | T2: 8/8 | High |
| P4 | Domain-expert chat wraps the composer in curated rails (starters + sources + recent work) | Harvey, Glean | T2: 2/8 (the closest analogues) | High |
| P5 | Starter chips: keep to 2–4; personalise by role/recency in workspace tools, static in consumer | Harvey, Glean, ChatGPT, Perplexity, Notion | T2: 5/8 | High (behaviour), Medium (counts) |
| P6 | Human handoff is AI-offered inline text, not a persistent button (2026 shift) | Intercom Fin | T2: 1 definitive | High |
| P7 | Conversation→artifact via an on-demand right-side panel with citations | Claude, Perplexity, Notion, Sana (ChatGPT diverging to inline) | T2: 4–5/8 | High (pattern), Medium (px) |
| P8 | Left sidebar is the primary product nav; collapses to an icon rail | Rippling, BambooHR, HiBob, Personio, Gusto, ELMO, Deel; Linear/Vercel | T1: 7/8, T3: most | High |
| P9 | Global search / Cmd+K in the top header, persistent across pages | Rippling, Glean, Linear, Stripe | T1+T2+T3 | High |
| P10 | Account switcher in a top-corner org/avatar menu | HubSpot, Gusto, Deel, Xero, Stripe | Cross-tier: 5 | High |
| P11 | Consultant/agency products add a dedicated client-list "command center" as the landing | QuickBooks Online Accountant, Rippling for Accountants, Google Ads MCC | Cross-tier: 3 | Medium–High |
| P12 | "Acting inside client X" signalled by per-account colour chrome + non-dismissible bar | AWS Console (Aug 2025), WorkOS/impersonation UX | Cross-domain: 2 primary | High (as the anti-error precedent) |
| P13 | Read-only vs act-on-behalf is a real configurable distinction for elevated roles | Stripe Connect, WorkOS | Cross-tier: 2 | High |
| P14 | Settings split Personal vs Organisation/Workspace with recurring labels | all HRIS + Linear, Vercel, Figma, Attio, Stripe | T1: 6/6, T3: 5/5 | High |
| P15 | Left sub-nav (not a single scroll) within settings once volume grows | Stripe, Vercel, Attio, Linear + all HRIS | ~10/11 | High |
| P16 | Hybrid save: auto-save low-stakes, explicit + dirty sticky-bar high-stakes | Linear (auto), Vercel/Stripe/HRIS (explicit) | ~all | High |
| P17 | Type-to-confirm "danger zone" for destructive actions (+ grace window) | GitHub, Linear | 2 canonical | High |
| P18 | Billing = thin in-app card → Stripe Customer Portal handoff | Stripe portal adopters broadly | High | High |
| P19 | AU-native compliance surfaced on the home (Fair Work/awards/expiring certs/STP) | Employment Hero (live capture 18 Aug 2026), ELMO | T1 AU: 2 | High for EH (live admin dashboard: Award Interpretation engine, STP feed notice, Hero AI "Check cert expiry"); Low for ELMO (KB gated) |
| P20 | 2026 conversational-HR trust mechanics: permission-scoped + cited answers | Employment Hero, BambooHR | T1: 2 | High |

Anti-patterns (documented, Q19): over-deep settings nesting (>3 levels); buried cancellation as a dark pattern; ambiguous save state (no saved/dirty indicator); shrinking recents/history behind flyouts (ChatGPT's 2026 change drew strong backlash); blurring personal preferences into a deep admin tree.

---

## 3. Home screen wireframe spec

Layout model: existing left **nav rail** (unchanged in role) + a single scrolling content column with a **composer hero** at top, a **two-column activity/next-actions band** below, and a **launchpad band** at the bottom. On desktop the composer is centered with a max content width (~768px for the conversation lineage) inside the page's `max-w-6xl`. Reuse the shipped `PageHeader`, `EmptyState`, `StatusPill`, `Button`, `Spinner` primitives and Wattle Gold tokens throughout.

### Zone 0 — Left navigation rail (existing, keep)
- **Position:** far left, full height. The shipped 68px auto-collapsing hover-rail (`components/sidebar/Sidebar.tsx`).
- **Purpose:** move between Home, HQ People, HQ Recruit, Documents, Tools, Settings.
- **Contents:** business pill (top); Workspace group (Home, HQ People, HQ Recruit, Documents, Tools); Account group (Settings, theme toggle, Sign out); Support (Contact HQ Advisor). Unchanged for owner/member.
- **Vertical priority:** persistent; icons visible collapsed, labels on hover.
- **Role variation:** **Super Admin adds a client-context control at the very top of the rail** (see Zone 1). Otherwise identical.
- **States:** default/hover/collapsed already handled. Add an **active-escalation dot** on the Support entry when the business has an open escalation.
- **Responsive:** desktop = 68px hover rail; tablet/mobile = existing drawer via `MobileShell`.
- **Data source:** `profiles` + `businesses` + feature flags (already loaded in `app/dashboard/layout.tsx`); open-escalation count from `conversations.escalated`.
- **Rationale:** P8 (left sidebar is near-universal). No change needed to a pattern the benchmark validates.

### Zone 1 — Top context bar (new, thin)
- **Position:** full-width strip above the content column (co-exists with the existing mobile top bar).
- **Purpose:** show who/where you are and give a global entry to search and account context.
- **Contents:** left = business/workspace name + logo (identity); center = a **global search / Cmd+K launcher** ("Search or ask…"); right = theme toggle + user avatar menu. For the **Super Admin**: the business name becomes a **client switcher** (dropdown: search, recents, pinned, status column) and, when inside a client, a **per-client accent colour bar** renders along the top edge.
- **Vertical priority:** always visible (sticky).
- **Role variation:**
  - *SME owner / HR practitioner:* static business name + logo, no switcher.
  - *Super Admin, at HQ console:* name reads "HQ Console"; switcher lists managed clients.
  - *Super Admin, inside a client:* full-width **non-dismissible "acting inside" bar** — `You are acting inside {Client} · [Return to HQ console]` — plus the client's accent colour on the top border and the client-name pill. Intensifies to an "ACTING ON BEHALF" state when write-elevation is active.
- **States:** default; switching (skeleton while the new client context loads); error (switch failed → toast, stay on current client).
- **Responsive:** desktop = full bar; mobile = the "acting inside" bar stays full-width and non-dismissible (it is load-bearing), search collapses to an icon.
- **Data source:** active session claim `active_client_id`; `consultant_client_access` join table; per-client colour (admin-set or hashed from `client_id`).
- **Rationale:** P9 (global search in header), P10 (top-corner switcher), P12 (colour + non-dismissible bar as the anti-error precedent — AWS Aug 2025, WorkOS). Name-in-header alone is explicitly a weak signal; do not rely on it.

### Zone 2 — Greeting (existing `PageHeader`, keep, role-condition the copy)
- **Position:** top of the content column.
- **Purpose:** orient and set intent.
- **Contents:** gold mono eyebrow ("YOUR DASHBOARD") + `font-display` greeting ("Good evening, James") + one supporting line. Reuse the shipped `LocalGreeting` → `PageHeader`.
- **Vertical priority:** first thing in the column, above the fold.
- **Role variation:** the supporting line changes by role — owner: "Ask a question or pick up where you left off." practitioner: "Jump back in." Super Admin inside a client: "Working in {Client}."
- **States:** greeting resolves client-side (already handled to avoid tz mismatch); no empty/error state needed.
- **Responsive:** `text-2xl sm:text-h1`.
- **Data source:** `profiles.full_name`, local time.
- **Rationale:** P4 (a greeting/persona one-liner is a common, light launchpad element).

### Zone 3 — Chat composer hero (NEW — the core change)
- **Position:** directly under the greeting; the visual centre of gravity of the page.
- **Purpose:** make the product's primary interaction (chat) the primary home element.
- **Contents:**
  - A **stream toggle** — `People` / `Recruitment` — as a segmented control above or inside the composer (maps to the two functional streams; sets `module` for the chat route).
  - The **composer input** ("Ask HQ about your team, or start a hire…"), full-width within the ~768px conversation column, `rounded-2xl`, with a send affordance and an attach control (CVs, policies) consistent with the existing `ChatInterface`.
  - **Starter chips grouped by the active stream** (2–4 visible), e.g. People: "Draft a warning letter", "Casual conversion — am I compliant?", "Minimum leave entitlements"; Recruitment: "Write a job ad", "Score these CVs", "Build interview questions". Pill-shaped, dismissible; personalise by role/recency where cheap (recent template types, last-used stream).
- **Vertical priority:** highest — this is what the user should see and act on first.
- **Role variation:**
  - *SME owner:* fewer, more guided starters phrased as outcomes ("Handle a resignation the right way").
  - *HR practitioner:* denser starter set, includes power-tasks ("Bulk-score a candidate pool"); the composer defaults to their most-used stream (a set-once preference, à la Glean's "Default composer behavior").
  - *Super Admin inside a client:* composer acts on that client's data (RLS-scoped); starters reflect the client's plan (People-only vs Recruit vs Full).
- **States:**
  - *default:* composer + chips.
  - *loading:* send disabled + `Spinner`; on submit, transition into the conversation view (Zone 3 expands into the chat thread, or routes to the chat surface — see §6).
  - *empty (brand-new account):* the composer stays, but chips become onboarding-oriented ("Add your business details", "Upload your logo", "Ask your first HR question") and a slim first-run checklist sits in Zone 4 (see first-run state there).
  - *error:* inherit the `ChatInterface` `__API_ERROR__` calm-error card pattern already built.
- **Responsive:** desktop = centered ~768px; tablet = full-width with padding; mobile = full-width, chips drop to 3 stacked, horizontal chip-scroll avoided.
- **Data source:** chat route (`app/api/chat/route.ts`); starters from a small curated per-stream config + optional recency (`documents.type`, last `conversations.module`).
- **Rationale:** P3 (composer-first landing, 8/8), P4 (curated launchpad — Harvey), P5 (2–4 stream-grouped chips — Employment Hero's live Hero AI panel ships exactly this: permission-scoped prompt chips like "Check pending actions" / "Check cert expiry" / "What can I edit?"), P20 (scope + cite answers). This is the single change that makes "chat-first" literally true on the home screen.

### Zone 4 — Next-actions & alerts rail (NEW, right column of the activity band)
- **Position:** right column beneath the hero (stacks under recents on mobile).
- **Purpose:** answer "what's outstanding" so the home serves the guidance-needing owner and the speed-needing practitioner without noise.
- **Contents (only surfaces of things that already exist in the product):**
  - **Open escalations** — "Escalation open · consultant reviewing" with the topic and time; links back to the thread (`conversations.escalated` + `escalation_summary`).
  - **Recruitment items needing action** — candidates awaiting review, prescreens to score, shortlists to advance (from the Recruit pipeline the app already runs).
  - **Documents to review / recently generated** — quick "open in library".
  - **Compliance / applicable-news items** — the curated AU items (Fair Work / award / casual-conversion updates) as *quiet, dated* entries, not a hero.
  - Empty when nothing is outstanding (do not fabricate tasks).
- **Vertical priority:** high — second only to the composer.
- **Role variation:**
  - *SME owner:* framed as a single "next best action" with plain-language guidance ("2 candidates are waiting for your review — open them").
  - *HR practitioner:* denser list, counts and timestamps, no hand-holding.
  - *Super Admin inside a client:* the client's outstanding items; at HQ console this rail becomes a **cross-client attention summary** (which clients have open escalations / items) — permission-gated.
- **States:** default (list); empty ("You're all caught up"); loading (skeleton rows); error (calm inline error, distinct from empty — reuse the `EmptyState tone="bg-danger/10"` pattern already in the home page).
- **Responsive:** desktop = right column; mobile = collapsible section under recents.
- **Data source:** `conversations` (escalated), recruit pipeline tables, `documents`, curated news config.
- **Rationale:** P1 (bounded task/status surface — the concrete model is Personio's **Inbox widget**: previews the top ~5 tasks + approvals with action-in-place and mirrors to email, plus Employment Hero's live **To Do List** and "Check pending actions"), P7-adjacent (open-escalation state), P19 (AU compliance surfacing — EH surfaces STP notices + cert expiry live), P12/anti-noise (Gusto colour+date urgency; contain in one rail, do not scatter banners).

### Zone 5 — Recent activity (existing, becomes the continuity rail)
- **Position:** left column of the activity band (the current two-column Recent conversations + Recent documents).
- **Purpose:** resume prior work — the continuity mechanism HRIS lacks and chat products excel at.
- **Contents:** **Recent conversations** (titled + timestamped threads, stream label, gold dot, `StatusPill` for escalated — already shipped) and **Recent documents**. A clear "New chat" is implicit in Zone 3.
- **Vertical priority:** high; keep one click away — heed ChatGPT's 2026 backlash against burying recents.
- **Role variation:** practitioner sees more rows; owner sees fewer. Super Admin: scoped to the active client.
- **States:** default list; empty (reuse the shipped `EmptyState` with "Start your first chat" → `/dashboard/people/advisor`); error (distinct calm card — already implemented via `convoErr`/`docErr`).
- **Responsive:** two columns desktop; stacked mobile.
- **Data source:** `conversations`, `documents` (the resilient query already handles the `escalated` column).
- **Rationale:** P3/Q10 (recents-on-home + left-rail continuity), and the HRIS cluster has no incumbent pattern to copy — this is borrowed from chat products deliberately.

### Zone 6 — Launchpad shortcuts (evolve the existing quick-action cards)
- **Position:** bottom band.
- **Purpose:** direct entry to the two module hubs and the most-used documents/templates.
- **Contents:** slim links to **HQ People** and **HQ Recruit** hubs (the launchers already built) and a **most-used templates/documents** row (Harvey's "most-used knowledge sources"). Demote the current three big gold quick-action *cards* — with a composer present they are redundant as the primary CTA; keep them as secondary shortcuts.
- **Vertical priority:** below the fold; discovery, not primary action.
- **Role variation:** owner sees guided labels; practitioner sees denser shortcuts.
- **States:** static (config-driven).
- **Responsive:** 2–3 column grid → stacked.
- **Data source:** static routes + `documents`/`template-ip` for most-used.
- **Rationale:** P4 (most-used sources rail). Avoids two competing primary CTAs (composer vs cards).

### Super Admin variant — Client Command Center (landing when NOT inside a client)
- When a Super Admin logs in and is not scoped to a client, Zone 3–6 are replaced by a **roster**: a searchable, sortable list/table of managed client accounts. Columns: client name, plan (HR365 People / Recruit / Full), status, **open escalations count**, last acted. Search + recency + pinned favourites (HubSpot precedent). Row action = "Enter" → sets `active_client_id`, applies the coloured chrome, lands on the scaffolded home scoped to that client.
- **Rationale:** P11 (QBOA/Rippling command-center), P10 (switcher), P12 (enter-with-context).

---

## 4. Settings screen wireframe spec

Move from the current single scrolling page + anchor nav (`components/settings/SettingsNav.tsx`) to a **scoped left sub-nav + right content pane**, routed under `/dashboard/settings/*`. Three scopes: **Your account** (personal), **Workspace** (the business; admin-gated), **Consultant** (Super Admin only). Keep the shipped section components (`LogoSection`, `ProfileSection`, `BusinessSection`, `AdvisorSection`, `BillingSection`) — they become the content panes; only the shell and routing change.

### Settings shell
- **Position:** left sub-nav (grouped, scope headers, search box at top) + right content pane, inside the dashboard chrome.
- **Purpose:** find and change configuration without hunting.
- **Vertical priority:** sub-nav persistent; active item highlighted.
- **Responsive:** desktop = left sub-nav; mobile = the sub-nav collapses to a top drawer/select, pane full-width.
- **States:** loading = the shipped `SettingsSkeleton`; per-pane empty/error as needed.
- **Rationale:** P15 (left sub-nav at volume), P14 (scope split), Q19 (settings search; ≤2 levels).

### Proposed navigation tree (exact labels)

```
SETTINGS  — left sub-nav, grouped by scope, search box at top

── YOUR ACCOUNT  (personal; applies only to you)
   Profile            /dashboard/settings/profile        name, avatar, email
   Preferences        /dashboard/settings/preferences    theme (dark default + toggle), language, timezone
   Notifications      /dashboard/settings/notifications   email/in-app notification prefs
   Security           /dashboard/settings/security        password, 2FA, active sessions, sign out everywhere

── WORKSPACE  (the business; owner/admin only)
   General            /dashboard/settings/general         business name, logo, ABN, industry, state
   Members & roles    /dashboard/settings/members         invite, role assignment (owner / member / consultant access)
   Advisor handoff    /dashboard/settings/advisor         AI advisor name, human advisor email, Calendly, escalation routing
   Billing & plan     /dashboard/settings/billing         plan card + seats + "Manage billing" → Stripe Portal
   Integrations       /dashboard/settings/integrations    connected apps (as/when they exist)
   Data & API         /dashboard/settings/data            exports, API keys, webhooks (as/when they exist)

── CONSULTANT  (Super Admin only)
   Client accounts    /dashboard/settings/clients         manage/switch managed client workspaces; per-client access level
```

- **Organisation-level vs personal-level vs Super-Admin-level:**
  - *Personal (Your account):* Profile, Preferences, Notifications, Security — scoped to the signed-in user via RLS on `profiles`/user prefs.
  - *Organisation (Workspace):* General, Members & roles, Advisor handoff, Billing, Integrations, Data & API — scoped to the active business; admin-gated (owner/test_admin).
  - *Super Admin (Consultant):* Client accounts — visible only to consultants; governs `consultant_client_access`.
- **Rationale:** P14 (personal/org split with convergent labels), P11/P13 (consultant scope, read-only vs act-on-behalf). Today's settings collapse Profile + Business + Advisor + Billing onto one page with no personal/org boundary and no Members/Security/Notifications — this tree draws the convergent boundary and adds the missing rooms without inventing features (Members/roles and consultant access are planned; Security/Notifications are table-stakes scaffolding).

### Save behaviour (hybrid, matches the shipped `SaveBar` foundation)
- **Auto-save** Preferences and Notifications (on blur / debounced) with an inline **"Saving… → Saved just now"** indicator (GitLab Pajamas pattern).
- **Explicit save + the existing sticky dirty-state `SaveBar`** for Profile, General (logo/business), Advisor handoff, Members — the shipped SaveBar already does honest dirty/saving/saved/error + `aria-busy`; keep it per high-stakes pane.
- **Danger zone** at the bottom of General: destructive actions (e.g. delete workspace) require **type-to-confirm the business name** (GitHub) + a **soft-delete grace window** (Linear's 48h) given AU SME data. Confirm dialogs re-state the target by name.
- **Rationale:** P16, P17, Q19 (unambiguous save state; reachable, safe destructive actions).

### Billing pane (Stripe-integrated, lowest-effort compliant)
- **Contents:** current plan card (plan name — People / Recruit / HR365 Full — plus seats and price), next invoice date, usage bar near limits, one primary **"Manage billing"** button that opens a **Stripe Customer Portal** session (the shipped `/api/stripe/portal`), plus the existing plan-picker/checkout for un-subscribed states. The portal owns payment method, invoices, plan change, and cancellation (keeps cancellation one click away — avoids the buried-cancellation dark pattern).
- **Rationale:** P18, Q19 anti-pattern #2.

### Data / documents / integrations placement
- **Integrations and Data & API live in Settings.** **Document libraries, candidate records, and reports stay in their product areas** (Documents, HQ Recruit) — Settings holds only their *configuration* (templates, field/rubric definitions, export/API keys). (P17: "Settings = configuration and connections; content stays in product areas.")

---

## 5. Component inventory

Reusable components the two specs require (✅ = already exists in this repo; ➕ = new; ✏️ = modify existing).

- ✏️ **PageHeader** — gold eyebrow + display h1 + subtitle. Add a `role`/`subtitle` variation. (exists)
- ➕ **ChatComposer** — stream toggle (People/Recruitment), input, attach, send, starter-chip row. Props: `defaultStream`, `starters[]` (label + seeded prompt), `onSubmit`, `disabled`, `role`. Wraps the existing chat route.
- ➕ **StarterChip** — pill, dismissible. Props: `label`, `prompt`, `stream`, `onClick`, `onDismiss`. Variants: guided (owner) / dense (practitioner).
- ➕ **NextActionsRail** — bounded list of outstanding items. Props: `items[]` (type, title, meta, href, tone), `role`, `emptyLabel`. Uses `StatusPill` for tone; `EmptyState` when empty; distinct error state.
- ✅ **StatusPill** — tone-mapped chip; add/confirm an "escalation open / consultant reviewing" tone. (exists)
- ✅ **EmptyState / Spinner / Button** — reuse for all empty/loading/CTA states. (exist)
- ➕ **RecentActivityList** — extract the current Recent conversations / Recent documents markup into a reusable list with resume + escalation pill. Props: `items[]`, `kind` ('conversations'|'documents'), `emptyAction`.
- ➕ **GlobalSearch / CommandPalette** — top-bar "Search or ask…" + Cmd+K. Props: `scope` (active client for Super Admin), result groups (navigate / ask / recent). (Buildable with a headless combobox; no new backend beyond existing tables.)
- ➕ **ClientSwitcher** — top-corner dropdown for Super Admin: search, recents, pinned, status column, "Enter". Props: `clients[]`, `activeClientId`, `onSwitch`.
- ➕ **ActingInsideBar** — full-width, non-dismissible context bar. Props: `clientName`, `accentColor`, `mode` ('read'|'act_on_behalf'), `onReturn`. Intensifies in act-on-behalf mode.
- ➕ **ClientCommandCenter** — Super Admin roster (table: name, plan, status, open escalations, last acted; search/sort/pin; "Enter" action).
- ➕ **SettingsShell** — left sub-nav (scope-grouped) + content pane + search. Props: `nav[]` (scope → items), `activeRoute`.
- ✅ **SettingsNav → refactor into SettingsShell sub-nav** (exists as anchor nav; becomes route-based sub-nav).
- ✅ **Settings section components** (`LogoSection`, `ProfileSection`, `BusinessSection`, `AdvisorSection`, `BillingSection`) — become route panes. (exist)
- ✅ **SaveBar** — keep for high-stakes panes; pair with an ➕ **AutoSaveIndicator** ("Saving… / Saved just now") for low-stakes panes. (SaveBar exists)
- ➕ **DangerZone** — separated section + type-to-confirm dialog + soft-delete grace window. Props: `resourceName`, `confirmPhrase`, `onConfirm`.
- ➕ **BillingCard** — plan + seats + usage bar + "Manage billing" → Stripe Portal. (wraps existing `/api/stripe/*`)
- ➕ **ArtifactPanel** — on-demand right-side split pane for generated letters/policies/contracts/scorecards, with inline source citations. Props: `open`, `artifact`, `citations[]`, `onClose`. (Surfaces existing generation output; note the Canvas-vs-panel disagreement — panel is the safer bet for structured HR artifacts.)

---

## 6. Interaction & transition notes

- **Composer → conversation:** submitting from the home composer either expands the hero into the live thread in place or routes to the stream's chat surface (`/dashboard/people/advisor` or the Recruit tool) carrying the seeded prompt via the existing `?prompt=` deep-link (already preserved by the People hub). Prefer in-place expansion on the home for the "chat-first" feel; fall back to route for the deep tools.
- **Conversation → artifact:** when the AI produces a letter/policy/contract or a candidate scorecard, open the **ArtifactPanel** on the right (hidden until there's something to show); keep the thread at ~768px. Cite the source document inline. Closing the panel returns to full-width chat. (Claude/Perplexity/Notion pattern; the safer choice than inline blocks for structured HR outputs.)
- **Escalation across screens:** the AI offers handoff inline when risk/uncertainty is high (Fin 2026 — no persistent button). On acceptance, the thread shows a persistent **"Escalation open · consultant reviewing"** chip; the same state appears in Zone 5 recents and as a dot on the sidebar Support entry, so the SME can leave and resume with clear state. On consultant reply, the message author switches to the named consultant's avatar. State lives in `conversations.escalated` + `escalation_summary` (now that the column is applied).
- **Account switching (Super Admin):** switch from the top-corner **ClientSwitcher** or Cmd+K ("Switch client…"). Switching sets a signed **`active_client_id`** session claim; the UI repaints the accent colour + ActingInsideBar; RLS re-scopes all data server-side (a stale tab cannot act on the wrong client). "Return to HQ console" clears the claim and lands on the Client Command Center. Entering a client defaults to **read-only Manage mode**; **Act-on-behalf** is an explicit, reason-gated, time-boxed elevation with a confirm dialog naming the client, an intensified bar, and an append-only audit entry per write.
- **Permission model (Supabase-RLS):** keep the consultant as a distinct role, never a flag on admin. RLS keys off a signed session claim `active_client_id`; policies check a live, unexpired access grant for `(auth.uid(), active_client_id)`; write policies `WITH CHECK(false)` unless the grant is `act_on_behalf`; an append-only action log flags every act-on-behalf write. This makes "which account am I in" a server-enforced fact, not just painted chrome. The grounded model (below) specialises this to HQ.ai's actual schema and its service-derived elevation.

### Consultant tenancy & elevation model (grounded in HQ.ai's current schema)

**Current state (verified in this repo, 18 Aug 2026):**
- **Single tenant per user:** `profiles.business_id` → exactly one `businesses` row. `AppRole = owner | test_admin | member` (`lib/auth/roles.ts`); there is **no `consultant`/`super_admin` role**, and `test_admin` is a read-only *internal* role, not a client-scoped consultant.
- **The "advisor" is denormalised contact strings on the business** (`businesses.advisor_name / advisor_email / calendly_link`) — not a linked consultant identity.
- **The human-advisor layer (HR365 = enterprise-people, Recruit365 = enterprise-recruit, both = enterprise-full) exists only as a sales pipeline** (`enterprise_inquiries.variant_interest` + `status` new→qualified→converted) plus pricing config. **There is no structured field on a business recording which human service it has actually opted into.** Self-serve `businesses.plan` is set from Stripe subscription metadata; the enterprise layer is invoiced.

**Elevation is service-derived + support-triggered (per owner input, 18 Aug 2026).** A consultant's access to a client is not hand-granted per consultant; it is a consequence of the client opting into an outsourced service, with a second ad-hoc path for tech support:
- **Standing (service-based):** client opts into HR365 / Recruit365 / both → their assigned Humanistiqs consultant gets standing access to that client, **domain-scoped to the service** (HR365 → People stream only; Recruit365 → Recruitment stream only; Full → both). **Read-only by default;** writing requires the explicit, reason-logged, time-boxed "act on behalf" elevation.
- **Ad hoc (support-based):** the client raises an IT/tech issue **through the existing Contact HQ Advisor flow** (add a "Tech / IT issue" category) → a **read-only** support grant to view their dashboard and diagnose; the grant **persists until the support ticket is marked resolved** (then revokes), with a long fallback expiry as a backstop so a never-closed ticket cannot grant forever; audit-logged. This is the impersonation-style path and is **never write-capable**.

**Minimum data model to make this real (three additions to today's schema):**
1. **Provisioned service on the business** — `businesses.human_service enum('none','hr365','recruit365','full') default 'none'`, set when an `enterprise_inquiries` row converts (`status='converted'`). This becomes the source of truth for domain scope. (Today this state is missing — it lives only as a sales inquiry, so there is nothing to key access off.)
2. **Consultant identity** — promote Humanistiqs staff to real users with a `consultant` role (extend `AppRole`), replacing the denormalised advisor strings with a `consultant_id` FK on the business (or an assignment row). **One consultant → many clients.** The **founder assigns** the consultant to a client manually when that client's `enterprise_inquiries` row converts (`status='converted'`) — assignment is deliberate, not automatic.
3. **Access grants** — `client_access(consultant_id, business_id, granted_via enum('service','support'), access_level enum('read','act_on_behalf'), reason, support_ticket_id, granted_by, granted_at, revoked_at, expires_at)`. Service grants derive `access_level` + domain from `businesses.human_service`. Support grants are always `read`, linked to the support ticket (`support_ticket_id`, `reason` = the issue) and **revoke when that ticket is marked resolved** — with a long fallback `expires_at` backstop so a never-closed ticket cannot grant access forever.

**RLS:** the active client is the signed claim `active_client_id`; policies check a live `client_access` row for `(auth.uid(), active_client_id)` that is unexpired; writes require `access_level='act_on_behalf'` **and** the acted-on domain (People vs Recruitment) matches the service scope. A stale tab cannot write to the wrong tenant because the check is server-side per request. This keeps the clean role separation the research recommends (consultant ≠ admin-with-a-flag), ties access to a real commercial event (service opt-in) rather than manual grants, and gives IT support a safe read-only door (Stripe/WorkOS/Deel precedent).

---

## 7. Prioritised change list (ranked by impact ÷ effort)

| Rank | Change | Impact | Effort | Notes |
|---|---|---|---|---|
| 1 | **Put a chat composer on the home hero** (Zone 3) with stream toggle + 2–4 starter chips | High | Medium | Makes "chat-first" literally true; reuses the existing chat route + `?prompt=` deep-link. Biggest single win. |
| 2 | **Add the Next-actions & alerts rail** (Zone 4), including the open-escalation chip | High | Medium | Serves both novice and practitioner; surfaces existing escalation/recruit/document state; no new features. |
| 3 | **Demote quick-action cards to launchpad shortcuts** (Zone 6) | Medium | Small | Removes the competing primary CTA once the composer exists. |
| 4 | **Escalation open-state chip + author-switch** across thread/recents/sidebar | High | Medium | Closes the waiting-state gap Fin under-specifies; high trust value for an HR tool. |
| 5 | **Settings → scoped left sub-nav** (Personal / Workspace) with route panes | Medium | Medium | Reuses shipped section components + SaveBar; adds Members/Security/Notifications rooms. |
| 6 | **Billing pane = plan card → Stripe Customer Portal** | Medium | Small | `/api/stripe/portal` already exists; keeps cancellation reachable. |
| 7 | **Auto-save for Preferences/Notifications + AutoSaveIndicator** | Medium | Small | Hybrid save; the SaveBar already covers the explicit path. |
| 8 | **Danger zone with type-to-confirm + soft-delete grace** | Medium | Small | Standard safety; cheap. |
| 9 | **Role-conditional content** (starters, rail density, guidance copy) driven off `role` | High | Medium | One home, three experiences; no separate pages. |
| 10 | **Super Admin: ClientSwitcher + ActingInsideBar + per-client colour chrome** | High | Large | Requires the `consultant_client_access` model + RLS active-client claim. The signalling is cheap; the permission plumbing is the cost. |
| 11 | **Super Admin: Client Command Center landing** | High | Large | Depends on #10; the roster + "Enter" flow. |
| 12 | **Act-on-behalf elevation (read-only default, reason, time-box, audit log)** | High | Large | The safety core of the consultant role; do after #10/#11. |
| 13 | **ArtifactPanel (right-side, on-demand, cited)** for generated docs/scorecards | Medium | Medium | Surfaces existing generation output; improves trust; panel over inline for structured HR artifacts. |
| 14 | **Global search / Cmd+K in the top bar** | Medium | Medium | Navigate + ask + recents; scales the nav without more sidebar items. |
| 15 | **AU-compliance items as quiet dated entries in the rail** | Low–Medium | Small | Verify the exact Fair Work/award surfacing against a live Employment Hero/ELMO demo before copying. |

Recommended sequencing: ship **1–3** first (home becomes chat-first), then **4–9** (trust + settings), then the **Super Admin block 10–12** as a dedicated project (it carries the RLS/permission cost), with **13–15** as polish.

---

## 8. Open questions

1. **Does HQ.ai's chat route support in-place home expansion, or must the composer route to the stream tool?** Determines whether Zone 3 expands inline or deep-links. Evidence to resolve: the current `ChatInterface` mount model and whether it can render on `/dashboard`.
2. **Client-account data model for consultants — now specified** (see §6 "Consultant tenancy & elevation model"). Confirmed current state: single-tenant (`profiles.business_id` → one `businesses`), advisor = denormalised strings, HR365/Recruit365 only a sales pipeline (`enterprise_inquiries`), no provisioned service field, no consultant identity. The recommended model reuses `businesses` as the tenant and adds a provisioned `human_service` field, a `consultant` role/identity, and a service-derived + support-triggered `client_access` grants table. **Owner decisions (resolved 18 Aug 2026):** one consultant maps to **many** clients; the **founder assigns** the consultant manually when `enterprise_inquiries.status='converted'`; IT/tech support is raised through the **existing Contact HQ Advisor flow** (add a Tech/IT category); the read-only support grant **persists until the support ticket is resolved**, with a fallback expiry backstop. The tenancy model is now fully specified for the Super Admin build.
3. **Exact AU-compliance surfacing (Fair Work / award interpretation / STP / state variation).** Employment Hero's live admin dashboard (captured 18 Aug 2026) is now a verified model — Award Interpretation / Pay Conditions Engine, STP correction notices in the Connect feed, Hero AI "Check cert expiry". ELMO remains unverified (support KB gated). Note HQ.ai is not an HRIS (no payroll/STP of its own), so decide which AU signals it legitimately surfaces (award/Fair Work *updates* and advice-adjacent items) vs which belong to a payroll integration.
4. **Read-only-by-default vs log-everything for act-on-behalf.** The field disagrees (Stripe/WorkOS gate to read-only; one teardown argues log-writes-instead). This spec recommends read-only-default given AU HR liability; confirm with legal/compliance appetite.
5. **Fin's end-user "waiting for a human" state is under-documented industry-wide.** No strong incumbent template; the open-escalation chip here is a designed answer, not a copied one — worth a quick usability check.
6. **Artifact panel vs inline blocks.** OpenAI is retiring Canvas back to inline blocks while Claude doubles down on the panel; this spec picks the panel for structured HR artifacts. Revisit if user testing shows short snippets dominate.
7. **Notifications/Security scope.** These settings rooms are proposed as table-stakes but do not yet exist; confirm they are in scope for the rebuild vs deferred.

---

*Confidence & sourcing: every pattern above is tagged in §2 with product count and confidence. Primary sources (product docs, help centres, design systems, dated teardowns) were prioritised; where evidence was marketing-sourced, auth-gated, or from prior knowledge it is flagged in the underlying research and should be re-checked against a live demo before build. Key dated anchors: Employment Hero live admin dashboard captured 18 Aug 2026 (widget home, Hero AI panel, To Do/Launchpad/Connect feed, Award Interpretation engine, STP notice); AWS Console Account Color (Aug 2025); Harvey unified homepage (Jul 2025, reinforced 2026); Intercom Fin conversational escalation (2026); BambooHR Bamboo AI (Jul 2026); ChatGPT sidebar-history backlash (2026); Linear settings redesign (Dec 2024); Stripe Customer Portal + Connect platform controls (current 2026); WorkOS AuthKit impersonation (2025–26). Personio Inbox widget + two-column card home (help centre, 2026); HiBob social-feed home (2023 redesign, reviews 2026).*
