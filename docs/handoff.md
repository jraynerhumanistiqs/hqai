# HQ.ai Handoff - 2026-05-15

Written for the next agent (or future-me) picking this up cold after a long working session that closed the recruitment-tool feature set, shipped a compliance baseline, and rewrote the CV scoring UI. Replaces the prior handoff at `docs/handoff.md.bak` (the older version is preserved in git at commit `42456bc` if needed).

---

## 1. Project goal and stack

**HQ.ai** is an AI-powered HR + recruitment SaaS for Australian SMEs, sold under the parent brand **Humanistiqs** (Rayner Consulting Group Pty Ltd). Owner: **Jimmy Rayner** (jrayner@humanistiqs.com.au).

Brand promise: "the operating system for people, compliance, and hiring - powered by human-centred AI." Strategic positioning is **anti-Employsure**: AI handles tier-one self-service, the same human advisor handles complexity every time, no repeating yourself. AI is decision support, not decision making; every adverse action requires a human click.

**Live URL:** https://hqai.vercel.app
**GitHub:** https://github.com/jraynerhumanistiqs/hqai (private)
**Supabase project:** `rbuxsuuvbeojxcxwxcjf`
**Vercel plan:** Pro ($20/month), 300s function ceiling, `maxDuration` typically set to 60-180s per route.

**Tech stack:**
- Next.js 16 App Router + TypeScript (`ignoreBuildErrors: true` in `next.config.js`)
- Tailwind CSS v3 with custom design tokens (DM Sans only, monochrome, pill buttons)
- Supabase (Postgres + pgvector, RLS partially applied - see Section 4)
- Anthropic Claude `claude-sonnet-4-20250514` with streaming + structured-output tool-use
- OpenAI text-embedding-3-small for RAG retrieval
- Cloudflare Stream for candidate video upload/playback
- Deepgram Nova-3 for transcription
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) - browser-side face landmarker for Tier-2 visual telemetry
- Resend for transactional email
- Stripe (portal wired, checkout incomplete)
- JSZip for multi-candidate zipped DOCX reports

**Product surfaces (live):**
- **HQ People** (`/dashboard/people`) - RAG-grounded HR advisor chat with TopicPicker empty state, triage card, citations
- **HQ Recruit hub** at `/dashboard/recruit` with three tile-buttons
  - **Campaign Coach** (`/dashboard/recruit/campaign-coach`) - 5-step job-ad wizard
  - **CV Scoring Agent** (`/dashboard/recruit/cv-screening`) - structured CV scoring, blind by default, manual override + Comments column, "Send to Shortlist Agent" batch handoff
  - **Shortlist Agent** (`/dashboard/recruit/shortlist`) - video AND phone pre-screen with same scoring rubric, ProcessFlowTracker per role, Tier-1 + Tier-2 reviewer signals
- **Privacy + Terms** (`/privacy`, `/privacy/request`, `/terms`) - APP-aligned scaffolds wired from login footer
- **Settings** (`/dashboard/settings`) - business profile + advisor block + billing + multi-select Employment Types

**Roles model (active):**
- `owner` - James only (full edit rights)
- `test_admin` - Rav, Steve, Bianca, Jess (read-only across all surfaces)
- `member` - regular client accounts
- Migration `supabase/migrations/roles_and_telemetry.sql` seeds these.

---

## 2. Key technical decisions made and why

### Core AI / safety decisions

| ID | Decision | Why |
|---|---|---|
| D1 | Magic-link auth callback handles `?code=` and `?token_hash=` flows | Newer Supabase magic links use OTP token-hash; old code only handled `?code=` |
| D2 | `chat_telemetry` + `chat_audit_log` capture per-turn token + latency | Cannot trust the chat without data on what's slow or expensive |
| D7 | Feature flags hide Coming-Soon modules from `member` accounts; `owner`+`test_admin` see everything | Half-built modules should not appear to clients |
| D8 | RLS migrated piecewise across two files (`rls_all_tables.sql` + `rls_extend_prescreen_and_core.sql`); production application is the Phase 2 entry gate | Largest unaddressed security debt per Nathan |
| D13 | Anthropic monthly cap $100, alert at $80 | Reflects actual usage profile of internal alpha |
| D14 | Separate Anthropic API keys for prod vs staging | Cleanest accounting |
| AI-1 | Force `tool_choice: { type: 'tool', name: 'search_knowledge' }` on iter 0 of HQ People chat | Tried `'any'` to allow request_clarification but the model picked clarification on every HR question and the chat appeared to "time out". Reverted; clarification stays registered for the future, demoted in the system prompt |
| AI-2 | iter 1 streaming turn drops the `tools` array + `tool_choice='none'` entirely | Empirically, passing tools + tool_choice='none' + tool_result in history made the model produce zero text_delta. Removing them is the simplest path to reliable text output |
| AI-3 | CV scoring uses two-pass blinding (name extraction first → blind name in body before sending to model) | APP 11 + Fair Work anti-discrimination - we score on substance, not signal. See `app/api/cv-screening/score/route.ts` extractRealName |
| AI-4 | Multi-tier confidence/speech analysis - Tier 1 (pace + fillers + completion + vocab + pauses), Tier 2 (visual telemetry browser-side) | Tier 3 (emotion recognition) explicitly REJECTED per `docs/BODY-LANGUAGE-ROADMAP.md` - regulatory + scientific risk too high |
| AI-5 | Tier-2 visual telemetry NEVER feeds the AI scorer - rendered in a separate "Reviewer Diagnostics" panel | Function-creep mitigation locked in by code-level separation (score route reads transcript only, never the new `visual_diagnostics` column) and documented in the published AIA |

### Architectural

- **Australian English everywhere** - organise, behaviour, recognise, optimise, minimise
- **No em-dashes or en-dashes in UI copy** - plain hyphens only
- **Tool-use structured output** - Campaign Coach steps and CV scoring use Anthropic tool-use with `tool_choice: { type: 'tool', name: ... }` for guaranteed JSON shape
- **Citations on a separate SSE channel** - model is told NOT to emit inline `[n]` markers or fenced citations blocks; `lib/parse-citations.ts` strips both as defence in depth
- **Pre-flight triage** - `detectHardTriage` regex catches 7 categories of high-stakes input and short-circuits to a hardcoded handoff card without any LLM call
- **Stream resilience** - withTimeout(60s), withHeartbeat(8s SSE pulses), stall watchdog with AbortController, empty-response recovery retry with flattened message history
- **Progressive-degrade INSERTs** - across batch-handoff and prescreen responses POST, optional columns get stripped one-by-one if migrations aren't applied so the user flow always succeeds
- **Backdrop close hook** - `components/recruit/useBackdropClose.ts` - only fires onClose when both mousedown AND mouseup land on the backdrop, so text selection drag-out doesn't close modals
- **Two CV-import paths to Shortlist Agent**: batch creates a placeholder `prescreen_responses` row per CV with synthesised `cv-<id>@no-email.local` email; per-row "Send video interview invite" affordance updates the row with the real email, sends a per-response invite link with `?response=<id>`, and the candidate's submission UPSERTs (UPDATEs the placeholder by `response_id` instead of inserting a duplicate)

### Compliance baseline shipped

- `docs/AIA-TEMPLATE.md` + `docs/AIA-visual-telemetry.md` - Algorithmic Impact Assessment template and a completed assessment for Tier-2 visual telemetry
- `docs/VENDOR-REGISTER.md` - sub-processor register (Anthropic, OpenAI, Cloudflare, Deepgram, Resend, Stripe, Supabase, Vercel) with per-vendor data flow, retention, training posture, DPA status, jurisdiction
- `docs/AI-FAIRNESS-FAIR-WORK.md` - formal record of seven fairness mechanisms (CV blinding, prompt guardrails, FairnessChecks per row, override modal, name-probe counterfactual, removed DI dashboard, no-autonomous-adverse-action) and four open gaps
- `docs/BODY-LANGUAGE-ROADMAP.md` - 3-tier roadmap, Tier 1 + 2 shipped, Tier 3 explicitly out of scope
- Privacy + Terms pages at `app/privacy/page.tsx`, `app/privacy/request/page.tsx`, `app/terms/page.tsx`
- Daily retention cron at `app/api/cron/retention-purge/route.ts` (80-day hard-delete + Cloudflare Stream cascade)
- Security headers in `next.config.js` (HSTS + X-Frame-Options + Referrer-Policy + Permissions-Policy)
- Consent metadata persisted on every prescreen submission (text + version + at + ip + user agent)

---

## 3. Files created or modified (recent session)

### New routes / endpoints

- `app/api/cv-screening/batch-handoff/route.ts` - one Shortlist role from many CVs; progressive-degrade insert with placeholder email fallback (RFC 6762 `.local`)
- `app/api/cv-screening/screenings/[id]/route.ts` - manual override PATCH (band, next-action, comment)
- `app/api/cv-screening/rubrics/[id]/route.ts` - PATCH/DELETE for custom rubrics
- `app/api/cv-screening/rubrics/[id]/version/route.ts` - version-bump on criteria edit
- `app/api/recruit/candidate-summary/route.ts` - combined CV + video summary; zip for multi
- `app/api/recruit/[session_id]/phone-screen/route.ts` - phone-call audio submission
- `app/api/recruit/[session_id]/phone-screen/[response_id]/score/route.ts` - transcribe + score phone audio
- `app/api/conversations/[id]/route.ts` - PATCH (rename) / DELETE chat history
- `app/api/privacy/request/route.ts` - APP 12/13 data-subject request intake
- `app/api/cron/retention-purge/route.ts` - daily 80-day retention purge
- `app/api/prescreen/responses/[id]/invite/route.ts` - **NEW**: per-row video invite for CV-imported placeholders; embeds `?response=<id>` in the email link

### Modified UI / business logic

- `app/api/chat/route.ts` - forced search_knowledge on iter 0, empty-response recovery, startup heartbeat, drop `tools` from streaming turn
- `app/api/prescreen/sessions/[id]/responses/route.ts` - **MODIFIED**: now UPSERTs by `response_id` in body (CV-import flow), then falls back to INSERT
- `app/prescreen/[id]/page.tsx` - **MODIFIED**: reads `?response=` and forwards it on submit
- `app/dashboard/recruit/cv-screening/page.tsx` - renamed to "CV Scoring Agent"
- `app/dashboard/recruit/shortlist/page.tsx` - Shortlist Agent uses RecruitDashboard
- `components/sidebar/Sidebar.tsx` - **MODIFIED**: HQ.ai logo moved from top to just above the advisor-support footer; new collapsible "Tools" parent wrapping Compliance / Leadership / Business
- `components/recruit/RecruitDashboard.tsx` - reads `?session=` on mount for auto-select
- `components/recruit/RoleDetail.tsx` - **MODIFIED**: per-row "Send video interview invite" affordance for CV-imported placeholder rows; "Awaiting video" pill replaces status pill for those rows; mobile header restructured to stack vertically
- `components/recruit/PhoneRecorder.tsx` - speakerphone setup tip
- `components/recruit/ReviewerDiagnosticsPanel.tsx` - Tier-2 visual diagnostics display, blue accent, "Diagnostic only" badge
- `components/recruit/SpeechAnalysisPanel.tsx` - Tier-1 multi-signal speech display
- `components/recruit/useBackdropClose.ts` - shared modal backdrop hook
- `components/recruit/cv-screening/CvScreeningClient.tsx` - two-panel layout, Saved Scoring Criteria + Starter library groups, How-the-agent-works info card replacing DI dashboard
- `components/recruit/cv-screening/EditRubricModal.tsx` - jargon-free rewrite (no more "hard-gate" / "snake_case" / decimal weights)
- `components/recruit/cv-screening/OverrideModal.tsx` - band + next-step + comment override
- `components/recruit/cv-screening/NewRubricModal.tsx` - AI-generated rubric from job ad
- `components/prescreen/CandidateGate.tsx` - consent v2 covering Deepgram + Anthropic + Cloudflare + visual diagnostics
- `components/prescreen/RecordingFlow.tsx` - Tier-2 visual sampler integration, Tier-1 multi-signal speech, "see myself" toggle
- `components/recruit/campaign-coach/Step1Brief.tsx` - "Common Roles" removed; Recent Campaigns card library only

### New library code

- `lib/visual-telemetry.ts` - MediaPipe FaceLandmarker wrapper, VisualSampler class, aggregate + rollUp helpers
- `lib/confidence.ts` - `computeConfidence` (legacy) + `analyseSpeech` (Tier-1 multi-signal) + `analyseSpeechForQuestion`

### Migrations (pending application on Supabase, in this order)

1. `roles_and_telemetry.sql` - role enum + chat_audit_log + chat_telemetry
2. `phone_screen_support.sql` - response_type + audio_path + audio_duration_sec on prescreen_responses
3. `prescreen_responses_consent_meta.sql` - consent_text + consent_version + consent_at + consent_ip + consent_user_agent
4. `prescreen_responses_cv_link.sql` - cv_screening_id FK on prescreen_responses
5. `cv_screenings_link_prescreen.sql` - prescreen_session_id FK on cv_screenings
6. `cv_screenings_manual_override.sql` - override_band + override_next_action + override_comment
7. `cv_custom_rubrics_versioning.sql` - parent_rubric_id + version_number + label_family
8. `visual_diagnostics_column.sql` - visual_diagnostics jsonb on prescreen_responses
9. `privacy_requests_table.sql` - APP 12/13 request audit log
10. `rls_all_tables.sql` - core RLS policies (originally written; some bug-fixes were merged into the next file)
11. `rls_extend_prescreen_and_core.sql` - **RECENTLY REWRITTEN**: now uses `created_by → profiles.business_id` joins instead of a direct `business_id` lookup. The prior version failed in production with `column "business_id" does not exist`

### Recent commits (newest first)

```
bab69b1 fix(recruit): scoring criteria rename, CV transfer fix, modal selection, mobile, edit modal simplification
f5518ca feat(visual-telemetry): Tier 2 reviewer-only visual diagnostics via MediaPipe
09a50e0 feat(speech): Tier 1 multidimensional speech analysis
484eafb feat(shortlist): show confidence indicator on existing video reviews
a3e0336 fix(phone-recorder): add speakerphone setup tip in the pre-record steps
a92d2cf feat(recruit): phone-screen workflow, interview-type selector, video UX rework
2188191 fix(rls + onboarding): RLS migration column error + employment-types multi-select + AI Advisor naming clarity
476c6e9 feat(compliance): privacy/terms pages, consent capture, RLS extension, retention cron, vendor register
74cc252 fix(recruit): candidates now flow through to Shortlist on Send + rename to CV Scoring Agent
d16cfe9 hotfix(chat): recover from empty iter-1 stream + heartbeat during streaming
a807c56 hotfix(chat): restore HR/awards/Fair Work answers - revert tool_choice 'any'
```

---

## 4. Current state

### Working

- Auth (login, signup, magic link callback handling both flows)
- HQ People chat (forced search_knowledge on iter 0, drops tools on streaming turn, recovery retry, startup heartbeat) - confirmed working on Q1 (annual leave) and post-fix on Q2/Q3 with the empty-response recovery
- HQ Recruit hub with three tiles
- Campaign Coach 5-step wizard end to end - Step 1 now uses Recent Campaigns only, no Common Roles
- CV Scoring Agent: two-panel layout, criteria left, candidates right; drop-CV upload, blind-by-default scoring, per-criterion evidence quotes, manual override modal, Comments column, candidate scorecard with Run Name Probe, batch send to Shortlist, multi-candidate zipped DOCX, "+ Save to mine" on starter library rows, version-aware criteria editor
- Shortlist Agent: ProcessFlowTracker per role, video AND phone interview tracks, per-question recording with see-yourself toggle, replay limit, transcript on right, Tier-1 + Tier-2 reviewer signals, CV-imported placeholder rows with **"Awaiting video"** pill and inline "Send video interview invite" affordance
- Privacy + Terms pages, consent capture with evidentiary metadata
- Daily retention cron at 03:00 UTC (Vercel)
- Sidebar: HQ.ai logo positioned between Settings and the support footer; Tools is now a single collapsible parent

### Broken / pending verification

- **Migrations 8 (`visual_diagnostics_column.sql`), 11 (`rls_extend_prescreen_and_core.sql`) and several earlier ones are NOT confirmed applied on Supabase.** The progressive-degrade INSERT pattern means submission still works without them, but features dependent on those columns (visual diagnostics display, cv_screening_id linking, tenant isolation) will silently degrade until applied. **User should apply staging → smoke test → prod, in the order listed above.**
- **CV transfer to Shortlist** - root cause was identified as `candidate_email` NOT NULL with no placeholder fallback. Fix shipped in `bab69b1` - synthesised `cv-<id>@no-email.local` placeholder + improved error logging. **Needs user verification with a fresh batch handoff.**
- **Video upsert on submission for invited CV-imports** - just shipped this session. **NOT YET TESTED end-to-end.** Path is: per-row invite → email link with `?response=<id>` → candidate completes prescreen → POST upserts on response_id match. If the upsert fails, the route falls back to INSERT (creating a duplicate), so worst case is duplicate rows, not data loss.

### Pending James-action items (cannot be automated)

- **Apply migrations on Supabase staging then prod** (see the ordered list in Section 3)
- Sign + file DPAs with Anthropic, OpenAI, Deepgram, Cloudflare, Resend, Stripe, Supabase, Vercel - checklist in `docs/VENDOR-REGISTER.md`
- Engage a penetration tester before broad commercial launch
- Provision a separate `hqai-staging` Supabase project + Anthropic staging key
- Run a Supabase backup restore drill into a branch + document RTO/RPO
- Decide on EU / US scope (GDPR, EU AI Act, Colorado / Illinois / NYC AI hiring laws)
- Custom domain - point `humanistiqs.ai` at Vercel deployment
- Cyber insurance review + policy uplift for AI + recruitment SaaS data

---

## 5. Next immediate steps

In rough priority order:

1. **Smoke-test CV transfer to Shortlist Agent end-to-end** with a real batch of CV-scored candidates. Verify candidates appear in the new role with the "Awaiting video" pill. If still broken, check Vercel function logs for `[batch-handoff]` lines (full Postgres error is logged now).

2. **Smoke-test the per-row video invite flow** that just shipped:
   - Send to Shortlist Agent with 2-3 CVs that have placeholder emails
   - On each row, click "Send video interview invite" and enter a real email (use a personal address to test)
   - Confirm the invite email arrives with a unique link containing `?response=<id>`
   - Open the link in incognito and complete the prescreen
   - Confirm the candidate's video replaces the placeholder on the original row (not a new duplicate row)

3. **Apply pending migrations on Supabase** (staging first, smoke-test cross-tenant isolation with two business accounts, then prod). Critical ones to land for the Shortlist Agent UX to fully work: `prescreen_responses_cv_link.sql`, `visual_diagnostics_column.sql`, `rls_extend_prescreen_and_core.sql`.

4. **Decide on the Stripe checkout flow** - currently the portal is wired but no checkout endpoint exists. This is the next material commercial work.

5. **Apply for the custom domain** - users see `hqai.vercel.app` everywhere; emails reference `humanistiqs.ai`. Pointing the domain ahead of broader testing is a small but visible polish.

6. **Pen test engagement** - $3-8k budget, scope to application + auth + access controls + file handling (per the security checklist).

---

## 6. Unresolved bugs / risks

| # | Bug / risk | Severity | Notes |
|---|---|---|---|
| 1 | CV → Shortlist transfer needs verification | Medium | Root cause identified + fix shipped (`bab69b1`); confirm in production |
| 2 | Per-row video invite UPSERT path is untested in production | Medium | Just shipped; the upsert path is gated by response_id match and falls back to INSERT, so worst case is duplicate rows |
| 3 | RLS migrations not confirmed applied | High (post-prod) | The product runs with RLS off in places - documented in CLAUDE.md. Apply before any external client |
| 4 | Empty-handler text on rare Anthropic stream pattern | Low | Mitigated by recovery retry + explicit error event; if it recurs, the stop_reason is now logged so we can target the next failure mode |
| 5 | Pre-existing TS errors in `supabase/functions/send-email/index.ts` (Deno) and a stale `@ts-expect-error` in `RoleDetail.tsx` | Cosmetic | Build allows them via `ignoreBuildErrors: true` |
| 6 | Stray empty files from heredoc parsing (`b.type`, `,`, `3`, etc.) keep appearing in the working tree | Cosmetic | Untracked; safe to delete |
| 7 | `prescreen_responses` does not have columns `rubric_scores`, `overall_score`, `recommendation_action`, `recommendation_rationale` - those live on `prescreen_evaluations`. Progressive-degrade handles this but the optimal long-term move is to write evaluations to the correct table | Tech debt | Not breaking flow today |

---

## 7. Seed prompt for the new chat

Paste this into the new chat to catch the next session up instantly:

```
HQ.ai handoff. I'm Jimmy Rayner, founder. Read docs/handoff.md in the
repo first - it's the full state-of-play. Repo at
C:\Users\JamesRayner\.claude\projects\C--Users-JamesRayner-hqai\hqai
on Windows, GitHub https://github.com/jraynerhumanistiqs/hqai.

Standing rules:
1. Don't ask permission - just progress. Pause only for genuine
   multi-option decisions you can't reasonably pick.
2. Plain hyphens only in UI copy - no em-dashes or en-dashes.
3. Australian English everywhere (organise, behaviour, optimise).
4. Self-verify your work end-to-end before returning control to me.
   Don't ship-and-hope.

Immediate priorities (in order):
1. Smoke-test the CV-to-Shortlist transfer + the new per-row video
   invite flow. The per-row invite shipped this session but is
   UNTESTED in production. Path: Send to Shortlist Agent ->
   per-row "Send video interview invite" -> email link with
   ?response=<id> -> candidate completes prescreen -> response
   UPSERTs the placeholder by response_id (instead of inserting a
   duplicate).
2. Confirm which Supabase migrations are applied. The most critical
   pending: prescreen_responses_cv_link.sql, visual_diagnostics_column.sql,
   rls_extend_prescreen_and_core.sql (this one was rewritten to use
   created_by joins instead of a non-existent business_id column).
3. Next material commercial work is the Stripe checkout flow -
   portal is wired, checkout endpoint doesn't exist yet.

Tech stack: Next.js 16 App Router, TypeScript, Tailwind v3, Supabase
(RLS partially applied - see handoff.md), Anthropic Claude sonnet-4,
Cloudflare Stream, Deepgram, MediaPipe Tasks Vision, Resend, Stripe.

Roles: owner = James only, test_admin = 4 directors (read-only),
member = clients. Feature flags hide Compliance / Leadership /
Business modules from members. Sidebar's Tools section is now a
single collapsible parent wrapping those three.

CV Scoring Agent: structured criteria scoring with blind-by-default,
manual override + Comments column, batch "Send to Shortlist Agent"
that creates a Shortlist role with placeholder rows per CV. The
placeholder rows have synthetic email cv-<id>@no-email.local and
show an "Awaiting video" pill. Recruiters click "Send video
interview invite" per row to email the candidate; their submission
UPSERTs the placeholder (not inserts a duplicate).

Shortlist Agent: video AND phone interview tracks under the same
scoring rubric, per-question recording with see-yourself toggle and
replay limit, Tier-1 multi-signal speech analysis + Tier-2 reviewer
visual telemetry (MediaPipe, browser-only, never feeds AI scorer -
see docs/AIA-visual-telemetry.md).

Compliance docs to maintain: docs/VENDOR-REGISTER.md,
docs/AI-FAIRNESS-FAIR-WORK.md, docs/AIA-TEMPLATE.md,
docs/BODY-LANGUAGE-ROADMAP.md. Privacy + Terms pages live at
/privacy and /terms.

Live URL https://hqai.vercel.app. Branded URL fallback
https://www.humanistiqs.ai (custom domain still needs to be pointed
at Vercel).

Don't replicate prior decision work in docs/DECISION-LOG.md,
docs/PHASE-1-ENTRY-WORK.md, docs/PHASED-ROLLOUT-PLAN.md - just
execute against them.
```

---

End of handoff. The seed prompt above goes in the new chat. Everything else lives in `docs/handoff.md` for context recovery.
