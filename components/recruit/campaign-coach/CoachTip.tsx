'use client'

// CoachTip - the Campaign Coach guidance as a small floating "pop-up tip"
// (Hive-style coach-mark) instead of a persistent right-hand chat panel.
//
// It surfaces the coach's latest guidance for the current step, plus - once
// the ad has been drafted (step 3+) - a compact ad-health readout with the
// top flags and a "Fix" jump. It is non-blocking: it floats bottom-right
// above the wizard footer, can be dismissed, and re-opens itself whenever
// fresh coaching arrives. When dismissed, a small gold "Coach tip" button
// stays in the corner to bring it back.
//
// Reads the same wizard state the old CoachPanel did (coach_messages,
// streaming, coach_score, step) so no behaviour changes - only the
// presentation moves from a sidebar to a tip.

import { useEffect, useRef, useState } from 'react'
import { useWizard } from './wizard-state'
import { BLOCK_LABELS, type BlockKey } from '@/lib/campaign-types'

// Friendly fallback guidance per step, shown before the AI coach has said
// anything on that step.
const STEP_TIP: Record<number, string> = {
  1: "Tell me about the role in your own words - title, pay, must-haves. I'll pull out the details and draft the ad.",
  2: "Check the details I pulled out. Fix anything that's off before I write the ad - it shapes everything downstream.",
  3: "I've scored your ad's health. Work through any flags below to strengthen it, then approve each block.",
  4: "Pick where this gets posted. I'll prep the prefilled links for each board.",
}

function LightbulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
    </svg>
  )
}

export default function CoachTip() {
  const { state, dispatch } = useWizard()
  const [open, setOpen] = useState(true)

  // Re-open the tip whenever fresh coaching arrives (a new message is
  // pushed, or the coach starts streaming) so new guidance is never missed
  // - even if the user dismissed the previous tip.
  const prevLen = useRef(state.coach_messages.length)
  const prevStreaming = useRef(state.streaming)
  useEffect(() => {
    const grew = state.coach_messages.length > prevLen.current
    const startedStreaming = state.streaming && !prevStreaming.current
    if (grew || startedStreaming) setOpen(true)
    prevLen.current = state.coach_messages.length
    prevStreaming.current = state.streaming
  }, [state.coach_messages.length, state.streaming])

  // Nothing to coach on the launch screen.
  if (state.step === 5) return null

  const lastCoach = [...state.coach_messages].reverse().find(m => m.role === 'coach')
  const tipText = (lastCoach?.text || '').trim() || STEP_TIP[state.step] || "I'm here to help you write a great ad and get it live."
  const showScore = state.step >= 3 && !!state.coach_score
  const score = state.coach_score?.overall
  const warnings = state.coach_score?.warnings ?? []

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show Campaign Coach tip"
        className="fixed bottom-24 right-4 sm:right-6 z-30 inline-flex items-center gap-2 rounded-full bg-accent text-ink-on-accent text-xs font-bold px-4 min-h-touch shadow-float hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <LightbulbIcon />
        Coach tip
      </button>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 right-4 sm:right-6 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-bg-elevated shadow-modal overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Header - gold coach avatar + label + dismiss. */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <span className="w-7 h-7 rounded-full bg-accent text-ink-on-accent flex items-center justify-center flex-shrink-0">
          <LightbulbIcon />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-clay-ink dark:text-clay">Campaign Coach</p>
          <p className="text-[11px] text-ink-muted leading-none mt-0.5">
            {state.streaming ? 'Thinking...' : 'Tip'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Dismiss tip"
          className="w-7 h-7 rounded-full hover:bg-bg-soft flex items-center justify-center text-ink-soft hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Body - the latest guidance for this step. */}
      <div className="px-4 py-3 max-h-44 overflow-y-auto scrollbar-thin">
        {state.streaming && !tipText ? (
          <span className="inline-block w-2 h-2 rounded-full bg-clay animate-pulse" aria-label="Coach is thinking" />
        ) : (
          <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{tipText}</p>
        )}
      </div>

      {/* Ad health - only once the ad exists (step 3+). */}
      {showScore && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-2xl font-bold text-ink tabular-nums leading-none">
              {typeof score === 'number' ? score : '-'}
              {typeof score === 'number' && <span className="text-sm font-bold text-ink-muted">/10</span>}
            </span>
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Ad health</span>
          </div>
          {warnings.length > 0 ? (
            <ul className="space-y-2">
              {warnings.slice(0, 3).map((w, i) => {
                const dotCls = w.severity === 'error' ? 'text-danger' : w.severity === 'warn' ? 'text-warning' : 'text-ink-soft'
                return (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={`${dotCls} font-bold leading-tight mt-0.5`} aria-hidden="true">!</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-ink uppercase tracking-wider">
                        {BLOCK_LABELS[w.block as BlockKey] || w.block}
                      </p>
                      <p className="text-xs text-ink-soft leading-relaxed">{w.message}</p>
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'FLASH_BLOCK', key: w.block as BlockKey })
                          setTimeout(() => dispatch({ type: 'FLASH_BLOCK', key: undefined }), 1500)
                        }}
                        className="text-[11px] font-bold text-clay-ink dark:text-clay hover:underline mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded"
                      >
                        Fix
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">No flags - looking good.</p>
          )}
        </div>
      )}

      {/* Footer - dismiss. */}
      <div className="px-4 py-2.5 border-t border-border flex items-center justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-bold text-ink-soft hover:text-ink min-h-touch px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-full"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
