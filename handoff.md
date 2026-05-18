# HQ.ai - Session Handoff (Chat 3 → Chat 4)

**Owner:** Jimmy Rayner (jrayner@humanistiqs.com.au)
**Date:** 2026-05-18
**Repo:** `C:\Users\JamesRayner\.claude\projects\C--Users-JamesRayner-hqai\hqai`
**Last commit on main:** `abc4ec2` (logo viewBox fix + accent unification)

---

## 1. Project Goal & Stack

**Product:** HQ.ai — Australian SME HR + recruitment SaaS. Three product surfaces:
- **HQ People** — AI Advisor (chat against AU statute) + AI Administrator (33 IP HR templates, structured doc generation)
- **HQ Recruit** — CV Scoring, Shortlist (phone/video screens), Campaign Coach (job-ad writer)
- **Marketing / /offer** — $25 Letter of Offer growth experiment landing page

**Stack:**
- Next.js 16 App Router + TypeScript + Tailwind v3 (CSS-variable tokens, dual-theme: `data-app="marketing"` Ivory&Clay / `data-app="product"` Ink&Clay)
- Supabase (Postgres + Auth + RLS + pgvector)
- Anthropic Claude (tool-use `emit_document`, 3-tier router Haiku/Sonnet/Opus, prompt caching via `withPromptCache`)
- Voyage AI `voyage-law-2` (1024-dim embeddings, env-gated)
- Cohere `rerank-3`, Anthropic Message Batches
- Cloudflare Stream, Deepgram (phone-screen transcription), MediaPipe Tasks Vision
- Resend (transactional email), Stripe Checkout (subscription + one-off $25 Letter)
- Renderers: `lib/render/{html,docx,pdf,pptx,docx-templates}.ts` — one `StructuredDocument` → 4 formats
- PDF extraction: `pdf-parse@1.1.1` imported via `pdf-parse/lib/pdf-parse.js` (Vercel-compatible)
- shadcn-style cva button variants, next-themes (currently `forcedTheme="light"`)

---

## 2. Key Technical Decisions

| Decision | Why |
|---|---|
| **Dual-theme via `data-app` attribute on `<html>`** | One stylesheet, two contexts; marketing = warm Ivory&Clay, product = neutral Ink with unified Clay accent |
| **Accent unified to Clay (#D97757)** across product (was Amber) | Founder wanted one CTA colour across marketing → onboarding → product |
| **`forcedTheme="light"`** on `ThemeBoundary` | Dark mode caused chaos against hardcoded white panels in Campaign Coach + Shortlist; deferred until full audit |
| **Structured doc model + `emit_document` tool-use** | Eliminates markdown-string parsing; same JSON drives docx/pdf/pptx/html renderers |
| **3-tier router** (Haiku/Sonnet/Opus) keyed by tool+intent | Cost: template-fill on Haiku, complex contracts on Opus |
| **`withPromptCache` ephemeral cache blocks** | 5-min cache on system prompts cuts admin generate costs ~70% |
| **`pdf-parse@1` via `/lib/pdf-parse.js` path** | v2's pdfjs-dist worker fails on Vercel; v1's root index.js debug block hits ENOENT on hard-coded test PDF — sub-path bypasses both |
| **Two-step profile + business fetch** | Embedded select referenced non-existent `abn`/`address` columns; split queries + permissive cast |
| **`documents` insert requires `user_id` AND `type`** | Both NOT NULL on live schema; discovered via synthetic-insert probing |
| **`doc.metadata.issuer_logo_url`** side-channel | Renderers fetch business logo for footer/letterhead without schema change |
| **localStorage-persisted sidebar state** | `COLLAPSE_STORAGE_KEY` + `WIDTH_STORAGE_KEY`; drag-resize + hover tooltips |
| **Logo viewBox `0 510 1760 570`** | Parsed glyph paths: `i` extends to x≈1740, `q` descender y≈1063, `i` dot y≈526 — fits all letters |

---

## 3. Files Created / Modified (high-signal)

**Branding / theme**
- `app/globals.css` — dual-theme tokens, accent unified to Clay across product (light + dark), sidebar-collapsible-hide rules
- `tailwind.config.ts` — full token rewrite, `font-display` → Inter
- `components/theme/ThemeBoundary.tsx` — `forcedTheme="light"`
- `public/{favicon,logo,logo-black,logo-white}.svg` — viewBox `0 510 1760 570` (1760×570)

**Sidebar / shell**
- `components/sidebar/Sidebar.tsx` — collapse + drag-resize + hover tooltips + HQ Recruit briefcase icon + Contact HQ Advisor button (`text-center`, "Need more support?")
- `components/shell/MobileShell.tsx` — logo dims updated

**AI Administrator**
- `app/api/administrator/documents/generate/route.ts` — `BEST_PRACTICE_FORMATTING` envelope, two-step profile/business fetch, `user_id`+`type` on insert, `doc.metadata.issuer_logo_url`
- `app/api/administrator/ingest/route.ts` — CV Formatter (`emit_humanistiqs_cv` tool), Contract review, `pdf-parse/lib/pdf-parse.js` import, `buildHumanistiqsCvDocument()` mapping
- `app/dashboard/people/administrator/AdministratorClient.tsx` — 4-and-4 category grid, eyebrow+sans h1+body header
- `app/dashboard/people/administrator/ingest/IngestClient.tsx` — CV Formatter UI, download buttons gated on `document_id`
- `lib/doc-model.ts` — `StructuredDocument` schema, `STRUCTURED_DOC_TOOL`, `assertStructuredDocument`
- `lib/render/{html,docx,pdf,pptx,docx-templates}.ts` — 4 renderers, all read `issuer_logo_url`
- `lib/router.ts` — 3-tier router, `withPromptCache`, `withPromptCacheBlocks`
- `lib/template-ip.ts` — 33 templates

**AI Advisor**
- `components/chat/TopicPicker.tsx` — "Recruitment & Talent Questions" id `recruitment_talent`, 5 AU-specific owner questions, eyebrow header
- (chat input row) — `items-center` instead of `items-end`

**HQ Recruit**
- `components/recruit/cv-screening/CvScreeningClient.tsx` — Starter Library dropdown removed, RubricFamily component, AI-Admin pattern header
- `components/recruit/RoleDetail.tsx` — heading `font-sans tracking-tight`
- `components/recruit/campaign-coach/WizardShell.tsx` — eyebrow header

**Marketing / commerce**
- `app/offer/page.tsx` + `OfferLandingClient.tsx` + `success/` + `cancelled/`
- `lib/stripe.ts` — env-driven price IDs (`STRIPE_PRICE_ID_LETTER_OF_OFFER` is the correct var name)
- `app/api/administrator/one-off/fulfil/route.ts` — anonymous purchase fulfilment (still missing `user_id` handling — see Unresolved)

**Settings**
- `app/dashboard/settings/page.tsx` — eyebrow header + Stripe plan cards

**Scripts**
- `scripts/check-migrations.mjs`, `scripts/axe-scan.mjs`, `scripts/smoke-doc-engine.mjs`

**Migrations**
- `supabase/migrations/documents_structured_payload.sql`
- `supabase/migrations/knowledge_chunks_voyage_dim.sql` (not yet applied — env-gated)

---

## 4. Current State

### Working
- Brand Kit v4 dual-theme tokens, Clay accent everywhere across product CTAs
- AI Administrator end-to-end: template pick → generate (tool-use) → docx/pdf download
- CV Formatter: docx + txt → Humanistiqs-formatted CV with download
- AI Advisor chat (initial query)
- Sidebar collapse + drag-resize + hover tooltips, HQ Recruit icon distinct
- Stripe Checkout (subscription tiers + $25 Letter)
- /offer landing page
- RLS on `prescreen_responses` (founder fixed via dashboard)
- Voyage code path (env-gated behind `VOYAGE_API_KEY`)
- Logo renders all letters across sign-in, dashboard, onboarding, prescreen, review

### Broken / Deferred
- **Shortlist phone screen "Stop recording" fails to submit** (next session, top priority)
- **Pre-record "Phone Screen Questions" form** missing — needs to pop on "Start microphone"
- **AI Advisor follow-up message** fails after initial query submission
- **AI Advisor greeting alignment** — not centred relative to topic picker
- **Bias-trigger auto-anonymise** rule not yet wired (CV scoring + Shortlist must flip to anonymised view when ethnic-name / similar bias signal detected by the agent)
- **One-off Letter fulfil route** — anonymous path still missing `user_id`; insert will fail until schema allows null or system user is provisioned
- **Documents top-level page header** — not refactored to AI-Admin pattern
- **Shortlist (`RecruitDashboard`) header** — not refactored
- **Dark mode** force-light because Campaign Coach + Shortlist still have hardcoded white panels
- **Logo injection (OPTION F)** — founder-supplied logo assets on Desktop ready for integration per `CLAUDE_CODE_PROMPT_logo_injection_full.txt`
- **PDF ingest on Vercel** — works locally; needs visual QA after next deploy
- **docxtemplater branded templates** — `lib/templates/` empty; needs founder-authored .docx files
- **A0.6 aria-label sweep + A0.7 44px touch-target audit** — not done

---

## 5. Next Immediate Steps

1. **Read OPTION F prompt** at `C:\Users\JamesRayner\OneDrive - humanistiqs.com.au\Desktop\CLAUDE_CODE_PROMPT_logo_injection_full.txt` and the `Desktop\files` folder. Execute the logo injection plan.
2. **Fix Shortlist phone-screen Stop recording** — trace `components/recruit/phone-screen/*` and the upload route; likely a missing await/finalise on the MediaRecorder stop event before POST.
3. **Build Phone Screen Questions form** — pre-record modal triggered by "Start microphone". Pull baseline questions from the video-interview researcher report; allow per-role criteria override + manual edit.
4. **Bias-trigger auto-anonymise rule** — add to CV scoring + Shortlist agents:
   - Detect signals (ethnic name patterns, photo, schooling country, etc.)
   - When triggered, flip `business.settings.anonymise_candidates` (or per-role override) to `true` and re-render scores/AI summaries with masked PII
   - Surface a banner explaining why anonymisation engaged
5. **Fix AI Advisor multi-turn** — currently breaks on the second user message; inspect `app/api/people/chat/route.ts` (or equivalent) for message-history shape — likely losing `messages[]` accumulation between turns.
6. **Centre AI Advisor greeting** relative to topic picker — `components/chat/TopicPicker.tsx` header wrapper width vs greeting wrapper width; probably an extra padding on the outer container.
7. After (1)-(6): re-run smoke (`scripts/smoke-doc-engine.mjs`), commit, push.

---

## 6. Unresolved Bugs

| # | Bug | Surface | Notes |
|---|---|---|---|
| 1 | Stop-recording fails to submit | Shortlist phone screen | Top priority. Likely MediaRecorder finaliser race. |
| 2 | Multi-turn AI Advisor breaks | People → AI Advisor | Initial Q works; follow-up errors. Inspect chat API message accumulation. |
| 3 | Greeting not centred | AI Advisor empty state | CSS alignment between `<h2>` and topic grid. |
| 4 | One-off Letter anonymous insert | `/api/administrator/one-off/fulfil` | `documents.user_id` NOT NULL; needs system user or schema change. |
| 5 | Documents + Shortlist dashboard headers | Page structure | Deferred from prior pass; AI-Admin pattern not applied. |
| 6 | Dark mode panels | Campaign Coach + Shortlist | Hardcoded white bg classes remain; `forcedTheme="light"` until audited. |
| 7 | PDF ingest QA on Vercel | CV Formatter | Works locally with `/lib/pdf-parse.js`; needs prod visual check. |

---

## 7. Seed Prompt for Next Chat

```
HQ.ai handoff — Chat 4. I'm Jimmy Rayner, founder. Read hqai/handoff.md
in full before doing anything else. Standing rules: don't ask permission,
just progress; plain hyphens only (no em/en-dashes); Australian English
(organise, behaviour, optimise); self-verify end-to-end.

Current focus (in order):

1. OPTION F logo injection — read
   C:\Users\JamesRayner\OneDrive - humanistiqs.com.au\Desktop\CLAUDE_CODE_PROMPT_logo_injection_full.txt
   and the Desktop\files folder, then execute.

2. Shortlist phone screen: "Stop recording" fails to submit. Fix the
   recorder finaliser, then add a pre-record "Phone Screen Questions"
   form that pops on "Start microphone" — seed it from the
   video-interview researcher report, allow per-role criteria override
   and manual edit.

3. Bias-trigger rule: if CV scoring or Shortlist agent detects a
   subconscious-bias threat (e.g. ethnic name, photo, schooling country),
   auto-flip the role/business into "anonymise all candidates" mode and
   re-mask scores + AI summaries. Surface a banner explaining why.

4. AI Advisor: follow-up messages fail after the initial query. Fix the
   chat message-history shape.

5. AI Advisor: greeting is not centred relative to the topic picker —
   fix alignment in components/chat/TopicPicker.tsx.

Repo is at hqai/. Last commit on main: abc4ec2. Stack and unresolved
list are in handoff.md sections 1, 4, 6. After each fix, commit + push.
```
