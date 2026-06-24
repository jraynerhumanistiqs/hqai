'use client'

// "The Cited Answer" - the marketing site's signature element. Wraps an
// inline phrase, draws a thin gold underline plus a small superscript
// dagger marker, and reveals a citation popover on hover, keyboard focus
// and tap. The popover styling mirrors the real citation chip in
// HeroChatPreview.tsx (gold border, bg-clay-soft, mono text) so the
// marketing flourish reads as the actual product feature.
//
// Used in EXACTLY four deliberate spots site-wide - keep it rare so it
// stays the thing the site is remembered by.
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
  statute: string
  children: React.ReactNode
}

export default function Cited({ statute, children }: Props) {
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

  return (
    <span ref={wrapRef} className="relative inline-block whitespace-nowrap">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="group cursor-help whitespace-normal rounded-sm font-[inherit] text-[inherit] leading-[inherit] text-clay underline decoration-clay decoration-2 underline-offset-[6px] transition-colors hover:text-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
      >
        {children}
        <sup aria-hidden className="ml-0.5 align-super font-mono text-[0.6em] text-clay">
          &dagger;
        </sup>
      </button>

      {/* Citation popover - styled like the product citation chip. */}
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
            <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-clay">
              <path fill="currentColor" d="M6 1l1.5 3 3.3.5-2.4 2.3.6 3.3L6 8.5l-3 1.6.6-3.3L1.2 4.5l3.3-.5z" />
            </svg>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-clay">
              Cited
            </span>
          </span>
          <span className="mt-1 block font-mono text-[11px] leading-snug text-ink">{statute}</span>
        </span>
      </span>
    </span>
  )
}
