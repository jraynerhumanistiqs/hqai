// Campaign Coach recruitment Tip Bot - shared types + routing.
//
// Source of truth: docs/research/recruitment-research/recruitment-tips.json
// (150 curated tips, mirrored into the Supabase table `recruitment_tips`).
// The read API (/api/campaign/tips) loads rows from the table - falling back
// to the bundled JSON - then orders the queue with buildTipQueue() below.
//
// This module is CLIENT-SAFE (no fs / node imports) so the TipBot component
// can import the types + STEP_TO_STAGE. The file reader lives separately in
// lib/campaign-tips-server.ts (server-only).

export type TipStage = 'plan' | 'attract' | 'engage' | 'screen' | 'offer' | 'analyse'
export type TipRegion = 'AU' | 'global'
export type TipConfidence = 'high' | 'medium'

export interface RecruitmentTip {
  id: string
  category: string
  campaign_stage: TipStage
  tip: string
  why_it_works: string
  region: TipRegion
  confidence: TipConfidence
  evidence?: string
  source?: string
  source_url?: string
  source_date?: string
}

export const TIP_STAGES: TipStage[] = ['plan', 'attract', 'engage', 'screen', 'offer', 'analyse']

// Campaign Coach wizard step (1..5) -> recruitment-funnel stage. The wizard
// covers the FRONT of the funnel (plan -> attract -> engage). The downstream
// stages (screen / offer / analyse) belong to the Shortlist Agent and are
// reserved for that surface; they do not appear in Campaign Coach in v1.
//   1 Brief         -> plan    (planning the role + the success metric)
//   2 Role profile  -> plan    (defining the role)
//   3 Draft & Coach -> attract (writing the job ad)
//   4 Distribution  -> attract (choosing the channels)
//   5 Launch        -> engage  (live - candidates start engaging)
export const STEP_TO_STAGE: Record<number, TipStage> = {
  1: 'plan',
  2: 'plan',
  3: 'attract',
  4: 'attract',
  5: 'engage',
}

export function stageForStep(step: number): TipStage {
  return STEP_TO_STAGE[step] ?? 'plan'
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
// between visits (routing rule 4).
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
  /** Business region. 'au' -> AU tips to the front then globals; 'global' -> globals only. */
  region: 'au' | 'global'
  /** Optional secondary filter from the card's "narrow to topic" chip. */
  category?: string
  rng?: () => number
}

// Routing rules (in order):
//  1. filter to the stage (+ optional category)
//  3. region: 'au' keeps AU + global with AU at the front; 'global' drops AU
//  4. confidence: high before medium, random tie-break within each band
// (rule 2 - the category chip - is the optional `category` filter.)
export function buildTipQueue(all: RecruitmentTip[], opts: BuildTipQueueOpts): RecruitmentTip[] {
  const rng = opts.rng ?? Math.random
  let pool = all.filter(t => t.campaign_stage === opts.stage)
  if (opts.category) pool = pool.filter(t => t.category === opts.category)
  if (opts.region !== 'au') pool = pool.filter(t => t.region !== 'AU')

  // Bucket by (region rank, confidence rank); shuffle inside each bucket;
  // then concatenate the buckets in priority order.
  const regionRank = (t: RecruitmentTip) => (opts.region === 'au' && t.region === 'AU' ? 0 : 1)
  const confRank = (t: RecruitmentTip) => (t.confidence === 'high' ? 0 : 1)
  const buckets = new Map<string, RecruitmentTip[]>()
  for (const t of pool) {
    const key = `${regionRank(t)}-${confRank(t)}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(t)
  }
  const order = opts.region === 'au'
    ? ['0-0', '0-1', '1-0', '1-1'] // AU-high, AU-medium, global-high, global-medium
    : ['1-0', '1-1'] // global-high, global-medium
  const out: RecruitmentTip[] = []
  for (const key of order) {
    const b = buckets.get(key)
    if (b) out.push(...shuffle(b, rng))
  }
  return out
}

/** Categories present for a stage given the region routing (for the chips). */
export function categoriesForStage(all: RecruitmentTip[], stage: TipStage, region: 'au' | 'global'): string[] {
  let pool = all.filter(t => t.campaign_stage === stage)
  if (region !== 'au') pool = pool.filter(t => t.region !== 'AU')
  return Array.from(new Set(pool.map(t => t.category).filter(Boolean))).sort()
}
