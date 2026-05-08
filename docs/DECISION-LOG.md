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
2026-05-08 | Magic-link login bug fixed + transactional emails sent from hq.ai@humanistiqs.com.au under sender name "HQ.ai" | D1; first-impression bug for every internal pilot user; brand consistency | James
2026-05-08 | chat_telemetry table captures per-turn token usage and latency from Day 1 | D2; cannot trust the chat without this data; Nathan flagged as most important instrumentation | James
2026-05-08 | Tier-classifier chat-speed fix approved; deliver internally rather than engaging Nathan | D3; demo-blocker for Phase 2; existing in-house capability sufficient | James |
2026-05-08 | coach_field_edits and cv_screening_outputs tables capture AI vs user-edited values from Day 1 | D4; need data to detect AI drift and validate prompts over time | James
2026-05-08 | Server-side observability sink added beyond Vercel default logs in Phase 2 | D5; Vercel logs sufficient for Phase 1 internal | James
2026-05-08 | Microsoft Clarity goes live for Phase 2 only, not Phase 1 | D6; internal users do not need session replay | James
2026-05-08 | Feature flags + role system: Owner (James only) edits, Test Admins (4 directors) read-only across all surfaces | D7; clear authority model and full-surface visibility for the partners | James
2026-05-08 | RLS policies written for all tables in Phase 1; applied on production as Phase 2 entry gate | D8; non-negotiable per Nathan; staging dress rehearsal first | James
2026-05-08 | Neon migration rejected; remain on Supabase but action all Critical security alerts via agent review | D9; Supabase + RLS done well is sufficient; agent-driven security audit covers the residual risk | James
2026-05-08 | Phase 1 entry trigger: I will signal "Internal Testing Phase Ready" once all approved gate items are complete | D11; explicit handover point, no calendar-driven start | Engineering -> James
2026-05-08 | Nathan engagement on hold indefinitely | D12; Nathan's own feedback was that paid engagement likely unnecessary | James
2026-05-08 | Anthropic budget cap $100/month with alert at $80/month (not the $80/day previously suggested) | D13; reflects actual usage profile of an internal alpha | James
2026-05-08 | Separate Anthropic API keys for production vs staging | D14; cleanest accounting and no commingling of dev with real-client traffic | James
```

---

## Phase 1 entry-gate work plan

Tracked in detail in `docs/PHASE-1-ENTRY-WORK.md`. When all items there are complete, Engineering signals "Internal Testing Phase Ready" and James starts the partner kickoff.

---

## How to use this log

1. Walk D1 through D14 in the open-decisions section as decisions arise.
2. Once decided, copy the decision into the Ratified section above with the date.
3. Append-only. Reversals add a new dated line referencing the original.
4. James and Rav each add at least one entry per week during the rollout. Engineering adds entries when an architectural decision changes.

---

## Decision-making shortcuts

If you're unsure how to decide on a future open decision, use this priority order:

1. Does it gate Phase 1? If yes, decide today.
2. Does it gate Phase 2? If yes, decide this week so engineering can start.
3. Is it post-launch optimisation? Defer with a date you'll revisit.
4. Is it a "Nathan offered" item? Hold until Phase 1 telemetry tells you the actual scale of the problem.
