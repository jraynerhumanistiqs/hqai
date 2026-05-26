'use client'
import type { PrescreenEvaluation, RubricDimensionScore } from '@/lib/recruit-types'

function fmtTs(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function BiasDisclaimer({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-[#FFF8E1] border border-[#E6C94A] text-charcoal rounded-2xl px-4 py-2 text-xs flex items-start gap-3">
      <span className="flex-1">
        AI scores are suggestions only. Always apply your own judgement. Scores ignore protected attributes and do not assess personality or emotion.
      </span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss bias disclaimer"
        className="text-mid hover:text-ink text-sm leading-none flex-shrink-0 mt-0.5"
      >&times;</button>
    </div>
  )
}

export function AiSuggestionCard({
  evaluation,
  alreadyReviewed,
  busy,
  onDecision,
  anonymise,
  onQuoteClick,
}: {
  evaluation: PrescreenEvaluation | null
  alreadyReviewed: boolean
  busy: string | null
  onDecision: (evaluationId: string, decision: 'accept' | 'adjust' | 'reject') => void
  anonymise: boolean
  onQuoteClick?: (sec: number) => void
}) {
  if (!evaluation) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-card px-5 py-4 flex items-center gap-3">
        <span className="w-4 h-4 border-2 border-border border-t-black rounded-full animate-spin" />
        <p className="text-sm text-mid">Loading AI suggestion...</p>
      </div>
    )
  }

  const rubric: RubricDimensionScore[] = Array.isArray(evaluation.rubric) ? evaluation.rubric : []

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-ink">AI Suggestion</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-light text-mid border border-border">
            suggestion only
          </span>
        </div>
        {alreadyReviewed && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
            reviewed
          </span>
        )}
      </div>

      <div className="px-5 py-5 space-y-7">
        {/* Document-style score summary. Mirrors the CV Scoring Agent
            v1 Score Summary layout: prominent overall (option c - 40px
            mean of rubric scores), then Summary section, then Criteria
            section with each entry showing label + score + italic
            indented evidence quote with click-to-seek timestamp. */}
        {(() => {
          // Compute overall as the mean of rubric scores - the
          // prescreen_evaluations row doesn't carry an overall_score
          // directly, so this is the at-a-glance metric.
          const overall = rubric.length > 0
            ? rubric.reduce((sum, d) => sum + d.score, 0) / rubric.length
            : 0
          return (
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[40px] leading-none font-bold text-ink tabular-nums">
                {overall.toFixed(2)}
              </span>
              <span className="text-base text-mid">/ 5</span>
              {(evaluation as { recommendation_action?: string }).recommendation_action && (() => {
                const action = (evaluation as { recommendation_action?: string }).recommendation_action!
                const labels: Record<string, { text: string; cls: string }> = {
                  progress_to_shortlist: { text: 'Progress to shortlist', cls: 'bg-success/10 text-success border-success/30' },
                  consider_with_caution: { text: 'Consider with caution', cls: 'bg-warning/10 text-warning border-warning/30' },
                  reject:                { text: 'Recommend reject',    cls: 'bg-danger/10 text-danger border-danger/30' },
                }
                const meta = labels[action] || { text: action, cls: 'bg-light text-mid border-border' }
                return (
                  <span className={`inline-flex items-center text-xs font-bold rounded-full px-3 py-1.5 border ${meta.cls}`}>
                    {meta.text}
                  </span>
                )
              })()}
            </div>
          )
        })()}

        {/* Summary rationale - the docx h2 + paragraph treatment. */}
        {evaluation.overall_summary && (
          <section className="border-t border-border pt-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mid mb-2">
              Summary rationale
            </p>
            <p className="text-sm text-charcoal leading-relaxed">{evaluation.overall_summary}</p>
          </section>
        )}

        {/* AI recommendation rationale (separate paragraph; the action
            badge already appears in the top strip above). */}
        {(evaluation as { recommendation_rationale?: string }).recommendation_rationale && (
          <section className="border-t border-border pt-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mid mb-2">
              AI recommendation
            </p>
            <p className="text-sm text-charcoal leading-relaxed">
              {(evaluation as { recommendation_rationale?: string }).recommendation_rationale}
            </p>
            <p className="text-[10px] text-muted mt-2">
              AI recommendation only. Final decision rests with the hiring manager.
            </p>
          </section>
        )}

        {/* Criteria - flowing list with bold label + score, italic
            indented evidence quote with click-to-seek timestamp. */}
        {rubric.length > 0 && (
          <section className="border-t border-border pt-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mid mb-4">
              Criteria
            </p>
            <div className="space-y-6">
              {rubric.map((d, i) => (
                <div key={i}>
                  <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
                    <p className="text-sm font-bold text-ink capitalize">
                      {d.name.replace(/_/g, ' ')} - {d.score}/5
                    </p>
                    {d.confidence < 0.6 && (
                      <span
                        title="Low confidence - review manually"
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                      >
                        low confidence
                      </span>
                    )}
                  </div>
                  {d.evidence_quote && (
                    <blockquote
                      className="text-sm text-mid italic border-l-2 border-border pl-3 ml-1 cursor-pointer hover:text-ink transition-colors"
                      title={anonymise ? 'Quotes from transcript may include identifying information' : 'Jump to this moment in the video'}
                      onClick={() => onQuoteClick?.(d.evidence_timestamp_sec)}
                    >
                      &ldquo;{d.evidence_quote}&rdquo;
                      <span className="not-italic text-mid/70 ml-1.5 text-xs">&middot; {fmtTs(d.evidence_timestamp_sec)}</span>
                    </blockquote>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-bg/40">
        <button
          onClick={() => onDecision(evaluation.id, 'reject')}
          disabled={busy === evaluation.id}
          className="text-xs font-bold px-4 py-2 rounded-full border border-border text-mid hover:text-ink hover:bg-white transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => onDecision(evaluation.id, 'adjust')}
          disabled={busy === evaluation.id}
          className="text-xs font-bold px-4 py-2 rounded-full border border-border text-ink bg-white hover:bg-bg transition-colors disabled:opacity-50"
        >
          Adjust
        </button>
        <button
          onClick={() => onDecision(evaluation.id, 'accept')}
          disabled={busy === evaluation.id}
          className="text-xs font-bold px-4 py-2 rounded-full bg-black text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
        >
          {busy === evaluation.id ? 'Saving...' : 'Accept'}
        </button>
      </div>
    </div>
  )
}
