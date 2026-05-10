# HQ.ai Handoff - 2026-05-10

Hand-off doc to refresh the context window on a new chat. Written for the next agent (or future-me) picking this up cold.

---

## 1. Project goal and stack

**HQ.ai** is an AI-powered HR + recruitment SaaS for Australian SMEs, built under the parent brand **Humanistiqs** (Rayner Consulting Group Pty Ltd). Owner: Jimmy Rayner. The pitch: "the operating system for people, compliance, and hiring - powered by human-centred AI." The strategic positioning is **anti-Employsure** - AI handles tier-one self-service, the same human advisor handles complexity every time, no repeating yourself.

**Live URL:** https://hqai.vercel.app (custom domain `https://www.humanistiqs.ai` is the target post-cutover; not yet live).
**GitHub:** https://github.com/jraynerhumanistiqs/hqai (private).
**Supabase project:** `rbuxsuuvbeojxcxwxcjf`.
**Vercel plan:** Pro ($20/month). 300s function ceiling.
**Anthropic plan:** monthly cap $100, alert at $80 (per D13).

**Tech stack:**
- Next.js 16 App Router + TypeScript
- Tailwind CSS v3 with custom design tokens (Uber-inspired v3, white/black, DM Sans only, pill buttons)
- Supabase (Postgres + pgvector, RLS deferred to Phase 2)
- Anthropic Claude `claude-sonnet-4-20250514` with streaming + structured-output tool-use
- Cloudflare Stream (candidate video upload/playback)
- Deepgram Nova-3 (transcription)
- Resend (transactional email - SMTP not yet wired through Supabase)
- Stripe (portal wired; checkout incomplete)

**Product surfaces (live):**
- **HQ People** - RAG-grounded HR advisor chat with the new TopicPicker empty state, escalation card, document generation
- **HQ Recruit hub** at `/dashboard/recruit` with three tile-buttons leading to the funnel below
  - **Campaign Coach** (`/dashboard/recruit/campaign-coach`) - 5-step wizard producing job ad + careers microsite
  - **CV Screening** (`/dashboard/recruit/cv-screening`) - blind-by-default scoring, custom rubrics, scorecard with evidence, video pre-screen handoff
  - **Shortlist Agent** (`/dashboard/recruit/shortlist`) - the renamed Video Pre-screen surface; Cloudflare Stream + Deepgram + AI scoring
- **Document generation** (33 templates with DOCX export)
- **Compliance Audit** placeholder (mid-migration from a separate Supabase project)

**Roles model (just shipped):**
- `owner` - James only (full edit rights)
- `test_admin` - Rav, Steve, Bianca, Jess (read-only across all surfaces)
- `member` - regular client account
- Migration `supabase/migrations/roles_and_telemetry.sql` seeds these.

---

## 2. Key technical decisions and why

### Demo prep + post-Nathan-meeting decisions (D1-D14, all ratified)

Source: `docs/POST-DEMO-REPORT-NATHAN.md` and `docs/DECISION-LOG.md`. These came out of an external developer review with Nathan (ex-Jumbo Interactive engineering lead) on 7 May.

| ID | Decision | Why |
|---|---|---|
| D1 | Magic-link auth callback handles both `?code=` and `?token_hash=` flows | Newer Supabase magic links use the OTP token-hash flow; old code only handled `?code=` so links silently failed |
| D2 | `chat_telemetry` table with per-turn token + latency capture | Cannot trust the chat without data on what's slow or expensive |
| D3 | Tier classifier + retrieval narrowing chat-speed fix - approved BUT engagement with Nathan rejected (do it internally) | Demo-blocker for Phase 2 if chat keeps timing out |
| D4 | `coach_field_edits` + `cv_screening_outputs` tables capture AI vs user-edited values | Need data to detect AI drift over time and validate prompts |
| D5 | Server-side observability sink in Phase 2 only (Vercel logs sufficient for Phase 1) | |
| D6 | Microsoft Clarity goes live for Phase 2 only | Free, gets 90% of Full Story value |
| D7 | Feature flags hide Coming-Soon modules from `member` accounts; `owner`+`test_admin` see everything | Half-built modules should not appear to clients |
| D8 | RLS policies written for every business-scoped table; production application is the Phase 2 entry gate | Largest unaddressed security debt per Nathan |
| D9 | Neon migration rejected; agent-driven Critical security review instead, stay on Supabase | Supabase + RLS done well is sufficient |
| D10 | HQ Recruit is the V1 launch wedge; HQ People stays in internal alpha until field-edit telemetry shows accuracy | Recruit is closer to ready, structured-output surfaces are the strongest validation |
| D11 | Phase 1 starts only when D1, D2, D7 are done. Engineering signals "Internal Testing Phase Ready" | No "we'll fix it next week" launches |
| D12 | Nathan engagement on indefinite hold | Nathan's own feedback was that paid engagement likely unnecessary |
| D13 | Anthropic monthly cap $100, alert at $80 | Reflects actual usage profile of internal alpha |
| D14 | Separate Anthropic API keys for production vs staging | Cleanest accounting |

### Other architectural decisions worth knowing

- **Australian English everywhere** - organise, behaviour, recognise, optimise, minimise. Saved in `~/.claude/projects/.../memory/feedback_self_verify.md`.
- **No em-dashes or en-dashes anywhere in UI copy** - plain hyphens only. Saved in `~/.claude/projects/.../memory/rule_no_em_dashes.md`.
- **No permission prompts** - autonomous execution; only pause for genuine multi-option decisions. Saved in `~/.claude/projects/.../memory/feedback_autonomous_progress.md`.
- **Self-verify before handing back** - don't return control until tested end-to-end. Saved in `~/.claude/projects/.../memory/feedback_self_verify.md`.
- **Tool-use forced structured output** - Campaign Coach steps and CV Screening scoring use Anthropic tool-use with `tool_choice: { type: 'tool', name: '...' }` for guaranteed JSON shape under streaming.
- **Citation contract** - tool-returned citations flow on a separate SSE channel; the model is told NOT to insert inline `[n]` markers or emit a fenced citations block. `lib/parse-citations.ts` strips both as defence-in-depth.
- **Pre-flight triage** - `detectHardTriage` regex catches 7 categories of high-stakes input (workplace violence, sexual harassment incident, mental health crisis, active litigation, visa, discriminatory request, imminent termination) and short-circuits to a hardcoded handoff card without any LLM call.
- **Stream resilience** - chat route wraps non-streaming Anthropic calls with `withTimeout` (60s) and `withHeartbeat` (8s SSE pulses). Streaming turn has a stall watchdog that propagates to the SDK via AbortController. Frontend has a 60s graceful-timeout button that injects an escalation card if the route never returns. **Note: chat is reportedly timing out again - see Section 6.**

---

## 3. Files created or modified (this session, after Phase 1 entry-gate work)

### New files
- `app/api/campaign-coach/suggestions/route.ts` - industry-aware example generation + recent campaigns lookup
- `app/api/telemetry/field-edit/route.ts` - capture endpoint for AI vs user-edited values
- `app/api/telemetry/daily-digest/route.ts` - 06:00 AEST cron emails James + Rav a one-page digest
- `app/api/cv-screening/counterfactual/route.ts` - re-scores a CV with different probe names to test name-driven bias
- `app/api/cv-screening/handoff/route.ts` - generates targeted video questions, creates prescreen session, returns invite URL
- `app/api/cv-screening/rubrics/route.ts` - persist custom rubrics
- `app/api/cv-screening/score/route.ts` - score an uploaded CV against a rubric
- `app/api/cv-screening/suggest-rubric/route.ts` - AI-suggested rubric from a JD
- `app/api/cv-screening/report/route.ts` - branded DOCX export of one or more candidate scorecards
- `app/dashboard/recruit/cv-screening/page.tsx` - CV Screening surface
- `app/dashboard/recruit/shortlist/page.tsx` - the renamed Shortlist Agent surface (was `/dashboard/recruit`)
- `components/chat/TopicPicker.tsx` - 2026-focused topic-tile empty-state for HQ People chat
- `components/recruit/cv-screening/CvScreeningClient.tsx` + `CandidateScorecardPanel.tsx` + `NewRubricModal.tsx`
- `lib/auth/roles.ts` + `lib/auth/feature-flags.ts` - role + flag helpers
- `lib/cv-screening-types.ts` + `lib/cv-screening-rubrics.ts` - types and standard rubric library
- `supabase/migrations/cv_screening.sql` + `cv_screening_custom_rubrics.sql` + `roles_and_telemetry.sql` + `rls_all_tables.sql` + `prescreen_recommendations.sql`
- `docs/POST-DEMO-REPORT-NATHAN.md` - structured analysis of the developer walkthrough
- `docs/PHASED-ROLLOUT-PLAN.md` - 7-week phased rollout plan
- `docs/DECISION-LOG.md` - ratified decisions register + open-decisions workflow
- `docs/PHASE-1-ENTRY-WORK.md` - tracked execution plan grouped A-E for Engineering and J1-J4 for James-action items
- `docs/SUPABASE-SECURITY-REVIEW.md` - 11 expected Critical alerts + remediation + 13-item Phase 2 RLS checklist + R1-R13 risk register
- `docs/JOB-BOARD-INTEGRATION-RESEARCH.md` - SEEK / LinkedIn / Indeed / Jora paths with v1-v3 phasing
- `docs/CRON-SECRET-SETUP.md` - 5-min Vercel env var setup guide
- `docs/AUTH-EMAIL-SMTP-SETUP.md` - Resend SMTP + Supabase URL config + email template rewrites
- `docs/CV-SCREENING-RESEARCH.md` - 22-source research report on AI CV screening
- `docs/DEV-HANDOFF.md` - briefing for Nathan
- `docs/CHAT-ARCHITECTURE-V2.md` + `docs/CHAT-V2-IMPLEMENTATION.md` - strategic chat redesign
- `docs/AUDIT-MIGRATION-RUNBOOK.md` + `docs/AUDIT-MIGRATION-BEGINNER.md` - humanistiqs-audits Supabase migration

### Modified files (recent batches)
- `app/api/chat/route.ts` - hard timeouts, AbortController on streaming, telemetry insert, triage short-circuit
- `app/api/prescreen/sessions/[id]/invite/route.ts` - accepts custom subject + body for templated email
- `app/api/prescreen/responses/[id]/score/route.ts` - persists `recommendation_action` + `recommendation_rationale`
- `app/auth/callback/route.ts` - handles both `?code=` and `?token_hash=` magic-link flows
- `app/dashboard/layout.tsx` - threads role + flagMap to sidebar
- `app/dashboard/recruit/page.tsx` - hub with three tiles
- `app/login/page.tsx` - magic-link `emailRedirectTo`, sentToEmail cached separately, "Use a different email" link
- `components/chat/ChatInterface.tsx` - TopicPicker integration, "Continue talking with the AI Advisor" copy
- `components/chat/MessageCitations.tsx` - includes the legal-advice disclaimer in small text
- `components/recruit/RoleDetail.tsx` - templated email modal, anonymise hides videos
- `components/recruit/RoleDetailParts.tsx` - AI Recommendation pill + rationale in scorecard
- `components/recruit/ResponsesKanban.tsx` - Video Interview tile in stage order
- `components/recruit/RecruitDashboard.tsx` - heading style matched to Campaign Coach + CV Screening
- `components/recruit/campaign-coach/Step1Brief.tsx` - smaller textarea, fetches from `/api/campaign-coach/suggestions`, Recent Campaigns section
- `components/recruit/campaign-coach/Step2Extract.tsx` - "Remove from campaign" link on the award listing
- `components/recruit/campaign-coach/WizardShell.tsx` - field-edit telemetry capture on Step 2 confirm
- `components/recruit/campaign-coach/wizard-state.ts` - `role_profile_initial` snapshot
- `components/sidebar/Sidebar.tsx` - role + flag-driven dropdown gating, read-only watermark, "AI Advisor" + "Shortlist Agent" labels
- `components/layout/MobileShell.tsx` - role + flags propagated through
- `lib/auth/roles.ts` + `lib/auth/feature-flags.ts` - new
- `lib/claude-scoring.ts` - schema produces `recommendation_action` + `recommendation_rationale`, fallback derives from average score
- `lib/email.ts` - `buildInviteEmailDefaults()` + `customSubject`/`customBody` parameters
- `lib/parse-citations.ts` - drops fenced `citations` block, strips inline `[n]` markers
- `lib/prompts.ts` - tightened scope + Australian English block + triage detection + naming discipline
- `lib/recruit-types.ts` - `RecommendationAction` type, `video_interview` stage
- `vercel.json` - cron schedule for daily-digest

### Recent commits (newest first)
```
3495f7d feat(coach): industry-aware example generation + recent campaigns reuse panel
aa5a4b3 fix(coach): stagger Step 1 coach intro messages so they don't fire simultaneously
0f0ccfd feat: AI recommendation, templated invite email, Step 1 polish, branded URL fallback
a5e2ebe docs(research): job board integration paths for SEEK/LinkedIn/Indeed/Jora
c1ae19b feat: chat topic picker + login fixes + advisor naming + anonymise hides videos
4be0502 chore: remove stray empty files from batch commit
78db3dd fix: post-J1-J4 batch - login UI, magic link, recruit landing, sidebar, kanban, RLS fix
2cebf0c docs: add job board integration research
463548b chore: remove stray empty files
afe3b39 feat: Phase 1 entry-gate work - roles, telemetry, RLS draft, magic-link fix
84c15e4 docs(security): supabase critical-alert review and remediation guide
e981ff3 docs: ratify all 14 Nathan-fix decisions + Phase 1 entry-gate work plan
d676133 docs: decision log with 8 ratified entries + 14 open Nathan-fix decisions for review
adf099b docs: add phased rollout plan and Nathan post-demo report
```

---

## 4. Current state

### Working
- Auth (login, signup, magic link callback handling both flows)
- HQ People chat with TopicPicker empty state, triage card, escalation card, citations rendering, document detection - **but see "Broken" below for current timeouts**
- HQ Recruit hub page with three tiles
- Campaign Coach 5-step wizard end to end
- CV Screening end to end including custom rubric creation, scorecard with evidence, counterfactual probe, video pre-screen handoff, candidate summary report DOCX export
- Shortlist Agent (renamed from Video Pre-screen) - role creation, candidate invites with templated email modal, video responses via Cloudflare Stream, AI scoring with rubric, AI Recommendation card with rationale
- Anonymise toggle hides videos until reviewer turns it off
- Sidebar gates Compliance / Leadership / Business dropdowns based on role + feature flags
- Read-only watermark renders for `test_admin` role
- Daily telemetry digest cron at 06:00 AEST (requires `CRON_SECRET` env var on Vercel)
- Per-turn telemetry to `chat_telemetry` table on every chat request
- Field-edit telemetry on Campaign Coach Step 2 confirm

### Broken (needs immediate attention)
- **HQ People chat timing out on basic questions** (regression - see Section 5 for investigation steps)
- **Chat history not saving to homepage** - the dashboard "Recent conversations" panel at `app/dashboard/page.tsx` queries the conversations table but is not showing recent chats; needs investigation of conversation_id wiring + business_id association
- **Common roles in [industry] examples** - Step 1 Campaign Coach is still showing irrelevant roles (Site Manager / barista mix) despite the new `/api/campaign-coach/suggestions` endpoint shipping. Likely either: (a) the route is failing silently and falling back to PLACEHOLDER_EXAMPLES, (b) Trowse Constructions' business profile lacks `industry` field and the inference is also failing, or (c) the suggestions response is cached/stale
- **Magic link email-sent confirmation may still show empty email** in some cases despite `sentToEmail` state cache - needs verification post-deploy

### Pending James-action items (cannot be automated)
- **J1** - Anthropic monthly cap $100 + alert at $80 (Anthropic console)
- **J2** - Generate `hqai-staging` Anthropic API key, add to Vercel Preview env as `ANTHROPIC_API_KEY_STAGING`
- **J3** - Resend SMTP custom config + email template rewrites in Supabase Auth (per `docs/AUTH-EMAIL-SMTP-SETUP.md`) - **deprioritised** per user note (domains technically different, will sort later)
- **J4** - Verify Supabase Site URL + Redirect URLs allow-list, test magic link in incognito
- **CRON_SECRET** - generate random string, add to Vercel env, redeploy (per `docs/CRON-SECRET-SETUP.md`)
- **Custom domain** - point `humanistiqs.ai` at Vercel deployment so the new fallback URL resolves
- **Apply migrations on Supabase**: `roles_and_telemetry.sql`, `prescreen_recommendations.sql`, `rls_all_tables.sql` (staging only - production is the Phase 2 entry gate)

---

## 5. Next immediate steps

### From the user's explicit list
1. **Fix Common roles in [industry] showing irrelevant roles in Campaign Coach** - investigate `/api/campaign-coach/suggestions` end-to-end. Test with Trowse Constructions' actual profile. Check whether `business.industry` is set in their `businesses` row. If empty, the inference Claude call should run; verify it does and isn't timing out (8s ceiling). Consider lowering the inference timeout fallback to use a synchronous keyword-fuzzy match against business.name as a third tier so users always get something contextual even when Claude inference fails. Also confirm the frontend isn't caching the stale industry from the wizard `business` prop instead of using the API response.
2. **Remove the Scheduling container from Settings completely** - `app/dashboard/settings/page.tsx`, find the Calendly / advisor-booking section, delete the container + any related state.
3. **Adjust the HQ People chat guiding text** - keep it short but reword to actively guide the client toward giving the chatbot the inputs it needs to respond well (e.g. "Tell me the specific situation, who's involved, and what you've tried so far"). Currently in `components/chat/TopicPicker.tsx` (the greeting + sub-text) and `components/chat/ChatInterface.tsx` (the assistant's first response context).
4. **Chat history rework on homepage + chat page UI**:
   - Investigate why chat history is not saving to the homepage Recent Conversations panel
   - Change "HQ People" heading on the chat page to "AI Advisor"
   - Replace "HR compliance & advisory" subtitle with the client's business name
   - Replace the current top-right client name with a "Chat History" button
   - Build an expandable/collapsable right-hand sidebar (3/4 the width of the left sidebar) that shows the chat history
5. **Chat timing out on basic questions** - investigate the regression. The chat was working post-Phase-1 fixes but is now timing out again. Spawn a researcher or system-architect to trace through `app/api/chat/route.ts`, `lib/chat-tools.ts`, `lib/rag.ts`, and the SSE consumer in `components/chat/ChatInterface.tsx`. Likely suspects: telemetry insert blocking the after() handler, the new `chat_telemetry` table missing causing the after() to throw silently, or the prompt-rewrite token bloat returning. Check Vercel function logs first.

### Other in-flight work to consider
- Apply RLS dress rehearsal on staging Supabase (D8). The user already corrected the `ps.business_id` SQL error - file is good.
- Consider whether the magic-link email shows the correct email address now (should be fixed via `sentToEmail` state cache, but worth verifying with a fresh incognito window).
- The `/api/cv-screening/report` endpoint accepts inline screening payloads - good to know if RLS turns out to break the DB lookup path.
- Job board integration v1 (Indeed + Jora XML feed, ~9-13 eng days) is the next big feature investment per `docs/JOB-BOARD-INTEGRATION-RESEARCH.md` - hold until Phase 1 internal testing concludes.

---

## 6. Unresolved bugs

| # | Bug | Severity | Notes |
|---|---|---|---|
| 1 | HQ People chat timing out on basic questions (regression) | High | Was working post-Phase-1 fixes; broken again now. Section 5 #5 investigation. |
| 2 | Common roles in [industry] showing irrelevant roles in Campaign Coach | High | Suggests `/api/campaign-coach/suggestions` is failing to populate or frontend isn't using it. Section 5 #1. |
| 3 | Chat history not surfacing on homepage Recent Conversations panel | High | Conversations may not be persisting with business_id, OR the dashboard query is wrong. Section 5 #4. |
| 4 | RLS `column ps.business_id does not exist` (already fixed by user editing the SQL file - verify by re-running on staging) | Medium-fixed | The user corrected the SQL to use the `created_by → profiles.business_id` chain. Verify on staging. |
| 5 | Chat magic-link confirmation may render empty email in some browsers | Low | Should be fixed via `sentToEmail` state cache (commit `c1ae19b`). Verify post-deploy. |
| 6 | Anthropic-billed transactional emails still come from Supabase noreply, not `hq.ai@humanistiqs.com.au` | Low (deprioritised) | J3 SMTP setup deprioritised per user; will revisit when domain situation resolved. |
| 7 | Pre-existing TS errors in `supabase/functions/send-email/index.ts` (Deno imports) and one stale `@ts-expect-error` in `RoleDetail.tsx` | Cosmetic | Project ignores TS errors in build via `next.config.js`. Won't block deploy. |
| 8 | Stray empty files keep appearing in commits (`0`, `Logs\``, `state.block_states[k]`, `'`, `({`, `SOFT_BUDGET_MS`, `b.type`, `,`, `Replace`, `Team`) | Cosmetic | Cleaned up each time. Likely an environment artefact when the shell parses heredocs or special chars. |

---

## 7. Seed prompt for the new chat

Paste this into the new chat to instantly catch up:

```
HQ.ai handoff. I'm Jimmy Rayner, founder. Read docs/handoff.md in the
repo first - it's a complete state-of-play. Repo is at
C:\Users\JamesRayner\.claude\projects\C--Users-JamesRayner-hqai\hqai
on Windows, GitHub https://github.com/jraynerhumanistiqs/hqai.

Standing rules (saved in your global memory, but reinforce them):
1. Don't ask permission for anything - just progress. Pause only for
   genuine multi-option decisions where you can't reasonably pick.
2. Plain hyphens only in UI copy - no em-dashes or en-dashes.
3. Australian English everywhere (organise, behaviour, optimise, etc).
4. Self-verify your work end-to-end before returning control to me.
   Don't ship-and-hope.

Immediate priorities (in order):
1. HQ People chat is timing out again on basic questions - investigate
   the regression. Likely the chat_telemetry table missing causes the
   after() handler to throw, or prompt token bloat is back.
2. Common roles in [industry] in Campaign Coach Step 1 still showing
   irrelevant roles despite the new /api/campaign-coach/suggestions
   route. Trace why - probably either business.industry is missing in
   the DB row, the inference is timing out, or the frontend is using
   the wizard's business prop instead of the API response.
3. Chat history not saving to the dashboard homepage Recent
   Conversations panel - investigate.
4. Rework the AI Advisor chat header: change 'HQ People' to
   'AI Advisor', replace 'HR compliance & advisory' with the client's
   business name, replace top-right client name with a 'Chat History'
   button that opens an expandable right-hand sidebar (3/4 width of
   left sidebar).
5. Tighten the HQ People chat guiding text to actively prompt the
   user to share situation/who's involved/what they've tried.
6. Remove the Scheduling container from Settings completely.

Tech stack: Next.js 16 App Router, TypeScript, Tailwind v3, Supabase
(RLS deferred to Phase 2), Anthropic Claude sonnet 4, Cloudflare
Stream, Deepgram, Resend, Stripe, Vercel Pro.

Roles: owner = James only, test_admin = 4 directors (read-only),
member = clients. Feature flags hide Compliance / Leadership /
Business modules from members.

Live URL is https://hqai.vercel.app. Branded URL fallback is
https://www.humanistiqs.ai but custom domain still needs to be
pointed at Vercel.

Don't replicate any of the standing decision work in the
DECISION-LOG, PHASE-1-ENTRY-WORK, PHASED-ROLLOUT-PLAN docs - just
execute against them.
```

---

End of handoff. The handoff lives at `docs/handoff.md` per project convention.
