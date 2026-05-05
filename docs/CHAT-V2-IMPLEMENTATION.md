# Chat V2 - Phased Implementation Plan

Each row is one discrete commit. Commits are independent where possible so they can land out of order if a reviewer needs to push one through fast. Tier 0 is the demo-blocking work - everything in Tier 0 should land before Thursday 7 May 2026.

Companion to `docs/CHAT-ARCHITECTURE-V2.md`.

## Tier 0 - demo blocking (target: Wed 6 May EOD)

| # | Commit | Files touched | LOC est | Risk |
|---|---|---|---|---|
| C-1 | Add `withTimeout` helper and wrap Anthropic stream with 45s wall budget | `lib/timeout.ts` (new), `app/api/chat/route.ts` | ~60 | Low |
| C-2 | Remove any non-streaming Anthropic call from the request path | `app/api/chat/route.ts` | ~20 | Low |
| C-3 | Pre-flight Tier-C heuristic: regex on inbound message, short-circuit to triage card before any LLM call | `app/api/chat/route.ts`, `components/chat/ChatInterface.tsx` | ~80 | Low |
| C-4 | System prompt rewrite: scope contract first, refusal-first triggers, voice cleanup, hyphens only | `lib/prompts.ts` | ~150 | Medium (touches every response) |
| C-5 | Heartbeat as SSE comment (`: ping\n\n`), not data message; clear interval in finally | `app/api/chat/route.ts` | ~25 | Low |
| C-6 | Frontend 60s soft timeout: show "I'm taking too long, escalate?" with one-click handoff button | `components/chat/ChatInterface.tsx` | ~40 | Low |
| C-7 | Smoke-test script: 10 representative queries, asserts response inside 60s, no hangs | `scripts/smoke-chat.mjs` (new) | ~80 | Low |

Demo gate: C-1 through C-6 merged, C-7 green.

## Tier 1 - V2.1 (target: week of 12 May)

| # | Commit | Files touched | LOC est |
|---|---|---|---|
| C-10 | RAG corpus ingestion script + chunking + embeddings + Supabase tables | `scripts/ingest-corpus.mjs`, `supabase/migrations/*` | ~250 |
| C-11 | `searchKnowledge` tool definition and dispatcher | `lib/chat-tools.ts` (new), `lib/rag.ts` | ~150 |
| C-12 | Confidence floor + domain whitelist on retrieval | `lib/rag.ts`, `lib/rag-config.ts` (new) | ~80 |
| C-13 | Citation parser, validator, regenerate-on-low-citation pass | `lib/parse-citations.ts` (new), `app/api/chat/route.ts` | ~180 |
| C-14 | Tier classifier (Haiku, with heuristic short-circuits) | `lib/classify.ts` (new), `app/api/chat/route.ts` | ~120 |
| C-15 | Tier A/B/C routing in chat route - separate code paths per tier | `app/api/chat/route.ts` | ~200 |
| C-16 | Triage card UI - structured JSON renderer for Tier C responses | `components/chat/TriageCard.tsx` (new), `components/chat/ChatInterface.tsx` | ~150 |

## Tier 2 - V2.5 (target: late May)

| # | Commit | Files touched |
|---|---|---|
| C-20 | Self-check turn behind `FEATURE_SELF_CHECK` flag | `lib/self-check.ts` (new), `app/api/chat/route.ts` |
| C-21 | SSE resume-from-seq: monotonic seq on every event, `?resumeFrom=` handler | `app/api/chat/route.ts`, `components/chat/ChatInterface.tsx` |
| C-22 | Circuit breaker on Supabase RPC | `lib/circuit-breaker.ts` (new), `lib/rag.ts` |
| C-23 | Eval harness: runner, fixtures, golden set with refusal cases | `tests/eval/golden-set.seed.ts` (new), `tests/eval/runner.ts` (new), `package.json` script |
| C-24 | Telemetry: timeout labels, tier distribution, citation strip rate | `lib/telemetry.ts` (new) |

## Tier 3 - V3

| # | Commit |
|---|---|
| C-30 | Per-claim atomic decomposition + per-claim grounding verification |
| C-31 | User-overridable tier control: "Quick / Full / Escalate" UI selector |
| C-32 | Multi-corpus federation - per-state WHS Acts as separate retrievable stores |
| C-33 | Conversation memory beyond last 10 turns - summarised context window |

## Per-commit checklist

Before merging any commit:

- `npm run build` passes
- `npm run lint` passes
- For Tier 0: smoke-test script (C-7) green
- For Tier 1+: golden-set eval >= prior run's pass rate
- No new dependencies unless approved
- No comments in code that explain what code does
- No em-dashes or en-dashes in any UI copy or prompt content

## Demo-day runbook (Thu 7 May)

1. Pre-demo: run `scripts/smoke-chat.mjs` against staging - 10/10 must pass.
2. Have a known-good Tier-A query and a known-good Tier-C trigger ready.
3. If anything stalls live, the frontend timeout (C-6) shows the escalation path - that **is** the product story. Lean into it.
4. Keep a tab open on Vercel logs during demo.
