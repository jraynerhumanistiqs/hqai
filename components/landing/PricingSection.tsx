'use client'

// Section 7: pricing. Two columns - subscription (3 tiers, Growth
// highlighted) on the left, marketplace re-statement on the right.

import Link from 'next/link'

interface Props {
  onReserve: () => void
}

const PLANS = [
  {
    name: 'Essentials',
    price: '$99',
    blurb: 'For the owner-operator handling HR on the side.',
    features: ['3 seats', 'AI advisor + 33 templates', 'Email + advisor handoff'],
    cta: 'Start the 14-day trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$199',
    blurb: 'For the growing team that needs HR every week.',
    features: ['6 seats', 'AI advisor + Recruit prescreen', 'Priority advisor handoff'],
    cta: 'Start the 14-day trial',
    highlighted: true,
  },
  {
    name: 'Scale',
    price: '$379',
    blurb: "For the SME that's outgrown DIY HR.",
    features: ['12 seats', 'Everything in Growth', 'Advisor hours included'],
    cta: 'Start the 14-day trial',
    highlighted: false,
  },
]

export default function PricingSection({ onReserve }: Props) {
  return (
    <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <h2 id="pricing-heading" className="font-serif text-3xl leading-tight tracking-tight text-ink md:text-[40px]">
          Two ways to start.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
          Subscribe for the lot, or buy one document at a time.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* LEFT: subscription tiers */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">If you&apos;ve got HR work every week</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {PLANS.map((p) => (
                <article
                  key={p.name}
                  className={[
                    'flex flex-col rounded-3xl border p-6 transition-shadow',
                    p.highlighted
                      ? 'border-accent bg-bg-elevated shadow-float'
                      : 'border-border bg-bg-elevated shadow-card',
                  ].join(' ')}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-serif text-xl text-ink">{p.name}</h3>
                    {p.highlighted && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-on-accent">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-ink">
                    {p.price}<span className="ml-1 text-sm font-normal text-ink-muted">/month</span>
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">{p.blurb}</p>
                  <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden><path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={[
                      'mt-6 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors',
                      p.highlighted
                        ? 'bg-accent text-ink-on-accent hover:bg-accent-hover'
                        : 'border border-border text-ink hover:bg-bg-soft',
                    ].join(' ')}
                  >
                    {p.cta} -&gt;
                  </Link>
                </article>
              ))}
            </div>
          </div>

          {/* RIGHT: marketplace re-statement */}
          <aside className="rounded-3xl border border-border bg-bg-elevated p-7 shadow-card">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">If you just need one thing today</p>
            <h3 className="mt-2 font-serif text-2xl text-ink">From $15. No subscription. Pay once.</h3>
            <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-2">
              <li className="rounded-xl bg-bg-soft px-3 py-2"><strong className="text-ink">Letter of Offer</strong> - from $25</li>
              <li className="rounded-xl bg-bg-soft px-3 py-2"><strong className="text-ink">Termination Letter</strong> - from $45</li>
              <li className="rounded-xl bg-bg-soft px-3 py-2"><strong className="text-ink">First-and-Final Warning</strong> - from $35</li>
              <li className="rounded-xl bg-bg-soft px-3 py-2"><strong className="text-ink">Position Description</strong> - from $29</li>
            </ul>
            <button
              type="button"
              onClick={onReserve}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full border border-accent bg-transparent px-5 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
            >
              Reserve the $25 Letter of Offer -&gt;
            </button>
            <p className="mt-3 text-xs text-ink-muted">First 100 reservations get $10 off launch pricing.</p>
          </aside>
        </div>
      </div>
    </section>
  )
}
