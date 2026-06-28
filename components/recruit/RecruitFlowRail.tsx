'use client'

// RecruitFlowRail - the shared "click along to progress" navigation for
// HQ Recruit pages.
//
// Replaces the dense, page-specific sidebars (criteria libraries, intro
// paragraph dumps, stacked buttons) with a calm, spacious progress rail:
// a short page header + a vertical list of numbered steps, each with one
// line of guidance for new users. The page's actual content (lists,
// uploads, results) moves OUT of the rail and into the main pane, which
// gets the room back.
//
// Design rationale (docs/research/2026-05-16_brand-kit-benchmark.md):
//   - One accent only (Wattle Gold) carries the current step. Done steps
//     read as a quiet check; upcoming steps recede.
//   - Content recedes, the task leads. The rail guides; it does not shout.
//   - Generous vertical rhythm ("spread") so each step has room to breathe.
//
// Desktop (md+): a fixed-width left rail. Mobile: a horizontal segmented
// bar so the same steps stay reachable without stealing vertical space.
//
// This is presentational only - the host page owns step state and the
// gating logic (which steps are reachable). Reuses the token system, so it
// renders correctly in both the light and dark product themes.

import type { ReactNode } from 'react'

export interface FlowStep {
  id: number
  label: string
  /** One short line of guidance shown under the label (new-user support). */
  hint: string
  /** Marks a step the user has already completed (shows a check). */
  done?: boolean
}

interface RecruitFlowRailProps {
  eyebrow?: string
  title?: string
  blurb?: string
  steps: FlowStep[]
  current: number
  onStepChange: (id: number) => void
  /**
   * Whether a step can be jumped to. Defaults to: any completed step, the
   * current step, or the immediate next one. Host pages pass a custom
   * predicate when later steps depend on earlier data.
   */
  canNavigate?: (step: FlowStep) => boolean
  /** Optional quiet content pinned to the bottom of the rail (e.g. a
      related-tool cross-link). Hidden on the mobile bar. */
  footer?: ReactNode
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

export default function RecruitFlowRail({
  eyebrow,
  title,
  blurb,
  steps,
  current,
  onStepChange,
  canNavigate,
  footer,
}: RecruitFlowRailProps) {
  const reachable = (step: FlowStep) => {
    if (canNavigate) return canNavigate(step)
    return step.done || step.id <= current + 1
  }

  return (
    <>
      {/* Mobile: horizontal segmented stepper. */}
      <nav
        aria-label="Steps"
        className="md:hidden flex-shrink-0 border-b border-border bg-bg-elevated"
      >
        <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2.5 scrollbar-thin">
          {steps.map(step => {
            const active = step.id === current
            const can = reachable(step)
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => can && onStepChange(step.id)}
                disabled={!can}
                aria-current={active ? 'step' : undefined}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                  active
                    ? 'bg-accent text-ink-on-accent'
                    : can
                      ? 'bg-bg-soft text-ink-soft hover:text-ink'
                      : 'bg-bg-soft text-ink-muted opacity-60 cursor-not-allowed'
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                    active ? 'bg-ink-on-accent/20 text-ink-on-accent' : 'bg-bg-elevated text-ink-soft'
                  }`}
                >
                  {step.done && !active ? <CheckIcon /> : step.id}
                </span>
                <span className="whitespace-nowrap">{step.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Desktop: left progress rail. */}
      <aside
        aria-label="Steps"
        className="hidden md:flex md:flex-col md:w-64 lg:w-72 flex-shrink-0 border-r border-border bg-bg-elevated"
      >
        {(eyebrow || title || blurb) && (
          <div className="px-6 pt-7 pb-5">
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted mb-1.5">
                {eyebrow}
              </p>
            )}
            {title && (
              <h1 className="font-display text-xl font-bold text-ink tracking-tight leading-tight">
                {title}
              </h1>
            )}
            {blurb && (
              <p className="text-xs text-ink-soft leading-relaxed mt-1.5">{blurb}</p>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
          <ol className="relative">
            {steps.map((step, i) => {
              const active = step.id === current
              const can = reachable(step)
              const isLast = i === steps.length - 1
              return (
                <li key={step.id} className="relative pl-0">
                  {/* Connector line between nodes (progress sense). */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[1.05rem] top-9 bottom-0 w-px ${step.done ? 'bg-accent/40' : 'bg-border'}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => can && onStepChange(step.id)}
                    disabled={!can}
                    aria-current={active ? 'step' : undefined}
                    className={`group relative w-full text-left flex items-start gap-3 rounded-2xl px-2.5 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                      active
                        ? 'bg-accent-soft'
                        : can
                          ? 'hover:bg-bg-soft cursor-pointer'
                          : 'cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`relative z-10 flex items-center justify-center w-[2.1rem] h-[2.1rem] rounded-full text-xs font-bold flex-shrink-0 border transition-colors ${
                        active
                          ? 'bg-accent text-ink-on-accent border-accent'
                          : step.done
                            ? 'bg-accent/15 text-clay border-accent/30'
                            : can
                              ? 'bg-bg text-ink-soft border-border'
                              : 'bg-bg text-ink-muted border-border'
                      }`}
                    >
                      {step.done && !active ? <CheckIcon /> : step.id}
                    </span>
                    <span className="min-w-0 flex-1 pt-1">
                      <span
                        className={`block text-sm font-bold leading-tight ${
                          active ? 'text-ink' : can ? 'text-ink' : 'text-ink-muted'
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="block text-[11px] leading-snug mt-1 text-ink-soft">
                        {step.hint}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        {footer && (
          <div className="px-6 py-5 border-t border-border">{footer}</div>
        )}
      </aside>
    </>
  )
}
