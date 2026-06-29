// Single source of truth for the Claude model IDs the app uses.
//
// Why this exists: the IDs used to be copy-pasted across ~20 routes and libs,
// so when Anthropic retired `claude-sonnet-4-20250514` every AI feature 404'd
// at once. Now there is ONE place to change them - or override per environment
// via the ANTHROPIC_MODEL_* env vars (e.g. on Vercel, no redeploy needed).
//
// Defaults are the current working models, verified against the live API
// (June 2026). When a model is retired, update the default here or set the
// matching env var.
//
// Server-only values: the ANTHROPIC_MODEL_* vars are not NEXT_PUBLIC_, so on
// the client process.env reads as undefined and the defaults apply - harmless,
// since model IDs are only ever used in server routes.

export const CLAUDE_MODELS = {
  /** Workhorse: extraction, drafting, scoring, chat - the default for most routes. */
  standard: process.env.ANTHROPIC_MODEL_STANDARD || 'claude-sonnet-4-6',
  /** Hardest reasoning (the router's "complex" tier). */
  complex: process.env.ANTHROPIC_MODEL_COMPLEX || 'claude-opus-4-8',
  /** Cheap + fast: light tasks and the eval judge. */
  simple: process.env.ANTHROPIC_MODEL_SIMPLE || 'claude-haiku-4-5-20251001',
} as const

/** The default Claude model used by most routes (alias for the standard tier). */
export const CLAUDE_MODEL = CLAUDE_MODELS.standard
