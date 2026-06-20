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
    'HQ.ai is built by Humanistiqs, an Australian HR and recruitment consultancy with 80+ years of combined director experience. Smart AI, real people, and the Fair Work Act rules built in.',
  alternates: { canonical: '/about' },
  robots: { index: true, follow: true },
}

const VALUES = [
  { t: 'AI plus real people', d: 'AI does the quick stuff fast. Our people handle the calls that matter. You always get a human when you need one.' },
  { t: 'Cite the source', d: 'Every answer shows where it comes from. The Fair Work Act or your award. No guessing, no fine print.' },
  { t: 'Australian only', d: 'We do one thing well. Australian workplace law for businesses under 250 staff. Nothing borrowed from overseas.' },
  { t: 'No lock-in', d: 'Cancel any time. We earn your next month by being useful. No long contract to trap you.' },
]

export default function AboutPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pt-16 md:px-10 md:pt-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">About</p>
          <h1 className="max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]">
            Bring out the best in your people. Let AI do the hard yards.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
            HQ.ai is made by Humanistiqs, an Australian HR and management consultancy. For years we
            gave small businesses real advice on people, structure and performance. Now you get that
            same advice in your pocket. It knows the law, it is there any time, and our team stands
            behind it.
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
              Want a real person on your side too?{' '}
              <Link href="/enterprise" className="font-semibold text-accent hover:underline">
                Explore HQ.ai Enterprise
              </Link>{' '}
              - your own Humanistiqs advisor or talent partner, backed by the AI.
            </p>
          </div>
        </section>

        <FooterCta />
      </main>
      <MarketingFooter />
    </>
  )
}
