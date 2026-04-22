// HQ Recruit - Video Pre-Screen shared TypeScript types

export type SessionStatus = 'active' | 'closed'

// Full status state machine for Phase 1 AI scoring
export type PrescreenResponseStatus =
  | 'submitted'
  | 'transcribing'
  | 'evaluating'
  | 'scored'
  | 'staff_reviewed'
  | 'shared'

// Legacy alias - kept so existing code that imports `ResponseStatus`
// (which used 'new' | 'reviewed' | 'shared') still compiles.
export type ResponseStatus = PrescreenResponseStatus | 'new' | 'reviewed'

export type RubricMode = 'standard' | 'custom'

export interface RubricDimension {
  name: string
  description: string
}

export interface RubricDimensionScore {
  name: string
  score: number       // 1-5
  confidence: number  // 0-1
  evidence_quote: string
  evidence_timestamp_sec: number
  insufficient_evidence?: boolean
}

export interface PrescreenEvaluation {
  id: string
  response_id: string
  rubric: RubricDimensionScore[]
  overall_summary: string | null
  model: string | null
  created_at: string
}

export interface PrescreenSession {
  id: string
  company: string
  role_title: string
  questions: string[]
  time_limit_seconds: number
  created_at: string
  created_by: string
  status: SessionStatus
  deleted_at?: string | null
  slug?: string | null
  rubric_mode?: RubricMode
  custom_rubric?: RubricDimension[] | null
  // -- Phase 4 outcome automation
  auto_send_outcomes?: boolean
  outcome_email_shortlisted?: string | null
  outcome_email_rejected?: string | null
  calendly_url_override?: string | null
}

export interface CandidateResponse {
  id: string
  session_id: string
  candidate_name: string
  candidate_email: string
  consent: boolean
  submitted_at: string
  status: ResponseStatus
  rating: number | null
  video_ids: string[]
  notes: string | null
  share_token: string | null
  share_expires_at: string | null
  stage?: 'new' | 'in_review' | 'shortlisted' | 'rejected'
}

// -- Phase 3 ----------------------------------------------------------------

export interface PrescreenNote {
  id: string
  response_id: string
  author_id: string
  author_name?: string | null
  author_email?: string | null
  body: string
  mentions: string[]
  created_at: string
  edited_at: string | null
}

export interface PrescreenShareLink {
  id: string
  response_id: string
  token: string
  created_by: string
  created_at: string
  expires_at: string | null
  revoked_at: string | null
  label: string | null
  view_count?: number
}

export interface PrescreenShareView {
  id: string
  link_id: string
  viewed_at: string
  ip: string | null
  user_agent: string | null
}

export interface TeamMember {
  id: string
  name: string
  email: string
}

// -- Phase 4 ----------------------------------------------------------------

export interface OutcomeTemplate {
  subject: string
  body: string
}

export interface PrescreenOutcomeEvent {
  id: string
  response_id: string
  outcome: 'shortlisted' | 'rejected'
  email_sent: boolean
  email_to: string | null
  email_subject: string | null
  email_body: string | null
  triggered_by: string
  created_at: string
}

export interface PrescreenInterviewBooking {
  id: string
  response_id: string
  invitee_email: string
  event_start: string
  event_end: string
  calendly_event_uri: string
  created_at: string
}
