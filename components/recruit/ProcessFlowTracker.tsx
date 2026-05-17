'use client'

// ProcessFlowTracker - 4 horizontal step pills at the top of the role
// detail. Computes its state from the loaded session + responses so it
// stays accurate without explicit step-advance calls.

import type { PrescreenSession, CandidateResponse } from '@/lib/recruit-types'

interface Props {
  session: PrescreenSession
  responses: CandidateResponse[]
  className?: string
}

type StepState = 'pending' | 'active' | 'done'

export function ProcessFlowTracker({ session, responses, className }: Props) {
  const interviewTypes = session.interview_types && session.interview_types.length > 0 ? session.interview_types : ['video']

  const total = responses.length
  const submitted = responses.filter(r => ['submitted', 'transcribing', 'transcribed', 'evaluating', 'scored', 'staff_reviewed', 'shared'].includes(String(r.status))).length
  const scored = responses.filter(r => ['scored', 'staff_reviewed', 'shared'].includes(String(r.status))).length
  const reviewed = responses.filter(r => ['staff_reviewed', 'shared'].includes(String(r.status))).length

  const step1: StepState = interviewTypes.length > 0 ? 'done' : 'pending'
  const step2: StepState = total === 0 ? (step1 === 'done' ? 'active' : 'pending') : (submitted === total ? 'done' : 'active')
  const step3: StepState = scored === 0
    ? (step2 === 'done' && total > 0 ? 'active' : 'pending')
    : (scored === total ? 'done' : 'active')
  const step4: StepState = reviewed === 0
    ? (step3 === 'done' ? 'active' : 'pending')
    : (reviewed === total ? 'done' : 'active')

  const typeLabel = interviewTypes.length === 2 ? 'Video + phone' : interviewTypes[0] === 'phone' ? 'Phone screen' : 'Video pre-screen'

  const steps = [
    { label: 'Interview type', hint: typeLabel, state: step1 },
    { label: 'Candidates', hint: total === 0 ? 'Awaiting invites' : `${submitted}/${total} submitted`, state: step2 },
    { label: 'AI scoring', hint: scored === 0 ? 'Waiting for submissions' : `${scored}/${total} scored`, state: step3 },
    { label: 'Decisions', hint: reviewed === 0 ? 'No reviews yet' : `${reviewed}/${total} actioned`, state: step4 },
  ]

  return (
    <div className={`bg-white border border-border rounded-2xl px-5 py-4 ${className ?? ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Process flow for this role</p>
      <ol className="flex flex-col sm:flex-row sm:items-stretch sm:divide-x divide-border">
        {steps.map((s, i) => (
          <li key={i} className="flex-1 sm:px-3 first:sm:pl-0 last:sm:pr-0 py-1.5">
            <div className="flex items-start gap-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold flex-shrink-0 ${stateClass(s.state)}`}>
                {s.state === 'done' ? '✓' : i + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-charcoal truncate">{s.label}</p>
                <p className={`text-[11px] truncate ${s.state === 'active' ? 'text-charcoal font-medium' : 'text-mid'}`}>{s.hint}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function stateClass(s: StepState): string {
  if (s === 'done') return 'bg-accent text-ink-on-accent'
  if (s === 'active') return 'bg-light text-charcoal ring-1 ring-black'
  return 'bg-light text-muted'
}
