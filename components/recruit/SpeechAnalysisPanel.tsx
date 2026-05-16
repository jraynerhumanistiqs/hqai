'use client'

// Renders the Tier-1 multidimensional speech analysis (pace, fillers,
// sentence completion, vocabulary, pauses) as a compact panel. Used
// by:
//   - components/prescreen/RecordingFlow.tsx (candidate-facing, shows
//     after each answer)
//   - components/recruit/RoleDetail.tsx       (staff-facing, shows
//     per-question and overall under the response detail)
//
// The framing is intentionally neutral - we describe what was said and
// how it was paced, not what kind of person the candidate "is". See
// docs/AI-FAIRNESS-FAIR-WORK.md section 2.7.

import type { SpeechAnalysis, SpeechSignal } from '@/lib/confidence'

interface Props {
  analysis: SpeechAnalysis
  /** Tight = inline under a video tile. Roomy = standalone card. */
  density?: 'tight' | 'roomy'
  /** Header text shown above the signals row. */
  title?: string
  /** Optional context line shown under the title. */
  caption?: string
}

const TONE: Record<NonNullable<SpeechSignal['score']> | 'null', string> = {} as any

export function SpeechAnalysisPanel({ analysis, density = 'roomy', title = 'Speech analysis', caption }: Props) {
  const signals: SpeechSignal[] = [
    analysis.pace,
    analysis.fillers,
    analysis.completion,
    analysis.vocabulary,
    analysis.pauses,
  ]
  const measured = signals.filter(s => s.score !== null)
  if (measured.length === 0) return null

  return (
    <div className={density === 'tight' ? 'px-3 py-2 border-t border-border bg-light/40' : 'bg-bg-elevated rounded-2xl border border-border shadow-card px-4 py-3'}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className={density === 'tight' ? 'text-[10px] font-bold uppercase tracking-widest text-muted' : 'text-[10px] font-bold uppercase tracking-widest text-muted'}>
          {title}
        </p>
        {analysis.fluencyScore !== null && (
          <p className="text-[10px] text-mid">Fluency <span className="font-bold text-charcoal">{analysis.fluencyScore}</span>/100</p>
        )}
      </div>
      {caption && density === 'roomy' && (
        <p className="text-[11px] text-mid leading-snug mb-2">{caption}</p>
      )}
      <div className={density === 'tight' ? 'grid grid-cols-1 gap-1' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
        {signals.map(s => (
          <Row key={s.id} signal={s} density={density} />
        ))}
      </div>
      <p className="text-[10px] text-muted italic mt-2 leading-snug">
        Speech-only analysis - what was said, not who the candidate is. Watch the video before drawing conclusions.
      </p>
    </div>
  )
}

function Row({ signal, density }: { signal: SpeechSignal; density: 'tight' | 'roomy' }) {
  const tone = scoreTone(signal.score)
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-1 ${density === 'tight' ? 'h-7' : 'h-9'} rounded-full ${tone.bar}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={`text-[11px] font-bold uppercase tracking-wider ${tone.text}`}>{signal.label}</p>
          <p className={`text-xs font-bold text-charcoal truncate`}>{signal.band}</p>
          {signal.value !== null && (
            <p className="text-[10px] text-muted ml-auto whitespace-nowrap">{formatValue(signal)}</p>
          )}
        </div>
        <p className="text-[10px] text-mid leading-snug truncate" title={signal.detail}>{signal.detail}</p>
      </div>
    </div>
  )
}

function formatValue(s: SpeechSignal): string {
  if (s.value === null) return ''
  if (s.unit === '%') return `${Math.round(s.value)}%`
  if (s.unit === 'wpm') return `${Math.round(s.value)} wpm`
  if (s.unit === '/min') return `${s.value.toFixed(1)}/min`
  return `${s.value}`
}

function scoreTone(score: number | null): { bar: string; text: string } {
  if (score === null) return { bar: 'bg-border', text: 'text-mid' }
  if (score >= 80) return { bar: 'bg-success', text: 'text-mid' }
  if (score >= 60) return { bar: 'bg-warning', text: 'text-mid' }
  return { bar: 'bg-danger', text: 'text-mid' }
}
