'use client'

// Animated HQ People chat preview - the landing page's "signature moment"
// from the research brief. Cycles through a few real Fair Work questions,
// crossfading each question + cited answer. Auto-advances, pauses on
// hover/focus, and honours prefers-reduced-motion (no auto-cycle; the
// dots become manual controls).
//
// Copy rules: Australian English, plain hyphens only, no competitor
// names, ASCII apostrophes. Answers are illustrative, grounded in the
// Fair Work Act / NES - not legal advice.

import { useEffect, useRef, useState } from 'react'

interface Exchange {
  q: string
  a: string
  cite: string
}

const EXCHANGES: Exchange[] = [
  {
    q: 'Can I let someone go during probation?',
    a: 'Yes, with notice under the NES - usually one week if they have been with you under a year. Check your Award for anything extra.',
    cite: 's 117 Fair Work Act 2009',
  },
  {
    q: 'What notice does a casual get?',
    a: 'A true casual on an irregular basis is not entitled to notice under the NES. If the work has become regular and systematic, the Award may require it.',
    cite: 's 123 Fair Work Act 2009',
  },
  {
    q: 'How much annual leave do full-timers accrue?',
    a: 'Four weeks a year under the NES, accruing progressively from day one - plus an extra week for some shift workers.',
    cite: 's 87 Fair Work Act 2009',
  },
  {
    q: 'Do I have to pay out unused annual leave?',
    a: 'Yes. On termination, accrued but unused annual leave is paid out under the NES, at the rate the employee would have received.',
    cite: 's 90 Fair Work Act 2009',
  },
]

const DWELL_MS = 4800

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

export default function HeroChatPreview() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (reduced || paused) return
    timer.current = setInterval(() => {
      setActive((i) => (i + 1) % EXCHANGES.length)
    }, DWELL_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [reduced, paused])

  return (
    <div
      className="rounded-3xl border border-border bg-bg-elevated p-5 shadow-float"
      role="group"
      aria-label="HQ People - example Fair Work answers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">HQ People</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-ink-muted">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          Live
        </span>
      </div>

      {/* Crossfade stage. Fixed min height so cards swap without shifting
          the surrounding layout. */}
      <div className="relative mt-4 min-h-[208px]">
        {EXCHANGES.map((ex, i) => (
          <div
            key={i}
            aria-hidden={i !== active}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === active ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {/* Question bubble */}
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm border border-accent bg-accent-soft px-3 py-2 text-xs text-ink">
              {ex.q}
            </div>
            {/* Answer bubble */}
            <div className="mt-2 w-fit max-w-[92%] rounded-2xl rounded-tl-sm bg-bg px-3 py-2.5">
              <p className="text-xs leading-relaxed text-ink">{ex.a}</p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-clay bg-clay-soft px-2.5 py-1 text-[10px] font-medium text-clay">
                <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3">
                  <path fill="currentColor" d="M6 1l1.5 3 3.3.5-2.4 2.3.6 3.3L6 8.5l-3 1.6.6-3.3L1.2 4.5l3.3-.5z" />
                </svg>
                Cited: {ex.cite}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress dots - also manual controls (the only way to advance
          under reduced motion). */}
      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3" role="tablist" aria-label="Example questions">
        {EXCHANGES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Example ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? 'w-6 bg-accent' : 'w-1.5 bg-border hover:bg-ink-muted'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
