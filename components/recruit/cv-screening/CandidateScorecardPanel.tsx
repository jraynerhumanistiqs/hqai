'use client'
import { useMemo } from 'react'
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

export default function CandidateScorecardPanel({ screening, onClose }: Props) {
  const rubric = useMemo(() => getRubric(screening.rubric_id), [screening.rubric_id])
  const criteriaById = useMemo(() => {
    const map: Record<string, string> = {}
    rubric?.criteria.forEach(c => { map[c.id] = c.label })
    return map
  }, [rubric])

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-start justify-between">
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
            <button className="ml-auto bg-black text-white text-sm font-bold rounded-full px-4 py-2 hover:bg-charcoal">
              {ACTION_LABELS[screening.next_action as keyof typeof ACTION_LABELS] ?? screening.next_action}
            </button>
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
      </div>
    </div>
  )
}
