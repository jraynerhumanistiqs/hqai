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

export default function CandidateScorecardPanel({ screening, customRubrics, onClose, onRenameCandidate }: Props) {
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

  // Engine toggle: 'v1' keeps the live docx-library path. 'v2' uses the
  // @turbodocx/html-to-docx POC route. A/B harness only - both produce
  // the same content; the founder eyeballs render quality.
  async function downloadExport(mode: 'score' | 'formatted' | 'combined', label: string, engine: 'v1' | 'v2' = 'v1') {
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
      const endpoint = engine === 'v2' ? 'export-v2' : 'export'
      const res = await fetch(`/api/cv-screening/screenings/${screening.id}/${endpoint}?mode=${mode}`)
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

  return (
    <div
      className="fixed inset-0 bg-ink/40 z-40 flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-start justify-between z-10">
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              {rubric?.role ?? screening.rubric_id}
            </p>
            <h2 className="font-display text-h3 font-bold text-charcoal inline-flex items-center gap-2 group">
              <span>{screening.candidate_label}</span>
              <button
                type="button"
                onClick={async () => {
                  const next = window.prompt('Rename candidate', screening.candidate_label)
                  if (!next || !next.trim() || next.trim() === screening.candidate_label) return
                  try {
                    const r = await fetch(`/api/cv-screening/screenings/${screening.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ candidate_label: next.trim() }),
                    })
                    const data = await r.json()
                    if (!r.ok) throw new Error(data.error || 'Update failed')
                    onRenameCandidate?.(data.screening.candidate_label)
                  } catch (err) {
                    window.alert(err instanceof Error ? err.message : 'Could not rename candidate')
                  }
                }}
                aria-label="Rename candidate"
                title="Rename candidate"
                className="text-[11px] text-mid hover:text-charcoal opacity-0 group-hover:opacity-100 rounded p-1 transition-opacity"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                  <path d="M10 3l3 3" />
                </svg>
              </button>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-light flex items-center justify-center text-mid text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-display font-bold text-charcoal leading-none">
              {Number(screening.overall_score).toFixed(2)}
            </span>
            <span className={`inline-flex items-center text-xs font-bold rounded-full px-3 py-1.5 ${BAND_COLOURS[screening.band as keyof typeof BAND_COLOURS] ?? ''}`}>
              {BAND_LABELS[screening.band as keyof typeof BAND_LABELS] ?? screening.band}
            </span>
            {canSendVideo ? (
              <button
                onClick={startHandoff}
                className="ml-auto bg-black text-white text-sm font-bold rounded-full px-4 py-2 hover:bg-charcoal"
              >
                Send to Shortlist Agent
              </button>
            ) : (
              <span className="ml-auto text-xs font-bold text-mid">
                {ACTION_LABELS[screening.next_action as keyof typeof ACTION_LABELS] ?? screening.next_action}
              </span>
            )}
          </div>

          {screening.rationale_short && (
            <p className="text-sm text-charcoal leading-relaxed">
              {screening.rationale_short}
            </p>
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
                className="bg-black text-white text-xs font-bold rounded-full px-4 py-2 hover:bg-charcoal disabled:opacity-60"
              >
                {downloadBusy === 'score' ? 'Generating...' : 'CV Score Summary'}
              </button>
              <button
                type="button"
                onClick={() => downloadExport('formatted', 'Formatted & Branded CV')}
                disabled={!!downloadBusy}
                className="bg-white border border-border text-charcoal text-xs font-bold rounded-full px-4 py-2 hover:bg-bg disabled:opacity-60"
              >
                {downloadBusy === 'formatted' ? 'Generating...' : 'Formatted & Branded CV'}
              </button>
              <button
                type="button"
                onClick={() => downloadExport('combined', 'Combined download')}
                disabled={!!downloadBusy}
                className="bg-white border border-border text-charcoal text-xs font-bold rounded-full px-4 py-2 hover:bg-bg disabled:opacity-60"
              >
                {downloadBusy === 'combined' ? 'Generating...' : 'Combine Both'}
              </button>
            </div>
            <p className="text-[10px] text-muted mt-2">
              Formatted CV preserves the candidate&apos;s wording verbatim - only the section order matches the Humanistiqs layout. Combine Both packages the summary on page one and the CV from page two onwards.
            </p>

            {/* A/B harness for the @turbodocx/html-to-docx POC. Same three
                downloads, rendered through the HTML pipeline so the founder
                can eyeball quality vs v1. Remove this block when the
                migration is signed off; the v1 buttons above become the
                v2 engine path. */}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                v2 engine (HTML -&gt; docx) - test only
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadExport('score', 'CV Score Summary', 'v2')}
                  disabled={!!downloadBusy}
                  className="bg-bg border border-border text-charcoal text-xs font-bold rounded-full px-4 py-2 hover:bg-light disabled:opacity-60"
                >
                  {downloadBusy === 'score' ? 'Generating...' : 'v2 Score Summary'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadExport('formatted', 'Formatted & Branded CV', 'v2')}
                  disabled={!!downloadBusy}
                  className="bg-bg border border-border text-charcoal text-xs font-bold rounded-full px-4 py-2 hover:bg-light disabled:opacity-60"
                >
                  {downloadBusy === 'formatted' ? 'Generating...' : 'v2 Formatted CV'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadExport('combined', 'Combined download', 'v2')}
                  disabled={!!downloadBusy}
                  className="bg-bg border border-border text-charcoal text-xs font-bold rounded-full px-4 py-2 hover:bg-light disabled:opacity-60"
                >
                  {downloadBusy === 'combined' ? 'Generating...' : 'v2 Combined'}
                </button>
              </div>
              <p className="text-[10px] text-muted mt-2">
                Files download with a `_v2.docx` suffix so you can sit them side-by-side with the v1 outputs.
              </p>
            </div>
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
                <p className="font-bold text-charcoal text-sm">Fairness checks</p>
                <button
                  onClick={runCounterfactual}
                  disabled={probeBusy}
                  className="bg-black text-white text-xs font-bold rounded-full px-3 py-1.5 hover:bg-charcoal disabled:opacity-50"
                >
                  {probeBusy ? 'Probing...' : 'Run name probe'}
                </button>
              </div>
              <p>Name blinded from scorer: {screening.fairness_checks.name_blinded ? 'yes' : 'no'}</p>
              <p>Demographic inference suppressed: {screening.fairness_checks.demographic_inference_suppressed ? 'yes' : 'no'}</p>
              {screening.fairness_checks.tenure_gap_explained && (
                <p>Tenure gap noted: {screening.fairness_checks.tenure_gap_explained}</p>
              )}

              {probeError && (
                <p className="text-danger">Probe failed: {probeError}</p>
              )}

              {probeResult && (
                <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                  <p className={`font-bold text-sm ${probeResult.flagged ? 'text-warning' : 'text-success'}`}>
                    {probeResult.flagged ? 'Flagged' : 'Stable'} - max delta {probeResult.max_delta}
                  </p>
                  <p>{probeResult.verdict}</p>
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
        </div>

        {handoffOpen && (
          <div
            className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4"
            onClick={() => !handoffLoading && setHandoffOpen(false)}
          >
            <div
              className="bg-white w-full max-w-xl rounded-3xl shadow-card max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-display text-h3 font-bold text-charcoal">
                  Video pre-screen invite
                </h3>
                <button
                  onClick={() => !handoffLoading && setHandoffOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-light flex items-center justify-center text-mid"
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
                          className="bg-black text-white text-xs font-bold rounded-full px-3 py-1.5 hover:bg-charcoal"
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
                        className="flex-1 bg-white border border-border text-charcoal text-sm font-bold rounded-full px-4 py-2.5 text-center hover:bg-light"
                      >
                        Preview candidate view
                      </a>
                      <button
                        onClick={() => setHandoffOpen(false)}
                        className="flex-1 bg-black text-white text-sm font-bold rounded-full px-4 py-2.5 hover:bg-charcoal"
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
