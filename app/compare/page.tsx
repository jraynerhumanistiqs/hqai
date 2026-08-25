// Public /compare - "Why businesses switch to HQ.ai". A comparison, not an
// attack. DELIBERATELY DE-IDENTIFIED: the left column only ever makes
// general statements about the traditional outsourced-HR model - no named
// competitor, no penalty/regulator references, no third-party review scores.
// Every HQ.ai claim is true today and its prices are imported from
// lib/pricing-config.ts so they never drift.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'
import { PRICING, C10_SELF_SERVE } from '@/lib/pricing-config'

export const metadata: Metadata = {
  title: 'Why businesses switch to HQ.AI - HR support without the lock-in',
  description:
    'Comparing HQ.ai with the traditional outsourced-HR model: contract length, wait times, pricing transparency and how fast you can get started.',
  alternates: { canonical: '/compare' },
  robots: { index: true, follow: true },
}

const peopleFrom = C10_SELF_SERVE.people.bands[0].monthly // 59
const recruitFrom = C10_SELF_SERVE.recruit.standaloneMonthly // 65
const bundleFrom = C10_SELF_SERVE.bundle.solo.monthly // 89
const hr365From = PRICING.enterprise.variants[0].priceMonthlyDisplay // 799

const ROWS: { dimension: string; traditional: string; hqai: string }[] = [
  {
    dimension: 'Contract',
    traditional: 'Often a multi-year agreement',
    hqai: 'Month-to-month, cancel any time',
  },
  {
    dimension: 'Getting started',
    traditional: 'Sales call, consultation, onboarding',
    hqai: 'Sign up and start in minutes',
  },
  {
    dimension: 'Everyday answers',
    traditional: 'Phone an advice line and wait your turn',
    hqai: 'Ask the AI, answered in seconds, any hour',
  },
  {
    dimension: 'Pricing',
    traditional: 'Quoted on a sales call',
    hqai: `Published on our pricing page, from $${peopleFrom}/mo`,
  },
  {
    dimension: 'The hard calls',
    traditional: 'Depends on your plan and who picks up',
    hqai: 'A real Humanistiqs advisor - on HR365, the same person every time',
  },
  {
    dimension: 'Hiring tools',
    traditional: 'Often separate or not included',
    hqai: `HQ Recruit built in or standalone from $${recruitFrom}/mo`,
  },
]

export default function ComparePage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        {/* Hero */}
        <section className="bg-bg py-14 md:py-20" aria-labelledby="compare-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              Compare
            </p>
            <h1
              id="compare-heading"
              className="max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]"
            >
              HR support should not need a long contract and a call queue.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
              Traditional outsourced-HR providers built their model in a different era: multi-year
              agreements, phone-based advice, pricing you only learn on a sales call. HQ.ai was built
              to be the opposite - self-serve, month-to-month, priced in the open. Here is the honest
              comparison.
            </p>
          </div>
        </section>

        {/* Comparison table */}
        <section className="bg-bg pb-6" aria-label="Side by side comparison">
          <div className="mx-auto max-w-4xl px-6 md:px-10">
            <div className="overflow-hidden rounded-2xl border border-border bg-bg-soft">
              {/* Header row - hidden on mobile, where each row self-labels */}
              <div className="hidden grid-cols-3 gap-4 border-b border-border px-6 py-4 md:grid">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Dimension</p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Traditional outsourced HR</p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">HQ.ai</p>
              </div>
              {ROWS.map((row) => (
                <div
                  key={row.dimension}
                  className="grid grid-cols-1 gap-2 border-b border-border px-6 py-5 last:border-b-0 md:grid-cols-3 md:gap-4"
                >
                  <p className="text-sm font-semibold text-ink">{row.dimension}</p>
                  <p className="text-[15px] leading-relaxed text-ink-soft">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted md:hidden">Traditional: </span>
                    {row.traditional}
                  </p>
                  <p className="text-[15px] font-medium leading-relaxed text-ink">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-clay md:hidden">HQ.ai: </span>
                    {row.hqai}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              All HQ.ai figures are current and match our pricing page. The left column describes the
              traditional outsourced-HR model in general - not any single provider.
            </p>
          </div>
        </section>

        {/* Prose sections */}
        <section className="bg-bg pb-6" aria-label="Why it matters">
          <div className="mx-auto max-w-3xl space-y-12 px-6 md:px-10 pt-8">
            <article>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                No lock-in. We have to earn your next month.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                The traditional model asks you to commit for years before you know if the service
                fits. We think that is backwards. HQ.ai is month-to-month on every self-serve plan:
                if we stop being useful, you stop paying. That keeps the pressure exactly where it
                belongs - on us.
              </p>
            </article>

            <article>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                Seconds, not hold music.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                When a staffing question lands, you want an answer while the problem is in front of
                you - not after a callback. HQ.ai answers everyday questions in seconds, at 6am before
                open or 11pm after close. And when a question is genuinely hard, it says so and brings
                in our human team rather than bluffing.
              </p>
            </article>

            <article>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                Our prices are on the website. That is the whole trick.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                HQ People from ${peopleFrom}/mo. HQ Recruit from ${recruitFrom}/mo. HQ Business from
                ${bundleFrom}/mo. HR365 with a dedicated advisor from ${hr365From.toLocaleString('en-AU')}/mo.
                It is all on the pricing page, and the price you see is the price you pay - unlimited
                logins, no per-seat charges, no surprise extras.
              </p>
            </article>

            <article>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                To be fair.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                An honest comparison cuts both ways. If you want someone else to handle everything end
                to end and you are comfortable with the commitment that comes with it, a full-service
                provider can be the right fit. And parts of what some of them offer - like
                insurance-backed products - are things we do not sell.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                That is why we built HR365 and Recruit365: the same done-for-you feel, a dedicated
                advisor who knows your business, without the multi-year handcuffs.
              </p>
            </article>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-bg py-14 md:py-20" aria-label="Try the other model">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <div className="rounded-3xl border border-border bg-bg-soft p-8 md:p-10">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Try the other model.
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                No sales call, no contract, no risk. Sign up, use it for a month, and judge us on
                whether we made your week lighter.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-clay px-6 py-3 text-sm font-bold text-clay-ink transition-colors hover:bg-clay-hover"
                >
                  Get started
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink"
                >
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
