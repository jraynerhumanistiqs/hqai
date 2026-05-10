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
        className="text-mid hover:text-black text-sm leading-none flex-shrink-0 mt-0.5"
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
          <span className="text-xs font-bold uppercase tracking-widest text-black">AI Suggestion</span>
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

      <div className="px-5 py-4 space-y-3">
        {rubric.map((d, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-bold text-black capitalize truncate">{d.name.replace(/_/g, ' ')}</p>
                {d.confidence < 0.6 && (
                  <span
                    title="Low confidence - review manually"
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                  >
                    low confidence
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-black flex-shrink-0">{d.score}/5</div>
            </div>
            <div className="w-full h-1.5 bg-light rounded-full overflow-hidden">
              <div className="h-full bg-black" style={{ width: `${(d.score / 5) * 100}%` }} />
            </div>
            {d.evidence_quote && (
              <p
                className="text-xs text-mid italic cursor-pointer hover:text-black transition-colors"
                title={anonymise ? 'Quotes from transcript may include identifying information' : undefined}
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
          className="text-xs font-bold px-4 py-2 rounded-full border border-border text-mid hover:text-black hover:bg-white transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => onDecision(evaluation.id, 'adjust')}
          disabled={busy === evaluation.id}
          className="text-xs font-bold px-4 py-2 rounded-full border border-border text-black bg-white hover:bg-bg transition-colors disabled:opacity-50"
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
