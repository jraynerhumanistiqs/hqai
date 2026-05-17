'use client'
import { useCallback, useReducer, useState } from 'react'
import {
  WizardContext,
  initialWizardState,
  wizardReducer,
  allBlocksApproved,
} from './wizard-state'
import type { CampaignBusinessContext } from '@/lib/campaign-types'
import CoachPanel from './CoachPanel'
import Step1Brief from './Step1Brief'
import Step2Extract from './Step2Extract'
import Step3DraftCoach from './Step3DraftCoach'
import Step4Distribution from './Step4Distribution'
import Step5Launch from './Step5Launch'

const STEP_LABELS = ['Brief', 'Extract', 'Draft & Coach', 'Distribution', 'Hand-off']

export default function WizardShell({ business }: { business: CampaignBusinessContext }) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState)
  const [coachOpenMobile, setCoachOpenMobile] = useState(false)

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
        return isReturningToStep1 ? 'Ask Coach to Try Again' : 'Brief the coach →'
      case 2: return 'Looks good - draft it →'
      case 3: return 'All approved - continue →'
      case 4: return 'Get prefilled links →'
      case 5: return 'Launch campaign →'
    }
  })()

  const onPrimary = async () => {
    if (state.streaming) return
    switch (state.step) {
      case 1: {
        if (!state.briefText.trim()) return
        const out = await callDraft(1, { brief: { raw_text: state.briefText } })
        // eslint-disable-next-line no-console
        console.log('[campaign-coach] step 1 response:', out)
        if (out?.role_profile) {
          dispatch({ type: 'MARK_BRIEFED' })
          // If this is a "Try Again" run from Step 1 (user already
          // briefed and came back), stay on Step 1 so they can confirm
          // the new extract before moving forward. Otherwise advance.
          if (!isReturningToStep1) {
            dispatch({ type: 'SET_STEP', step: 2 })
          }
        } else {
          const dump = (() => {
            try { return JSON.stringify(out, null, 2).slice(0, 1500) }
            catch { return String(out) }
          })()
          dispatch({
            type: 'REPLACE_LAST_COACH_MESSAGE',
            text: `I had a wobble parsing that one. The server returned:\n\n${dump}`,
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

        const out = await callDraft(2)
        if (out?.blocks || out?.job_ad_draft) {
          dispatch({ type: 'SET_STEP', step: 3 })
        } else {
          dispatch({
            type: 'REPLACE_LAST_COACH_MESSAGE',
            text: "I couldn't draft the ad cleanly - give me one more try.",
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
      <div className="flex h-full bg-bg">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border bg-bg-elevated flex-shrink-0">
            {/* AI Administrator-style page header. */}
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
              HQ Recruit - Campaign Coach
            </p>
            <h1 className="font-sans text-h2 sm:text-h1 font-bold text-ink tracking-tight mb-1">
              Brief the role, draft the ad.
            </h1>
            <p className="text-sm text-ink-soft mb-3">
              {business.name ? `For ${business.name}.` : 'AI-coached recruitment campaign.'}{' '}
              Five steps - brief, extract, draft, distribute, launch.
            </p>
            <StepProgress
              step={state.step}
              onJump={goStep}
              hasRoleProfile={!!state.role_profile}
              hasJobAd={!!state.job_ad_draft}
              hasDistribution={!!state.distribution_plan}
            />

          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-6 py-6 sm:py-8 bg-bg">
            <div className="max-w-3xl mx-auto">
              {state.step === 1 && <Step1Brief />}
              {state.step === 2 && <Step2Extract />}
              {state.step === 3 && <Step3DraftCoach />}
              {state.step === 4 && <Step4Distribution />}
              {state.step === 5 && <Step5Launch />}
            </div>
          </div>

          {state.step !== 5 && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-white flex-shrink-0">
              <button
                onClick={onBack}
                disabled={state.step === 1}
                className="bg-white border border-border text-charcoal text-sm font-bold px-5 py-2.5 rounded-full hover:bg-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setCoachOpenMobile(o => !o)}
                className="lg:hidden bg-light text-charcoal text-xs font-bold px-3 py-2 rounded-full"
              >
                {coachOpenMobile ? 'Hide coach' : 'Show coach'}
              </button>
              <button
                onClick={onPrimary}
                disabled={!stepCanAdvance}
                className="bg-black text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-[#1a1a1a] disabled:bg-muted disabled:cursor-not-allowed transition-colors"
              >
                {state.streaming ? 'Coach is thinking…' : primaryCtaLabel}
              </button>
            </div>
          )}
        </div>

        <div className="hidden lg:flex w-[320px] flex-shrink-0 border-l border-border bg-white">
          <CoachPanel />
        </div>

        {coachOpenMobile && (
          <div className="lg:hidden fixed inset-0 z-40 bg-ink/40" onClick={() => setCoachOpenMobile(false)}>
            <div
              className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-white shadow-card"
              onClick={e => e.stopPropagation()}
            >
              <CoachPanel onClose={() => setCoachOpenMobile(false)} />
            </div>
          </div>
        )}

        {!coachOpenMobile && (
          <button
            onClick={() => setCoachOpenMobile(true)}
            className="lg:hidden fixed bottom-20 right-4 z-30 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-card flex items-center gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-white text-ink font-display flex items-center justify-center text-[10px]">
              C
            </span>
            Coach
          </button>
        )}
      </div>
    </WizardContext.Provider>
  )
}

function StepProgress({
  step,
  onJump,
  hasRoleProfile,
  hasJobAd,
  hasDistribution,
}: {
  step: 1 | 2 | 3 | 4 | 5
  onJump: (s: 1 | 2 | 3 | 4 | 5) => void
  hasRoleProfile: boolean
  hasJobAd: boolean
  hasDistribution: boolean
}) {
  // A step is reachable if (a) it's behind the current step, or (b) the
  // wizard has the data needed to render it usefully. Lets users navigate
  // freely once they've moved past Step 1.
  const reachable = (n: 1 | 2 | 3 | 4 | 5): boolean => {
    if (n <= step) return n !== step
    if (n === 2) return hasRoleProfile
    if (n === 3) return hasRoleProfile && hasJobAd
    if (n === 4) return hasRoleProfile && hasJobAd && hasDistribution
    if (n === 5) return hasRoleProfile && hasJobAd && hasDistribution
    return false
  }
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4 | 5
        const isActive = n === step
        const isCompleted = n < step
        const cls = isActive
          ? 'bg-accent text-ink-on-accent'
          : isCompleted
          ? 'bg-charcoal text-white'
          : 'bg-light text-mid'
        const clickable = reachable(n)
        return (
          <button
            key={n}
            onClick={() => clickable && onJump(n)}
            disabled={!clickable}
            className={`${cls} text-[11px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${
              clickable ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'
            }`}
          >
            <span className="opacity-70">{n}</span>
            {isCompleted && (
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span>{label}</span>
          </button>
        )
      })}
    </div>
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
