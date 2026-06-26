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

const STEP_LABELS = ['Brief', 'Role profile', 'Draft & Coach', 'Distribution', 'Launch']

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
        const out = await callDraft(1, { brief: { raw_text: state.briefText } })
        if (out?.role_profile) {
          dispatch({ type: 'MARK_BRIEFED' })
          // Intentionally no SET_STEP here - the user advances via the
          // "Review the details" CTA once they're ready.
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
              Five steps - brief, role profile, draft, distribute, launch.
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
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-bg-elevated flex-shrink-0">
              <button
                onClick={onBack}
                disabled={state.step === 1}
                className="bg-bg-elevated border border-border text-charcoal text-sm font-bold px-5 py-2.5 rounded-full hover:bg-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                Back
              </button>
              <button
                onClick={() => setCoachOpenMobile(o => !o)}
                className="lg:hidden bg-light text-charcoal text-xs font-bold px-3 min-h-touch rounded-full inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                {coachOpenMobile ? 'Hide coach' : 'Show coach'}
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

        <div className="hidden lg:flex w-[320px] flex-shrink-0 border-l border-border bg-bg-elevated">
          <CoachPanel />
        </div>

        {coachOpenMobile && (
          <div
            className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end bg-ink/40 motion-safe:animate-[fadeIn_150ms_ease-out]"
            onClick={() => setCoachOpenMobile(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Campaign Coach"
              className="relative bg-bg-elevated rounded-t-panel shadow-modal max-h-[80vh] flex flex-col motion-safe:animate-[slideUp_220ms_ease-out]"
              onClick={e => e.stopPropagation()}
            >
              {/* Grab handle - signals the sheet can be dismissed by tapping
                  the backdrop or the close control inside CoachPanel. */}
              <div className="flex-shrink-0 flex justify-center pt-2.5 pb-1">
                <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-border" />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                <CoachPanel onClose={() => setCoachOpenMobile(false)} />
              </div>
            </div>
          </div>
        )}

        {!coachOpenMobile && (
          <button
            onClick={() => setCoachOpenMobile(true)}
            aria-label="Open Campaign Coach"
            className="lg:hidden fixed bottom-20 right-4 z-30 bg-accent text-ink-on-accent text-xs font-bold px-4 min-h-touch rounded-full shadow-card inline-flex items-center gap-2 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
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
          ? 'bg-ink text-ink-on-accent'
          : 'bg-light text-mid'
        const clickable = reachable(n)
        return (
          <button
            key={n}
            onClick={() => clickable && onJump(n)}
            disabled={!clickable}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`Step ${n}: ${label}${isCompleted ? ', completed' : isActive ? ', current step' : ''}`}
            className={`${cls} text-[11px] sm:text-xs font-bold uppercase tracking-wider px-3 min-h-touch rounded-full inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
              clickable ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'
            }`}
          >
            <span className="opacity-70" aria-hidden="true">{n}</span>
            {isCompleted && (
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
