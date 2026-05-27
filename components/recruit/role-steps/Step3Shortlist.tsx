'use client'

// Step 3 of the role workflow stepper - Shortlist.
//
// Shows responses the recruiter has explicitly promoted to shortlist
// (shortlisted_at is set). The intent of this stage is to identify the
// top N candidates from the Prescreen pool, then hand them off to a
// decision maker (CEO, client, owner, etc.) to schedule the formal
// interview.
//
// "Promote to shortlist" and "Remove from shortlist" are managed via a
// PATCH /api/prescreen/responses/[id] with the shortlist_action verb
// which the route translates into the shortlisted_at + shortlisted_by
// audit columns.

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
  return Boolean((r as unknown as { shortlisted_at?: string | null }).shortlisted_at)
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
          Curate the top picks from Step 2 here, then share with the decision maker
          (CEO, owner, hiring manager). Each shortlisted candidate gets a shareable
          read-only link.
        </p>
      </div>

      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold text-ink">On the shortlist ({shortlisted.length})</p>
        </div>
        {shortlisted.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-mid">No shortlisted candidates yet.</p>
            <p className="text-xs text-mid mt-1">Promote candidates from the list below to build your shortlist for the decision maker.</p>
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
          <p className="text-sm font-bold text-ink">All other candidates ({otherCandidates.length})</p>
          <p className="text-xs text-mid mt-1">Promote anyone from Step 2 into your shortlist.</p>
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
                    {String(r.status)}{r.rating ? ` - ${r.rating}/5` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => toggleShortlist(r.id, 'promote')}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border border-border bg-bg-elevated text-ink hover:bg-light disabled:opacity-50"
                >
                  Promote to shortlist
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
