# HQ.ai Decision Log

Append-only record of strategic and architectural decisions. Reversals add a new line with `(reverses YYYY-MM-DD)`.

**Format:** `YYYY-MM-DD | <decision> | <rationale> | <owner>`

---

## Ratified decisions

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

---

## Open decisions: Nathan-identified fixes (review BEFORE Phase 1 starts)

Each block below is one observation Nathan made in the 7 May 2026 walkthrough. James fills in the **Decision** line, then once decided moves the resulting one-liner into the Ratified section above with the date.

For each: **Approve as proposed** / **Approve with modification** / **Defer to Phase 2** / **Defer to Phase 3** / **Reject (don't action)**.

---

### D1. Magic-link login bug

**Source:** Issue 3.1 in `POST-DEMO-REPORT-NATHAN.md`. Nathan tried magic link, didn't complete the session.
**Proposed action:** Reproduce on a fresh browser profile. Check Supabase auth logs after click. Verify the auth callback route is on the deployed URL. Phase 1 entry gate.
**Effort:** ~1 hour debugging, possibly Site URL config in Supabase or callback route fix.
**Risk if deferred:** Every internal pilot user trips on it Day 1.

**Decision:** _____________________
**Notes:** _____________________

---

### D2. Chat telemetry table - per-request token + latency capture

**Source:** Issue 3.2.
**Proposed action:** Add a `chat_telemetry` table. Have `app/api/chat/route.ts` write a row per turn (timestamp, conversation_id, query length, tool calls, total_input_tokens, total_output_tokens, total_ms, tier_classification). Daily cron at 06:00 AEST emails a one-page summary.
**Effort:** ~2 hours engineering for the table + insert. Cron is another hour.
**Risk if deferred:** No data to know what's slow or expensive. We can't trust the chat without this. Nathan called this out as the single most important instrumentation.

**Decision:** _____________________
**Notes:** _____________________

---

### D3. Tier classifier + retrieval narrowing (the chat speed fix)

**Source:** Issue 3.2 / Step E.
**Proposed action:** Two-stage approach Nathan described - quick intent classification, then narrow which corpus chunks get loaded. Caveat: changes the chat architecture, slight risk of misclassification.
**Effort:** Substantial. Nathan's fixed-scope engagement in Weeks 4-5.
**Risk if deferred:** Chat stays slow at p95 60-90s on complex queries. Not a Phase 1 blocker because Phase 1 has 5 internal users; becomes blocking by Phase 2.

**Decision:** _____________________
**Notes:** _____________________

**Sub-decision:** Engage Nathan or attempt internally first?
**Decision:** _____________________

---

### D4. AI accuracy feedback loop - log AI output vs user-edited output

**Source:** Issue 3.3.
**Proposed action:** New tables `coach_field_edits` and `cv_screening_outputs`. Capture every AI-generated structured output before user edit, then again after user confirm. Build a daily diff report. Trigger prompt revision when any field's edit rate is over 40% for two consecutive weeks.
**Effort:** ~3 hours engineering for the tables + capture points on Campaign Coach Step 2 confirm and CV Screening confirm.
**Risk if deferred:** No way to detect AI drift over time. No way to improve the prompts based on real data. Nathan said this matters more in Phase 2 than Phase 1, but the table needs to exist Day 1 to capture from the start.

**Decision:** _____________________
**Notes:** _____________________

---

### D5. Server-side observability beyond Vercel default logs

**Source:** Issue 3.4.
**Proposed action:** Add structured logging to a dedicated sink. Options:
- **Logtail** (Better Stack) - free tier, simple
- **Axiom** - free tier, more powerful queries
- **Supabase logs table** - cheapest, less queryable
Phase 1 can run on Vercel logs only; Phase 2 needs a real sink.

**Decision:** _____________________
**Notes:** _____________________

---

### D6. Microsoft Clarity for session replay

**Source:** Issue 3.4 (already ratified above as the choice). Open question: when does it go live?
**Proposed action:** Install in Phase 2 only, not Phase 1 (internal users don't need it).
**Risk if deferred:** Clients hit weird UX bugs we never see.

**Decision:** _____________________
**Notes:** _____________________

---

### D7. Feature flags - hide Coming-Soon modules from non-internal accounts

**Source:** Issue 3.5.
**Proposed action:** Add a feature-flags config. Hide Strategy Coach, Team Development, Awards Interpreter, Compliance Audit placeholders from non-internal accounts. Internal Humanistiqs accounts see everything.
**Effort:** ~2 hours engineering. Either env-var-driven or a `feature_flags` table keyed by environment + business_id.
**Risk if deferred:** Internal users can find their way into broken modules even in Phase 1 (they shouldn't, but they will). Clients in Phase 2 absolutely cannot.
**Phase 1 entry gate.**

**Decision:** _____________________
**Notes:** _____________________

---

### D8. Apply RLS policies to every Supabase table

**Source:** Issue 3.6. Nathan's largest unaddressed security debt call.
**Proposed action:** Write and apply RLS policies for `cv_screenings`, `cv_custom_rubrics`, `documents`, `conversations`, `messages`, `chat_audit_log`, `campaigns`, `prescreen_evaluations`. Pattern: `business_id = (select business_id from profiles where id = auth.uid())`. Existing draft for prescreen tables at `supabase/rls_prescreen.sql` is the template.
**Effort:** ~4-6 hours. Write SQL, test on staging with a non-admin auth user, apply to production.
**Risk if deferred:** Phase 2 cannot start. Already a non-negotiable entry gate for Phase 2.
**Phase 1 - dress rehearsal on staging. Phase 2 - applied on production.**

**Decision:** _____________________
**Notes:** _____________________

---

### D9. Neon migration (database posture)

**Source:** Issue 3.6 (alternative).
**Proposed action:** Defer to post-launch. 1-day spike to compare Neon vs Supabase + RLS done well. Trade-off: Neon means hand-writing every query and not exposing PostgREST to the browser.
**Effort:** 1-day spike, then potentially a 2-3 week migration if we go ahead.
**Risk if deferred:** None for Phase 1 or Phase 2. Only relevant if we want a tighter security posture for V2.

**Decision:** _____________________
**Notes:** _____________________

---

### D10. Wedge decision - HQ Recruit first, HQ People in alpha

**Source:** Issue 3.7. Already ratified above. Restated here for confirmation.
**Proposed action:** HQ Recruit is the public surface. HQ People is internal-only and visibly badged "alpha" until field-edit telemetry confirms accuracy.
**Risk if deferred:** Scope creep returns. Nathan's strongest critique was indecision between the two products.

**Decision:** _____________________ (already ratified, restate to confirm)
**Notes:** _____________________

---

### D11. Internal pilot starts when these are done, not when calendar says

**Source:** Issue 3.8 / Step B.
**Proposed action:** Hard rule - Phase 1 starts only when D1, D2, D7 are done. No "we'll fix it next week" launches.
**Risk if deferred:** Cascading slip - bug in Phase 1 erodes Rav and partners' confidence.

**Decision:** _____________________
**Notes:** _____________________

---

### D12. Engagement model with Nathan

**Source:** Issue 3.5 in the report's section 5.
**Proposed action:** Engage on a fixed-scope, paid piece - the chat-speed and token-tracking work in issue 3.2 - in Weeks 4-5. Single point of contact (James). Single GitHub branch. Written brief. No greenfield work.
**Open question:** Pay rate / fixed price? Nathan would not quote without poking at the code first. Need a follow-up conversation.

**Decision:** _____________________
**Notes:** _____________________

---

### D13. Daily Anthropic spend alert

**Source:** Section 6 of the rollout plan / Phase 1 entry criterion 5.
**Proposed action:** Confirm $80/day cap (already in place). Add an email alert at $50/day on the Anthropic dashboard. Phase 1 entry gate.
**Effort:** 5 minutes.
**Risk if deferred:** Demo-day-style runaway loop drains the budget overnight.

**Decision:** _____________________
**Notes:** _____________________

---

### D14. Anthropic SDK key separation - production vs staging

**Source:** Implied by D13.
**Proposed action:** Have a separate API key for staging/local development so production budget alerts only fire on real client traffic.
**Effort:** 10 minutes. Generate a second key in the Anthropic console, label it, store as `ANTHROPIC_API_KEY_STAGING` in Vercel preview environments.
**Risk if deferred:** Local dev usage and production usage commingle in spend metrics.

**Decision:** _____________________
**Notes:** _____________________

---

## How to use this log

1. Tonight or tomorrow morning: walk D1 through D14. Write a one-line decision under each.
2. Once decided, copy the decision into the Ratified section at the top with today's date.
3. Move on. Do not reopen ratified decisions unless circumstances genuinely change.
4. Append-only. Reversals add a new dated line referencing the original.
5. James and Rav each add at least one entry per week during the rollout. Engineering (Claude Code working on this repo) adds entries when an architectural decision changes.

---

## Decision-making shortcuts

If you're unsure how to decide on any of D1-D14, use this priority order:

1. **Does it gate Phase 1?** If yes, decide today.
2. **Does it gate Phase 2?** If yes, decide this week so engineering can start.
3. **Is it post-launch optimisation?** Defer with a date you'll revisit.
4. **Is it a "Nathan offered" item?** Hold until Phase 1 telemetry tells you the actual scale of the problem.
