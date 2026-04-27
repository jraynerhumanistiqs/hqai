'use client'
import { createContext, useContext } from 'react'
import type {
  RoleBrief,
  RoleProfile,
  JobAdDraft,
  CoachScore,
  DistributionPlan,
  CampaignBusinessContext,
  BlockKey,
  BlockState,
} from '@/lib/campaign-types'

export type CoachMessage = {
  role: 'coach' | 'user'
  text: string
  ts: number
}

export type WizardState = {
  step: 1 | 2 | 3 | 4 | 5
  brief?: RoleBrief
  briefText: string
  role_profile?: RoleProfile
  job_ad_draft?: JobAdDraft
  coach_score?: CoachScore
  distribution_plan?: DistributionPlan
  streaming: boolean
  coach_messages: CoachMessage[]
  block_states: Partial<Record<BlockKey, BlockState>>
  draftedStep3: boolean
  flashBlock?: BlockKey
}

export type WizardAction =
  | { type: 'SET_STEP'; step: WizardState['step'] }
  | { type: 'SET_BRIEF_TEXT'; text: string }
  | { type: 'SET_BRIEF'; brief: RoleBrief }
  | { type: 'SET_ROLE_PROFILE'; profile: RoleProfile }
  | { type: 'PATCH_ROLE_PROFILE'; patch: Partial<RoleProfile> }
  | { type: 'SET_JOB_AD'; draft: JobAdDraft }
  | { type: 'PATCH_JOB_AD_BLOCK'; key: BlockKey; value: any }
  | { type: 'SET_COACH_SCORE'; score: CoachScore }
  | { type: 'SET_DISTRIBUTION'; plan: DistributionPlan }
  | { type: 'TOGGLE_BOARD'; boardId: string; include: boolean }
  | { type: 'SET_STREAMING'; streaming: boolean }
  | { type: 'PUSH_COACH_MESSAGE'; msg: CoachMessage }
  | { type: 'REPLACE_LAST_COACH_MESSAGE'; text: string }
  | { type: 'SET_BLOCK_STATE'; key: BlockKey; state: BlockState }
  | { type: 'MARK_DRAFTED_STEP3' }
  | { type: 'FLASH_BLOCK'; key?: BlockKey }

export const initialWizardState: WizardState = {
  step: 1,
  briefText: '',
  streaming: false,
  coach_messages: [],
  block_states: {},
  draftedStep3: false,
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_BRIEF_TEXT':
      return { ...state, briefText: action.text }
    case 'SET_BRIEF':
      return { ...state, brief: action.brief }
    case 'SET_ROLE_PROFILE':
      return { ...state, role_profile: action.profile }
    case 'PATCH_ROLE_PROFILE':
      return state.role_profile
        ? { ...state, role_profile: { ...state.role_profile, ...action.patch } }
        : state
    case 'SET_JOB_AD': {
      const block_states: Partial<Record<BlockKey, BlockState>> = {
        overview: 'draft',
        about_us: 'draft',
        responsibilities: 'draft',
        requirements_must: 'draft',
        requirements_nice: 'draft',
        benefits: 'draft',
        apply_cta: 'draft',
      }
      return { ...state, job_ad_draft: action.draft, block_states }
    }
    case 'PATCH_JOB_AD_BLOCK': {
      if (!state.job_ad_draft) return state
      const blocks = { ...state.job_ad_draft.blocks }
      switch (action.key) {
        case 'overview': blocks.overview = action.value; break
        case 'about_us': blocks.about_us = action.value; break
        case 'responsibilities': blocks.responsibilities = action.value; break
        case 'requirements_must': blocks.requirements = { ...blocks.requirements, must: action.value }; break
        case 'requirements_nice': blocks.requirements = { ...blocks.requirements, nice: action.value }; break
        case 'benefits': blocks.benefits = action.value; break
        case 'apply_cta': blocks.apply_cta = action.value; break
      }
      return {
        ...state,
        job_ad_draft: { ...state.job_ad_draft, blocks },
        block_states: { ...state.block_states, [action.key]: 'edited' },
      }
    }
    case 'SET_COACH_SCORE':
      return { ...state, coach_score: action.score }
    case 'SET_DISTRIBUTION':
      return { ...state, distribution_plan: action.plan }
    case 'TOGGLE_BOARD': {
      if (!state.distribution_plan) return state
      const boards = state.distribution_plan.boards.map(b =>
        b.id === action.boardId ? { ...b, include: action.include } : b,
      )
      const total = boards
        .filter(b => (b as any).include !== false)
        .reduce((sum, b) => sum + (b.estimated_cost_aud || 0), 0)
      return {
        ...state,
        distribution_plan: { ...state.distribution_plan, boards, total_estimated_cost_aud: total },
      }
    }
    case 'SET_STREAMING':
      return { ...state, streaming: action.streaming }
    case 'PUSH_COACH_MESSAGE':
      return { ...state, coach_messages: [...state.coach_messages, action.msg] }
    case 'REPLACE_LAST_COACH_MESSAGE': {
      const msgs = [...state.coach_messages]
      if (msgs.length === 0 || msgs[msgs.length - 1].role !== 'coach') {
        msgs.push({ role: 'coach', text: action.text, ts: Date.now() })
      } else {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: action.text }
      }
      return { ...state, coach_messages: msgs }
    }
    case 'SET_BLOCK_STATE':
      return { ...state, block_states: { ...state.block_states, [action.key]: action.state } }
    case 'MARK_DRAFTED_STEP3':
      return { ...state, draftedStep3: true }
    case 'FLASH_BLOCK':
      return { ...state, flashBlock: action.key }
    default:
      return state
  }
}

export type WizardCtx = {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  business: CampaignBusinessContext
  callDraft: (step: number, extra?: Record<string, any>) => Promise<void>
  callLaunch: () => Promise<any>
}

export const WizardContext = createContext<WizardCtx | null>(null)

export function useWizard(): WizardCtx {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardShell')
  return ctx
}

export function allBlocksApproved(state: WizardState): boolean {
  const required: BlockKey[] = [
    'overview',
    'about_us',
    'responsibilities',
    'requirements_must',
    'requirements_nice',
    'benefits',
    'apply_cta',
  ]
  return required.every(k => state.block_states[k] === 'approved')
}
