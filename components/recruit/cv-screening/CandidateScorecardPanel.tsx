'use client'
import { useMemo, useState } from 'react'
import {
  type CandidateScreening,
  BAND_LABELS,
  ACTION_LABELS,
  BAND_COLOURS,
} from '@/lib/cv-screening-types'
import { getRubric } from '@/lib/cv-screening-rubrics'

interface Props {
  screening: CandidateScreening
  onClose: () => void
}

interface HandoffResult {
  candidate_url: string
  questions: string[]
}

export default function CandidateScorecardPanel({ screening, onClose }: Props) {
  const rubric = useMemo(() => getRubric(screening.rubric_id), [screening.rubric_id])
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
  const [copied, setCopied] = useState(false)

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
    } catch (err) {
      setHandoffError(err instanceof Error ? err.message : 'Unknown error')
    }
    setHandoffLoading(false)
  }

  async function copyLink() {
    if (!handoffResult) return
    await navigator.clipboard.writeText(handoffResult.candidate_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex justify-end"
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
            <h2 className="font-display text-h3 font-bold text-charcoal">
              {screening.candidate_label}
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
                Send video pre-screen
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
            <div className="bg-light rounded-2xl px-4 py-3 text-xs text-mid space-y-1">
              <p className="font-bold text-charcoal text-sm mb-1">Fairness checks</p>
              <p>Name blinded: {screening.fairness_checks.name_blinded ? 'yes' : 'no'}</p>
              <p>Demographic inference suppressed: {screening.fairness_checks.demographic_inference_suppressed ? 'yes' : 'no'}</p>
              {screening.fairness_checks.tenure_gap_explained && (
                <p>Tenure gap noted: {screening.fairness_checks.tenure_gap_explained}</p>
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
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
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
                      <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                        Generated questions
                      </p>
                      <ol className="space-y-2 list-decimal list-inside text-sm text-charcoal">
                        {draftQuestions.map((q, i) => (
                          <li key={i} className="leading-relaxed">{q}</li>
                        ))}
                      </ol>
                      <p className="text-xs text-muted mt-2">
                        These target {screening.candidate_label}'s lowest-scoring criteria. The video answers will be auto-scored against the same rubric the CV was scored on.
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
