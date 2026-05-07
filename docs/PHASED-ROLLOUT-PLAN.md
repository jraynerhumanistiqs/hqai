# HQ.ai Phased Rollout Plan

**Companion to:** `docs/POST-DEMO-REPORT-NATHAN.md` (Nathan walkthrough, 7 May 2026)
**Audience:** James (founder), Rav (recruitment partner), Jess, and other Humanistiqs partners.
**Author:** Coordinator (drafted 7 May 2026).

---

## 1. Executive summary

HQ.ai goes to market in three phases. **Phase 1 (Weeks 1-2)** is an internal Humanistiqs-only test of HQ Recruit on Rav's real client campaigns, with HQ People in chat alpha for our own use. **Phase 2 (Weeks 3-6)** opens a private alpha to 3-5 trusted SME founders, gated behind row-level security on every Supabase table and Microsoft Clarity session replay. **Phase 3 (Week 7 onwards)** is the public launch with paid signup, Stripe checkout, the three pricing tiers, and a LinkedIn-led marketing push. HQ Recruit is the wedge. HQ People stays in alpha until field-edit telemetry shows the AI is trustworthy without a human re-checking every output. Total elapsed time from today to public launch is roughly seven weeks if Phase 1 starts Monday.

---

## 2. Phase 1 - Internal Humanistiqs Test (Weeks 1-2)

### 2.1 Entry criteria

These must all be true on the morning of Day 1. Tied to issues 3.1, 3.2, 3.5 and Step A in the report.

| # | Gate | Source | Owner |
|---|------|--------|-------|
| 1 | Magic-link login works on a fresh browser profile against `https://hqai.vercel.app`. Auth callback verified. | Issue 3.1 | James |
| 2 | `chat_telemetry` table created in Supabase and the `app/api/chat/route.ts` route writes a row per turn (timestamp, conversation_id, query length, tool calls, total_input_tokens, total_output_tokens, total_ms, tier_classification). | Issue 3.2 / Step A | Engineering (Claude Code) |
| 3 | Feature-flags config in place. Coming-Soon modules (Strategy Coach, Team Development, Awards Interpreter, Compliance Audit placeholders) hidden from any non-internal account. | Issue 3.5 | Engineering |
| 4 | Written decision filed in `docs/DECISION-LOG.md`: HQ Recruit is the launch wedge; HQ People is internal-alpha only. | Issue 3.7 / Step A | James |
| 5 | Anthropic budget cap confirmed (already in place per the report) and a daily spend alert set on the Anthropic dashboard. | Section 6.6 | James |

If any of these are not done, Phase 1 does not start.

### 2.2 Who tests

Five named users. No one else.

- **James Rayner** - founder, drives HQ People chat usage and dogfoods every surface daily.
- **Rav** - runs HQ Recruit end-to-end on three live recruitment campaigns he is currently working.
- **Jess** - second recruitment user, mirrors Rav's flow on her own campaign for cross-check.
- **Two additional Humanistiqs partners** (named by James on Day 1) - lighter-touch usage; one HR-leaning, one operations-leaning, so we cover both buyer personas.

No clients. No friends-of-friends. Internal only.

### 2.3 What they test

**HQ Recruit (primary focus)** - end-to-end on real Rav campaigns:

1. Create role via Campaign Coach (two-step modal, AI question generation).
2. CV Screening on the inbound applicants for that role (per-criterion evidence spans, structured output).
3. Send candidate prescreen invites via Resend, candidates record videos via Cloudflare Stream.
4. Review responses, star-rate, export.
5. Hand off shortlist to Rav's normal placement workflow.

**HQ People (alpha mode, internal only)** - James and the partners ask real Humanistiqs questions: pay rates, NES entitlements, award interpretation, document generation from the 33 templates. No client-facing usage in this phase.

### 2.4 What gets instrumented

Three things must be captured from Day 1, not retro-fitted later.

| Surface | Table | What it captures |
|---------|-------|------------------|
| Chat (HQ People) | `chat_telemetry` | conversation_id, user_id, business_id, turn_index, query length (chars and tokens), tools called, retrieval chunks pulled, tier classification, input_tokens, output_tokens, total_ms, model, error if any. One row per turn. |
| Campaign Coach | `coach_field_edits` | session_id, field_name, ai_value (jsonb), final_value (jsonb), edited_bool, edit_distance, captured_at. One row per field on every save. |
| CV Screening | `cv_screening_outputs` | screening_id, candidate_id, rubric_version, ai_scores (jsonb per criterion), ai_evidence_spans (jsonb), final_scores (jsonb after staff edit), staff_edits_count. Captured at AI generation time and again on staff confirm. |

Engineering writes a daily cron at 06:00 AEST that emails James and Rav a one-page Markdown summary: turns yesterday, p50/p95 latency, total Anthropic spend, top three slowest queries, Campaign Coach edit rate per field, CV Screening criterion-edit rate.

### 2.5 Daily rhythm

**Feedback channel: a single shared Notion doc** at `Humanistiqs / HQ.ai Internal Alpha Log`. One page per day, three sections per page: What I tried, What broke, What surprised me. Everyone appends a dated bullet by end of day. No Slack threads, no scattered notes, no spreadsheets.

| Person | Daily |
|--------|-------|
| James | Use HQ People chat for at least three real questions. Skim the 06:00 telemetry email. Triage anything over p95 30s or any error. Append to Notion log. |
| Rav | Run at least one CV Screening pass and one Campaign Coach session on a real campaign. Append to Notion log with screenshots. |
| Jess | Mirror Rav on her own campaign. Append to Notion log. |
| Partners | Use HQ People at least three times a week, append to Notion log. |
| Engineering (Claude Code) | Read the Notion log first thing each morning, fix any P0 issue same-day, post a fix-log entry below each issue. |

**Weekly:** 30-minute Friday call. Five people max. Walk the Notion log, agree the top three fixes for next week, update the decision log.

### 2.6 Exit criteria

Phase 1 closes when ALL of these are true:

| # | Metric | Threshold |
|---|--------|-----------|
| 1 | Chat p95 latency | Under 30 seconds across the full week |
| 2 | Auth failures | Zero in the most recent 50 logins across all five test users |
| 3 | Coming-Soon modules | None visible to any non-internal account on production |
| 4 | Rav campaign completion | At least three real campaigns run end-to-end (role created, candidates invited, responses reviewed) without manual workarounds |
| 5 | HQ People accuracy spot-check | James and one partner audit 20 chat answers, no factual errors on AU employment law |
| 6 | Anthropic spend | Under $40 per day average across the second week |
| 7 | RLS work | SQL written and applied on staging for `cv_screenings`, `cv_custom_rubrics`, `documents`, `conversations`, `messages`, `chat_audit_log`, `campaigns`, `prescreen_evaluations` (Phase 2 entry gate is on production - this is the dress rehearsal) |

### 2.7 Risks and mitigation

| Risk | Mitigation |
|------|------------|
| Magic-link auth still flaky after the Day 1 fix | Fall back to email-and-password as the primary auth path. Magic link as optional. |
| Telemetry table writes slow down the chat route | Make the insert fire-and-forget (no `await`). Log failures to console, do not block the user. |
| Rav cannot find time for daily usage | James shadows two of Rav's campaigns himself in the first week, switches to Rav-led in week two. |
| Internal users hit a Coming-Soon module that wasn't flagged | Sidebar item disabled at the component level, not just hidden. Click yields a toast: "Available from June 2026." |
| Anthropic spend spikes from a runaway loop | Daily cap configured at $80. Any 24-hour window over $50 triggers a Slack DM to James and a manual review. |

---

## 3. Phase 2 - Client Test (Weeks 3-6)

### 3.1 Entry criteria

| # | Gate | Why |
|---|------|-----|
| 1 | All Phase 1 exit criteria met | Cannot graduate on a broken base |
| 2 | **RLS applied to every table on production**, not staging. Verified by a smoke test signed in as a non-admin user attempting to read another `business_id`'s rows and getting zero rows back. | Issue 3.6. Non-negotiable per Nathan. |
| 3 | Microsoft Clarity installed on the dashboard pages, project ID stored in env var, consent banner copy reviewed | Issue 3.4 |
| 4 | Feature-flag config blocks Strategy Coach, Team Development, Awards Interpreter, Compliance Audit for client accounts | Issue 3.5 |
| 5 | Stripe checkout still **off** for client-pilot accounts. Free for the duration. | Out of scope for Phase 2 |
| 6 | Decision log up to date | Section 6 |

### 3.2 Who tests

Three to five SME founders. **Maximum five, no exceptions.** Persona profiles:

| Profile | Why this profile | Source |
|---------|------------------|--------|
| Construction SME founder, 12-30 staff | James's existing relationship; trades + safety + award complexity | James's mate (per Step D in the report) |
| Hospitality operator, 1-3 venues, 20-60 staff | Heavy casual workforce, Hospitality Award, high turnover, real recruitment volume | New introduction via Rav |
| Retail (multi-site or franchise) | General Retail Industry Award, inductions, rostering complaints | Partner introduction |
| Professional services firm, 10-25 staff | Modern Award edge cases (Clerks Award), buyer is an office manager | Partner introduction |
| Optional fifth: light-industrial or trades-adjacent | Stress-test award interpreter with a different award again | Hold for week 4, only invite if first four are stable |

### 3.3 How they're invited

- Private Vercel-hosted signup link, one per founder, expires after first use.
- No public signup page. The "Sign up" button on the marketing site is hidden behind a feature flag.
- Framed verbatim: "Early alpha. You get free access for the duration. We need your honest feedback. Things will break."
- Each founder signs a one-page early-access agreement (light, plain English, no NDA theatre) confirming feedback can be quoted anonymously.

### 3.4 In scope vs out of scope

**In scope:** HQ Recruit (Campaign Coach, CV Screening, Video Pre-screen, candidate review). HQ People chat for AU employment law questions and document generation from the 33 templates.

**Out of scope (hidden behind feature flags):** Strategy Coach, Team Development, Awards Interpreter standalone tool, Compliance Audit, Stripe checkout, Calendly advisor booking, team seat management.

### 3.5 Observability adds

| Tool | Why | Cost |
|------|-----|------|
| Microsoft Clarity | Session replay, heatmaps, rage-click detection. Nathan's specific suggestion (Full Story or Clarity); Clarity gets 90% of the value for free. | Free |
| Logtail or Axiom (pick one in week 3) | Structured server-side logs beyond Vercel's default | Free tier |
| Daily telemetry email continues from Phase 1 | Now includes per-business breakdowns | n/a |

### 3.6 Per-client weekly cadence

| Day | What |
|-----|------|
| Monday | Engineering reviews Clarity replays from the weekend, logs anything notable in `docs/DECISION-LOG.md` |
| Tuesday | Async check-in message to each founder via the channel they prefer (Rav owns this) |
| Wednesday | One 30-minute founder call (rotate so each founder gets a call every two weeks) |
| Thursday | Telemetry review: chat p95, Campaign Coach edit rates per field per business, CV Screening edit rates per criterion |
| Friday | Internal 45-minute review. Walk Clarity highlights + telemetry. Decide one shipped change for the next week. |

**What gets measured per client:** sessions per week, chat turns per session, Campaign Coach completed flows, CV Screening passes, candidate invites sent, candidate responses received, support questions per founder, sentiment (qualitative, captured during the bi-weekly call).

### 3.7 What Nathan does in this phase

Engaged on a fixed-scope, paid piece of work corresponding to issue 3.2 / Step E in the report.

- **Brief:** "Cut chat p95 latency from the Phase 1 measured number to under 15 seconds, no regression on the eval set in `eval-report.md`."
- **Deliverable:** Two-stage classifier (quick intent classification, then narrowed retrieval) + retrieval-narrowing pattern, integrated into `app/api/chat/route.ts`, with the existing `chat_telemetry` table extended to record the classifier decision.
- **Working agreement:** Fixed price, written scope, two-week window inside Weeks 4-5. No greenfield work. No frontend.
- **Owner of the engagement:** James. Single point of contact, single shared Notion brief, single GitHub branch.

### 3.8 Exit criteria

| # | Metric | Threshold |
|---|--------|-----------|
| 1 | Chat p95 latency post-Nathan optimisation | Under 15 seconds across the most recent seven days |
| 2 | Critical user-reported bugs | None unaddressed for more than 48 hours |
| 3 | Client campaigns | All 3-5 clients have run at least one full campaign end-to-end with positive sentiment in the bi-weekly call |
| 4 | Campaign Coach field-edit rate | Under 40% per field (the alarm threshold from issue 3.3) |
| 5 | CV Screening criterion-edit rate | Under 40% per criterion |
| 6 | RLS regression test | Re-run weekly, zero cross-business leakage |
| 7 | Anthropic spend | Under $200 per day at Phase 2 peak |
| 8 | Clarity sessions reviewed | At least one full review per founder per week |

### 3.9 Risks and mitigation

| Risk | Mitigation |
|------|------------|
| A founder logs in, hits a bug, never returns | Day-1 onboarding call (30 min) with Rav or James for every founder. Pin a "What's working today" Loom in the dashboard. |
| RLS policy gap leaks data across `business_id`s | Smoke test in CI on every deploy. Manual cross-business probe weekly. Halt rollout if any leakage found. |
| Nathan's optimisation regresses answer quality | Eval suite (`eval-report.md`) runs on every Nathan PR. Hard gate: no merge if accuracy drops more than 2 points. |
| Campaign Coach edit rate stays above 40% | Trigger prompt revision per issue 3.3. Block Phase 3 entry until below threshold for two consecutive weeks. |
| Clarity captures sensitive fields | Configure Clarity masking on every input field marked `data-sensitive`. Audit before first founder gets the link. |
| Founder requests a feature in scope of Phase 3 (e.g. Stripe, Awards Interpreter) | Polite hold note + entry on the post-launch backlog. Do not break the wedge. |

---

## 4. Phase 3 - Full Launch (Week 7 onwards)

### 4.1 Entry criteria

| # | Gate |
|---|------|
| 1 | All Phase 2 exit criteria met |
| 2 | Stripe checkout flow built, tested end-to-end on Stripe test mode against all three tiers, and a real card on live mode for one staged purchase |
| 3 | Marketing site copy reviewed by Rav, hosted on `humanistiqs.com.au` or `hq.humanistiqs.ai`, links to `https://hqai.vercel.app` signup |
| 4 | Support inbox `support@humanistiqs.com.au` live, monitored, with response SLA published |
| 5 | Decision log up to date, including go/no-go meeting minutes |

### 4.2 What "launched" actually means

- Public signup at `https://hqai.vercel.app/signup` open to anyone with an Australian-registered ABN.
- Three pricing tiers live in Stripe.
- Free 14-day trial with no card required for the trial start. Card captured at trial end to convert.
- Marketing site live with pricing, the wedge story (HQ Recruit first), and the Humanistiqs parent-brand story.
- Public LinkedIn launch posts from Rav and James the same week.
- HQ People remains visible in the dashboard with a clear "alpha" badge until its own field-edit telemetry hits the same 40% threshold.

### 4.3 Pricing tier rollout

| Tier | Price (AUD/month) | Seats | Who it is for |
|------|-------------------|-------|---------------|
| Essentials | $99 | 3 | Solo operator or 1-2 person HR function |
| Growth | $199 (most popular) | 6 | Most SMEs, 10-30 staff |
| Scale | $379 | 12 | 30-100 staff or multi-site |
| Free trial | 14 days | n/a | Anyone, on any tier, no card up front |
| Advisory add-ons | $250 / $400 / $680 / $1,100 | n/a | Optional retainer hours, separate Stripe product |

### 4.4 Marketing channels and order

1. **LinkedIn first.** Rav and James already have a relevant audience. Two posts per week each for the first month, with a content plan written in advance. One demo video, one customer-quote piece, one practical tip post, one product-feature post per cycle.
2. **Partner referrals second.** Humanistiqs partners get a referral link and a 20% revenue share for 12 months on any client they introduce.
3. **Paid acquisition third, and only after retention metrics are confirmed.** No Google Ads, no LinkedIn Ads until Day-30 retention is above 60% and Day-30 paid conversion is above 20% of trial signups.

### 4.5 Day-1, Day-7, Day-30 success metrics

| Window | Metric | Target |
|--------|--------|--------|
| Day 1 | Signups | 20 |
| Day 1 | Activated accounts (created at least one role or asked one chat question) | 12 |
| Day 7 | Signups cumulative | 80 |
| Day 7 | Active week-2 retention from Day-1 cohort | 50% |
| Day 7 | Paid conversion within trial | 5 |
| Day 30 | Signups cumulative | 200 |
| Day 30 | Paid conversions | 30 |
| Day 30 | Trial-to-paid conversion rate | 20% |
| Day 30 | Churn (paid users cancelling) | Under 10% |
| Day 30 | NPS-equivalent (single question: "Would you recommend HQ.ai to another SME founder, yes/no/maybe") | At least 50% yes, under 15% no |

### 4.6 Operational readiness

| Item | Owner | Detail |
|------|-------|--------|
| Support inbox | Rav (primary), James (escalation) | `support@humanistiqs.com.au`, monitored 09:00-17:30 AEST weekdays |
| Response SLA | Rav | First response within 1 business day; resolution target 3 business days for non-critical, 4 hours for critical |
| Critical bug escalation tree | James | Rav flags, James triages within 1 hour, Engineering (Claude Code) fixes same-day, Nathan on retainer for backend P0s only |
| Status page | James | Simple `https://status.hqai.vercel.app` (Vercel statuspage or Better Stack free tier) |
| Outage comms | James | Email blast template ready to go from Day 1 |
| Onboarding email sequence | Rav | Day 0 welcome, Day 2 nudge, Day 5 case study, Day 12 "trial ending" |

### 4.7 Risks and mitigation

| Risk | Mitigation |
|------|------------|
| Public signup floods support | Cap signups at 10 per day for week 1 via a simple gate; lift cap weekly based on support load |
| Stripe webhook fails silently and accounts don't activate | Webhook health check pinging every 10 minutes; alert to James if a webhook hasn't fired in 2 hours during business hours |
| HQ People answers wrong on a public-facing edge case | Alpha badge stays on; chat output footer reads "alpha - verify before relying"; daily eval re-run on prod |
| Nathan engagement question: extend or end | Decision point at Phase 2 close. If chat-speed work landed cleanly and we have a backend P0 list of three or more items, retainer at fixed monthly hours. Otherwise end the engagement cleanly with a written thanks. **Decision owner: James, by end of Week 6.** |
| Marketing pulls in customers we cannot serve (e.g. enterprise, non-AU) | Signup form has an ABN field; non-AU bounce with a "we'll let you know" page. Enterprise enquiries route to a human conversation. |
| Anthropic spend at scale outpaces revenue | Per-account daily cap; tier-based caps (Essentials 50 chat turns/day, Growth 150, Scale unlimited but soft-throttled) |

---

## 5. Cross-phase decisions and dependencies

### 5.1 HQ Recruit vs HQ People wedge

**Decision: HQ Recruit is the wedge.** HQ People remains in alpha throughout all three phases. Rationale: HQ Recruit is closer to ready, Rav's team uses it directly, and the structured-output surfaces (Campaign Coach, CV Screening) are Nathan's strongest validation points. HQ People needs the field-edit telemetry to mature before it can stand in front of clients without a human re-checking every output. Source: issue 3.7.

### 5.2 Feature flags strategy

Two layers (per issue 3.5):

1. **Environment-level toggle** via env var `NEXT_PUBLIC_FEATURE_FLAGS` (a comma-separated list of enabled module IDs). Read once at app load.
2. **Per-business override** via a `feature_flags` table in Supabase keyed by `business_id` and module ID, allowing internal Humanistiqs accounts to see in-development modules in production while clients do not.

Modules behind flags from Day 1: `strategy-coach`, `team-development`, `awards-interpreter`, `compliance-audit`. Flag check happens both in the sidebar render and in the route guard - hidden AND disabled, not just hidden.

### 5.3 RLS rollout sequence

| Phase | RLS state |
|-------|-----------|
| Phase 1 | Apply on staging. Smoke-test as a non-admin. Document the policy pattern in `supabase/rls_all.sql`. |
| Phase 1 -> Phase 2 | Apply to production. Re-run smoke test. This is the Phase 2 entry gate. |
| Phase 2 ongoing | Weekly cross-business probe. CI test on every deploy. |
| Phase 3 | Same posture. Quarterly external review (cheap pen-test, ~$1.5k) within the first six months. |

The pattern, lifted from `supabase/rls_prescreen.sql`: `business_id = (select business_id from profiles where id = auth.uid())`. Apply to `cv_screenings`, `cv_custom_rubrics`, `documents`, `conversations`, `messages`, `chat_audit_log`, `campaigns`, `prescreen_evaluations`. Per-table override only when there is a clear public-write reason (candidate prescreen submissions, which already use the service-role admin client).

### 5.4 Telemetry stack

| Layer | Tool | When |
|-------|------|------|
| App-level structured events | `chat_telemetry`, `coach_field_edits`, `cv_screening_outputs` Supabase tables | Phase 1 |
| Server logs | Logtail or Axiom (pick in Week 3) | Phase 2 |
| Session replay | Microsoft Clarity | Phase 2 |
| Public status | Better Stack or Vercel statuspage | Phase 3 |
| Cost tracking | Anthropic dashboard alerts + daily cron summary | Phase 1 |

### 5.5 Engagement model with Nathan

| Phase | Engagement |
|-------|------------|
| Phase 1 | None. Telemetry is being built so we know what's actually slow. |
| Phase 2 | Fixed-scope paid engagement: chat-speed two-stage classifier. Two-week window inside Weeks 4-5. Eval-gate on merges. |
| Phase 3 | Decision: extend or end. Written by James by end of Week 6. If extended, fixed monthly hours retainer for backend P0s only - no greenfield, no frontend. |

---

## 6. Decision log

A new file at `docs/DECISION-LOG.md`. Single line per decision. Format:

```
YYYY-MM-DD | <decision in one sentence> | <rationale in one sentence> | <owner>
```

Seed entries to add on Day 1:

```
2026-05-07 | HQ Recruit is the V1 launch wedge; HQ People stays in internal alpha | Recruit is closer to ready, Rav uses it directly, structured-output surfaces are the strongest validation | James
2026-05-07 | RLS on every Supabase table is the Phase 2 entry gate | Nathan flagged this as the largest unaddressed security debt | James
2026-05-07 | Microsoft Clarity is the session-replay tool for Phase 2 | Free, gets 90% of Full Story's value for our needs | James
2026-05-07 | Notion is the single feedback channel for Phase 1 | One source of truth, no scattered Slack threads | James
2026-05-07 | Nathan's chat-speed work is paid, fixed-scope, runs in Weeks 4-5 | Issue 3.2 is the demo-blocker; Nathan is the right specialist | James
2026-05-07 | Stripe checkout deferred until Phase 3 | Pilots are free; revenue starts at public launch | James
2026-05-07 | LinkedIn is the primary Phase 3 channel; paid acquisition only after retention proven | Rav and James already have audience; protect cash | James
2026-05-07 | Coming-Soon modules hidden behind feature flags from Phase 1 onward | Per issue 3.5; nothing half-built visible to clients | James
```

The log is append-only. Reversals are new lines with a "(reverses YYYY-MM-DD)" suffix. James and Rav each add at least one entry per week during the rollout; Engineering adds entries when an architectural decision changes.

---

## 7. The first 5 things James does on Monday

Each takes under 30 minutes. In this order, before lunch.

1. **Open Vercel.** Go to the `hqai` project, Settings -> Environment Variables. Verify `NEXT_PUBLIC_BASE_URL` is `https://hqai.vercel.app` (not localhost). Verify `NEXT_PUBLIC_FEATURE_FLAGS` exists (create it if not, value: empty string for now). Trigger a redeploy.

2. **Open Supabase.** Project `rbuxsuuvbeojxcxwxcjf`. Authentication -> URL Configuration. Set Site URL to `https://hqai.vercel.app`. Add redirect URL `https://hqai.vercel.app/auth/callback`. Save. Then open Logs -> Auth, leave the tab open while you test the magic link from a fresh incognito window. Confirm the callback fires and the session sets.

3. **Open the Anthropic console.** Settings -> Limits. Confirm the daily cap is set to $80. Add an email alert at $50/day. Settings -> API Keys. Confirm the production key is named and the staging key (if any) is separate.

4. **Open GitHub, create the Notion log, file the decisions.** In `hqai/docs/`, create `DECISION-LOG.md` with the eight seed entries from section 6 above. Commit and push. Then open Notion, create the page `Humanistiqs / HQ.ai Internal Alpha Log`, paste the day-1 template (three sections: What I tried, What broke, What surprised me), and share with Rav, Jess, and the two partners.

5. **Send the kickoff message.** One message to Rav, Jess, and the two partners (single Slack channel or group email, your call). Verbatim suggestion: "We're starting the HQ.ai internal alpha today. Two weeks. Use it on real Rav campaigns. Log everything in the Notion page (link). Friday 30-min call at 14:00 to walk what we've learned. James." Done.

---

End of plan. Companion source: `docs/POST-DEMO-REPORT-NATHAN.md`.
