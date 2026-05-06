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

export type CandidateBand = 'strong_yes' | 'yes' | 'maybe' | 'likely_no' | 'reject'

export type NextAction =
  | 'schedule_panel'
  | 'schedule_phone_screen'
  | 'send_technical_task'
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
  fairness_checks: FairnessChecks
  status: 'parsing' | 'scoring' | 'scored' | 'failed'
  error_message?: string | null
  created_at: string
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
  schedule_panel: 'Schedule panel',
  schedule_phone_screen: 'Phone screen',
  send_technical_task: 'Technical task',
  hold_for_review: 'Hold for review',
  reject: 'Reject (needs human click)',
}

export const BAND_COLOURS: Record<CandidateBand, string> = {
  strong_yes: 'bg-success/10 text-success',
  yes: 'bg-success/10 text-success',
  maybe: 'bg-warning/10 text-warning',
  likely_no: 'bg-mid/10 text-mid',
  reject: 'bg-danger/10 text-danger',
}
