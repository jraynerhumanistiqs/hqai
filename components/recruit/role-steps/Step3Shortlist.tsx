'use client'

// Step 3 of the role workflow stepper - Shortlist.
//
// One job: review the scored + pre-screened pool and decide who moves
// to interview. "Move to interview" is the primary action - it is the
// same shortlisted_at gate as before (kept separate from the Interviews
// step below so bulk triage across the whole pool and the deep,
// per-candidate interview workspace don't have to share one screen).
//
// "Move to interview" and "Remove" are managed via a PATCH
// /api/prescreen/responses/[id] with the shortlist_action verb, which
// the route translates into the shortlisted_at + shortlisted_by audit
// columns.

import { useMemo, useState } from 'react'
import type { CandidateResponse, PrescreenSession } from '@/lib/recruit-types'

interface Props {
  session: PrescreenSession
  responses: CandidateResponse[]
  onPatchResponse: (id: string, patch: Partial<CandidateResponse> & { shortlist_action?: 'promote' | 'remove' }) => Promise<void>
  onShareResponse: (id: string) => Promise<string>
}

// A response is considered "on the shortlist" if it has a shortlisted_at
// timestamp. We treat the existing 'shortlisted' stage as a soft signal
// only (for backward compat with the Kanban). The explicit column wins.
function isShortlisted(r: CandidateResponse): boolean {
  return Boolean(r.shortlisted_at)
}

// Human-friendly status for the Shortlist view. Internal pipeline
// states (evaluating / transcribing) are noise here - what the recruiter
// cares about is whether the candidate has been prescreened yet. CV-only
// imports (no video, came from a CV screening) are surfaced as "CV
// scored - awaiting prescreen" so they never look stuck mid-pipeline.
function friendlyStatus(r: CandidateResponse): string {
  const isCvOnly = (!r.video_ids || r.video_ids.length === 0) && Boolean(r.cv_screening_id)
  if (isCvOnly) return 'CV scored - awaiting prescreen'
  switch (String(r.status)) {
    case 'submitted': return 'Prescreen submitted'
    case 'transcribing': return 'Processing'
    case 'transcribed': return 'Prescreen submitted'
    case 'evaluating': return 'Processing'
    case 'scored': return 'Prescreen scored'
    case 'staff_reviewed': return 'Reviewed'
    case 'shared': return 'Shared'
    default: return 'In progress'
  }
}

export function Step3Shortlist({ session, responses, onPatchResponse, onShareResponse }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const shortlisted = useMemo(() => responses.filter(isShortlisted), [responses])
  const otherCandidates = useMemo(() => responses.filter(r => !isShortlisted(r)), [responses])

  async function toggleShortlist(id: string, action: 'promote' | 'remove') {
    setBusyId(id)
    try {
      await onPatchResponse(id, { shortlist_action: action })
    } finally {
      setBusyId(null)
    }
  }

  async function copyShareLink(id: string) {
    setBusyId(id)
    try {
      let url = shareUrls[id]
      if (!url) {
        url = await onShareResponse(id)
        setShareUrls(s => ({ ...s, [id]: url }))
      }
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(c => (c === id ? null : c)), 2000)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card p-5">
        <p className="text-xs font-bold text-ink uppercase tracking-widest">Shortlist - {session.role_title}</p>
        <p className="text-sm text-mid mt-2 leading-snug">
          Review the scored and pre-screened pool below, then move your top candidates
          to interview. Each one you move gets a shareable read-only link for the
          decision maker (CEO, owner, hiring manager).
        </p>
      </div>

      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Moving to interview ({shortlisted.length})</p>
        </div>
        {shortlisted.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-mid">No candidates moved to interview yet.</p>
            <p className="text-xs text-mid mt-1">Move candidates from the pool below to build your interview list.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {shortlisted.map(r => (
              <li key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{r.candidate_name || 'Unnamed candidate'}</p>
                  <p className="text-xs text-mid truncate">
                    {r.rating ? `${r.rating}/5 - ` : ''}
                    {r.candidate_email && !r.candidate_email.endsWith('@no-email.local')
                      ? r.candidate_email
                      : 'No email on file'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => copyShareLink(r.id)}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-ink text-bg-elevated hover:bg-charcoal disabled:opacity-50"
                  >
                    {copied === r.id ? 'Link copied' : 'Share with decision maker'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => toggleShortlist(r.id, 'remove')}
                    className="text-xs font-bold px-3 py-1.5 rounded-full border border-border bg-bg-elevated text-mid hover:text-ink disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-bold text-ink">Candidate pool ({otherCandidates.length})</p>
          <p className="text-xs text-mid mt-1">Move anyone here into the interview list.</p>
        </div>
        {otherCandidates.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-mid">No other candidates in this role yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {otherCandidates.map(r => (
              <li key={r.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{r.candidate_name || 'Unnamed candidate'}</p>
                  <p className="text-xs text-mid truncate">
                    {friendlyStatus(r)}{r.rating ? ` - ${r.rating}/5` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => toggleShortlist(r.id, 'promote')}
                  className="text-xs font-bold px-3 py-1.5 rounded-full bg-accent text-ink-on-accent hover:bg-accent-hover disabled:opacity-50"
                >
                  Move to interview
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
