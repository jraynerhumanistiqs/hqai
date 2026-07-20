// Public /roadmap - the honest record of what HQ.ai has shipped, what is
// being built now, and what is coming next. Static server component in the
// shared marketing chrome. No dates promised - month-level honesty lives on
// /changelog instead.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'

export const metadata: Metadata = {
  title: 'HQ.ai roadmap - what we\'ve shipped and what\'s coming',
  description:
    'The public record of the HQ.ai roadmap: everything that has shipped, what we are building now, and what comes next for Australian small business HR and hiring.',
  alternates: { canonical: '/roadmap' },
  robots: { index: true, follow: true },
}

const COLUMNS: { heading: string; blurb: string; items: string[] }[] = [
  {
    heading: 'Shipped',
    blurb: 'Live in the product today.',
    items: [
      'HQ People - an AI HR assistant backed by a library of 33 ready-to-use HR documents',
      'One-off document marketplace - buy a single HR document without a subscription',
      'Campaign Coach - a step-by-step wizard that helps you write a better job ad',
      'CV Scoring Agent - scores every CV against the role, with the evidence behind each score shown',
      'Shortlist Agent - bulk shortlisting with personalised screening questions for each candidate',
      'Video and phone pre-screen interviews candidates complete in their own time',
      'AI interview guides so every interview covers the right ground',
      'Dashboard light and dark themes',
      'Self-serve plans with checkout - HQ People, standalone HQ Recruit, and the HQ Business bundle',
      'HR365 and Recruit365 - the done-for-you layer with a dedicated Humanistiqs advisor',
    ],
  },
  {
    heading: 'In progress',
    blurb: 'Being built right now.',
    items: [
      'Compliance assessment tool - a plain-English health check on where your HR basics stand',
      'Awards interpreter - help making sense of which modern award applies and what it means day to day',
      'Accuracy audit dashboard - our own public measure of how the AI is performing',
      'Deeper coverage of the 2024-26 workplace reforms',
    ],
  },
  {
    heading: 'Next',
    blurb: 'Coming after that, in rough order.',
    items: [
      'Payroll integrations - read-only Xero and MYOB to start',
      'Industry packs for hospitality, trades and allied health',
      'SSO and audit logs for larger teams',
      'Partner programme for accountants and bookkeepers',
    ],
  },
]

export default function RoadmapPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        {/* Hero */}
        <section className="bg-bg py-14 md:py-20" aria-labelledby="roadmap-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              Roadmap
            </p>
            <h1
              id="roadmap-heading"
              className="max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]"
            >
              What we've shipped, and what's coming.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
              This page is the public record of where HQ.ai is up to. Everything under Shipped is
              live today. The rest is in the order we plan to build it. We don't promise dates -
              we'd rather ship things properly than ship them to a deadline.
            </p>
          </div>
        </section>

        {/* Three-column board */}
        <section className="bg-bg pb-14 md:pb-20" aria-label="Roadmap board">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              {COLUMNS.map((col) => (
                <article
                  key={col.heading}
                  className="flex flex-col rounded-2xl border border-border bg-bg-soft p-6 md:p-7"
                >
                  <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                    {col.heading}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">{col.blurb}</p>
                  <ul className="mt-5 space-y-3">
                    {col.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-soft">
                        <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <p className="mt-10 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              Want something on this list?{' '}
              <Link href="/contact" className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-clay">
                Tell us
              </Link>
              . Roadmap items move when customers ask for them. For what has already landed, see the{' '}
              <Link href="/changelog" className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-clay">
                changelog
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
