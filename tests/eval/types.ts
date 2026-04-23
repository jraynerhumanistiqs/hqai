// HQ.ai evaluation types — golden-set schema + run results.
// Pure types only, no runtime imports.

export type Category = 'nes' | 'award' | 'termination_redundancy' | 'edge'
export type ExpectedType = 'numeric' | 'narrative' | 'escalation'

export interface ExpectedRubric {
  /** Facts / phrases that MUST appear in the assistant's answer. */
  mustInclude: string[]
  /**
   * Phrases that must NOT appear — use this for wrong-jurisdiction canaries
   * (e.g. "Alberta", "OSHA", "unfair dismissal act 1977").
   */
  mustNotInclude?: string[]
}

export interface GoldenQuestion {
  id: string
  category: Category
  question: string
  expectedType: ExpectedType

  /** numeric: exact expected value (e.g. 812.60 for a weekly pay rate). */
  expectedValue?: number | string
  /** numeric tolerance (absolute). Default 0.01 for money, 0 for ints/strings. */
  numericTolerance?: number

  /** narrative rubric the LLM judge scores against. */
  expectedRubric?: ExpectedRubric

  /**
   * Required citation — the answer must cite at least one source whose
   * label contains every one of these substrings (case-insensitive).
   * Example: ["Clerks", "15.2"] matches "Clerks Award cl 15.2".
   */
  expectedCitationContains?: string[]

  /** escalation questions: the assistant must refuse direct advice. */
  expectsEscalation?: boolean

  /** Authoritative reference for lawyer bookkeeping, e.g. "MA000002 cl 15.2". */
  source: string

  /** Lawyer name — unset means UNREVIEWED and should be skipped in public metrics. */
  reviewedBy?: string
  /** ISO date. */
  reviewedAt?: string
}

export interface JudgeResult {
  passed: boolean
  score: number // 0..1
  notes: string
}

export interface RunQuestionResult {
  question: GoldenQuestion
  answer: string
  citations: Array<{ n: number; label: string; url?: string }>
  judges: Record<string, JudgeResult>
  passed: boolean
  latencyMs: number
}

export interface EvalRun {
  id: string
  startedAt: string
  completedAt?: string
  model: string
  baseUrl: string
  results: RunQuestionResult[]
  summary: {
    total: number
    passed: number
    skippedUnreviewed: number
    byCategory: Record<Category, { total: number; passed: number }>
  }
}
