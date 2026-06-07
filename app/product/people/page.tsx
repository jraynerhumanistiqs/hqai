// Public /product/people - HQ People deep-dive page in the shared chrome.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'
import PeopleDeepDive from '@/components/landing/PeopleDeepDive'
import FooterCta from '@/components/landing/FooterCta'

export const metadata: Metadata = {
  title: 'HQ People - the AI HR advisor that cites the Fair Work Act',
  description:
    'Ask any HR question and get an answer grounded in the Fair Work Act, the NES, and your Modern Award - with the section cited. Draft 33 HR documents, and hand off to a real advisor when it matters.',
  alternates: { canonical: '/product/people' },
  robots: { index: true, follow: true },
}

const FEATURES = [
  { t: 'Answers that cite the law', d: 'Every response points to the Fair Work Act, the NES, or your Modern Award section, so you can check the source.' },
  { t: '33 HR documents, drafted', d: 'Letters of offer, warnings, PIPs, terminations and more - generated with your details, ready to send.' },
  { t: 'Human handoff built in', d: 'When a question is too complex or too risky, the same Humanistiqs advisor picks it up - no repeating yourself.' },
  { t: 'Australian law only', d: 'No US or UK noise. Grounded exclusively in Australian employment law.' },
]

export default function ProductPeoplePage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <section className="mx-auto max-w-5xl px-6 pt-16 text-center md:px-10 md:pt-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">HQ People</p>
          <h1 className="mx-auto max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]">
            An HR advisor that cites the law.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
            Ask anything about people, pay or compliance. HQ People answers in plain English, cites the
            exact Fair Work section, drafts the document, and hands off to a real human when the stakes
            are high.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-white shadow-card transition-opacity hover:opacity-90">
              Start the 14-day trial
            </Link>
            <Link href="/pricing" className="inline-flex h-12 items-center justify-center rounded-full border border-ink px-6 text-sm font-medium text-ink transition-colors hover:bg-bg-soft">
              See pricing -&gt;
            </Link>
          </div>
        </section>

        <PeopleDeepDive />

        {/* Feature grid */}
        <section className="bg-bg-soft py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
              What you get with HQ People.
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 md:gap-10">
              {FEATURES.map((f) => (
                <div key={f.t}>
                  <h3 className="font-display text-lg font-bold tracking-tight text-ink">{f.t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FooterCta />
      </main>
      <MarketingFooter />
    </>
  )
}
