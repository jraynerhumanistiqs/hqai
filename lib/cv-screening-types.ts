// CV Screening - shared TypeScript types
// Mirrors the schemas from docs/CV-SCREENING-RESEARCH.md sections 2 and 3.

export type CriterionType = 'ordinal_5' | 'binary'

export interface CriterionAnchors {
  '1'?: string
  '2'?: string
  '3'?: string
  '4'?: string
  '5'?: string
}

export interface RubricCriterion {
  id: string
  label: string
  weight: number
  type: CriterionType
  anchors?: CriterionAnchors
  evidence_required?: boolean
  fairness_flag?: string
  hard_gate?: boolean
}

export interface Rubric {
  rubric_id: string
  role: string
  country: 'AU'
  version: number
  criteria: RubricCriterion[]
  minimum_score_to_advance: number
  hard_gates: string[]
  blind_fields: string[]
}

export interface EvidenceSpan {
  text: string
  cv_span?: [number, number]
}

export interface CriterionScore {
  id: string
  score: number
  confidence: number
  evidence: EvidenceSpan[]
  rationale?: string
}

// Considerations are hard-gate checks (location / work rights) that are
// assessed but deliberately kept OUT of the weighted merit score - they
// surface post-score as a single-select tick the recruiter confirms.
// An interstate candidate with full work rights and intent to relocate
// should not score lower on merit than a local one; eligibility is a
// yes/unclear/no flag, not a number that drags the score down.
export type ConsiderationStatus = 'met' | 'unclear' | 'not_met'

export interface Consideration {
  id: string                       // criterion id, e.g. 'location_eligibility'
  label: string                    // human label carried from the rubric
  status: ConsiderationStatus      // current (recruiter-confirmed) value
  ai_status?: ConsiderationStatus  // the AI's original read, kept for drift
  note?: string                    // AI rationale or recruiter note
}

export const CONSIDERATION_LABELS: Record<ConsiderationStatus, string> = {
  met: 'Eligible',
  unclear: 'Unclear',
  not_met: 'Not eligible',
}

// Map a hard-gate criterion's 0-5 score to a consideration status. The
// scorer uses 5 = clear yes, 0 = clear no, ~3 = uncertain / relocating.
export function statusFromGateScore(score: number): ConsiderationStatus {
  if (score >= 4) return 'met'
  if (score <= 1) return 'not_met'
  return 'unclear'
}

// Build the post-score considerations for a screening from its hard-gate
// criteria. The AI read comes from the gate criteria_scores; any value the
// recruiter has confirmed (persisted on the row) overrides it. Pure - used
// by the scorecard so we don't need to persist the AI read separately.
export function deriveConsiderations(
  criteria: RubricCriterion[],
  scores: CriterionScore[],
  persisted?: Consideration[] | null,
): Consideration[] {
  return criteria
    .filter(c => c.hard_gate)
    .map(c => {
      const cs = scores.find(s => s.id === c.id)
      const ai_status = statusFromGateScore(cs?.score ?? 3)
      const saved = persisted?.find(p => p.id === c.id)
      return {
        id: c.id,
        label: c.label,
        status: saved?.status ?? ai_status,
        ai_status,
        note: saved?.note ?? cs?.rationale,
      }
    })
}

export type CandidateBand = 'strong_yes' | 'yes' | 'maybe' | 'likely_no' | 'reject'

export type NextAction =
  | 'schedule_panel'
  | 'schedule_phone_screen'
  | 'schedule_video_interview'
  | 'send_technical_task'
  | 'reference_check'
  | 'request_more_info'
  | 'hold_for_review'
  | 'reject'

export interface FairnessChecks {
  name_blinded: boolean
  tenure_gap_explained?: string
  demographic_inference_suppressed: boolean
}

export interface CandidateScreening {
  id: string
  business_id: string
  user_id: string
  rubric_id: string
  candidate_label: string
  candidate_email?: string | null
  cv_text: string
  overall_score: number
  band: CandidateBand
  next_action: NextAction
  rationale_short: string
  criteria_scores: CriterionScore[]
  // Hard-gate eligibility flags shown post-score. Optional - older rows
  // and the standalone read path derive these on the fly from the
  // hard-gate criteria_scores + rubric when the column is absent.
  considerations?: Consideration[] | null
  fairness_checks: FairnessChecks
  status: 'parsing' | 'scoring' | 'scored' | 'failed'
  error_message?: string | null
  created_at: string
  // Reviewer overrides (optional - set when a human edits the AI's call)
  override_band?: CandidateBand | null
  override_next_action?: string | null
  override_comment?: string | null
  override_at?: string | null
  override_by?: string | null
}

// Effective band / action reading helpers - prefer human override when set.
export function effectiveBand(s: { band: CandidateBand; override_band?: string | null }): CandidateBand {
  return (s.override_band as CandidateBand) || s.band
}

export function effectiveNextAction(s: { next_action: NextAction; override_next_action?: string | null }): NextAction {
  return (s.override_next_action as NextAction) || s.next_action
}

// Band thresholds match the research report Section 6.
export function bandFromScore(score: number): CandidateBand {
  if (score >= 4.3) return 'strong_yes'
  if (score >= 3.6) return 'yes'
  if (score >= 3.0) return 'maybe'
  if (score >= 2.0) return 'likely_no'
  return 'reject'
}

export function defaultActionForBand(band: CandidateBand): NextAction {
  switch (band) {
    case 'strong_yes': return 'schedule_panel'
    case 'yes': return 'schedule_phone_screen'
    case 'maybe': return 'send_technical_task'
    case 'likely_no': return 'hold_for_review'
    case 'reject': return 'reject'
  }
}

export const BAND_LABELS: Record<CandidateBand, string> = {
  strong_yes: 'Strong yes',
  yes: 'Yes',
  maybe: 'Maybe',
  likely_no: 'Likely no',
  reject: 'Reject',
}

export const ACTION_LABELS: Record<NextAction, string> = {
  schedule_panel: 'Schedule Interview',
  schedule_phone_screen: 'Phone screen',
  schedule_video_interview: 'Video interview',
  send_technical_task: 'Technical task',
  reference_check: 'Reference check',
  request_more_info: 'Request more info',
  hold_for_review: 'Hold for review',
  reject: 'Reject (needs human click)',
}

// Premium-minimal band styling. Semantic colour kept for instant
// recognition but tuned per the rule-5 status-pill pattern:
//   8% alpha background, the colour itself for text, hairline border
//   in the same hue at 20% alpha. Likely-no / final states use ink/5.
export const BAND_COLOURS: Record<CandidateBand, string> = {
  strong_yes: 'bg-success/8 text-success border border-success/20',
  yes:        'bg-success/8 text-success border border-success/20',
  maybe:      'bg-warning/8 text-warning border border-warning/20',
  likely_no:  'bg-ink/5 text-ink border border-border',
  reject:     'bg-danger/8 text-danger border border-danger/20',
}
