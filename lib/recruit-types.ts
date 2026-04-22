// HQ Recruit - Video Pre-Screen shared TypeScript types

export type SessionStatus  = 'active' | 'closed'
export type ResponseStatus = 'new' | 'reviewed' | 'shared'

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
}
