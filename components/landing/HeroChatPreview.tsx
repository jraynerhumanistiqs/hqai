'use client'

// HQ People chat preview - the landing page's "signature moment" from the
// research brief. A few everyday HR questions, each with its answer and a
// small speed marker; the dots below switch between them and the cards
// crossfade on the way.
//
// VISITOR-DRIVEN ONLY - do not reintroduce auto-advance. It used to cycle
// every 4.8s, which WCAG 2.2.2 treats as moving content needing a pause,
// stop or hide mechanism once it runs past five seconds. The dots were
// technically that mechanism, but a row of 6px dots is not a pause button
// anyone recognises, and on touch the card swapped under a reader
// mid-sentence. Nov 2026, after the Web Interface Guidelines audit and in
// step with the same change on ToolExplorer - see
// docs/audits/web-interface-guidelines.md.
//
// There is no prefers-reduced-motion branch left to carry: nothing moves
// until the visitor asks it to, and the global reduce-motion block in
// app/globals.css already collapses the crossfade. Note that the resting
// state here is the FIRST exchange fully rendered, not a blank card -
// visibility never depends on an animation running (CLAUDE.md).
//
// Copy rules: Australian English, plain hyphens only, no competitor
// names, ASCII apostrophes. Answers are illustrative and helpful, in
// plain English - not legal advice.

import { useState } from 'react'

interface Exchange {
  q: string
  a: string
  marker: string
}

const EXCHANGES: Exchange[] = [
  {
    q: 'Can I let someone go during probation?',
    a: 'Yes, with notice - usually one week if they have been with you under a year. Your award may add to that - we will flag it.',
    marker: 'Answered in seconds',
  },
  {
    q: 'What notice does a casual get?',
    a: 'A true casual on an irregular basis usually gets none. If the work has become regular and systematic, your award may add to that - we will flag it.',
    marker: 'Answered in seconds',
  },
  {
    q: 'How much annual leave do full-timers accrue?',
    a: 'Four weeks a year, building up from day one - plus an extra week for some shift workers.',
    marker: 'Answered in seconds',
  },
  {
    q: 'Do I have to pay out unused annual leave?',
    a: 'Yes. When someone leaves, their unused annual leave is paid out, at the rate they would have been paid.',
    marker: 'Answered in seconds',
  },
]

export default function HeroChatPreview() {
  const [active, setActive] = useState(0)

  return (
    <div
      className="rounded-3xl border border-border bg-bg-elevated p-5 shadow-float"
      role="group"
      aria-label="HQ People - example HR answers"
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
                  <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1" />
                  <path d="M6 3.4V6l1.7 1" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {ex.marker}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The dots are the only way to change the card, now that nothing
          advances on its own.

          Nov 2026 - two fixes here:
          1. role="tablist"/"tab" promised the tabs pattern without
             aria-controls, without a role="tabpanel" and without arrow-key
             navigation. Plain buttons carrying aria-current describe what
             these actually are, so nothing is advertised that is not
             implemented.
          2. The dot WAS the button, so the inactive hit target was 6x6 px
             (WCAG 2.5.8 wants 24x24). The button is now a 24px-tall
             padded target and the dot is a child span, so the visual is
             unchanged and the tappable area clears the minimum. The
             negative margin keeps the row's original height. */}
      <div className="-ml-[3px] mt-3 flex items-center border-t border-border pt-3" aria-label="Example questions" role="group">
        {EXCHANGES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-current={i === active ? 'true' : undefined}
            aria-label={`Example ${i + 1}`}
            onClick={() => setActive(i)}
            className="-my-[9px] flex h-6 items-center px-[3px] py-[9px]"
          >
            <span
              aria-hidden
              className={`block h-1.5 rounded-full transition-[width,background-color] ${
                i === active ? 'w-6 bg-accent' : 'w-1.5 bg-border hover:bg-ink-muted'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
