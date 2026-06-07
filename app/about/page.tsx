// Public /about - the Humanistiqs story + the team, in the shared chrome.
// Reuses FounderNote for the director grid.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'
import FounderNote from '@/components/landing/FounderNote'
import FooterCta from '@/components/landing/FooterCta'

export const metadata: Metadata = {
  title: 'About HQ.ai - the Humanistiqs team behind the AI HR advisor',
  description:
    'HQ.ai is built by Humanistiqs, an Australian HR and recruitment consultancy with 80+ years of combined director experience. AI plus human judgement, grounded in Australian employment law.',
  alternates: { canonical: '/about' },
  robots: { index: true, follow: true },
}

const VALUES = [
  { t: 'AI plus HQ', d: 'Artificial intelligence for leverage, human intelligence and judgement for the calls that matter. The handoff is the point, not an afterthought.' },
  { t: 'Cite the source', d: 'Every answer points to the Fair Work Act, the NES or your Modern Award. No black box, no hand-waving.' },
  { t: 'Australian only', d: 'We do one thing properly: Australian employment law for businesses under 250 staff. No imported playbooks.' },
  { t: 'No lock-in', d: 'Cancel any time. We earn the next month by being useful, not by trapping you in a multi-year contract.' },
]

export default function AboutPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pt-16 md:px-10 md:pt-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">About</p>
          <h1 className="max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]">
            Unlocking human potential - with AI doing the heavy lifting.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
            HQ.ai is the product arm of Humanistiqs, an Australian management and HR consultancy. We
            spent years giving small businesses practical advice on strategy, structure, people and
            performance. HQ.ai puts that same advice in your pocket - grounded in the law, available
            any time, with our team behind it.
          </p>
        </section>

        {/* Values */}
        <section className="bg-bg py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <div className="grid gap-8 sm:grid-cols-2 md:gap-10">
              {VALUES.map((v) => (
                <div key={v.t} className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card">
                  <h3 className="font-display text-lg font-bold tracking-tight text-ink">{v.t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The team + the why (reused) */}
        <FounderNote />

        <section className="bg-bg py-12 text-center md:py-16">
          <div className="mx-auto max-w-2xl px-6 md:px-10">
            <p className="text-base text-ink-soft">
              Want the human layer too?{' '}
              <Link href="/enterprise" className="font-semibold text-accent hover:underline">
                Explore HQ.ai Enterprise
              </Link>{' '}
              - a dedicated Humanistiqs advisor or talent partner, with the AI as their leverage.
            </p>
          </div>
        </section>

        <FooterCta />
      </main>
      <MarketingFooter />
    </>
  )
}
