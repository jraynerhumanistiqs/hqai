// Public /changelog - a simple dated list of meaningful public changes,
// newest first. Month-level dates only. Static server component in the
// shared marketing chrome.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'

export const metadata: Metadata = {
  title: 'HQ.ai changelog - what\'s new',
  description:
    'Meaningful updates to HQ.ai, newest first. New features, pricing changes and improvements to the AI HR and recruitment tools for Australian small business.',
  alternates: { canonical: '/changelog' },
  robots: { index: true, follow: true },
}

const ENTRIES: { month: string; items: string[] }[] = [
  {
    month: 'July 2026',
    items: [
      'HQ Recruit is now a standalone plan - run hiring with HQ Recruit without an HQ People subscription',
      'Simplified pricing to three self-serve plans: HQ People, HQ Recruit and the HQ Business bundle',
      'New interviews step with AI interview guides, so every interview covers the right ground',
      'Bulk shortlisting now generates personalised screening questions for each candidate',
    ],
  },
  {
    month: 'June 2026',
    items: [
      'Campaign Coach - a guided wizard that helps you write a better job ad, step by step',
      'CV Scoring Agent now treats eligibility checks like location and work rights as considerations shown beside the score, so they no longer skew it',
      'Brand refresh - the new Wattle Gold look across the site and dashboard',
    ],
  },
  {
    month: 'May 2026',
    items: [
      'Phone screening added alongside video pre-screen interviews',
      'Document marketplace - buy a one-off HR document without a subscription',
    ],
  },
]

export default function ChangelogPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        {/* Hero */}
        <section className="bg-bg py-14 md:py-20" aria-labelledby="changelog-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              Changelog
            </p>
            <h1
              id="changelog-heading"
              className="max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]"
            >
              What's new in HQ.ai.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
              Meaningful updates, newest first. We date entries by the month they went live and only
              list things you can use today. For what's coming, see the{' '}
              <Link href="/roadmap" className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-clay">
                roadmap
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Entries */}
        <section className="bg-bg pb-14 md:pb-20" aria-label="Changelog entries">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <div className="max-w-3xl space-y-4 md:space-y-6">
              {ENTRIES.map((entry) => (
                <article
                  key={entry.month}
                  className="rounded-2xl border border-border bg-bg-soft p-6 md:p-8"
                >
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                    {entry.month}
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {entry.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-soft">
                        <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
