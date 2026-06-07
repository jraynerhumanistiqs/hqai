'use client'

// Mobile-only sticky bottom bar. Twin CTAs (trial + reserve). Fades in
// after the user scrolls past 60% of the page. Uses an IntersectionObserver
// watching a sentinel placed near the 60% mark instead of a scroll
// listener, per the brief's "use IntersectionObserver, not a scroll
// listener" rule.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface Props {
  onReserve: () => void
}

export default function StickyMobileCta({ onReserve }: Props) {
  const [visible, setVisible] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Place a sentinel at ~60% of the document height. We re-position it
    // each time the document resizes so it tracks the true page depth.
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const positionSentinel = () => {
      const h = document.documentElement.scrollHeight
      sentinel.style.top = `${Math.floor(h * 0.6)}px`
    }
    positionSentinel()
    const ro = new ResizeObserver(positionSentinel)
    ro.observe(document.documentElement)

    const io = new IntersectionObserver((entries) => {
      const e = entries[0]
      // When the sentinel has scrolled into view (i.e. the user has
      // scrolled past 60% of the page), reveal the bar.
      if (e.isIntersecting) setVisible(true)
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 })

    io.observe(sentinel)
    return () => { io.disconnect(); ro.disconnect() }
  }, [])

  return (
    <>
      {/* Invisible sentinel positioned at ~60% page depth. */}
      <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute left-0 h-px w-px" />
      <div
        className={[
          'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-elevated/95 px-4 py-3 backdrop-blur transition-opacity duration-300 md:hidden',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0',
          'pb-safe',
        ].join(' ')}
      >
        <div className="mx-auto flex max-w-md items-center gap-2">
          <Link
            href="/signup"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-clay px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            Start the trial
          </Link>
          <button
            type="button"
            onClick={onReserve}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-accent bg-transparent px-4 text-sm font-semibold text-accent hover:bg-accent-soft"
          >
            $25 doc
          </button>
        </div>
      </div>
    </>
  )
}
