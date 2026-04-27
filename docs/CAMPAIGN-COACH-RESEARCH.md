# Campaign Coach — Research & Design Doc

## Executive Summary

Campaign Coach should be HQ.ai's opinionated, conversational front-door to HQ Recruit: an Australian-SME-tuned AI guide that takes a hiring manager from a one-line role idea ("we need another estimator in Penrith") to a posted ad and a live HQ Recruit screening session in under ten minutes. The competitive scan shows two camps — enterprise ATS players (Greenhouse, Ashby, Lever, SmartRecruiters, Workable) that bury AI inside heavy workflows, and AI-native challengers (Pinpoint, Teamtailor, Recruiterflow, plus AI-ad point tools like Datapeople, Textio, Ongig) that focus narrowly on writing and bias-checking the ad. None are tuned for Australian SMEs, none ground drafts in Modern Awards/FWA, and none hand off cleanly to an asynchronous video-first screen. That gap is HQ.ai's wedge.

For v1: a five-step coached wizard (Role brief → Extract & classify → Draft & coach → Distribution plan → Hand-off), with the AI's structured output stored alongside the eventual `prescreen_sessions` row. Skip full multipost API integration in v1 — the Australian board landscape (SEEK, Indeed, LinkedIn, Jora) does not offer SME-tier posting APIs without recruiter accounts or paid aggregator deals. Instead ship "deep-link with prefilled values + copy-paste assist" for the free/Essentials tier, and pre-architect a multipost adapter layer behind a feature flag for Growth/Scale.

---

## 1. Competitive Scan

| # | Platform | Tier / Market | Ad-writing UX | Job-board distribution | AI guidance | Strengths | Weaknesses (vs HQ.ai) |
|---|----------|---------------|---------------|------------------------|-------------|-----------|------------------------|
| 1 | **Workable** | Mid-market global, paid-only (~USD 169/mo entry) | "AI-powered job description" generator from a title prompt; templated sections; inline edit | One-click to 200+ free boards via aggregator; paid promotion to LinkedIn/Indeed/Glassdoor billed through Workable | "Workable AI" suggests interview kits and writes ad drafts; "Find Candidates" sourcing AI on top tier | Fastest one-click multiposting in SMB tier; mature ad library | Heavy ATS; expensive for AU SMEs; no FWA grounding; ad-writing AI is generic global English |
| 2 | **SmartRecruiters** | Enterprise (200+ seats), priced on request | Structured "Job Ad Editor" with brand kit; req-first | Enterprise XML feeds + premium board packages | "Winston" assistant for sourcing/screening; less prominent on ad authoring | Strong distribution at enterprise scale; CSB | Wrong segment; setup-heavy; not relevant for SMB beyond UX patterns |
| 3 | **Greenhouse** | Mid-market to enterprise | Structured req → role-kit → templated post; minimal ad-writing AI as of 2026 | Direct LinkedIn, Indeed, Glassdoor + aggregator slots | Greenhouse AI Co-pilot for interview kits and stage suggestions | Rigorous structured hiring methodology | Ad authoring is bare; assumes a TA team, not a busy SME owner |
| 4 | **Lever** | Mid-market | Job posting from req object; less wizard-style than Workable | Built-in board integrations, paid sponsorship via Indeed/LinkedIn | LeverTRM AI sourcing; ad-writing AI weaker than Workable | CRM-style nurture, good API | Built for talent teams, not solo HR managers |
| 5 | **JobAdder** | Strong AU presence (Sydney HQ), agency + corporate, ~AUD 200/mo entry | Job description editor with templates; recently shipped AI rewrite | **Best AU board coverage**: native SEEK, LinkedIn, Indeed, CareerOne, Jora, EthicalJobs via paid multiposting credits | Limited ad-writing AI; resume parsing AI is the headline | Australian-owned, native SEEK integration | Agency-flavoured UX; pricey for SMEs running 1–2 hires/year; not coach-style |
| 6 | **LiveHire** | Australian, talent-community focused | Talent pool first, ad creation secondary | LinkedIn + custom careers site; weaker raw multipost | Talent matching AI, candidate engagement | AU compliance literacy, talent-pool model | Not designed for one-off hires; ad-writing UX minimal |
| 7 | **Recruiterflow** | Agency-focused, ~USD 99/seat | "AI JD writer" inside the role create flow | Multipost via Broadbean integration on top plan; 1-click LinkedIn + Indeed | AI sourcing + JD writer + sequence writer | Slick UX; cheap; modern AI | Agency-shaped data model; not a fit for an SME hiring its own people |
| 8 | **Ashby** | Modern enterprise/scale-up | Polished structured ad builder; strong analytics | Native LinkedIn, Indeed, Glassdoor; aggregator for the long tail | "Ashby AI" features for sourcing and copy assistance | Best-in-class analytics; clean UX | Overkill for SMEs; expensive; US-centric |
| 9 | **Pinpoint** | UK-built, mid-market global | Career-site led; ad authoring inside req with templates and inline AI rewrite | Direct LinkedIn, Indeed, Glassdoor; aggregator for rest | AI ad rewrite, AI scorecard suggestions | Strong careers-site builder, EU-data-residency posture | UK English; not Australian-aware |
| 10 | **Teamtailor** | Sweden-built, "employer brand" angle | Drag-and-drop career page + ad builder; very visual | LinkedIn + aggregator; visual ad layouts unusual on SEEK | AI assistant for ad rewriting and chatbot screening | Best-looking career pages in segment | Not ATS-deep; AU board coverage thin; not FWA-aware |
| 11 | **Datapeople** | Specialist AI ad-coaching tool | **Best-in-class JD coaching**: live readability score, gendered-language flags, must-have vs nice-to-have separation, length warnings | Not a poster — exports to ATS | Inline coaching, not generation | Sets the bar for "coach panel" UX | Niche pricing; doesn't post anywhere |
| 12 | **Textio** | Specialist | Inline tone/bias scoring as you type | Not a poster | Tone, inclusivity, predicted-response-rate scoring | Pioneer of the inline-coach pattern | Expensive; standalone |
| 13 | **Ongig** | Specialist | Job-page builder with bias scanner | Not a poster | Bias scanner, EEO compliance | Strong bias detection lexicon | US-centric (EEO not FWA) |

**Patterns worth stealing:**
1. **Datapeople's live coach panel** (right rail with score + tips that update as the user edits) — closest existing UX to what Campaign Coach should feel like.
2. **Workable's one-prompt-to-draft** flow (title + a few details → instant editable draft) — right pace for an SME owner who is not a writer.
3. **JobAdder's AU board coverage** — sets the realistic ceiling for distribution without a multipost partner.
4. **Pinpoint/Teamtailor's "section blocks"** — ads as composable blocks (overview / responsibilities / requirements / benefits / about-us) rather than a single text area. Maps cleanly to a coach that operates per-block.
5. **Greenhouse's "structured hiring"** language — labels for must-have vs nice-to-have, scorecards — gives the user a vocabulary HQ Recruit's rubric already aligns with.

**Patterns to avoid:**
- ATS-style req-first flows (force user to fill 30 fields before they see anything).
- "Generate then edit" without coaching — wall of text and no guidance on whether it's good.
- US-centric tone/legal language (EEO, "veteran status") in any default output.

---

## 2. AI Flow & Guidance Design

Campaign Coach is conversational *and* structured: each step has a free-text/voice surface for the user, but every AI turn returns a typed JSON object that drives the UI. The coach panel narrates what's happening; the main pane is the editable artifact.

### 2.1 Five-step flow

| Step | Goal | User input | AI output (JSON) | Coach panel commentary |
|------|------|-----------|------------------|------------------------|
| 1. Brief | Capture intent | One free-text box: "Tell me about the role." Voice optional. | `RoleBrief` | "Got it — sounds like a Senior Estimator in Penrith. I'll fill in some assumptions, you can correct anything." |
| 2. Extract & Classify | Pull structured fields, suggest Award + classification | Confirm/edit each chip | `RoleProfile` + `AwardSuggestion[]` | "Best match is the Building & Construction General On-site Award (MA000020), Level CW3. Salary band $95–110k looks right for Western Sydney." |
| 3. Draft & Coach | Produce draft ad in blocks; live-coach as user edits | Edit text per block | `JobAdDraft` (per-block) + `CoachScore` (rolling) | "Your responsibilities section uses passive voice in 3 places. Your must-haves list has 11 items — top SME ads have 5–7. Tap to fix." |
| 4. Distribution | Recommend boards, prep deep-links | Select boards + budget | `DistributionPlan` | "For a Sydney trades role, SEEK is non-negotiable (~$340 for 30 days). Indeed is a useful free supplement. LinkedIn is low ROI for this role." |
| 5. Hand-off | Spin up HQ Recruit session, generate questions, prep invite | Confirm + click "Launch campaign" | `PrescreenLaunchPayload` | "Six tailored video-screen questions ready. Rubric pre-loaded with your must-haves. Invite link copied." |

### 2.2 Structured output schemas (illustrative)

```ts
type RoleBrief = {
  raw_text: string;
  voice_transcript_id?: string;
  detected_intent: "new_hire" | "replacement" | "contract" | "casual";
  confidence: number;
};

type RoleProfile = {
  title: string;
  alt_titles: string[];               // for board SEO
  level: "entry" | "mid" | "senior" | "lead" | "manager";
  contract_type: "permanent_ft" | "permanent_pt" | "fixed_term" | "casual" | "contract";
  hours_per_week?: number;
  location: { suburb: string; state: AU_State; postcode?: string; remote: "no" | "hybrid" | "full" };
  salary: { min: number; max: number; currency: "AUD"; super_inclusive: boolean; source: "user" | "estimate" };
  must_have_skills: string[];         // 3-7 ideal
  nice_to_have_skills: string[];
  team_context?: string;
  start_date?: "asap" | string;
  award?: AwardSuggestion;
  eeo_flags: string[];
};

type AwardSuggestion = {
  code: string;                       // "MA000020"
  name: string;
  classification: string;
  min_weekly_rate: number;
  source_url: string;                 // FWA reference
  confidence: number;
};

type JobAdDraft = {
  blocks: {
    overview: string;
    about_us: string;
    responsibilities: string[];
    requirements: { must: string[]; nice: string[] };
    benefits: string[];
    apply_cta: string;
  };
  meta: { word_count: number; reading_grade: number };
};

type CoachScore = {
  overall: number;                    // 0-100
  inclusivity: number;
  clarity: number;
  legal: number;                      // FWA compliance
  attractiveness: number;
  warnings: { block: string; severity: "info"|"warn"|"error"; message: string; suggestion?: string }[];
};

type DistributionPlan = {
  boards: {
    id: "seek"|"indeed"|"linkedin"|"jora"|"careerone"|"ethicaljobs"|"hqai_careers";
    method: "deep_link" | "api" | "copy_paste" | "internal";
    estimated_cost_aud?: number;
    rationale: string;
    prefill_url?: string;
  }[];
  total_estimated_cost_aud: number;
};

type PrescreenLaunchPayload = {
  session_id?: string;
  role_title: string;
  role_description: string;
  custom_rubric: { name: string; description: string }[];
  questions: string[];
  invite_template: { subject: string; body: string };
};
```

### 2.3 Where the model needs grounding

| Domain | Grounding source | Why |
|--------|------------------|-----|
| Modern Award classification + minimum rates | Existing FWA/Awards corpus via `search_knowledge` MCP tool (already indexed) | Hallucinated awards are a legal liability |
| Salary benchmarks | v1: hard-coded ranges by ANZSCO code + state, refreshable. v2: SEEK Salary Insights / LinkedIn Salary | Avoid Claude making up numbers |
| EEO / discriminatory language | Curated AU lexicon (Fair Work Act prohibited grounds) + Datapeople-style heuristics | AU prohibited grounds differ from US EEO; do not import US lexicon |
| Job-board specific length / format rules | Static config (SEEK: 50–250 words for blurb, etc.) | Each board has quirks; bake them into the linter |
| HQ Recruit rubric alignment | Map `must_have_skills` → rubric dimensions via deterministic transform, then let Claude refine | Keeps the hand-off explainable |

### 2.4 Example coached turn

> **User:** "Need someone to run our office in Adelaide — 2 days a week, must be good with Xero."
>
> **Coach:** "Sounds like a part-time Office Manager / Bookkeeper hybrid. I'd classify this under the Clerks—Private Sector Award (MA000002), Level 4. For 16 hours/week in Adelaide CBD, the going rate is around $36–42/hr including super. I've drafted the ad — have a look at the *Responsibilities* block first, I'd love your eyes on it."
>
> **JSON returned to UI:** `RoleProfile` with title, level: "mid", contract_type: "permanent_pt", hours: 16, location, salary, award {code: "MA000002", classification: "Level 4"}, must_have_skills: ["Xero", "AP/AR", "office coordination"], nice_to_have: ["payroll", "BAS lodgement"].

---

## 3. Job-Board Integration Tactics (Australia, 2026)

The honest answer: **none of the major AU boards offer a self-serve posting API for an SME-tier SaaS in 2026**.

| Board | Position in AU | Posting API? | Realistic v1 path | Realistic v2 path |
|-------|----------------|--------------|--------------------|--------------------|
| **SEEK** | #1 by far | "SEEK API" exists but gated to **SEEK Partners** (recruitment agencies + ATS vendors with signed Partner Agreement). Two sub-products: Job Posting API + Application Export API. Not available to a brand-new SaaS without partnership negotiation (months of process, revenue floor). | **Deep-link with prefill** to `talent.seek.com.au/employer/job-ad/new?title=…&category=…` with as many prefillable params as SEEK accepts; combined with 1-click copy of SEEK-formatted ad text for paste into body field | Apply for SEEK Partner status once HQ.ai has steady volume; or piggyback via JobAdder reseller |
| **Indeed** | #2 in AU | Free posting via XML feed **deprecated for new partners** in 2024. **Indeed Apply API** gated to ATS partners. **Sponsored Jobs** uses pay-per-click via the Indeed Employer dashboard, no public API for SMEs. | Deep-link to `employers.indeed.com/p/post-job` with limited prefill. Copy-paste assist. | Pursue Indeed ATS partnership for Apply API once volumes justify |
| **LinkedIn** | Strong for white-collar | LinkedIn Talent Solutions / Recruiter API: enterprise contract, expensive, gated. No SME-tier posting API. | Deep-link to LinkedIn job posting page with prefilled title + description. Free posts limited; paid posts via user's own billing. | Partnership only viable at scale |
| **Jora** | Aggregator (owned by SEEK) | Crawls feeds — if role on HQ.ai careers page with proper Schema.org `JobPosting` markup, Jora indexes for free | Auto-publish to a hosted HQ.ai careers microsite (`hqai.vercel.app/careers/[business]`) with Schema.org JSON-LD → indexed within days. Zero cost. | Submit direct XML feed to Jora's aggregator team for faster indexing |
| **CareerOne** | Mid-tier | Paid posting via dashboard; XML feed for bulk posters | Deep-link only | XML feed at v2 |
| **EthicalJobs** | Niche, NFP/values-led | Paid only via dashboard | Deep-link only | Manual partnership if NFP customers cluster |
| **Google for Jobs** | Search aggregator | Free — requires Schema.org JobPosting markup | Same as Jora — get the careers microsite right | — |
| **HQ.ai careers page** | Internal | Full control | First-class destination — every Coach run publishes here automatically | Custom domain support per business |

### 3.1 Recommended v1 architecture

```
Campaign Coach
   │
   ▼
DistributionPlan
   │
   ├── publish to HQ.ai careers microsite          (always, free, instant)
   │      └── Schema.org JobPosting JSON-LD        (Jora + Google for Jobs index for free)
   │
   ├── deep-link out to SEEK (talent.seek.com.au)  (prefill what we can; copy-paste the rest)
   ├── deep-link out to Indeed                      (same)
   ├── deep-link out to LinkedIn job post           (same)
   │
   └── (feature-flagged) multipost adapter          (off in v1; reserved for v2)
```

### 3.2 Multipost reseller landscape (for v2 reference)

- **Broadbean** (CareerBuilder): ~AUD $250–500/job/month per board package.
- **idibu**: similar, slightly cheaper, UK-led but AU coverage decent.
- **JobAdder Multiposting**: own a JobAdder account or partner with them; not white-labellable.
- **JobTarget OneClick**: US-led, weak AU coverage.

For HQ.ai, the best path at v2 is *JobAdder partnership* (Aussie-owned, deep SEEK integration) or *direct SEEK Partner status* once volume justifies. Avoid building bespoke board scrapers — TOS violations and brittle.

### 3.3 Deep-link prefill — what's actually possible

| Board | Prefillable params | Notes |
|-------|--------------------|-------|
| SEEK | title, category, subcategory, location, work_type — **not the body** | Body must be pasted. 1-click copy of SEEK-formatted version. |
| Indeed | title, location, sometimes job_type — **not the body** | Same. |
| LinkedIn | title, company, location — **not the body** | Same. |
| Jora / CareerOne | none (aggregator-only) | Indexed via careers page. |

The SME UX win: **"We've prefilled what each board allows. Click *Open in SEEK* — your title and location are already there. The full ad text is on your clipboard. Paste it into the body field on the next screen."** Users still feel coached, even though we're not technically posting.

---

## 4. UI / UX Recommendations

All sizes/colours assume the existing tokens in `tailwind.config.ts` (Uber-derived). DM Sans throughout. Pill buttons (`rounded-full`). No gradients.

### 4.1 Entry point

- **Sidebar**: under HQ Recruit, add a sub-item "Campaign Coach" with a small "New" pill. Top-level sidebar stays dark; sub-item uses `text-white/70` with `text-white` on active.
- **Empty state on /dashboard/recruit**: a card prompts "Hiring something new? Try Campaign Coach →" alongside the existing "Create role" CTA.
- **Cmd+K command bar**: add `Start a campaign…` and `Coach me on a job ad`.

### 4.2 Wizard layout

Three-pane at `≥1120px`, two-pane on tablet, single-column on mobile.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Sidebar (dark, 240px)                                                    │
├──────┬──────────────────────────────────────────────┬────────────────────┤
│      │  STEP HEADER: "Step 2 of 5 — Extract"        │   COACH PANEL      │
│      │  (progress dots, pill-shaped)                │   (320px right)    │
│      │                                              │                    │
│      │  MAIN PANE                                   │   ─ avatar + name  │
│      │  (editable artifact: chips or block-editor)  │   ─ rolling commen-│
│      │                                              │     tary (streamed)│
│      │                                              │   ─ live coach    │
│      │                                              │     score (0-100) │
│      │                                              │   ─ warnings list │
│      │                                              │     (clickable)   │
│      │                                              │   ─ "Ask the coach"│
│      │                                              │     input         │
│      │  [ Back ]              [ Looks good → Next ] │                    │
└──────┴──────────────────────────────────────────────┴────────────────────┘
```

**Coach panel** behaviour:
- Streams Claude tokens into the commentary area (existing `ChatInterface` patterns reusable).
- Score updates on debounced edits (1.5s after typing stops).
- Warnings clickable → scroll + highlight relevant block.
- Collapsible to a floating pill on mobile.

### 4.3 Per-step screens

**Step 1 — Brief**
- Single huge textarea (`text-h2`, 32px) with placeholder *"Tell me about the role you're hiring for…"*.
- Mic button (pill, top-right of textarea) for voice → existing Deepgram pipeline.
- Below: 3 example chips ("Senior estimator, Sydney", "Part-time bookkeeper, Adelaide", "Casual barista, multiple shifts") — clicking pre-fills.
- Bottom-right: black pill "Brief the coach →".

**Step 2 — Extract**
- Main pane is a vertically-stacked set of *fields-as-chips*: Title, Level, Contract type, Location, Salary, Award, Must-have skills, Nice-to-have skills.
- Each chip shows AI-extracted value with edit icon. Click → inline-edit popover (no modal).
- Award chip is special: shows code + classification + min rate, with "i" icon → side-drawer with FWA citation pulled from `search_knowledge`.
- Coach panel narrates assumptions and confidence.

**Step 3 — Draft & Coach**
- Main pane is a **block-editor**: each section (Overview, About us, Responsibilities, Requirements, Benefits, Apply CTA) is its own card with `shadow-card`, 8px radius, editable in-place.
- Each block has an action menu: *Rewrite*, *Make shorter*, *Make warmer*, *Show diff*.
- **Diff view**: when AI rewrites a block, old text crossed-out in `text-muted` above new text in `text-charcoal`. Two pill buttons: *Keep new* (black) and *Keep mine* (white).
- Coach panel is loud here — running score, top-3 warnings.

**Step 4 — Distribution**
- Main pane is a checklist of boards, each as a card: greyscale logo, suggested method ("Open & paste" / "Auto-publish" / "Skip — low ROI"), estimated cost, include/exclude pill toggle.
- Below: summary bar with total estimated cost and "Get prefilled links" black pill.

**Step 5 — Hand-off / Launch**
- Two-column: left shows draft ad final preview (read-only, `prose`), right shows auto-generated screening questions (editable list) + auto-derived rubric chips.
- Big black pill: **"Launch campaign"** → POST to new endpoint (see §5).
- After success: confirmation screen with (a) candidate invite link, (b) "Open in SEEK" / "Open in Indeed" deep-link buttons in new tabs, (c) "Copy ad text" button.

### 4.4 Visual rules recap

- All buttons `rounded-full`, padding `px-4 py-2.5` (compact) or `px-5 py-3.5` (comfortable).
- Cards `bg-white shadow-card`, no border.
- Step progress: row of pill chips at top, active black/white, inactive `bg-light`.
- No gradients, no accent colours. Coach score uses size + position, not colour.
- Warnings: severity shown via icon shape + small `text-warning` / `text-danger` label only — no coloured backgrounds.

---

## 5. Hand-off to Shortlist Agent (HQ Recruit)

The hand-off must be a **single transaction**: pressing "Launch campaign" should atomically create the prescreen session, generate questions, derive the rubric, and return the candidate URL.

### 5.1 New endpoint (recommended)

Add `POST /api/campaign/launch` (new route — does **not** modify existing endpoints). It composes existing `/api/prescreen/questions/generate` and `/api/prescreen/sessions` logic server-side, plus a new rubric-derivation step.

**Request payload:**
```ts
{
  role_profile: RoleProfile;
  job_ad_draft: JobAdDraft;
  distribution_plan: DistributionPlan;
  options: {
    question_count: number;          // default 5
    rubric_mode: "auto" | "manual";  // auto = derive from must_haves
    auto_send_outcomes: boolean;
  };
}
```

**Server logic:**
1. Build `role_description` by concatenating `JobAdDraft.blocks.overview` + `responsibilities` + `requirements.must`. This becomes the `description` passed to `generateQuestions()` (existing function in `app/api/prescreen/sessions/route.ts`).
2. Derive `custom_rubric` from `RoleProfile.must_have_skills`:
   - Each must-have skill → one rubric dimension (cap at 6; existing validation rule is 3–6).
   - Map skill name → rubric `name` (Title-cased), `description` = `"Demonstrated ability with {skill} relevant to a {level} {title}."`
   - If `<3` must-haves, top up with derived dimensions: "Communication", "Cultural fit / motivation", "Working style".
3. Call existing `POST /api/prescreen/sessions` server-side with:
   ```ts
   {
     company: business.name,
     role_title: role_profile.title,
     role_description,
     ai_generate: true,
     time_limit_seconds: 90,
     status: "active",
     rubric_mode: "custom",
     custom_rubric,
     auto_send_outcomes: options.auto_send_outcomes,
   }
   ```
4. Persist a new `campaigns` row (see §5.3) linking the campaign artifacts to the resulting `prescreen_sessions.id`.
5. Return `{ session, candidateUrl, deep_links: { seek, indeed, linkedin }, copy_paste_text }`.

### 5.2 Question-generator prompt enrichment (no breaking change)

The existing `generateQuestions` prompt only sees `role_title` + `description`. Recommend a backward-compatible enhancement: when the request includes a `must_have_skills` array, append:

```
Must-have skills (weight questions toward these): {comma-list}
Level: {level}
Contract: {contract_type}
```

…to the user prompt. Function signature changes to accept an optional `extras` object; existing callers unaffected.

### 5.3 New `campaigns` table (Supabase)

```sql
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  created_by uuid not null references auth.users(id),
  prescreen_session_id uuid references prescreen_sessions(id) on delete set null,
  role_profile jsonb not null,
  job_ad_draft jsonb not null,
  distribution_plan jsonb not null,
  coach_score jsonb,
  status text not null default 'draft',  -- draft | launched | archived
  created_at timestamptz not null default now(),
  launched_at timestamptz
);
create index on campaigns (business_id, created_at desc);
```

This keeps conversational artifacts separate from the lean `prescreen_sessions` row, lets the coach be re-opened to iterate, and supports analytics (which boards converted, time-to-launch, etc.). RLS policy: same as `prescreen_sessions` — owner + same business.

### 5.4 Invite template auto-generation

Generate the candidate invite email body during launch (one extra Claude turn):

```ts
invite_template: {
  subject: string;                    // "We'd love to hear from you, {first_name} — {role_title} at {company}"
  body: string;                       // markdown, references {invite_url}
}
```

Add a new optional column `prescreen_sessions.invite_template jsonb` *only if* the team wants AI-templated invites in v1; otherwise reuse existing copy/email-invite UX.

---

## 6. Founder Decisions — CONFIRMED 2026-04-27

All five v1 decisions have been confirmed by the founder:

1. **Pricing tier**: limited Coach on Free (1 campaign/month, no careers microsite hosting), full Coach on Essentials+, multipost on Growth+ — **APPROVED**.
2. **Step 3 auto-fill**: pre-write all blocks BUT each block requires explicit **"Approve Section"** click before the wizard advances to Step 4. No silent advance — confirmation gate per block.
3. **Multipost in v1**: deep-link only, defer full API integration to v2 — **APPROVED**.
4. **Voice on Step 1**: defer to v1.1 — **APPROVED**.
5. **Award grounding**: confident-but-collapsible chip in Step 2 — **APPROVED**.

Lower-priority confirmed:
- Coach voice: **first-person** ("I'd classify this as…", not "The Coach recommends…").
- Careers microsite branding: **HQ.ai-branded** v1 per the Uber-derived design system. Custom domain support deferred to v2.
- NZ market: **defer**. Awards regime doesn't apply; revisit post-launch.

## 7. Open Questions / Founder Decisions (original — for record)

The five decisions that meaningfully shape the v1 build:

1. **Pricing tier** — does Campaign Coach ship in Free/Essentials, or is it Growth+?
   - *Recommendation:* limited Coach (1 campaign/month, no AU careers microsite hosting, no auto-publish to Jora) on Free; full Coach on Essentials+. Multipost adapter (v2) gated to Growth+. The Coach is the wedge — gating it too tightly kills top-of-funnel conversion.

2. **AI auto-fill aggressiveness** — should the coach pre-write the entire ad on Step 3 by default, or wait for confirmation per block?
   - *Recommendation:* auto-write all blocks on Step 3 entry, but every block is in "draft" state until the user touches it. Matches Workable's pace (SME mental model is "give me something to react to"). Datapeople's pure-coach model is too slow for a busy hiring manager.

3. **Multipost in v1?** — build full SEEK/Indeed/LinkedIn API integration now, or ship deep-link-only?
   - *Recommendation:* deep-link only in v1. Full multipost is 4–8 weeks of partnership negotiation per board, and SEEK Partner status is unlikely without volume HQ.ai doesn't yet have. Ship v1, prove demand, then either pursue SEEK Partner or partner with JobAdder for v2.

4. **Voice input on Step 1** — reuse existing Deepgram pipeline, or text-only for v1?
   - *Recommendation:* defer voice to v1.1. Text-only ships faster.

5. **Award grounding strictness** — how visible should the Modern Award classification be?
   - *Recommendation:* surface as a confident-but-collapsible chip in Step 2, with FWA citation in a side-drawer. Don't gate progress on it (some roles have genuinely ambiguous classifications), but log every classification suggestion for compliance audit.

**Lower-priority:** Coach voice (first-person vs impersonal — recommend first-person); careers microsite branding (HQ.ai-branded v1, custom v2); NZ market (defer; Awards regime doesn't apply).

---

## Sources

- Workable, SmartRecruiters, Greenhouse, Lever, JobAdder, Pinpoint, Teamtailor, Recruiterflow, Ashby, LiveHire — vendor websites, public pricing pages, G2/Capterra category leaders Q4 2025.
- Datapeople, Textio, Ongig — vendor product pages, ERE.net coverage 2024–25.
- SEEK Talent Search and Job Posting API — SEEK Developer Portal partner docs (gated; partner-tier confirmation via 2024 trade reporting).
- Indeed XML feed deprecation — Indeed Partner Help Center notice 2024; ATS partner program docs.
- LinkedIn Talent Solutions API — LinkedIn Marketing Developer Platform docs, Recruiter System Connect partner program.
- Schema.org `JobPosting` markup — schema.org/JobPosting and Google Search Central job-posting structured-data guide.
- Modern Awards corpus — Fair Work Commission Awards database (already indexed in HQ.ai via `search_knowledge`).
- HQ.ai source files: `app/api/prescreen/sessions/route.ts`, `app/api/prescreen/questions/generate/route.ts`, `DESIGN-uber.md`, `CLAUDE.md`.

*Vendor pricing and partner-tier details accurate to within ~10% as of Q1 2026; recheck before kicking off the build.*
