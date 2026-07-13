'use client'

// Section 1: hero. June 2026 frontend-design pass.
//
// The HQ People chat preview is the star: one orchestrated load reveal
// runs on mount (eyebrow + headline, then subhead + CTAs, then the
// headline outcome underline draws last). The HQ Recruit scorecard is
// demoted to a small, quiet secondary tile beneath it. The hero surface
// is a clean dark slab - no watermark texture.
//
// prefers-reduced-motion renders the final state instantly (no reveal).
//
// Copy rules: Australian English, plain hyphens only, ASCII apostrophes.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import HeroChatPreview from './HeroChatPreview'
import Cited from './Cited'

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

export default function HeroSection() {
  const reduced = usePrefersReducedMotion()
  // Reveal stage: 0 nothing, 1 eyebrow+headline, 2 subhead+CTAs,
  // 3 headline underline draws. The chat preview runs its own reveal.
  const [stage, setStage] = useState(reduced ? 3 : 0)

  useEffect(() => {
    if (reduced) {
      setStage(3)
      return
    }
    const t1 = setTimeout(() => setStage(1), 80)
    const t2 = setTimeout(() => setStage(2), 480)
    const t3 = setTimeout(() => setStage(3), 1600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [reduced])

  const reveal = (active: boolean) =>
    reduced
      ? ''
      : `transition-all duration-700 ease-smooth ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-heading">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-14 pt-8 md:grid-cols-[1fr_1.05fr] md:gap-12 md:px-10 md:pb-20 md:pt-12 lg:gap-16">
        {/* Left: copy block.
            relative z-20 lifts this column's stacking context above the
            right-hand preview column. Both columns get a transform from the
            reveal animation, so each is its own stacking context painting in
            DOM order - without this the HQ People card (later in the DOM)
            covers the "busywork off your plate" popover where it opens into
            the gap between the columns. */}
        <div className="relative z-20 max-w-xl">
          <p className={`mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay ${reveal(stage >= 1)}`}>
            <span aria-hidden className="h-px w-5 bg-clay" />
            Built for Australian small business
          </p>
          <h1
            id="hero-heading"
            className={`font-display text-[34px] font-semibold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[42px] md:text-[52px] ${reveal(stage >= 1)}`}
          >
            HR and hiring are complicated. HQ.ai makes it{' '}
            {stage >= 3 ? (
              <Cited placement="right" note="From question to finished document in about three minutes.">easy, quick and accurate.</Cited>
            ) : (
              <span className="text-clay">easy, quick and accurate.</span>
            )}
          </h1>
          <p className={`mt-6 text-lg leading-relaxed text-ink-soft md:text-xl ${reveal(stage >= 2)}`}>
            HQ.ai handles the everyday HR work and hiring processes that cost you time and money. All the questions, the admin, the documents, so the work that used to take hours or days, now takes three minutes. No HR background needed, and a real advisor is there for the hard calls. From $59/month. Cancel any time.
          </p>

          <div className={`mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4 ${reveal(stage >= 2)}`}>
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              Get started
            </Link>
            <a
              href="#marketplace"
              className="inline-flex h-12 items-center justify-center rounded-full border border-accent bg-transparent px-6 text-sm font-medium text-accent transition-colors hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              See one-off documents from $25 -&gt;
            </a>
          </div>
          <p className={`mt-4 text-sm text-ink-muted ${reveal(stage >= 2)}`}>Three minutes to your first document.</p>
        </div>

        {/* Right: HQ People is the star; HQ Recruit is a quiet secondary tile. */}
        <div className={`relative w-full ${reveal(stage >= 1)}`}>
          {/* Feature surface (Tier B) - the signature live preview. */}
          <HeroChatPreview />

          {/* HQ Recruit - quiet tile (Tier A), secondary + smaller. */}
          <div
            className="mt-4 rounded-2xl border border-border bg-bg-soft p-4"
            role="group"
            aria-label="HQ Recruit preview"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-2 w-2 rounded-full bg-ink-muted" />
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">HQ Recruit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-semibold tracking-tight text-ink">Sarah K.</span>
                <span className="font-display text-base font-semibold tracking-tight text-ink">
                  4.2<span className="text-xs font-normal text-ink-muted"> / 5</span>
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              {[
                { label: 'Experience', score: 88 },
                { label: 'Communication', score: 82 },
                { label: 'Role fit', score: 74 },
              ].map((row) => (
                <div key={row.label} className="flex-1">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-ink-muted" style={{ width: `${row.score}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-ink-muted">{row.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
