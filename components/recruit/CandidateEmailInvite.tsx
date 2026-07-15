'use client'

// CandidateEmailInvite - the per-candidate "Email candidate" flow on the
// Shortlist Agent. Replaces the old unlabelled row affordance with a
// clearly explained button + compose card so the recruiter always knows
// exactly what will be sent and to whom.
//
// Used for candidates without a video response yet (CV-imported
// placeholder rows, or candidates on a role where video was added just
// for them). Sending POSTs /api/prescreen/responses/[id]/invite, which
// stores the real email + name on the row and emails a unique link with
// ?response=<id> so the candidate's submission updates this row in place.

import { useState } from 'react'
import type { CandidateResponse, PrescreenSession } from '@/lib/recruit-types'

interface Props {
  response: CandidateResponse
  session: PrescreenSession
  /** The role's public prescreen link, eg https://.../prescreen/<slug>. */
  candidateUrl: string
  /** Optimistic local update after a successful send. */
  onSent: (patch: Partial<CandidateResponse>) => void
}

export function CandidateEmailInvite({ response, session, candidateUrl, onSent }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const firstName = (response.candidate_name || '').trim().split(' ')[0] || 'this candidate'
  const inviteUrl = `${candidateUrl}?response=${response.id}`

  function openCompose() {
    // Pre-fill from the CV-extracted email when we have one; ignore the
    // synthetic cv-*@no-email.local placeholder so the recruiter sees an
    // empty box and types a real address rather than accidentally
    // emailing the placeholder.
    const e = response.candidate_email
    setEmail(e && !e.endsWith('@no-email.local') ? e : '')
    setName(response.candidate_name ?? '')
    setError(null)
    setShowEditor(false)
    setOpen(true)
  }

  function openEditor() {
    // Same template the server sends by default, made visible + editable.
    // The unique link is included here; the server appends it if removed.
    const timeMin = Math.max(1, Math.round(session.time_limit_seconds / 60))
    const totalMin = session.questions.length * timeMin
    const greeting = name.trim() ? `Hi ${name.trim()},` : 'Hi,'
    setSubject(`Your video pre-screen for ${session.role_title} at ${session.company}`)
    setBody(
      `${greeting}\n\nYou've been invited to complete a short video pre-screen for the ${session.role_title} role at ${session.company}.\n\nIt takes about ${totalMin} minute${totalMin === 1 ? '' : 's'} total - ${session.questions.length} question${session.questions.length === 1 ? '' : 's'}, ${timeMin} minute per answer. You can re-record each answer until you're happy with it.\n\nStart your pre-screen here:\n${inviteUrl}\n\nIf you have any questions, reply to this email. Good luck.\n\nThe ${session.company} hiring team`,
    )
    setShowEditor(true)
  }

  async function send() {
    const cleaned = email.trim()
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setError('Please enter a valid email address.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const payload: Record<string, string> = {
        candidate_email: cleaned,
        candidate_name: name.trim(),
      }
      if (showEditor && subject.trim() && body.trim()) {
        payload.subject = subject.trim()
        payload.body = body.trim()
      }
      const res = await fetch(`/api/prescreen/responses/${response.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setOpen(false)
      setSent(true)
      onSent({ candidate_email: cleaned, candidate_name: name.trim() || undefined })
      window.setTimeout(() => setSent(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    }
    setBusy(false)
  }

  if (sent) {
    return (
      <div className="px-5 pb-3 -mt-1">
        <p className="text-xs font-bold text-success inline-flex items-center gap-1.5">
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          Invite sent. The candidate&apos;s video will appear here when they complete the pre-screen.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="px-5 pb-3 -mt-1 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={openCompose}
          className="text-xs font-bold text-ink inline-flex items-center gap-1.5 bg-bg-elevated border border-border rounded-full px-3 py-1.5 hover:bg-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
          </svg>
          Email candidate
        </button>
        <p className="text-[11px] text-mid leading-snug">
          Sends {firstName} their video pre-screen invitation by email.
        </p>
      </div>
    )
  }

  return (
    <div className="px-5 pb-4 -mt-1 bg-bg/40 border-t border-border">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mt-3 mb-2">
        Email {response.candidate_name || 'this candidate'} their video pre-screen invitation
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1">To</label>
          <input
            type="email"
            aria-label="Candidate email address"
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="candidate@example.com"
            className="w-full text-sm bg-bg-elevated border border-border rounded-lg px-3 py-2 outline-none focus:border-ink"
            onKeyDown={e => { if (e.key === 'Enter' && !busy) send() }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1">Candidate name</label>
          <input
            type="text"
            aria-label="Candidate full name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Candidate full name"
            className="w-full text-sm bg-bg-elevated border border-border rounded-lg px-3 py-2 outline-none focus:border-ink"
          />
        </div>
      </div>

      {!showEditor ? (
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[11px] text-mid leading-snug">
            A pre-written email goes out with their unique pre-screen link included. Want to tweak the wording?
          </p>
          <button
            type="button"
            onClick={openEditor}
            className="text-[11px] font-bold text-charcoal hover:underline whitespace-nowrap"
          >
            Preview &amp; edit email
          </button>
        </div>
      ) : (
        <div className="space-y-2 bg-light rounded-2xl p-3 mb-2">
          <div>
            <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-charcoal"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1">Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={9}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-charcoal leading-relaxed font-mono"
            />
            <p className="text-[10px] text-muted mt-1">
              Their unique pre-screen link is included - if you remove it, we add it back at the end automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEditor(false)}
            className="text-xs font-bold text-mid hover:text-charcoal"
          >
            Use the default template
          </button>
        </div>
      )}

      {error && <p className="text-xs text-danger mb-2">{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={send}
          disabled={busy || !email.trim()}
          className="bg-accent text-ink-on-accent text-xs font-bold rounded-full px-4 py-1.5 hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {busy ? 'Sending...' : 'Send invite email'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="text-xs font-bold text-mid hover:text-charcoal px-2 py-1.5"
        >
          Cancel
        </button>
        <p className="text-[10px] text-muted ml-auto leading-tight max-w-[240px]">
          When they submit, their video replaces the placeholder on this row.
        </p>
      </div>
    </div>
  )
}
