// Campaign Coach v1 types — see docs/CAMPAIGN-COACH-RESEARCH.md §2.2.
// These power the five-step coached wizard (Brief → Extract → Draft → Distribute → Hand-off)
// and the persisted `campaigns` row that links a campaign artifact set to a
// `prescreen_sessions` row created at launch.

export type AU_State = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT'

export type RoleBrief = {
  raw_text: string
  voice_transcript_id?: string
  detected_intent: 'new_hire' | 'replacement' | 'contract' | 'casual'
  confidence: number
}

export type AwardSuggestion = {
  code: string                       // "MA000020"
  name: string
  classification: string
  min_weekly_rate: number
  source_url: string                 // FWA reference
  confidence: number
}

export type RoleProfile = {
  title: string
  alt_titles: string[]               // for board SEO
  level: 'entry' | 'mid' | 'senior' | 'lead' | 'manager'
  contract_type: 'permanent_ft' | 'permanent_pt' | 'fixed_term' | 'casual' | 'contract'
  hours_per_week?: number
  location: { suburb: string; state: AU_State; postcode?: string; remote: 'no' | 'hybrid' | 'full' }
  salary: { min: number; max: number; currency: 'AUD'; super_inclusive: boolean; source: 'user' | 'estimate' }
  must_have_skills: string[]         // 3-7 ideal
  nice_to_have_skills: string[]
  team_context?: string
  start_date?: 'asap' | string
  award?: AwardSuggestion
  eeo_flags: string[]
}

export type JobAdDraft = {
  blocks: {
    overview: string
    about_us: string
    responsibilities: string[]
    requirements: { must: string[]; nice: string[] }
    benefits: string[]
    apply_cta: string
  }
  meta: { word_count: number; reading_grade: number }
}

export type CoachScore = {
  overall: number                    // 0-100
  inclusivity: number
  clarity: number
  legal: number                      // FWA compliance
  attractiveness: number
  warnings: { block: string; severity: 'info' | 'warn' | 'error'; message: string; suggestion?: string }[]
}

export type DistributionPlan = {
  boards: {
    id: 'seek' | 'indeed' | 'linkedin' | 'jora' | 'careerone' | 'ethicaljobs' | 'hqai_careers'
    method: 'deep_link' | 'api' | 'copy_paste' | 'internal'
    estimated_cost_aud?: number
    rationale: string
    prefill_url?: string
  }[]
  total_estimated_cost_aud: number
}

export type PrescreenLaunchPayload = {
  session_id?: string
  role_title: string
  role_description: string
  custom_rubric: { name: string; description: string }[]
  questions: string[]
  invite_template: { subject: string; body: string }
}

// ── UI helpers (used by Campaign Coach wizard) ──────────────────────────

export type BlockKey =
  | 'overview'
  | 'about_us'
  | 'responsibilities'
  | 'requirements_must'
  | 'requirements_nice'
  | 'benefits'
  | 'apply_cta'

export const ALL_BLOCK_KEYS: BlockKey[] = [
  'overview',
  'about_us',
  'responsibilities',
  'requirements_must',
  'requirements_nice',
  'benefits',
  'apply_cta',
]

export const BLOCK_LABELS: Record<BlockKey, string> = {
  overview: 'Overview',
  about_us: 'About us',
  responsibilities: 'Responsibilities',
  requirements_must: 'Requirements — must have',
  requirements_nice: 'Requirements — nice to have',
  benefits: 'Benefits',
  apply_cta: 'Apply CTA',
}

export type BlockState = 'draft' | 'edited' | 'approved'

export type LaunchResponse = {
  ok: boolean
  campaign_id: string
  session: { id: string; [k: string]: any }
  candidate_url: string
  deep_links: { seek?: string; indeed?: string; linkedin?: string }
  copy_paste_text: string
}

export type CampaignBusinessContext = {
  id?: string
  name: string
  industry?: string
  state?: string
  award?: string
  size?: string
  about?: string
}

// Maps to the `campaigns` Supabase table — see supabase/migrations/add_campaigns_table.sql.
export type CampaignRow = {
  id: string
  business_id: string
  created_by: string
  prescreen_session_id: string | null
  role_profile: RoleProfile
  job_ad_draft: JobAdDraft
  distribution_plan: DistributionPlan
  coach_score: CoachScore | null
  status: 'draft' | 'launched' | 'archived'
  created_at: string
  launched_at: string | null
}
