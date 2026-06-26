'use client'
import { useMemo, useState } from 'react'
import {
  type CandidateScreening,
  type Rubric,
  BAND_LABELS,
  ACTION_LABELS,
  BAND_COLOURS,
} from '@/lib/cv-screening-types'
import { getRubric } from '@/lib/cv-screening-rubrics'

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

interface ProbeResult {
  original: { name: string; overall: number }
  probes: Array<{ name: string; overall: number | null; error: string | null }>
  max_delta: number
  flagged: boolean
  verdict: string
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

  const [probeBusy, setProbeBusy] = useState(false)
  const [probeError, setProbeError] = useState<string | null>(null)
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null)

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

  async function runCounterfactual() {
    setProbeBusy(true)
    setProbeError(null)
    setProbeResult(null)
    try {
      const res = await fetch('/api/cv-screening/counterfactual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screening_id: screening.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setProbeResult(data as ProbeResult)
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : 'Probe failed')
    }
    setProbeBusy(false)
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
          <button
            onClick={onClose}
            className="min-h-touch min-w-touch rounded-full hover:bg-light flex items-center justify-center text-mid text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 flex-shrink-0"
            aria-label="Close scorecard"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl sm:text-4xl font-bold text-charcoal leading-none tabular-nums">
              {Number(screening.overall_score).toFixed(2)}
            </span>
            <span className={`inline-flex items-center text-xs font-bold rounded-full px-3 py-1.5 ${BAND_COLOURS[screening.band as keyof typeof BAND_COLOURS] ?? ''}`}>
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
              {screening.criteria_scores.map(cs => (
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

          {screening.fairness_checks && (
            <div className="bg-light rounded-2xl px-4 py-3 text-xs text-mid space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-charcoal text-sm">Bias checks</p>
                <button
                  onClick={runCounterfactual}
                  disabled={probeBusy}
                  title="Re-scores this CV with a few different names to check the AI's score doesn't change based on the candidate's name."
                  className="bg-accent text-ink-on-accent text-xs font-bold rounded-full px-3 py-1.5 hover:bg-accent-hover disabled:opacity-50"
                >
                  {probeBusy ? 'Checking...' : 'Check for name bias'}
                </button>
              </div>
              <p>Candidate name hidden from the scorer: {screening.fairness_checks.name_blinded ? 'yes' : 'no'}</p>
              <p>Age, gender and background ignored: {screening.fairness_checks.demographic_inference_suppressed ? 'yes' : 'no'}</p>
              {screening.fairness_checks.tenure_gap_explained && (
                <p>Career gap noted: {screening.fairness_checks.tenure_gap_explained}</p>
              )}

              {probeError && (
                <p className="text-danger">Bias check failed: {probeError}</p>
              )}

              {probeResult && (
                <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                  <p className={`font-bold text-sm ${probeResult.flagged ? 'text-warning' : 'text-success'}`}>
                    {probeResult.flagged
                      ? 'Possible name bias detected'
                      : 'No name bias detected'}
                  </p>
                  <p className="leading-relaxed">
                    We re-scored this CV with different names. The biggest change to the overall score was{' '}
                    <strong className="text-charcoal">{probeResult.max_delta.toFixed(2)} out of 5</strong>
                    {probeResult.flagged
                      ? ' - large enough to be worth a manual look.'
                      : ' - small enough that the name is not swaying the score.'}
                  </p>
                  <ul className="space-y-0.5 mt-1.5">
                    <li className="flex justify-between">
                      <span className="text-charcoal font-bold">{probeResult.original.name} (original)</span>
                      <span className="text-charcoal font-bold">{probeResult.original.overall.toFixed(2)}</span>
                    </li>
                    {probeResult.probes.map(p => (
                      <li key={p.name} className="flex justify-between">
                        <span>{p.name}</span>
                        <span>{p.overall != null ? p.overall.toFixed(2) : '-'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
