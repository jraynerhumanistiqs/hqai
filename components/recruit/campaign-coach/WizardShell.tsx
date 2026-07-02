'use client'
import { useCallback, useReducer } from 'react'
import dynamic from 'next/dynamic'
import {
  WizardContext,
  initialWizardState,
  wizardReducer,
  allBlocksApproved,
} from './wizard-state'
import type { CampaignBusinessContext } from '@/lib/campaign-types'
import { stageForStep } from '@/lib/campaign-tips'
import RecruitFlowRail, { type FlowStep } from '../RecruitFlowRail'
import TipBot from './TipBot'
import Step1Brief from './Step1Brief'
// The wizard renders one step at a time and always starts on Step 1, so only
// Step 1 is needed on load. Steps 2-5 are code-split and fetched as the
// recruiter advances - keeping the campaign-coach page's initial bundle to
// the shell + Step 1 instead of all five step screens. ssr:false: only the
// active step is ever rendered (state.step === N), all client-side.
const Step2Extract = dynamic(() => import('./Step2Extract'), { ssr: false })
const Step3DraftCoach = dynamic(() => import('./Step3DraftCoach'), { ssr: false })
const Step4Distribution = dynamic(() => import('./Step4Distribution'), { ssr: false })
const Step5Launch = dynamic(() => import('./Step5Launch'), { ssr: false })

// The five wizard steps as a calm left progress rail. Labels are unchanged
// from the old pill bar; each carries one line of new-user guidance.
const WIZARD_STEPS: Omit<FlowStep, 'done'>[] = [
  { id: 1, label: 'Brief',         hint: 'Tell the coach about the role' },
  { id: 2, label: 'Role profile',  hint: 'Confirm the extracted details' },
  { id: 3, label: 'Draft & Coach', hint: 'Approve each block' },
  { id: 4, label: 'Distribution',  hint: 'Pick where it posts' },
  { id: 5, label: 'Launch',        hint: 'Go live + prefilled links' },
]

export default function WizardShell({ business }: { business: CampaignBusinessContext }) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState)

  const callDraft = useCallback(
    async (step: number, extra: Record<string, any> = {}): Promise<any | null> => {
      dispatch({ type: 'SET_STREAMING', streaming: true })
      dispatch({
        type: 'PUSH_COACH_MESSAGE',
        msg: { role: 'coach', text: '', ts: Date.now() },
      })

      let finalOutput: any = null

      try {
        const res = await fetch('/api/campaign/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step,
            brief: state.brief,
            role_profile: state.role_profile,
            job_ad_draft: state.job_ad_draft,
            business,
            ...extra,
          }),
        })

        if (!res.ok || !res.body) throw new Error('Draft request failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let coachText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6))
              if (typeof data.message === 'string' && data.status) {
                coachText = coachText
                  ? `${coachText}\n${data.message}`
                  : data.message
                dispatch({ type: 'REPLACE_LAST_COACH_MESSAGE', text: coachText })
              }
              if (data.text) {
                coachText += data.text
                dispatch({ type: 'REPLACE_LAST_COACH_MESSAGE', text: coachText })
              }
              if (data.done && data.output) {
                finalOutput = data.output
                applyOutput(step, data.output, dispatch)
              }
            } catch {
              // ignore malformed line
            }
          }
        }
      } catch (err) {
        dispatch({
          type: 'REPLACE_LAST_COACH_MESSAGE',
          text:
            "Sorry - I couldn't reach my brain just then. Try again, or carry on and I'll catch up.",
        })
      } finally {
        dispatch({ type: 'SET_STREAMING', streaming: false })
      }

      return finalOutput
    },
    [state.brief, state.role_profile, state.job_ad_draft, business],
  )

  const callLaunch = useCallback(async () => {
    if (!state.role_profile || !state.job_ad_draft || !state.distribution_plan) return null
    dispatch({ type: 'SET_STREAMING', streaming: true })
    try {
      const res = await fetch('/api/campaign/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_profile: state.role_profile,
          job_ad_draft: state.job_ad_draft,
          distribution_plan: state.distribution_plan,
          options: {
            question_count: 5,
            rubric_mode: 'auto',
            auto_send_outcomes: false,
          },
        }),
      })
      if (!res.ok) throw new Error('Launch failed')
      return await res.json()
    } catch {
      return { ok: false, error: 'Launch failed - please try again.' }
    } finally {
      dispatch({ type: 'SET_STREAMING', streaming: false })
    }
  }, [state.role_profile, state.job_ad_draft, state.distribution_plan])

  const goStep = (s: 1 | 2 | 3 | 4 | 5) => dispatch({ type: 'SET_STEP', step: s })

  // Reachability for the left rail - ported verbatim from the old
  // StepProgress pill bar so jump-to-step behaviour is unchanged. A step is
  // reachable if (a) it's behind the current step, or (b) the wizard has the
  // data needed to render it usefully.
  const hasRoleProfile = !!state.role_profile
  const hasJobAd = !!state.job_ad_draft
  const hasDistribution = !!state.distribution_plan
  const canNavigate = (step: FlowStep): boolean => {
    const n = step.id
    if (n <= state.step) return n !== state.step
    if (n === 2) return hasRoleProfile
    if (n === 3) return hasRoleProfile && hasJobAd
    if (n === 4) return hasRoleProfile && hasJobAd && hasDistribution
    if (n === 5) return hasRoleProfile && hasJobAd && hasDistribution
    return false
  }

  const railSteps: FlowStep[] = WIZARD_STEPS.map(s => ({
    ...s,
    done: s.id < state.step,
  }))

  const stepCanAdvance = (() => {
    if (state.streaming) return false
    switch (state.step) {
      case 1: return state.briefText.trim().length > 0
      case 2: return !!state.role_profile
      case 3: return !!state.job_ad_draft && allBlocksApproved(state)
      case 4: return !!state.distribution_plan
      case 5: return false
      default: return false
    }
  })()

  // True once Step 1 has produced a role_profile. After that, returning
  // to Step 1 changes the CTA copy + behaviour: it no longer auto-advances
  // to Step 2 unless the user explicitly clicks 'Ask Coach to Try Again'.
  const isReturningToStep1 = state.step === 1 && state.hasBriefed && !!state.role_profile

  const primaryCtaLabel = (() => {
    switch (state.step) {
      case 1:
        // After a successful brief we no longer auto-advance (Bianca,
        // 2026-06-04, found being thrown to the next page without
        // approving disorienting). The primary action becomes an
        // explicit "review the details" that the user chooses to click.
        return isReturningToStep1 ? 'Review the details →' : 'Brief the coach →'
      case 2: return 'Looks good - draft it →'
      case 3: return 'All approved - continue →'
      case 4: return 'Get prefilled links →'
      case 5: return 'Launch campaign →'
    }
  })()

  // Re-run the Step 1 brief from the current brief text. Surfaced as a
  // secondary action once the coach has already extracted a profile, so
  // the user can correct the brief instead of being forced forward.
  const onReBrief = async () => {
    if (state.streaming || !state.briefText.trim()) return
    const out = await callDraft(1, { brief: { raw_text: state.briefText } })
    if (out?.role_profile) dispatch({ type: 'MARK_BRIEFED' })
  }

  const onPrimary = async () => {
    if (state.streaming) return
    switch (state.step) {
      case 1: {
        // Two modes on Step 1:
        //  - Already briefed + have a profile: the primary action is now
        //    "Review the details" - advance to Step 2 on an explicit
        //    click. We never auto-advance off the back of the brief.
        //  - Not yet briefed: run the brief, mark briefed, and STAY on
        //    Step 1 so the user chooses when to move forward.
        if (isReturningToStep1) {
          dispatch({ type: 'SET_STEP', step: 2 })
          break
        }
        if (!state.briefText.trim()) return
        dispatch({ type: 'SET_BRIEF_ERROR', error: undefined })
        const out = await callDraft(1, { brief: { raw_text: state.briefText } })
        if (out?.role_profile) {
          dispatch({ type: 'MARK_BRIEFED' })
          // Advance straight to Step 2 - the review step where the user
          // checks and edits the details we pulled out. (The old flow stayed
          // on Step 1 behind a "Review the details" CTA, but that relied on
          // the coach message panel for feedback; with the panel retired it
          // looked like nothing happened, so we move to the review step.)
          dispatch({ type: 'SET_STEP', step: 2 })
        } else {
          dispatch({
            type: 'SET_BRIEF_ERROR',
            error: "I couldn't read that brief clearly. Try again, or add a bit more detail about the role, the location, the pay, and the must-have skills.",
          })
        }
        break
      }
      case 2: {
        // Capture per-field edits between the AI-generated role_profile
        // (snapshotted on Step 1 success) and the user-edited final value
        // before we move on to Step 3. Fire-and-forget; never blocks.
        if (state.role_profile && state.role_profile_initial) {
          const ai = state.role_profile_initial as Record<string, unknown>
          const final = state.role_profile as Record<string, unknown>
          const fields = Array.from(new Set([...Object.keys(ai), ...Object.keys(final)]))
          for (const f of fields) {
            void fetch('/api/telemetry/field-edit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                surface: 'coach',
                step: 'step2_role_profile',
                field_name: f,
                ai_value: ai[f] ?? null,
                final_value: final[f] ?? null,
              }),
            }).catch(() => {})
          }
        }

        dispatch({ type: 'SET_STEP_ERROR', error: undefined })
        const out = await callDraft(2)
        if (out?.blocks || out?.job_ad_draft) {
          dispatch({ type: 'SET_STEP', step: 3 })
        } else {
          dispatch({
            type: 'SET_STEP_ERROR',
            error: "I couldn't draft the ad just then. Give it another go - if it keeps happening, tweak a detail above and retry.",
          })
        }
        break
      }
      case 3: {
        if (!allBlocksApproved(state)) return
        dispatch({ type: 'SET_STEP', step: 4 })
        break
      }
      case 4: {
        dispatch({ type: 'SET_STEP', step: 5 })
        break
      }
      case 5: break
    }
  }

  const onBack = () => {
    if (state.step > 1) goStep(((state.step - 1) as 1 | 2 | 3 | 4 | 5))
  }

  return (
    <WizardContext.Provider value={{ state, dispatch, business, callDraft, callLaunch }}>
      <div className="flex flex-col md:flex-row h-full bg-bg">
        {/* Shared HQ Recruit progress rail (desktop aside + mobile bar). It
            now carries the page header, so the content area starts clean. */}
        <RecruitFlowRail
          eyebrow="HQ Recruit - Campaign Coach"
          title="Brief the role, draft the ad."
          blurb={business.name ? `For ${business.name}.` : 'AI-coached recruitment campaign.'}
          steps={railSteps}
          current={state.step}
          onStepChange={(id) => goStep(id as 1 | 2 | 3 | 4 | 5)}
          canNavigate={canNavigate}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-6 py-6 sm:py-8 bg-bg">
            <div className="max-w-4xl mx-auto">
              {state.stepError && (
                <div role="alert" className="mb-4 bg-danger/10 border border-danger/30 text-danger text-sm rounded-2xl px-4 py-3">
                  {state.stepError}
                </div>
              )}
              {state.step === 1 && <Step1Brief />}
              {state.step === 2 && <Step2Extract />}
              {state.step === 3 && <Step3DraftCoach />}
              {state.step === 4 && <Step4Distribution />}
              {state.step === 5 && <Step5Launch />}
            </div>
          </div>

          {state.step !== 5 && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-bg-elevated flex-shrink-0">
              <button
                onClick={onBack}
                disabled={state.step === 1}
                className="bg-bg-elevated border border-border text-charcoal text-sm font-bold px-5 py-2.5 rounded-full hover:bg-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                Back
              </button>
              {isReturningToStep1 && (
                <button
                  onClick={onReBrief}
                  disabled={state.streaming || !state.briefText.trim()}
                  className="bg-light text-charcoal text-sm font-bold px-4 py-2.5 rounded-full hover:bg-border disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  title="Re-run the brief if the extracted details aren't right"
                >
                  Ask coach to try again
                </button>
              )}
              <button
                onClick={onPrimary}
                disabled={!stepCanAdvance}
                className="bg-accent text-ink-on-accent text-sm font-bold px-5 py-2.5 rounded-full hover:bg-accent-hover disabled:bg-muted disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                {state.streaming ? 'Coach is thinking...' : primaryCtaLabel}
              </button>
            </div>
          )}
        </div>

        {/* Recruitment Tip Bot - a floating pop-up card routed to the
            current step's funnel stage. Replaces the interim CoachTip. */}
        <TipBot stage={stageForStep(state.step)} />
      </div>
    </WizardContext.Provider>
  )
}

function applyOutput(
  step: number,
  output: any,
  dispatch: React.Dispatch<any>,
) {
  if (!output) return
  if (step === 1) {
    if (output.role_profile) dispatch({ type: 'SET_ROLE_PROFILE', profile: output.role_profile })
    if (output.brief) dispatch({ type: 'SET_BRIEF', brief: output.brief })
    if (output.award_suggestion && output.role_profile) {
      dispatch({
        type: 'SET_ROLE_PROFILE',
        profile: { ...output.role_profile, award: output.award_suggestion },
      })
    }
  }
  if (step === 2) {
    if (output.role_profile) dispatch({ type: 'SET_ROLE_PROFILE', profile: output.role_profile })
    if (output.job_ad_draft) dispatch({ type: 'SET_JOB_AD', draft: output.job_ad_draft })
    if (output.blocks) dispatch({ type: 'SET_JOB_AD', draft: output })
    if (output.coach_score) dispatch({ type: 'SET_COACH_SCORE', score: output.coach_score })
  }
  if (step === 3) {
    if (output.coach_score) dispatch({ type: 'SET_COACH_SCORE', score: output.coach_score })
    if (output.overall !== undefined) dispatch({ type: 'SET_COACH_SCORE', score: output })
  }
  if (step === 4) {
    if (output.distribution_plan) dispatch({ type: 'SET_DISTRIBUTION', plan: output.distribution_plan })
    if (output.boards) dispatch({ type: 'SET_DISTRIBUTION', plan: output })
  }
}
