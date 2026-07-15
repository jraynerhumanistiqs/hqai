'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  type CandidateScreening,
  type Consideration,
  type ConsiderationStatus,
  type Rubric,
  BAND_LABELS,
  ACTION_LABELS,
  BAND_COLOURS,
  BAND_CATEGORY_LABEL,
  CONSIDERATION_LABELS,
  deriveConsiderations,
} from '@/lib/cv-screening-types'
import { getRubric } from '@/lib/cv-screening-rubrics'
import ScoreMeaningGuide from './ScoreMeaningGuide'
import CvDownloadButton from './CvDownloadButton'

interface CustomRubricRow {
  id: string
  label: string
  rubric: Rubric
  created_at: string
}

interface Props {
  screening: CandidateScreening
  customRubrics?: CustomRubricRow[]
  onClose: () => void
  /** Called when the recruiter renames the candidate. Lets the parent
   *  (CvScreeningClient) update its screenings[] state so the list +
   *  panel header stay in sync. */
  onRenameCandidate?: (next: string) => void
  /** Called when the recruiter deletes the candidate. The parent
   *  removes the row from screenings[] state and the drawer closes. */
  onDeleteCandidate?: (id: string) => void
  /** True when this panel is hosted inside a role (Step 1 of the
   *  Shortlist Agent workflow). Swaps the legacy "Send to Shortlist
   *  Agent" handoff for the in-role action set (Send to Prescreen /
   *  Reject Candidate). */
  inRole?: boolean
  /** Attach this candidate to the role's prescreen session (Step 2).
   *  Only provided in role context. */
  onSendToPrescreen?: (screeningId: string) => Promise<void>
  /** Move this candidate to the rejected ("No") grouping. Only provided
   *  in role context. */
  onRejectCandidate?: (screeningId: string) => Promise<void>
}

interface HandoffResult {
  candidate_url: string
  questions: string[]
}

export default function CandidateScorecardPanel({ screening, customRubrics, onClose, onRenameCandidate, onDeleteCandidate, inRole, onSendToPrescreen, onRejectCandidate }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // In-role action state (Send to Prescreen / Reject).
  const [roleActionBusy, setRoleActionBusy] = useState<null | 'prescreen' | 'reject'>(null)
  const [roleActionError, setRoleActionError] = useState<string | null>(null)
  const [roleActionDone, setRoleActionDone] = useState<null | 'prescreen' | 'reject'>(null)

  async function handleSendToPrescreen() {
    if (!onSendToPrescreen) return
    setRoleActionBusy('prescreen')
    setRoleActionError(null)
    try {
      await onSendToPrescreen(screening.id)
      setRoleActionDone('prescreen')
    } catch (err) {
      setRoleActionError(err instanceof Error ? err.message : 'Send to prescreen failed')
    } finally {
      setRoleActionBusy(null)
    }
  }

  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  async function handleReject() {
    if (!onRejectCandidate) return
    setRejectConfirmOpen(false)
    setRoleActionBusy('reject')
    setRoleActionError(null)
    try {
      await onRejectCandidate(screening.id)
      setRoleActionDone('reject')
    } catch (err) {
      setRoleActionError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setRoleActionBusy(null)
    }
  }

  async function deleteCandidate() {
    setDeleteConfirmOpen(false)
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/cv-screening/screenings/${screening.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string; detail?: string })?.error || (data as { detail?: string })?.detail || `HTTP ${res.status}`)
      onDeleteCandidate?.(screening.id)
      onClose()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }
  const rubric = useMemo(() => {
    const standard = getRubric(screening.rubric_id)
    if (standard) return standard
    return customRubrics?.find(c => c.id === screening.rubric_id)?.rubric ?? null
  }, [screening.rubric_id, customRubrics])
  const criteriaById = useMemo(() => {
    const map: Record<string, string> = {}
    rubric?.criteria.forEach(c => { map[c.id] = c.label })
    return map
  }, [rubric])

  // Hard-gate criteria (location / work rights) are pulled out of the
  // scored "Criteria" list and shown as post-score "Considerations" - a
  // single-select eligibility tick that does NOT affect the merit number.
  const gateIds = useMemo(
    () => new Set((rubric?.criteria ?? []).filter(c => c.hard_gate).map(c => c.id)),
    [rubric],
  )
  const derivedConsiderations = useMemo(
    () => rubric ? deriveConsiderations(rubric.criteria, screening.criteria_scores, screening.considerations) : [],
    [rubric, screening.criteria_scores, screening.considerations],
  )
  const [considerations, setConsiderations] = useState<Consideration[]>(derivedConsiderations)
  const [considerSaving, setConsiderSaving] = useState<string | null>(null)
  const [considerError, setConsiderError] = useState<string | null>(null)
  // Re-seed from the AI read + persisted values when the candidate or the
  // resolved rubric changes. Local toggles below won't re-trigger this
  // (screening.id + rubric are stable once resolved), so edits stick.
  useEffect(() => {
    setConsiderations(derivedConsiderations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screening.id, rubric])

  async function setConsideration(id: string, status: ConsiderationStatus) {
    const next = considerations.map(c => c.id === id ? { ...c, status } : c)
    setConsiderations(next)
    // A screening that never persisted (local- placeholder id) can't be
    // PATCHed - keep the optimistic UI change but skip the network call.
    if (typeof screening.id === 'string' && screening.id.startsWith('local-')) return
    setConsiderSaving(id)
    setConsiderError(null)
    try {
      const res = await fetch(`/api/cv-screening/screenings/${screening.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ considerations: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
    } catch (err) {
      setConsiderError(err instanceof Error ? err.message : 'Could not save eligibility')
    } finally {
      setConsiderSaving(null)
    }
  }

  const [handoffOpen, setHandoffOpen] = useState(false)
  const [handoffLoading, setHandoffLoading] = useState(false)
  const [handoffError, setHandoffError] = useState<string | null>(null)
  const [handoffResult, setHandoffResult] = useState<HandoffResult | null>(null)
  const [draftQuestions, setDraftQuestions] = useState<string[] | null>(null)
  // Snapshot of what came back from the first /handoff call, so we
  // can detect whether the recruiter edited the questions and only
  // send questions_override when they actually changed something.
  const [originalQuestions, setOriginalQuestions] = useState<string[] | null>(null)
  const [resending, setResending] = useState(false)
  const [copied, setCopied] = useState(false)

  // Download state. Previously we used plain <a href> links which
  // sent the user to the export route directly - so when the route
  // returned an error JSON the browser rendered it as raw text and
  // the user saw "a page with code". We now fetch + blob and surface
  // any non-2xx as an inline error so they stay on the scorecard.
  const [downloadBusy, setDownloadBusy] = useState<'score' | 'formatted' | 'combined' | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function downloadExport(mode: 'score' | 'formatted' | 'combined', label: string) {
    setDownloadBusy(mode)
    setDownloadError(null)
    // Guard: if the screening never persisted to Supabase (the score
    // route fell back to a `local-*` placeholder id), the export
    // routes will error with "invalid input syntax for type uuid".
    // Surface a clearer message before we even hit the network so the
    // user understands the root cause (typically an unapplied DB
    // migration that's been logged in Vercel).
    if (typeof screening.id === 'string' && screening.id.startsWith('local-')) {
      setDownloadError(
        'This screening was not saved to the database - downloads only work for persisted rows. ' +
        'Re-score this CV; if it fails again, check the Vercel function logs for "[cv-screening/score] cv_screenings insert failed" - the Postgres error there will tell us which column is missing.'
      )
      setDownloadBusy(null)
      return
    }
    try {
      const res = await fetch(`/api/cv-screening/screenings/${screening.id}/export?mode=${mode}`)
      const ct = res.headers.get('content-type') || ''
      if (!res.ok) {
        // Try JSON first - the export route returns structured errors.
        // Render BOTH the friendly error and the detail so Postgres /
        // Claude / fetch errors surface to the founder without diving
        // into Vercel logs.
        let detail = ''
        try {
          const j = await res.json()
          const top = j?.error ?? ''
          const inner = j?.detail ?? ''
          detail = top && inner ? `${top} - ${inner}` : (top || inner)
        } catch {
          detail = await res.text().catch(() => '')
        }
        throw new Error(detail || `HTTP ${res.status}`)
      }
      if (!ct.includes('officedocument') && !ct.includes('octet-stream')) {
        // 2xx but not a docx - belt-and-braces guard so we never
        // present raw JSON or text as a download.
        const text = await res.text().catch(() => '')
        throw new Error(text || 'Unexpected response from export route')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition') || ''
      const m = /filename="([^"]+)"/.exec(cd)
      a.download = m?.[1] ?? `${screening.candidate_label || 'candidate'}_${mode}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(`Could not generate ${label} - ${err instanceof Error ? err.message : 'unknown'}`)
    }
    setDownloadBusy(null)
  }

  const canSendVideo = ['strong_yes', 'yes', 'maybe'].includes(screening.band)

  async function startHandoff() {
    setHandoffOpen(true)
    setHandoffLoading(true)
    setHandoffError(null)
    setHandoffResult(null)
    try {
      const res = await fetch('/api/cv-screening/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screening_id: screening.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setHandoffResult({ candidate_url: data.candidate_url, questions: data.questions })
      setDraftQuestions(data.questions)
      setOriginalQuestions(data.questions)
    } catch (err) {
      setHandoffError(err instanceof Error ? err.message : 'Unknown error')
    }
    setHandoffLoading(false)
  }

  // Re-send the handoff with the edited questions. The handoff route
  // accepts a questions_override field that, when present, bypasses
  // the AI question generator and uses the supplied list verbatim.
  // Reuses the same session because /handoff creates a new prescreen
  // row each call - we only re-run it if the questions actually
  // changed so the candidate URL doesn't bounce around.
  async function applyEditedQuestions() {
    if (!draftQuestions) return
    const trimmed = draftQuestions.map(q => q.trim()).filter(Boolean)
    if (trimmed.length < 3) {
      setHandoffError('Keep at least 3 questions.')
      return
    }
    const sameAsOriginal = originalQuestions
      && trimmed.length === originalQuestions.length
      && trimmed.every((q, i) => q === originalQuestions[i])
    if (sameAsOriginal) {
      // Nothing changed - close the modal silently.
      setHandoffOpen(false)
      return
    }
    setResending(true)
    setHandoffError(null)
    try {
      const res = await fetch('/api/cv-screening/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screening_id: screening.id,
          questions_override: trimmed,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setHandoffResult({ candidate_url: data.candidate_url, questions: data.questions })
      setOriginalQuestions(data.questions)
      setDraftQuestions(data.questions)
    } catch (err) {
      setHandoffError(err instanceof Error ? err.message : 'Could not save edits')
    }
    setResending(false)
  }

  async function copyLink() {
    if (!handoffResult) return
    await navigator.clipboard.writeText(handoffResult.candidate_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renameBusy, setRenameBusy] = useState(false)

  async function commitRename() {
    const next = renameDraft.trim()
    if (!next || next === screening.candidate_label) { setRenameOpen(false); return }
    setRenameBusy(true)
    setRenameError(null)
    try {
      const r = await fetch(`/api/cv-screening/screenings/${screening.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_label: next }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Update failed')
      onRenameCandidate?.(data.screening.candidate_label)
      setRenameOpen(false)
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Could not rename candidate')
    } finally {
      setRenameBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink/40 z-40 flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated w-full max-w-2xl h-full overflow-y-auto shadow-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-bg-elevated border-b border-border px-6 py-4 flex items-start justify-between z-10">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              {rubric?.role ?? screening.rubric_id}
            </p>
            {renameOpen ? (
              <div className="space-y-1">
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={e => setRenameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenameOpen(false) }}
                  className="w-full text-base font-bold text-charcoal bg-bg border border-border rounded-full px-3 py-1.5 outline-none focus:border-charcoal"
                  aria-label="Candidate name"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={commitRename}
                    disabled={renameBusy}
                    className="text-xs font-bold text-accent hover:underline disabled:opacity-50"
                  >
                    {renameBusy ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenameOpen(false)}
                    className="text-xs font-bold text-mid hover:underline"
                  >
                    Cancel
                  </button>
                  {renameError && <span className="text-xs text-danger">{renameError}</span>}
                </div>
              </div>
            ) : (
              <h2 className="font-display text-h3 font-bold text-charcoal inline-flex items-center gap-2 group">
                <span>{screening.candidate_label}</span>
                <button
                  type="button"
                  onClick={() => { setRenameDraft(screening.candidate_label ?? ''); setRenameOpen(true); setRenameError(null) }}
                  aria-label="Rename candidate"
                  title="Rename candidate"
                  className="text-[11px] text-mid hover:text-charcoal opacity-0 group-hover:opacity-100 rounded p-1 transition-opacity"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                    <path d="M10 3l3 3" />
                  </svg>
                </button>
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <CvDownloadButton
              screeningId={screening.id}
              candidateName={screening.candidate_label}
              align="right"
            />
            <button
              onClick={onClose}
              className="min-h-touch min-w-touch rounded-full hover:bg-light flex items-center justify-center text-mid text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              aria-label="Close scorecard"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl sm:text-4xl font-bold text-charcoal leading-none tabular-nums">
              {Number(screening.overall_score).toFixed(2)}
            </span>
            <span
              title={BAND_CATEGORY_LABEL}
              className={`inline-flex items-center text-xs font-bold rounded-full px-3 py-1.5 ${BAND_COLOURS[screening.band as keyof typeof BAND_COLOURS] ?? ''}`}
            >
              {BAND_LABELS[screening.band as keyof typeof BAND_LABELS] ?? screening.band}
            </span>
            {/* In-role: the legacy single "Send to Shortlist Agent"
                handoff is replaced by the in-role action set rendered
                below the score. Standalone keeps the original button. */}
            {!inRole && (
              canSendVideo ? (
                <button
                  onClick={startHandoff}
                  className="ml-auto bg-accent text-ink-on-accent text-sm font-bold rounded-full px-4 py-2 hover:bg-accent-hover"
                >
                  Send to Shortlist Agent
                </button>
              ) : (
                <span className="ml-auto text-xs font-bold text-mid">
                  {ACTION_LABELS[screening.next_action as keyof typeof ACTION_LABELS] ?? screening.next_action}
                </span>
              )
            )}
          </div>

          {/* One-click explainer of the 0-5 score, summoned on demand so
              the scorecard itself stays calm. */}
          <details className="group">
            <summary className="inline-flex items-center gap-1.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden text-[11px] font-bold text-mid hover:text-charcoal transition-colors">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              What does this score mean?
            </summary>
            <div className="mt-2">
              <ScoreMeaningGuide variant="flat" />
            </div>
          </details>

          {screening.rationale_short && (
            <p className="text-sm text-charcoal leading-relaxed">
              {screening.rationale_short}
            </p>
          )}

          {/* In-role decision actions. Replaces the standalone "Send to
              Shortlist Agent" handoff with the three outcomes the
              recruiter actually needs at Step 1: keep the candidate by
              sending them to prescreen, or reject them. The CV report
              download lives in the Download block below, so here we
              point to it rather than duplicate it. */}
          {inRole && (
            <div className="bg-light rounded-2xl px-4 py-3 space-y-3">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Next step for this candidate
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendToPrescreen}
                  disabled={roleActionBusy !== null || roleActionDone === 'prescreen'}
                  className="bg-accent text-ink-on-accent text-xs font-bold rounded-full px-4 py-2 hover:bg-accent-hover disabled:opacity-60"
                >
                  {roleActionBusy === 'prescreen'
                    ? 'Sending...'
                    : roleActionDone === 'prescreen'
                      ? 'Sent to prescreen'
                      : 'Send to prescreen'}
                </button>
                {rejectConfirmOpen ? (
                  <span className="inline-flex items-center gap-2 text-xs">
                    <span className="text-mid">Reject this candidate?</span>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={roleActionBusy !== null}
                      className="font-bold text-danger hover:underline disabled:opacity-50"
                    >
                      Yes, reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectConfirmOpen(false)}
                      className="font-bold text-mid hover:underline"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRejectConfirmOpen(true)}
                    disabled={roleActionBusy !== null || roleActionDone === 'reject'}
                    className="bg-bg-elevated border border-border text-charcoal text-xs font-bold rounded-full px-4 py-2 hover:bg-danger/10 hover:text-danger hover:border-danger/30 disabled:opacity-60"
                  >
                    {roleActionDone === 'reject' ? 'Rejected' : 'Reject candidate'}
                  </button>
                )}
                <span className="text-[11px] text-muted">
                  Download the CV report below.
                </span>
              </div>
              {roleActionError && (
                <p className="text-xs text-danger">{roleActionError}</p>
              )}
              {roleActionDone === 'prescreen' && (
                <p className="text-xs text-mid">
                  This candidate now appears in Step 2 (Prescreen). Switch to the Prescreen step to send their invite.
                </p>
              )}
            </div>
          )}

          {/* CV Scoring Agent download options. Three exports off the same
              underlying screening record: a recruiter-facing score
              summary, the candidate's CV rewritten into the Humanistiqs
              house layout, and a single docx that combines both with a
              page break between them. The Formatted & Combined paths
              do a fresh Claude pass to restructure the CV so we don't
              need a separate upload step. */}
          <div className="bg-light rounded-2xl px-4 py-3">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
              Download
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadExport('score', 'CV Score Summary')}
                disabled={!!downloadBusy}
                className="bg-accent text-ink-on-accent text-xs font-bold rounded-full px-4 py-2 hover:bg-accent-hover disabled:opacity-60"
              >
                {downloadBusy === 'score' ? 'Generating...' : 'CV Score Summary'}
              </button>
              <button
                type="button"
                onClick={() => downloadExport('formatted', 'Formatted & Branded CV')}
                disabled={!!downloadBusy}
                className="bg-bg-elevated border border-border text-charcoal text-xs font-bold rounded-full px-4 py-2 hover:bg-light disabled:opacity-60"
              >
                {downloadBusy === 'formatted' ? 'Generating...' : 'Formatted & Branded CV'}
              </button>
              <button
                type="button"
                onClick={() => downloadExport('combined', 'Combined download')}
                disabled={!!downloadBusy}
                className="bg-bg-elevated border border-border text-charcoal text-xs font-bold rounded-full px-4 py-2 hover:bg-light disabled:opacity-60"
              >
                {downloadBusy === 'combined' ? 'Generating...' : 'Combine Both'}
              </button>
            </div>
            <p className="text-[10px] text-muted mt-2">
              Formatted CV preserves the candidate&apos;s wording verbatim - only the section order matches the Humanistiqs layout. Combine Both packages the summary on page one and the CV from page two onwards.
            </p>

            {downloadError && (
              <div className="mt-2 text-[11px] text-danger flex items-start gap-2">
                <span className="flex-1">{downloadError}</span>
                <button
                  type="button"
                  onClick={() => setDownloadError(null)}
                  className="text-mid hover:text-charcoal font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
              Criteria
            </p>
            <ul className="space-y-3">
              {screening.criteria_scores.filter(cs => !gateIds.has(cs.id)).map(cs => (
                <li key={cs.id} className="bg-light rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-charcoal">
                      {criteriaById[cs.id] ?? cs.id}
                    </span>
                    <span className="text-sm font-bold text-charcoal">
                      {cs.score}/5
                    </span>
                  </div>
                  {cs.rationale && (
                    <p className="text-xs text-mid mb-1.5 leading-relaxed">{cs.rationale}</p>
                  )}
                  {cs.evidence?.length > 0 && (
                    <blockquote className="text-xs text-charcoal border-l-2 border-border pl-3 italic">
                      "{cs.evidence[0].text}"
                    </blockquote>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Considerations - hard-gate eligibility checks (location / work
              rights) shown AFTER the score and deliberately excluded from
              it. A single-select tick the recruiter confirms, pre-set to the
              AI's read. Location no longer drags down a candidate's merit
              score - an interstate applicant with work rights and intent to
              relocate stays on a level field. */}
          {considerations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Considerations
                </p>
                {considerSaving && <span className="text-[10px] text-muted">Saving...</span>}
              </div>
              <p className="text-xs text-mid mb-2 leading-relaxed">
                Eligibility checks that do not affect the score. Confirm or adjust the AI&apos;s read.
              </p>
              <ul className="space-y-3">
                {considerations.map(c => (
                  <li key={c.id} className="bg-light rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-sm font-bold text-charcoal">{c.label}</span>
                      {c.ai_status && c.status !== c.ai_status && (
                        <span className="text-[10px] font-bold text-mid">edited</span>
                      )}
                    </div>
                    {/* The thin-experience note is informational - it flags
                        missing responsibility detail, not an eligibility
                        judgement, so the Eligible/Not eligible pills would
                        mislead. Note only. */}
                    {c.id !== 'thin_experience' && (
                    <div
                      role="radiogroup"
                      aria-label={`${c.label} eligibility`}
                      className="inline-flex rounded-full border border-border bg-bg-elevated p-0.5"
                    >
                      {(['met', 'unclear', 'not_met'] as ConsiderationStatus[]).map(status => {
                        const selected = c.status === status
                        return (
                          <button
                            key={status}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={considerSaving === c.id}
                            onClick={() => setConsideration(c.id, status)}
                            className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-3 py-1.5 transition-colors disabled:opacity-60 ${
                              selected
                                ? status === 'met'
                                  ? 'bg-success/12 text-success'
                                  : status === 'not_met'
                                    ? 'bg-danger/12 text-danger'
                                    : 'bg-ink text-bg-elevated'
                                : 'text-mid hover:text-charcoal'
                            }`}
                          >
                            {selected && (
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                              </svg>
                            )}
                            {CONSIDERATION_LABELS[status]}
                          </button>
                        )
                      })}
                    </div>
                    )}
                    {c.note && (
                      <p className="text-xs text-mid mt-2 leading-relaxed">{c.note}</p>
                    )}
                  </li>
                ))}
              </ul>
              {considerError && (
                <p className="text-[11px] text-danger mt-2">{considerError}</p>
              )}
            </div>
          )}

          <details className="bg-light rounded-2xl px-4 py-3 text-xs text-mid">
            <summary className="font-bold text-charcoal text-sm cursor-pointer">
              View parsed CV text
            </summary>
            <pre className="whitespace-pre-wrap mt-3 text-charcoal font-mono text-[11px] leading-relaxed">
              {screening.cv_text}
            </pre>
          </details>

          {/* Delete candidate - footer-low-emphasis. Inline confirm replaces
              native window.confirm for non-blocking UX. */}
          <div className="pt-4 border-t border-border">
            {deleteError && (
              <p className="text-[11px] text-danger mb-2">{deleteError}</p>
            )}
            {deleteConfirmOpen ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-mid">Delete {screening.candidate_label ?? 'this candidate'}? This cannot be undone.</span>
                <button
                  type="button"
                  onClick={deleteCandidate}
                  disabled={deleting}
                  className="font-bold text-danger hover:underline disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="font-bold text-mid hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="text-xs font-bold text-mid hover:text-danger transition-colors"
                >
                  Delete candidate
                </button>
              </div>
            )}
          </div>
        </div>

        {handoffOpen && (
          <div
            className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4"
            onClick={() => !handoffLoading && setHandoffOpen(false)}
          >
            <div
              className="bg-bg-elevated w-full max-w-xl rounded-3xl shadow-card max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-display text-h3 font-bold text-charcoal">
                  Video pre-screen invite
                </h3>
                <button
                  onClick={() => !handoffLoading && setHandoffOpen(false)}
                  className="min-h-touch min-w-touch rounded-full hover:bg-light flex items-center justify-center text-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  aria-label="Close video pre-screen invite"
                >
                  ×
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {handoffLoading && (
                  <div className="text-sm text-mid">
                    Generating questions tuned to this candidate's gaps...
                  </div>
                )}

                {handoffError && (
                  <div className="bg-danger/10 text-danger text-sm rounded-2xl px-4 py-3">
                    Couldn't create pre-screen: {handoffError}
                  </div>
                )}

                {handoffResult && draftQuestions && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <p className="text-[11px] font-bold text-muted uppercase tracking-wider">
                          Generated questions
                        </p>
                        <p className="text-[10px] text-muted">
                          Edit any line to tailor it to the PD.
                        </p>
                      </div>
                      {/* Editable question list. Mirrors the question editor
                          in PhoneRecorder so the interaction shape is the
                          same across surfaces. Saving with edits POSTs
                          questions_override back to the handoff route. */}
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {draftQuestions.map((q, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[11px] font-bold text-mid mt-2.5 w-5 text-right tabular-nums">{i + 1}.</span>
                            <textarea
                              value={q}
                              onChange={e => setDraftQuestions(qs => qs ? qs.map((row, idx) => idx === i ? e.target.value : row) : qs)}
                              rows={2}
                              className="flex-1 text-sm px-3 py-2 bg-bg-elevated border border-border rounded-lg outline-none focus:border-ink resize-y text-charcoal"
                            />
                            <button
                              type="button"
                              onClick={() => setDraftQuestions(qs => qs ? qs.filter((_, idx) => idx !== i) : qs)}
                              className="text-[11px] font-bold text-mid hover:text-danger mt-2.5 px-1.5"
                              aria-label="Remove question"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setDraftQuestions(qs => qs ? [...qs, ''] : [''])}
                          className="text-xs font-bold text-ink hover:underline"
                        >
                          + Add question
                        </button>
                        <button
                          type="button"
                          onClick={applyEditedQuestions}
                          disabled={resending}
                          className="text-xs font-bold bg-bg-elevated border border-border rounded-full px-3 py-1.5 hover:bg-light disabled:opacity-50"
                        >
                          {resending ? 'Saving...' : 'Apply edits'}
                        </button>
                      </div>
                      <p className="text-xs text-muted mt-2">
                        These target {screening.candidate_label}&apos;s lowest-scoring criteria. The video answers will be auto-scored against the same criteria the CV was scored on. Edit any question to tailor it to the PD.
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                        Candidate link
                      </p>
                      <div className="flex items-center gap-2 bg-light rounded-2xl px-4 py-3">
                        <code className="text-xs text-charcoal flex-1 truncate">
                          {handoffResult.candidate_url}
                        </code>
                        <button
                          onClick={copyLink}
                          className="bg-accent text-ink-on-accent text-xs font-bold rounded-full px-3 py-1.5 hover:bg-accent-hover"
                        >
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-muted mt-2">
                        Send this link to {screening.candidate_label}. They open it, record their answers, and the responses appear in your Video Pre-screen tab.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <a
                        href={handoffResult.candidate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-bg-elevated border border-border text-charcoal text-sm font-bold rounded-full px-4 py-2.5 text-center hover:bg-light"
                      >
                        Preview candidate view
                      </a>
                      <button
                        onClick={() => setHandoffOpen(false)}
                        className="flex-1 bg-accent text-ink-on-accent text-sm font-bold rounded-full px-4 py-2.5 hover:bg-accent-hover"
                      >
                        Done
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
