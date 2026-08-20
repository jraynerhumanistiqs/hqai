// Public /marketplace - a holding page in the shared marketing chrome.
// The route is kept (it is linked from the header and footer) but there is
// nothing to sell here yet, so the body is a plain "coming soon" panel.
// Noindex while it is a stub; flip robots back to index when there is real
// content to rank. This page supplies its own <main> landmark and the
// min-height that keeps the footer at the bottom.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'

export const metadata: Metadata = {
  title: 'HQ.ai Marketplace - coming soon',
  description:
    'The HQ.ai marketplace is not open yet. In the meantime, HQ People answers your everyday HR questions and HQ Recruit handles your hiring.',
  alternates: { canonical: '/marketplace' },
  robots: { index: false, follow: true },
}

export default function MarketplacePage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <section className="mx-auto max-w-3xl px-6 py-20 md:px-10 md:py-28" aria-labelledby="marketplace-heading">
          <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
            <span aria-hidden className="h-px w-5 bg-clay" />
            Marketplace
          </p>
          <h1
            id="marketplace-heading"
            className="font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[52px]"
          >
            Coming soon.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            We are still building this one. When it is ready, it will be here.
          </p>

          <div className="mt-10 rounded-2xl border border-border bg-bg-soft p-7 md:p-8">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink">
              What you can use today
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              HQ People answers your everyday HR questions in plain English, and a real advisor steps
              in for the hard calls. HQ Recruit runs your hiring, from the job ad to a clean
              shortlist.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center justify-center rounded-full bg-clay px-6 text-sm font-semibold text-ink-on-accent transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                See pricing
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-full border border-ink px-6 text-sm font-medium text-ink transition-colors hover:bg-bg-soft"
              >
                Talk to us -&gt;
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
