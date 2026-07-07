'use client'

// Step 4 of the role workflow stepper - Interviews (renamed from
// "Decision"). Runs the interview stage for each candidate moved to
// interview in Step 3:
//   - generate a tailored, structured interview guide (Claude, forced
//     tool-call - see app/api/recruit/interview-guide/route.ts);
//   - keep interview notes as you go, saved on blur;
//   - optionally attach a recording link (Zoom/Teams/Cloudflare) or a
//     short note that a recording exists - no in-browser recording;
//   - record the interview outcome.
//
// The 'offer' decision value is retired - offers and contracts are
// handled in HQ People, not HQ Recruit. Existing rows with decision =
// 'offer' render read-only (the select shows a disabled legacy option)
// so old data never crashes this view; new decisions can only be
// interview_1 / interview_2 / reject.

import { useMemo, useState } from 'react'
import type { CandidateResponse, PrescreenSession } from '@/lib/recruit-types'

type DecisionValue = 'reject' | 'interview_1' | 'interview_2' | 'offer' | ''

interface InterviewGuideQuestion {
  question: string
  good_answer: string
}

interface InterviewGuide {
  role_title: string
  candidate_name: string
  generated_at: string
  questions: InterviewGuideQuestion[]
}

// Omit + re-declare 'decision' rather than extend: CandidateResponse's
// decision type has no '' member, and DecisionValue needs '' to
// represent "no decision yet" in the <select>, so a plain `extends`
// would not type-check.
type ExtendedResponse = Omit<CandidateResponse, 'decision'> & {
  shortlisted_at?: string | null
  decision?: DecisionValue | null
  decision_reason?: string | null
  decision_at?: string | null
  interview_guide?: InterviewGuide | null
  interview_notes?: string | null
  interview_recording_url?: string | null
}

interface Props {
  session: PrescreenSession
  responses: CandidateResponse[]
  onPatchResponse: (
    id: string,
    patch: Partial<CandidateResponse> & {
      decision?: DecisionValue | null
      decision_reason?: string | null
      interview_notes?: string | null
      interview_recording_url?: string | null
      interview_guide?: InterviewGuide | null
    },
  ) => Promise<void>
}

// Labels are deliberately plain-language for a non-recruiter. 'offer' has
// no label in the selectable set below - it only appears as a disabled,
// read-only option when an existing row already carries it.
const DECISION_LABELS: Record<Exclude<DecisionValue, ''>, string> = {
  reject: 'Not progressing',
  interview_1: 'Progress to interview',
  interview_2: 'Progress to 2nd interview',
  offer: 'Offer (legacy - manage in HQ People)',
}

const DECISION_OPTIONS: Array<{ value: DecisionValue; label: string }> = [
  { value: '', label: 'No decision yet' },
  { value: 'interview_1', label: DECISION_LABELS.interview_1 },
  { value: 'interview_2', label: DECISION_LABELS.interview_2 },
  { value: 'reject', label: DECISION_LABELS.reject },
]

function isShortlisted(r: CandidateResponse): boolean {
  return Boolean((r as ExtendedResponse).shortlisted_at)
}

export function Step4Interviews({ session, responses, onPatchResponse }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [guideBusyId, setGuideBusyId] = useState<string | null>(null)
  const [guideErrors, setGuideErrors] = useState<Record<string, string>>({})
  const [guideOpen, setGuideOpen] = useState<Record<string, boolean>>({})
  // Local draft state - each field debounces through local state then
  // commits on blur, same pattern as the rejection reason box below.
  const [draftReasons, setDraftReasons] = useState<Record<string, string>>({})
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})
  const [draftRecording, setDraftRecording] = useState<Record<string, string>>({})

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

  async function commitNotes(id: string, value: string) {
    setBusyId(id)
    try {
      await onPatchResponse(id, { interview_notes: value })
    } finally {
      setBusyId(null)
    }
  }

  async function commitRecording(id: string, value: string) {
    setBusyId(id)
    try {
      await onPatchResponse(id, { interview_recording_url: value })
    } finally {
      setBusyId(null)
    }
  }

  async function generateGuide(id: string) {
    setGuideBusyId(id)
    setGuideErrors(prev => ({ ...prev, [id]: '' }))
    try {
      const res = await fetch('/api/recruit/interview-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_id: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      await onPatchResponse(id, { interview_guide: data.guide as InterviewGuide })
      setGuideOpen(prev => ({ ...prev, [id]: true }))
    } catch (err) {
      setGuideErrors(prev => ({ ...prev, [id]: err instanceof Error ? err.message : 'Could not generate guide' }))
    } finally {
      setGuideBusyId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card p-5">
        <p className="text-xs font-bold text-ink uppercase tracking-widest">Interviews - {session.role_title}</p>
        <p className="text-sm text-mid mt-2 leading-snug">
          Generate a tailored interview guide, keep notes as you go, and record the
          outcome for each candidate moved to interview. Using the same core
          questions for every candidate keeps things fair.
        </p>
      </div>

      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Candidates in interview ({shortlisted.length})</p>
        </div>
        {shortlisted.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-mid">No candidates in interview yet.</p>
            <p className="text-xs text-mid mt-1">Move candidates to interview in Step 3 to run interviews here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {shortlisted.map(r => {
              const current = (r.decision ?? '') as DecisionValue
              const isLegacyOffer = current === 'offer'
              const reasonDraft = draftReasons[r.id] ?? r.decision_reason ?? ''
              const notesDraft = draftNotes[r.id] ?? r.interview_notes ?? ''
              const recordingDraft = draftRecording[r.id] ?? r.interview_recording_url ?? ''
              const showReason = current === 'reject'
              const guide = r.interview_guide ?? null
              const guideIsOpen = guideOpen[r.id] ?? false
              const guideError = guideErrors[r.id]

              return (
                <li key={r.id} className="px-5 py-4 space-y-4">
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
                      {/* Legacy rows only - never offered as a new choice. */}
                      {isLegacyOffer && (
                        <option value="offer" disabled>{DECISION_LABELS.offer}</option>
                      )}
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
                        Reason (record keeping)
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

                  <div className="bg-bg rounded-2xl border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-mid">Interview guide</p>
                      <button
                        type="button"
                        disabled={guideBusyId === r.id}
                        onClick={() => generateGuide(r.id)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-accent text-ink-on-accent hover:bg-accent-hover disabled:opacity-50"
                      >
                        {guideBusyId === r.id ? 'Generating...' : guide ? 'Regenerate guide' : 'Generate interview guide'}
                      </button>
                    </div>
                    {guideError && <p className="text-xs text-danger">{guideError}</p>}
                    {guide && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setGuideOpen(prev => ({ ...prev, [r.id]: !guideIsOpen }))}
                          className="text-xs font-bold text-charcoal hover:underline"
                        >
                          {guideIsOpen ? 'Hide guide' : `Show guide (${guide.questions.length} questions)`}
                        </button>
                        {guideIsOpen && (
                          <ol className="mt-3 space-y-3 list-decimal list-inside">
                            {guide.questions.map((q, i) => (
                              <li key={i} className="text-sm text-ink">
                                <span className="font-bold">{q.question}</span>
                                <p className="text-xs text-mid mt-1 ml-5 leading-snug">
                                  What good looks like: {q.good_answer}
                                </p>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-mid mb-1">
                      Interview notes
                    </label>
                    <textarea
                      rows={3}
                      value={notesDraft}
                      onChange={(e) => setDraftNotes(d => ({ ...d, [r.id]: e.target.value }))}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        if (v !== (r.interview_notes ?? '')) commitNotes(r.id, v)
                      }}
                      placeholder="Notes from the interview - what stood out, any follow-ups."
                      className="w-full text-sm bg-bg border border-border focus:border-ink rounded-2xl px-3 py-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-mid mb-1">
                      Recording link (optional)
                    </label>
                    <input
                      type="text"
                      value={recordingDraft}
                      onChange={(e) => setDraftRecording(d => ({ ...d, [r.id]: e.target.value }))}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        if (v !== (r.interview_recording_url ?? '')) commitRecording(r.id, v)
                      }}
                      placeholder="Paste a Zoom/Teams/Cloudflare link, or note where the recording is saved."
                      className="w-full text-sm bg-bg border border-border focus:border-ink rounded-2xl px-3 py-2 outline-none"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
