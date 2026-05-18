// B2 - 3-tier tool-aware model router.
//
// Source: docs/research/2026-05-16_ai-doc-creation-teardown.md section 6.4.
// Goal: route every Anthropic call to the smallest model that gets the
// job done. Industry-standard saving from this pattern is 40-70% of
// Anthropic spend at HQ.ai's current traffic profile.
//
// The router is TOOL-AWARE: AI Advisor (chat) and AI Administrator (doc
// engine) live under HQ People but have different cost / latency / quality
// trade-offs, so the intent space is split per tool. Recruit lives in
// its own family because the chat shell is shared but the scoring routes
// have their own complexity envelopes.
//
// IMPORTANT - this file does NOT make Anthropic calls. It only resolves
// (a) which model id to use and (b) how to wrap the system prompt for
// caching. The call sites in app/api/chat/route.ts and the upcoming
// app/api/administrator/* routes import this module and pass the
// resolved model into their existing Anthropic SDK invocations. That
// keeps the change surface minimal and preserves the existing
// tool-use, streaming, heartbeat and retry behaviour.

import type Anthropic from '@anthropic-ai/sdk'

// ── Tier definitions ──────────────────────────────────────────────────

export type Tier = 'simple' | 'standard' | 'complex'

// Model ids are picked to match the production tier names called out in
// CLAUDE.md (3-tier model routing ADR-026). We keep one constant here
// rather than scattering model ids across routes so a future tier
// upgrade lands in one place.
export const MODELS: Record<Tier, string> = {
  // Haiku 4.5 - fast, cheap, perfectly adequate for template-fill +
  // short-conversation replies + simple edits.
  simple:   'claude-haiku-4-5-20251001',
  // Sonnet 4 - current default, used today for all chat traffic. Keeps
  // existing recall behaviour for any intent we are unsure about.
  standard: 'claude-sonnet-4-20250514',
  // Opus 4 - reserved for escalations, multi-step reasoning, and
  // complex contracts.
  complex:  'claude-opus-4-20250514',
}

// ── Tool + intent taxonomy ────────────────────────────────────────────

// `tool` tags every outbound model call so credit ledger, telemetry,
// and the cache_control system-prompt id can all be split per surface.
export type Tool =
  | 'advisor'        // AI Advisor (HR chat, Fair Work grounded)
  | 'administrator'  // AI Administrator (doc engine, multi-format)
  | 'recruit'        // CV scoring + Shortlist Agent scoring
  | 'shared'         // util calls that don't belong to one tool

export type AdvisorIntent =
  | 'advisor-chat-reply'    // short turn, no/low RAG, no escalation
  | 'advisor-rag-cite'      // RAG-grounded answer, multi-hit citations
  | 'advisor-escalation'    // hand-off, high-stakes, complex reasoning

export type AdministratorIntent =
  | 'administrator-template-fill'    // routine merge-field substitution
  | 'administrator-edit-section'     // edit a block in a doc
  | 'administrator-clause-cite'      // pull and cite a Fair Work clause
  | 'administrator-complex-contract' // multi-section bespoke contract

export type RecruitIntent =
  | 'recruit-cv-score'     // criterion-by-criterion scoring on one CV
  | 'recruit-batch-score'  // population-level shortlist work
  | 'recruit-transcribe-score' // video-transcript scoring rubric

export type Intent = AdvisorIntent | AdministratorIntent | RecruitIntent

// ── Routing signals ──────────────────────────────────────────────────

export interface RoutingSignals {
  tool: Tool
  intent: Intent
  /** Number of knowledge-base hits returned by RAG for this turn. */
  ragHitsCount?: number
  /** How many turns deep we are in the conversation. */
  conversationDepth?: number
  /** Set true when the caller has already classified this turn as a
   *  hand-off / escalation upstream. Forces complex tier regardless of
   *  other signals. */
  forceEscalation?: boolean
}

/**
 * routeTask returns the tier to use for a given (tool, intent) pair.
 * Pure function - no side effects, no IO - so it can be unit-tested in
 * isolation and reused from any call site (chat, doc-gen, recruit).
 */
export function routeTask(input: RoutingSignals): Tier {
  if (input.forceEscalation) return 'complex'

  switch (input.intent) {
    // AI Advisor ----------------------------------------------------
    case 'advisor-chat-reply':
      // Short, no-RAG, no escalation -> Haiku. Once the conversation
      // gets deep or the RAG retrieval gets fat, drop to Sonnet so
      // citation rendering stays grounded.
      if ((input.conversationDepth ?? 0) < 3 && (input.ragHitsCount ?? 0) === 0) return 'simple'
      return 'standard'
    case 'advisor-rag-cite':
      // Always at least Sonnet - citations are user-visible and the
      // legal accuracy matters more than the few cents saved.
      return 'standard'
    case 'advisor-escalation':
      return 'complex'

    // AI Administrator ---------------------------------------------
    case 'administrator-template-fill':
      // Was 'simple' (Haiku) but Haiku was repeatedly emitting
      // heading-only documents - sections with a title and no
      // paragraph blocks under them. Sonnet follows the structured
      // output schema reliably and is the right baseline for a doc
      // that ends up in front of an employee. The cost delta is a
      // few cents per generation; the quality delta is the difference
      // between a real Letter of Offer and an empty template.
      return 'standard'
    case 'administrator-edit-section':
      // Either: small textual tweak (Haiku) or rewrite-a-paragraph
      // (Sonnet). Default to Sonnet for safety; call site can pass
      // forceEscalation=false explicitly if they know it's trivial.
      return (input.conversationDepth ?? 0) > 0 ? 'standard' : 'simple'
    case 'administrator-clause-cite':
      return 'standard'
    case 'administrator-complex-contract':
      return 'complex'

    // HQ Recruit ----------------------------------------------------
    case 'recruit-cv-score':
      return 'standard'
    case 'recruit-batch-score':
      return 'standard'
    case 'recruit-transcribe-score':
      // Long video transcripts + structured scoring rubric is closer
      // to a multi-step task than a simple classification, but Sonnet
      // handles it - reserve Opus for explicit escalation.
      return 'standard'

    default: {
      // Exhaustiveness guard - if we add a new intent and forget to
      // route it, TypeScript here will flag the missing case at build
      // time. At runtime, fall back to standard tier so we never
      // accidentally underspend on quality.
      const _exhaustive: never = input.intent
      void _exhaustive
      return 'standard'
    }
  }
}

/** Convenience - looks up the resolved model id directly. */
export function resolveModel(input: RoutingSignals): string {
  return MODELS[routeTask(input)]
}

// ── B3 - cached system-prompt builder ────────────────────────────────

/**
 * Wraps a system prompt in the Anthropic ephemeral-cache block shape so
 * the prompt is reused across turns at 90% discount on the cached input
 * tokens. See https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 *
 * Pass the raw string; we return the structured `system` value expected
 * by `anthropic.messages.create({ system })`. The Anthropic SDK accepts
 * both the legacy string shape and this block-array shape, so callers
 * can adopt this incrementally.
 */
export function withPromptCache(
  systemText: string,
): Array<{ type: 'text'; text: string; cache_control: { type: 'ephemeral' } }> {
  return [
    {
      type: 'text',
      text: systemText,
      cache_control: { type: 'ephemeral' },
    },
  ]
}

/**
 * Convenience helper for call sites that need to wrap multiple cached
 * blocks (eg system prompt + a large RAG context block that doesn't
 * change turn-to-turn). Returns the same Anthropic block-array shape.
 */
export function withPromptCacheBlocks(
  blocks: Array<string | { text: string; cacheable?: boolean }>,
): Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> {
  return blocks.map(b => {
    if (typeof b === 'string') {
      return { type: 'text' as const, text: b, cache_control: { type: 'ephemeral' as const } }
    }
    return b.cacheable === false
      ? { type: 'text' as const, text: b.text }
      : { type: 'text' as const, text: b.text, cache_control: { type: 'ephemeral' as const } }
  })
}

// ── Typing shim ──────────────────────────────────────────────────────
// Re-export the Anthropic Message type so callers can `import { Message }
// from '@/lib/router'` without importing the full SDK in two places.
export type AnthropicMessageParam = Anthropic.Messages.MessageParam
