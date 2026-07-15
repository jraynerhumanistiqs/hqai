'use client'
import type { PrescreenEvaluation, RubricDimensionScore } from '@/lib/recruit-types'

function fmtTs(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function AiSuggestionCard({
  evaluation,
  alreadyReviewed,
  busy,
  onDecision,
  onQuoteClick,
}: {
  evaluation: PrescreenEvaluation | null
  alreadyReviewed: boolean
  busy: string | null
  onDecision: (evaluationId: string, decision: 'accept' | 'adjust' | 'reject') => void
  onQuoteClick?: (sec: number) => void
}) {
  if (!evaluation) {
    return (
      <div className="bg-bg-elevated rounded-2xl border border-border shadow-card px-5 py-4 flex items-center gap-3">
        <span className="w-4 h-4 border-2 border-border border-t-ink rounded-full animate-spin" />
        <p className="text-sm text-mid">Loading AI suggestion...</p>
      </div>
    )
  }

  const rubric: RubricDimensionScore[] = Array.isArray(evaluation.rubric) ? evaluation.rubric : []

  return (
    <div className="bg-bg-elevated rounded-2xl border border-border shadow-card">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-ink">AI Suggestion</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-light text-mid border border-border">
            suggestion only
          </span>
        </div>
        {alreadyReviewed && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
            reviewed
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {rubric.map((d, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-bold text-ink capitalize truncate">{d.name.replace(/_/g, ' ')}</p>
                {d.confidence < 0.6 && (
                  <span
                    title="Low confidence - review manually"
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20"
                  >
                    low confidence
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-ink flex-shrink-0">{d.score}/5</div>
            </div>
            <div className="w-full h-1.5 bg-light rounded-full overflow-hidden">
              <div className="h-full bg-ink" style={{ width: `${(d.score / 5) * 100}%` }} />
            </div>
            {d.evidence_quote && (
              <p
                className="text-xs text-mid italic cursor-pointer hover:text-ink transition-colors"
                onClick={() => onQuoteClick?.(d.evidence_timestamp_sec)}
              >
                &ldquo;{d.evidence_quote}&rdquo;
                <span className="not-italic text-mid/70 ml-1.5">&middot; {fmtTs(d.evidence_timestamp_sec)}</span>
              </p>
            )}
          </div>
        ))}

        {evaluation.overall_summary && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-mid mb-1">Summary</p>
            <p className="text-sm text-charcoal">{evaluation.overall_summary}</p>
          </div>
        )}

        {(evaluation as any).recommendation_action && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-mid mb-1">AI recommendation</p>
            {(() => {
              const action = (evaluation as any).recommendation_action as string
              const labels: Record<string, { text: string; cls: string }> = {
                progress_to_shortlist: { text: 'Progress to shortlist', cls: 'bg-success/10 text-success' },
                consider_with_caution: { text: 'Consider with caution', cls: 'bg-warning/10 text-warning' },
                reject: { text: 'Recommend reject', cls: 'bg-danger/10 text-danger' },
              }
              const meta = labels[action] || { text: action, cls: 'bg-light text-mid' }
              return (
                <div>
                  <span className={`inline-flex items-center text-xs font-bold rounded-full px-3 py-1 ${meta.cls}`}>
                    {meta.text}
                  </span>
                  {(evaluation as any).recommendation_rationale && (
                    <p className="text-sm text-charcoal mt-2 leading-relaxed">
                      {(evaluation as any).recommendation_rationale}
                    </p>
                  )}
                  <p className="text-[10px] text-muted mt-2">
                    AI recommendation only. Final decision rests with the hiring manager.
                  </p>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-bg/40">
        <button
          onClick={() => onDecision(evaluation.id, 'reject')}
          disabled={busy === evaluation.id}
          className="text-xs font-bold px-4 py-2 rounded-full border border-border text-mid hover:text-ink hover:bg-bg-elevated transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => onDecision(evaluation.id, 'adjust')}
          disabled={busy === evaluation.id}
          className="text-xs font-bold px-4 py-2 rounded-full border border-border text-ink bg-bg-elevated hover:bg-bg transition-colors disabled:opacity-50"
        >
          Adjust
        </button>
        <button
          onClick={() => onDecision(evaluation.id, 'accept')}
          disabled={busy === evaluation.id}
          className="text-xs font-bold px-4 py-2 rounded-full bg-accent text-ink-on-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {busy === evaluation.id ? 'Saving...' : 'Accept'}
        </button>
      </div>
    </div>
  )
}
