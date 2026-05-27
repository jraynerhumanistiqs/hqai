'use client'

// RoleStepperRail - left-rail 4-step navigation that will scope the role
// detail panel into discrete phases. Day 2 ships only the visual scaffold;
// Steps 1, 3, and 4 are flagged "Coming soon" and clicking them is a noop.
// Day 3-4 will lift CvScreeningClient into Step 1 and wire up real content
// switching.

import type { ReactNode } from 'react'

export type RoleStep = 1 | 2 | 3 | 4

interface StepDef {
  id: RoleStep
  label: string
  hint: string
  status: 'live' | 'soon'
}

const STEPS: StepDef[] = [
  { id: 1, label: 'Score CVs',  hint: 'Upload and rank CVs',         status: 'soon' },
  { id: 2, label: 'Prescreen',  hint: 'Video + phone responses',     status: 'live' },
  { id: 3, label: 'Shortlist',  hint: 'Top picks for decision maker', status: 'soon' },
  { id: 4, label: 'Decision',   hint: 'Hire outcome + handoff',      status: 'soon' },
]

interface Props {
  currentStep: RoleStep
  onStepChange: (step: RoleStep) => void
  children?: ReactNode
}

export function RoleStepperRail({ currentStep, onStepChange }: Props) {
  return (
    <aside
      aria-label="Role workflow steps"
      className="hidden md:flex md:flex-col md:w-56 lg:w-60 flex-shrink-0 border-r border-border bg-bg-elevated"
    >
      <div className="px-5 py-5 border-b border-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Role workflow</p>
        <p className="text-xs text-mid mt-1">Walk this candidate pool through four phases.</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {STEPS.map((step) => {
          const active = step.id === currentStep
          const live = step.status === 'live'
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => live && onStepChange(step.id)}
              disabled={!live}
              aria-current={active ? 'step' : undefined}
              title={live ? step.hint : 'Coming soon - the bigger merge build wires this up'}
              className={`w-full text-left rounded-2xl px-3 py-3 border transition-colors flex items-start gap-3 ${
                active
                  ? 'bg-accent text-ink-on-accent border-accent shadow-card'
                  : live
                    ? 'bg-bg border-border text-ink hover:bg-light'
                    : 'bg-bg border-dashed border-border text-mid cursor-not-allowed'
              }`}
            >
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
                  active
                    ? 'bg-white/15 text-ink-on-accent'
                    : live
                      ? 'bg-light text-charcoal'
                      : 'bg-light text-muted'
                }`}
              >
                {step.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight truncate">{step.label}</span>
                <span
                  className={`block text-[11px] leading-tight mt-0.5 truncate ${
                    active ? 'text-white/80' : 'text-mid'
                  }`}
                >
                  {step.hint}
                </span>
                {!live && (
                  <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-muted bg-light border border-border rounded-full px-2 py-0.5">
                    Coming soon
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </nav>
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted leading-snug">
          Steps 1, 3, and 4 ship in the next preview - this rail is the scaffold so you can sign off on the information architecture first.
        </p>
      </div>
    </aside>
  )
}
