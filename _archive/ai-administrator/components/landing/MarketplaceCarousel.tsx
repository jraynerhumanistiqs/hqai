'use client'

// Section 5: the pay-as-you-go marketplace tease.
//
// Reworked June 2026 to mirror the pricing page's pay-as-you-go UI: a
// category carousel of example document TYPES on the left (the same
// DOC_CATEGORIES pattern PricingSection uses), and a faux document
// preview mock card on the right so it "shows an example" cleanly rather
// than listing a flat catalogue. Lighter than the pricing page. The
// primary CTA points to the new /marketplace page.
//
// Copy rules: Australian English, plain hyphens only, ASCII apostrophes.

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Example document TYPES, grouped by the most commonly requested HR
// categories - lifted lighter from the pricing page so the two surfaces
// read as one system.
const DOC_CATEGORIES: { title: string; docs: string[] }[] = [
  {
    title: 'Hiring and onboarding',
    docs: ['Letters of offer', 'Employment contracts', 'Position descriptions', 'Onboarding checklists'],
  },
  {
    title: 'Performance management',
    docs: ['Probation outcome letters', 'Performance plans', 'Performance improvement plans', 'Warning letters'],
  },
  {
    title: 'Everyday people admin',
    docs: ['Workplace policies', 'Flexible work agreements', 'Casual conversion letters', 'Leave request forms'],
  },
  {
    title: 'Offboarding',
    docs: ['Resignation acknowledgements', 'Termination letters', 'Reference check requests', 'Exit checklists'],
  },
]

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

export default function MarketplaceCarousel() {
  const [cat, setCat] = useState(0)
  const reduced = usePrefersReducedMotion()
  const activeCat = DOC_CATEGORIES[cat]
  const moveCat = (dir: 1 | -1) => setCat((c) => (c + dir + DOC_CATEGORIES.length) % DOC_CATEGORIES.length)

  return (
    <section id="marketplace" className="bg-bg py-14 md:py-20" aria-labelledby="marketplace-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          Pay-as-you-go - launching soon
        </p>
        <h2 id="marketplace-heading" className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
          Just need one document today? From $39.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          Buy a single HR document without a subscription. Answer a few questions and it is ready to sign in three minutes.
        </p>

        {/* Two columns: category carousel left, mock document preview right. */}
        <div className="mt-10 grid items-stretch gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Category carousel - mirrors the pricing page pattern. */}
          <div className="flex flex-col rounded-3xl border border-border bg-bg-soft p-7 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Examples you can buy</p>
            <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
              The documents employers ask for most
            </h3>

            <div className="mt-6 rounded-2xl border border-border bg-bg p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  {activeCat.title}
                </p>
                <div className="flex items-center gap-1.5">
                  <CarouselBtn dir="prev" onClick={() => moveCat(-1)} />
                  <CarouselBtn dir="next" onClick={() => moveCat(1)} />
                </div>
              </div>

              <ul key={cat} className={['mt-4 grid min-h-[140px] grid-cols-2 gap-x-4 gap-y-2.5', reduced ? '' : 'cat-fade'].join(' ')}>
                {activeCat.docs.map((d) => (
                  <li key={d} className="flex items-start gap-2.5">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden>
                      <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
                    </svg>
                    <span className="text-sm leading-snug text-ink-soft">{d}</span>
                  </li>
                ))}
              </ul>

              {/* Dots */}
              <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3" role="tablist" aria-label="Document categories">
                {DOC_CATEGORIES.map((c, i) => (
                  <button
                    key={c.title}
                    type="button"
                    role="tab"
                    aria-selected={i === cat}
                    aria-label={c.title}
                    onClick={() => setCat(i)}
                    className={`h-1.5 rounded-full transition-all ${i === cat ? 'w-6 bg-ink-soft' : 'w-1.5 bg-border hover:bg-ink-muted'}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/marketplace"
                className="inline-flex h-11 items-center justify-center rounded-full border border-ink px-6 text-sm font-semibold text-ink transition-colors hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Browse the document marketplace -&gt;
              </Link>
            </div>
          </div>

          {/* Mock document preview - a believable mini document, not a black box. */}
          <aside className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-6 shadow-card md:p-7">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Employment Contract</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-bg-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
                  <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
                </svg>
                Ready to sign
              </span>
            </div>

            {/* Faux document surface - light sheet, letterhead bar, placeholder lines. */}
            <div className="mt-4 flex-1 rounded-2xl border border-border bg-white p-5 shadow-sm">
              {/* Letterhead bar */}
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded-sm bg-clay/70" />
                <div className="h-2 w-10 rounded-sm bg-black/15" />
              </div>
              <div className="mt-5 h-3 w-2/5 rounded-sm bg-black/70" />
              <div className="mt-4 space-y-2.5">
                <div className="h-2 w-full rounded-sm bg-black/15" />
                <div className="h-2 w-11/12 rounded-sm bg-black/15" />
                <div className="h-2 w-full rounded-sm bg-black/15" />
                <div className="h-2 w-4/5 rounded-sm bg-black/15" />
              </div>
              <div className="mt-5 h-2.5 w-1/3 rounded-sm bg-black/50" />
              <div className="mt-3 space-y-2.5">
                <div className="h-2 w-full rounded-sm bg-black/15" />
                <div className="h-2 w-10/12 rounded-sm bg-black/15" />
                <div className="h-2 w-3/5 rounded-sm bg-black/15" />
              </div>
              {/* Signature line */}
              <div className="mt-6 flex items-end gap-3">
                <div className="h-px w-24 bg-black/30" />
                <div className="h-2 w-12 rounded-sm bg-black/15" />
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              A believable preview - your real document arrives filled in with your details.
            </p>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .cat-fade { animation: catFade 320ms ease-out both; }
        @keyframes catFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .cat-fade { animation: none; } }
      `}</style>
    </section>
  )
}

function CarouselBtn({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous category' : 'Next category'}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-ink-soft transition-colors hover:border-ink hover:text-ink"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dir === 'prev' ? <path d="M10 3 5 8l5 5" /> : <path d="M6 3l5 5-5 5" />}
      </svg>
    </button>
  )
}
