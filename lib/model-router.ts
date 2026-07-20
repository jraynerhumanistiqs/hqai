// A10 - 3-tier Claude model router for the HQ People chat.
//
// Pure, deterministic heuristics - no LLM call for classification. The
// router picks which Claude tier a chat turn should run on:
//
//   simple   (Haiku)  - greetings, acknowledgements, yes/no follow-ups,
//                       formatting tweaks. Low-stakes turns only.
//   standard (Sonnet) - the default. Cited / RAG-grounded HR answers.
//   complex  (Opus)   - high-stakes judgment (termination, redundancy,
//                       investigations, discrimination, underpayment, FWC)
//                       or multi-part scenario analysis.
//
// Guards:
//   - Document generation and escalation flows are NEVER routed to Haiku.
//   - ANTHROPIC_ROUTER_DISABLED=1 forces standard for every turn (safety
//     valve - flip the env var, no redeploy of logic needed).
//
// Model IDs come from lib/ai-models.ts (the single source of truth).
// Escalation keywords come from detectEscalation in lib/prompts.ts (the
// single source of truth for escalation language) plus a small supplement
// below for high-stakes terms that list does not cover.

import { CLAUDE_MODELS } from './ai-models'
import { detectEscalation } from './prompts'

export type ModelTier = 'simple' | 'standard' | 'complex'

export interface RouteModelInput {
  /** The latest user message (plain text). */
  message: string
  /** Number of prior messages in the conversation sent to the model. */
  historyLength: number
  /** True when the turn asks for document generation (detectDocumentRequest hit). */
  hasDocumentIntent?: boolean
  /** True when the caller already knows this turn is in an escalation flow. */
  escalationSignals?: boolean
}

export interface RouteModelDecision {
  model: string
  tier: ModelTier
  reason: string
}

// Supplement to detectEscalation (lib/prompts.ts). Only terms NOT already
// covered by that list belong here - keep the two in sync by extending
// prompts.ts first and only adding here when a term doesn't fit there.
const COMPLEX_SUPPLEMENT =
  /\b(dismiss(al|ed|ing)?|wage theft|fwc\b|fair work commission|tribunal|contract dispute|sexual harassment|sham contract|general protections claim|show cause)\b/i

// Multi-part scenario analysis: a long message asking several questions, or
// a long message laying out a numbered scenario.
const NUMBERED_LIST = /(^|\n)\s*(\d+[.)]|[-*])\s+\S/m

// Conversational openers - only ever matched on very short messages.
const GREETING_ACK =
  /^(hi|hey|hello|g'day|thanks|thank you|cheers|ta|ok|okay|sure|yes|no|yep|nope|cool|great|got it|noted|perfect|good|fine|right|awesome|appreciate it|will do|understood|makes sense|sounds good|no worries)\b/i

// Short clarifying / yes-no follow-ups referencing the prior answer.
const SHORT_FOLLOW_UP =
  /^(can you (explain|clarify|expand|elaborate)|what do you mean|tell me more|go on|keep going|how so|why is that|is that right|are you sure|sorry|pardon|yes please|no thanks)\b/i

// Formatting-only requests on an existing answer.
const FORMATTING_REQUEST =
  /^(please )?(can you )?(make (it|that|this) (shorter|longer|simpler|clearer)|shorten (it|that|this)|summarise|summarize|reword|rephrase|simplify|tidy (it|that|this) up|put (it|that|this) in (bullet|dot) points?|bullet point (it|that|this)|format (it|that|this))\b/i

// HR substance that disqualifies the simple tier even on short messages -
// anything with legal/compliance weight must get at least Sonnet.
const HR_SUBSTANCE =
  /\b(award|nes\b|fair work|leave|pay|wage|salary|super(annuation)?|contract|policy|employee|employer|casual|part[- ]time|full[- ]time|overtime|penalty|allowance|notice|probation|entitlement|roster|whs\b|ohs\b)\b/i

export function routeModel(input: RouteModelInput): RouteModelDecision {
  const { message, historyLength, hasDocumentIntent, escalationSignals } = input

  // Safety valve: force the default tier for every turn.
  if (process.env.ANTHROPIC_ROUTER_DISABLED === '1') {
    return decision('standard', 'router disabled via ANTHROPIC_ROUTER_DISABLED')
  }

  const trimmed = (message || '').trim()
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
  const questionMarks = (trimmed.match(/\?/g) || []).length

  // --- complex: high-stakes judgment ---------------------------------------
  if (escalationSignals) {
    return decision('complex', 'caller flagged escalation signals')
  }
  if (detectEscalation(trimmed)) {
    return decision('complex', 'escalation keyword match (lib/prompts.ts detectEscalation)')
  }
  if (COMPLEX_SUPPLEMENT.test(trimmed)) {
    return decision('complex', 'high-stakes keyword match (router supplement)')
  }
  // Multi-part scenario analysis: long message with several questions or a
  // numbered scenario breakdown.
  if (wordCount >= 80 && (questionMarks >= 2 || NUMBERED_LIST.test(trimmed))) {
    return decision('complex', 'multi-part scenario analysis (long message, multiple questions)')
  }

  // --- guard: document generation never drops below standard ---------------
  if (hasDocumentIntent) {
    return decision('standard', 'document generation - Haiku excluded by guard')
  }

  // --- simple: low-stakes conversational turns ------------------------------
  // Anything with HR/compliance substance stays on standard regardless of
  // length - being short doesn't make it low-stakes.
  if (!HR_SUBSTANCE.test(trimmed)) {
    if (wordCount > 0 && wordCount <= 4 && GREETING_ACK.test(trimmed)) {
      return decision('simple', 'short greeting or acknowledgement')
    }
    if (wordCount > 0 && wordCount <= 8 && SHORT_FOLLOW_UP.test(trimmed)) {
      return decision('simple', 'short clarifying follow-up')
    }
    if (wordCount > 0 && wordCount <= 12 && FORMATTING_REQUEST.test(trimmed) && historyLength >= 2) {
      return decision('simple', 'formatting request on an existing answer')
    }
  }

  // --- standard: the default -------------------------------------------------
  return decision('standard', 'default tier')
}

function decision(tier: ModelTier, reason: string): RouteModelDecision {
  return { model: CLAUDE_MODELS[tierKey(tier)], tier, reason }
}

// CLAUDE_MODELS keys happen to match the tier names exactly; keep the
// mapping explicit so a future rename in ai-models.ts fails loudly here.
function tierKey(tier: ModelTier): keyof typeof CLAUDE_MODELS {
  switch (tier) {
    case 'simple': return 'simple'
    case 'complex': return 'complex'
    case 'standard': return 'standard'
  }
}
