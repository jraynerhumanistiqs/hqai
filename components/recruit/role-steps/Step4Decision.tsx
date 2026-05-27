'use client'

// Step 4 of the role workflow stepper - Decision.
//
// Records the recruiter's outcome for each shortlisted candidate. The
// four supported outcomes were nailed down with Jimmy:
//   - reject        : not progressing (reason captured for record keeping)
//   - interview_1   : organise the first formal interview
//   - interview_2   : organise the second formal interview
//   - offer         : move to offer stage
//
// This step only records the decision and reason. Wiring the action
// (calendar booking, offer letter generation, candidate email) is a
// separate build that follows this migration.

import { useMemo, useState } from 'react'
import type { CandidateResponse, PrescreenSession } from '@/lib/recruit-types'

type DecisionValue = 'reject' | 'interview_1' | 'interview_2' | 'offer' | ''

interface ExtendedResponse extends CandidateResponse {
  shortlisted_at?: string | null
  decision?: DecisionValue | null
  decision_reason?: string | null
  decision_at?: string | null
}

interface Props {
  session: PrescreenSession
  responses: CandidateResponse[]
  onPatchResponse: (
    id: string,
    patch: Partial<CandidateResponse> & {
      decision?: DecisionValue | null
      decision_reason?: string | null
    },
  ) => Promise<void>
}

const DECISION_LABELS: Record<Exclude<DecisionValue, ''>, string> = {
  reject: 'Reject candidate',
  interview_1: 'Organise 1st interview',
  interview_2: 'Organise 2nd interview',
  offer: 'Offer stage',
}

const DECISION_OPTIONS: Array<{ value: DecisionValue; label: string }> = [
  { value: '', label: 'No decision yet' },
  { value: 'interview_1', label: DECISION_LABELS.interview_1 },
  { value: 'interview_2', label: DECISION_LABELS.interview_2 },
  { value: 'offer', label: DECISION_LABELS.offer },
  { value: 'reject', label: DECISION_LABELS.reject },
]

function isShortlisted(r: CandidateResponse): boolean {
  return Boolean((r as ExtendedResponse).shortlisted_at)
}

export function Step4Decision({ session, responses, onPatchResponse }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  // Local draft reasons keyed by response id - the reason field debounces
  // through local state then commits on blur or when the decision changes.
  const [draftReasons, setDraftReasons] = useState<Record<string, string>>({})

  const shortlisted = useMemo(
    () => responses.filter(isShortlisted) as ExtendedResponse[],
    [responses],
  )

  async function setDecision(id: string, decision: DecisionValue) {
    setBusyId(id)
    try {
      const value = decision === '' ? null : decision
      await onPatchResponse(id, { decision: value })
    } finally {
      setBusyId(null)
    }
  }

  async function commitReason(id: string, value: string) {
    setBusyId(id)
    try {
      await onPatchResponse(id, { decision_reason: value })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card p-5">
        <p className="text-xs font-bold text-ink uppercase tracking-widest">Decision - {session.role_title}</p>
        <p className="text-sm text-mid mt-2 leading-snug">
          Record the outcome for each shortlisted candidate. The action itself
          (booking the interview, generating the offer letter, sending the
          decline email) is the next build - this step keeps the record.
        </p>
      </div>

      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Shortlisted candidates ({shortlisted.length})</p>
        </div>
        {shortlisted.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-mid">No shortlisted candidates yet.</p>
            <p className="text-xs text-mid mt-1">Promote candidates in Step 3 to make decisions here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {shortlisted.map(r => {
              const current = (r.decision ?? '') as DecisionValue
              const reasonDraft = draftReasons[r.id] ?? r.decision_reason ?? ''
              const showReason = current === 'reject'
              return (
                <li key={r.id} className="px-5 py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{r.candidate_name || 'Unnamed candidate'}</p>
                      <p className="text-xs text-mid truncate">
                        {r.rating ? `${r.rating}/5` : 'No rating'}
                        {r.decision_at ? ` - decided ${new Date(r.decision_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''}
                      </p>
                    </div>
                    <select
                      value={current}
                      disabled={busyId === r.id}
                      onChange={(e) => setDecision(r.id, e.target.value as DecisionValue)}
                      className="text-xs font-bold px-3 py-2 rounded-full border border-border bg-bg-elevated text-ink disabled:opacity-50 min-w-[200px]"
                    >
                      {DECISION_OPTIONS.map(opt => (
                        <option key={opt.value || 'none'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {showReason && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-mid mb-1">
                        Rejection reason (record keeping)
                      </label>
                      <textarea
                        rows={2}
                        value={reasonDraft}
                        onChange={(e) => setDraftReasons(d => ({ ...d, [r.id]: e.target.value }))}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v !== (r.decision_reason ?? '')) commitReason(r.id, v)
                        }}
                        placeholder="e.g. Strong CV but limited customer-facing experience for the role."
                        className="w-full text-sm bg-bg border border-border focus:border-ink rounded-2xl px-3 py-2 outline-none"
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
