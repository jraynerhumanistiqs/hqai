// Campaign Coach recruitment Tip Bot - shared types + routing.
//
// Source of truth: docs/research/recruitment-research/recruitment-tips.json
// (150 curated tips, written in plain English for people new to hiring, and
// mirrored into the Supabase table `recruitment_tips`). The read API
// (/api/campaign/tips) loads rows from the table - falling back to the
// bundled JSON - then orders the queue with buildTipQueue() below.
//
// This module is CLIENT-SAFE (no fs / node imports) so the TipBot component
// can import the types + STEP_TO_STAGE. The file reader lives separately in
// lib/campaign-tips-server.ts (server-only).

// The five stages map 1:1 to the Campaign Coach wizard steps, so each step
// shows tips relevant to the task in front of the user.
export type TipStage = 'brief' | 'role_profile' | 'draft' | 'distribution' | 'launch'
export type TipRegion = 'AU' | 'global'
export type TipConfidence = 'high' | 'medium'

export interface RecruitmentTip {
  id: string
  category: string
  campaign_stage: TipStage
  tip: string
  why_it_works: string
  /** Lineage only - not used for routing or display. */
  region?: TipRegion
  confidence: TipConfidence
  /** True when the tip is tied to a clear Australian legal requirement.
      Drives the small "Australian law" flag on the card; otherwise no flag. */
  legislative?: boolean
  evidence?: string
  source?: string
  source_url?: string
  source_date?: string
}

export const TIP_STAGES: TipStage[] = ['brief', 'role_profile', 'draft', 'distribution', 'launch']

// Campaign Coach wizard step (1..5) -> stage. One stage per step:
//   1 Brief         -> brief        (plan the role + how you will measure success)
//   2 Role profile  -> role_profile (pin down title, pay, must-haves, criteria)
//   3 Draft & Coach -> draft        (write the job ad)
//   4 Distribution  -> distribution (where it posts)
//   5 Launch        -> launch       (go live + handle candidates well)
export const STEP_TO_STAGE: Record<number, TipStage> = {
  1: 'brief',
  2: 'role_profile',
  3: 'draft',
  4: 'distribution',
  5: 'launch',
}

export function stageForStep(step: number): TipStage {
  return STEP_TO_STAGE[step] ?? 'brief'
}

export const TIP_TELEMETRY_EVENTS = [
  'tip_viewed',
  'tip_cycled',
  'tip_dismissed',
  'tip_source_clicked',
] as const
export type TipTelemetryEvent = (typeof TIP_TELEMETRY_EVENTS)[number]

// Fisher-Yates shuffle with an injectable RNG (Math.random by default). Used
// only to vary the order WITHIN a confidence band, so the opener differs
// between visits.
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface BuildTipQueueOpts {
  stage: TipStage
  /** Optional secondary filter from the card's "narrow to topic" chip. */
  category?: string
  rng?: () => number
}

// Routing:
//  1. filter to the stage (+ optional category)
//  2. confidence: high before medium, random tie-break within each band so
//     the opener varies between visits.
export function buildTipQueue(all: RecruitmentTip[], opts: BuildTipQueueOpts): RecruitmentTip[] {
  const rng = opts.rng ?? Math.random
  let pool = all.filter(t => t.campaign_stage === opts.stage)
  if (opts.category) pool = pool.filter(t => t.category === opts.category)
  const high = shuffle(pool.filter(t => t.confidence === 'high'), rng)
  const medium = shuffle(pool.filter(t => t.confidence !== 'high'), rng)
  return [...high, ...medium]
}

/** Topics present for a stage (for the "narrow to topic" chips). */
export function categoriesForStage(all: RecruitmentTip[], stage: TipStage): string[] {
  return Array.from(
    new Set(all.filter(t => t.campaign_stage === stage).map(t => t.category).filter(Boolean)),
  ).sort()
}
