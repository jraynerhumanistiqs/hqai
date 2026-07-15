'use client'
// "What the CV score means" - a glanceable strip that teaches the 0-5
// score at a look. The ranges, labels and colours are DERIVED from
// bandFromScore + BAND_LABELS + BAND_COLOURS in lib/cv-screening-types,
// so this guide can never drift from the real banding logic.

import {
  bandFromScore,
  BAND_LABELS,
  BAND_COLOURS,
  BAND_CATEGORY_LABEL,
  type CandidateBand,
} from '@/lib/cv-screening-types'

// One plain-English line per band - what the recommendation means and
// the usual next step. The final call always stays with the user.
const BAND_MEANING: Record<CandidateBand, string> = {
  strong_yes: 'The CV clearly shows what you asked for. Usual next step: book an interview.',
  yes: 'A solid match against your criteria. Usual next step: a phone screen.',
  maybe: 'Some boxes ticked, some open questions. Usual next step: a phone screen or a small task to fill the gaps.',
  likely_no: 'The CV shows little of what you asked for. Sits in Hold for review - nothing is rejected without you.',
  reject: 'Very little match against your criteria. Still your call - the AI never rejects anyone for you.',
}

// Walk the 0-5 scale in 0.01 steps and merge contiguous scores that land
// in the same band. Computed once at module load, straight from
// bandFromScore, so the displayed ranges are always the live thresholds.
const SEGMENTS: Array<{ band: CandidateBand; from: number; to: number }> = (() => {
  const segs: Array<{ band: CandidateBand; from: number; to: number }> = []
  for (let i = 0; i <= 500; i++) {
    const score = i / 100
    const band = bandFromScore(score)
    const last = segs[segs.length - 1]
    if (last && last.band === band) last.to = score
    else segs.push({ band, from: score, to: score })
  }
  return segs
})()

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100)
}

interface Props {
  /** 'card' matches the page sections; 'flat' matches scorecard blocks. */
  variant?: 'card' | 'flat'
  className?: string
}

export default function ScoreMeaningGuide({ variant = 'card', className = '' }: Props) {
  const shell = variant === 'card'
    ? 'bg-bg-elevated shadow-card rounded-3xl px-5 py-4'
    : 'bg-bg-soft/50 border border-border rounded-2xl px-4 py-3'
  return (
    <section className={`${shell} ${className}`} aria-label="What the CV score means">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          What the CV score means
        </p>
        <p className="text-[11px] text-ink-muted">
          Score out of 5, mapped to a {BAND_CATEGORY_LABEL.toLowerCase()}
        </p>
      </div>

      {/* Full text alternative for screen readers. */}
      <p className="sr-only">
        {SEGMENTS.map(s => `A score from ${fmt(s.from)} to ${fmt(s.to)} means ${BAND_LABELS[s.band]}. ${BAND_MEANING[s.band]}`).join(' ')}
      </p>

      {/* One glanceable strip (sm and up) - five equal-width segments
          filling the container (tester feedback 2026-07-15: proportional
          widths squeezed the narrow bands and read unevenly). Ranges in
          mono so the decimal point is unmistakable (3.59, not 359). */}
      <div className="hidden sm:flex w-full gap-1" aria-hidden="true">
        {SEGMENTS.map(s => (
          <div
            key={s.band}
            className={`flex-1 rounded-xl px-2 py-1.5 text-center min-w-0 ${BAND_COLOURS[s.band]}`}
          >
            <p className="text-[11px] font-bold truncate">{BAND_LABELS[s.band]}</p>
            <p className="font-mono text-[11px] opacity-90 whitespace-nowrap">{fmt(s.from)} - {fmt(s.to)}</p>
          </div>
        ))}
      </div>

      {/* Compact rows on mobile where the strip would be cramped. */}
      <ul className="sm:hidden space-y-1.5" aria-hidden="true">
        {[...SEGMENTS].reverse().map(s => (
          <li key={s.band} className="flex items-center justify-between gap-2">
            <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 ${BAND_COLOURS[s.band]}`}>
              {BAND_LABELS[s.band]}
            </span>
            <span className="font-mono text-[11px] text-ink-soft">{fmt(s.from)} - {fmt(s.to)}</span>
          </li>
        ))}
      </ul>

      <details className="mt-2.5 group" aria-hidden="true">
        <summary className="inline-flex items-center gap-1.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden text-[11px] font-bold text-ink-soft hover:text-ink transition-colors">
          <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
          What each {BAND_CATEGORY_LABEL.toLowerCase()} means
        </summary>
        <ul className="mt-2 space-y-1.5">
          {[...SEGMENTS].reverse().map(s => (
            <li key={s.band} className="flex items-center gap-2 text-xs leading-relaxed">
              <span className={`flex-shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${BAND_COLOURS[s.band]}`}>
                {BAND_LABELS[s.band]}
              </span>
              <span className="text-ink-soft">{BAND_MEANING[s.band]}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
