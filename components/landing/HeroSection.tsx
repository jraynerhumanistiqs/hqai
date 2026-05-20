'use client'

// Section 1: hero. Decision-making narrative pass (May 2026 rewrite).
//
// Layout: copy block on the left, split-screen STATIC two-product mock
// on the right - HQ People chat-preview card AND HQ Recruit CV-scoring
// scorecard card visible together above the fold. No animation cycle.
// Both products get equal pixel real estate so the page treats them as
// sibling pillars from the first scroll.

import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-heading">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-[1fr_1.1fr] md:gap-12 md:px-10 md:pb-28 md:pt-24 lg:gap-16">
        {/* Left: copy block */}
        <div className="max-w-xl">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
            For Australian businesses under 250 staff
          </p>
          <h1
            id="hero-heading"
            className="font-serif text-[40px] leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-[56px]"
          >
            Make HR and hiring decisions you can stand behind.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft md:text-xl">
            HQ.ai is the decision-making layer for people, compliance and hiring. Save the hours, skip the second-guessing, stop overpaying for advice.
          </p>

          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start the 14-day trial
            </Link>
            <a
              href="#marketplace"
              className="inline-flex h-12 items-center justify-center rounded-full border border-accent bg-transparent px-6 text-sm font-medium text-accent transition-colors hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              See pay-as-you-go documents -&gt;
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-muted">No card. Three minutes to first document.</p>
        </div>

        {/* Right: split-screen still life - HQ People + HQ Recruit, equal weight */}
        <div className="relative w-full">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* HQ People preview */}
            <div
              className="rounded-3xl border border-border bg-bg-elevated p-5 shadow-float"
              role="group"
              aria-label="HQ People preview"
            >
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">HQ People</span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="rounded-2xl border border-border bg-bg px-3 py-2 text-xs text-ink-soft">
                  Can I fire someone in probation?
                </div>
                <div className="rounded-2xl border border-accent bg-accent-soft px-3 py-2 text-xs text-ink">
                  What&apos;s the notice period for a casual?
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-bg p-3">
                <p className="text-xs leading-relaxed text-ink">
                  A true casual on an irregular basis is not entitled to notice under the NES. If they&apos;ve become regular and systematic, the Award may require notice.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent bg-bg-elevated px-2.5 py-1 text-[10px] font-medium text-accent">
                  <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3"><path fill="currentColor" d="M6 1l1.5 3 3.3.5-2.4 2.3.6 3.3L6 8.5l-3 1.6.6-3.3L1.2 4.5l3.3-.5z" /></svg>
                  Cited: s 123 Fair Work Act 2009
                </div>
              </div>
            </div>

            {/* HQ Recruit preview - CV scorecard */}
            <div
              className="rounded-3xl border border-border bg-bg-elevated p-5 shadow-float"
              role="group"
              aria-label="HQ Recruit preview"
            >
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">HQ Recruit</span>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Candidate</p>
                  <p className="font-serif text-base text-ink">Sarah K.</p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-2xl text-ink">4.2<span className="text-sm text-ink-muted"> / 5</span></p>
                  <span className="mt-1 inline-flex rounded-full border border-accent bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">Strong yes</span>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  { label: 'Experience', score: 88 },
                  { label: 'Communication', score: 82 },
                  { label: 'Role fit', score: 74 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-[11px] text-ink-soft">
                      <span>{row.label}</span>
                      <span className="tabular-nums">{row.score}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${row.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
