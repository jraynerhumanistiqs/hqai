'use client'

// "The Done-in-minutes mark" - the marketing site's signature element.
// Wraps an inline phrase, draws a thin gold underline, and reveals a small
// outcome popover on hover, keyboard focus and tap. The popover styling
// mirrors the real speed marker in the product previews (gold border,
// bg-clay-soft, mono text) so the marketing flourish reads as the actual
// product feel: the everyday job, done in minutes.
//
// Used in a few deliberate spots site-wide - keep it rare so it stays the
// thing the site is remembered by.
//
// Accessibility: the wrapper is a real <button> (keyboard reachable),
// the popover is linked via aria-describedby, it dismisses on blur and
// Escape, and it respects prefers-reduced-motion (no fade transition).
//
// Copy rules: Australian English, plain hyphens only, ASCII apostrophes.

import { useEffect, useId, useRef, useState } from 'react'

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

interface Props {
  note: string
  label?: string
  children: React.ReactNode
}

export default function Cited({ note, label = 'Done in minutes', children }: Props) {
  const [open, setOpen] = useState(false)
  const reduced = usePrefersReducedMotion()
  const id = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)

  // Dismiss on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Wrapper is `inline` (not inline-block) so the phrase flows with the
  // sentence and trailing punctuation stays attached - an inline-block
  // here orphans a following "." onto its own line. `relative` still
  // anchors the popover. The gold underline alone marks the citation; the
  // old superscript glyph scaled badly at display sizes, so it is gone.
  return (
    <span ref={wrapRef} className="relative inline">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="group cursor-help rounded-sm font-[inherit] text-[inherit] leading-[inherit] text-clay underline decoration-clay decoration-2 underline-offset-[6px] transition-colors hover:text-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
      >
        {children}
      </button>

      {/* Outcome popover - styled like the product speed/done marker. */}
      <span
        id={id}
        role="tooltip"
        className={[
          'pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-[15rem] -translate-x-1/2',
          reduced ? '' : 'transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        <span className="block whitespace-normal rounded-xl border border-clay border-l-2 border-l-clay bg-clay-soft px-3 py-2 text-left shadow-popover">
          <span className="flex items-center gap-1.5">
            {/* Clock glyph - the everyday job, done in minutes. */}
            <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-clay">
              <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M6 3.4V6l1.7 1" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-clay">
              {label}
            </span>
          </span>
          <span className="mt-1 block font-mono text-[11px] leading-snug text-ink">{note}</span>
        </span>
      </span>
    </span>
  )
}
