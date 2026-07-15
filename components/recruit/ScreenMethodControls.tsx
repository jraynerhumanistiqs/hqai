'use client'

// ScreenMethodControls - per-candidate screening-method strip on the
// Shortlist Agent's expanded candidate card.
//
// A role's session.interview_types sets the DEFAULT methods for every
// candidate. This strip lets the recruiter enable a method for THIS
// candidate only (eg record a phone screen for one person on a
// video-only role). Candidate-level opt-ins persist to
// prescreen_responses.preferred_screen_methods (null = inherit the role
// default) and the candidate's available methods are always
// union(session.interview_types, preferred_screen_methods).

import { useState } from 'react'
import type { CandidateResponse, InterviewType, PrescreenSession } from '@/lib/recruit-types'

// preferred_screen_methods is additive (migration
// prescreen_responses_preferred_screen_methods.sql) and intentionally
// not part of the shared CandidateResponse type - read it defensively.
type WithMethods = CandidateResponse & { preferred_screen_methods?: InterviewType[] | null }

const METHOD_LABEL: Record<InterviewType, string> = {
  video: 'Video interview',
  phone: 'Phone screen',
}

export function candidateExtraMethods(response: CandidateResponse): InterviewType[] {
  const raw = (response as WithMethods).preferred_screen_methods
  return Array.isArray(raw)
    ? raw.filter((m): m is InterviewType => m === 'video' || m === 'phone')
    : []
}

export function roleDefaultMethods(session: PrescreenSession): InterviewType[] {
  return session.interview_types && session.interview_types.length > 0
    ? session.interview_types
    : ['video']
}

/** All methods available for this candidate - the union of the role
 *  default and any candidate-level opt-ins. */
export function screenMethodsFor(session: PrescreenSession, response: CandidateResponse): InterviewType[] {
  return Array.from(new Set([...roleDefaultMethods(session), ...candidateExtraMethods(response)]))
}

interface Props {
  session: PrescreenSession
  response: CandidateResponse
  /** Persist the candidate-level opt-ins. Parent handles optimistic update + PATCH. */
  onPatch: (patch: Partial<CandidateResponse>) => Promise<void> | void
  /** Open the phone recorder bound to this candidate. */
  onRecordPhone: () => void
}

export function ScreenMethodControls({ session, response, onPatch, onRecordPhone }: Props) {
  const [busy, setBusy] = useState(false)
  const defaults = roleDefaultMethods(session)
  const extras = candidateExtraMethods(response)
  const enabled = screenMethodsFor(session, response)

  async function saveExtras(next: InterviewType[]) {
    setBusy(true)
    try {
      await onPatch({ preferred_screen_methods: next.length ? next : null } as Partial<CandidateResponse>)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Screening methods</p>
      {(['video', 'phone'] as InterviewType[]).map(m => {
        const isDefault = defaults.includes(m)
        const isExtra = !isDefault && extras.includes(m)
        if (isDefault || isExtra) {
          return (
            <span
              key={m}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border border-border bg-bg-elevated text-ink"
              title={isExtra ? 'Added for this candidate only' : 'Included in the role default'}
            >
              {METHOD_LABEL[m]}
              {isExtra && (
                <button
                  type="button"
                  onClick={() => saveExtras(extras.filter(x => x !== m))}
                  disabled={busy}
                  aria-label={`Remove ${METHOD_LABEL[m].toLowerCase()} for this candidate`}
                  title="Added for this candidate - click to remove"
                  className="text-mid hover:text-ink leading-none disabled:opacity-50"
                >&times;</button>
              )}
            </span>
          )
        }
        return (
          <button
            key={m}
            type="button"
            onClick={() => saveExtras([...extras, m])}
            disabled={busy}
            title={`The role default doesn't include a ${METHOD_LABEL[m].toLowerCase()} - add one just for this candidate.`}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-dashed border-border text-mid hover:text-ink hover:border-ink/40 transition-colors disabled:opacity-50"
          >
            + Add {METHOD_LABEL[m].toLowerCase()}
          </button>
        )
      })}
      {enabled.includes('phone') && (
        <button
          type="button"
          onClick={onRecordPhone}
          className="ml-auto text-[11px] font-bold px-3 py-1.5 rounded-full bg-ink text-bg-elevated hover:bg-charcoal transition-colors"
        >
          Record phone screen
        </button>
      )}
    </div>
  )
}
