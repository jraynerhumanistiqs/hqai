// Public /pricing page - the pricing block + FAQ in the shared chrome.

import type { Metadata } from 'next'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'
import PricingPageClient from '@/components/landing/PricingPageClient'

export const metadata: Metadata = {
  title: 'HQ.ai pricing - from $89/month, or one document from $25',
  description:
    'Simple Australian pricing. Solo $89/mo, Business $249/mo, Foundation 100 lock-in, or buy a single HR document from $25 with no subscription. 14-day free trial, no card.',
  alternates: { canonical: '/pricing' },
  robots: { index: true, follow: true },
}

export default function PricingPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <section className="mx-auto max-w-6xl px-6 pt-16 md:px-10 md:pt-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">Pricing</p>
          <h1 className="max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[52px]">
            Pricing that fits a business, not a finance team.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Subscribe for the lot, or buy one document at a time. Every plan starts with a 14-day free
            trial - no card required.
          </p>
        </section>
        <PricingPageClient />
      </main>
      <MarketingFooter />
    </>
  )
}
