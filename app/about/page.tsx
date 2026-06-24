// Public /about - the Humanistiqs story + the team, in the shared chrome.
// Refreshed to match the qase-modelled homepage: eyebrow-in-clay headers,
// big font-display headings, card grids on the shared dark tokens, a stat
// strip, and a values grid with tick lists. Reuses FounderNote for the
// director grid and FooterCta for the closing call to action.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'
import FounderNote from '@/components/landing/FounderNote'
import FooterCta from '@/components/landing/FooterCta'
import Cited from '@/components/landing/Cited'

export const metadata: Metadata = {
  title: 'About HQ.ai - the Humanistiqs team behind the AI HR advisor',
  description:
    'HQ.ai is built by Humanistiqs, an Australian HR and recruitment consultancy with 80+ years of combined director experience. Smart AI for the everyday work, real people for the hard calls, built only for Australian workplaces.',
  alternates: { canonical: '/about' },
  robots: { index: true, follow: true },
}

const STATS = [
  { figure: '80+', label: 'years of combined director experience' },
  { figure: '4', label: 'Humanistiqs directors behind the AI' },
  { figure: 'Every', label: 'Australian industry covered' },
]

const VALUES = [
  {
    t: 'AI plus real people',
    d: 'AI does the quick stuff fast. Our people handle the calls that matter. You always get a human when you need one.',
    icon: PeopleIcon,
  },
  {
    t: 'Show the working',
    d: (
      <>
        Every answer comes in{' '}
        <Cited note="Plain-English answers with the working shown, so you can act straight away.">plain English with the working shown</Cited>, so you can act
        straight away. No guessing, no fine print.
      </>
    ),
    icon: SourceIcon,
  },
  {
    t: 'Australian only',
    d: 'We do one thing well. Australian workplace law for businesses under 250 staff. Nothing borrowed from overseas.',
    icon: FlagIcon,
  },
  {
    t: 'No lock-in',
    d: 'Cancel any time. We earn your next month by being useful. No long contract to trap you.',
    icon: NoLockIcon,
  },
]

export default function AboutPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        {/* Hero */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="about-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              <span aria-hidden className="h-px w-5 bg-ink-muted" />
              About
            </p>
            <h1
              id="about-heading"
              className="max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]"
            >
              Bring out the best in your people. Let AI do the hard yards.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
              HQ.ai is made by Humanistiqs, an Australian HR and management consultancy. For years we
              gave small businesses real advice on people, structure and performance. Now you get that
              same advice in your pocket. It is there any time, it takes the busywork off your plate,
              and our team stands behind it.
            </p>
            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-8 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                Start the trial - it's three minutes
              </Link>
            </div>

            {/* Stat strip - delta-style callouts from the homepage MetricsStrip */}
            <div className="mt-14 grid gap-4 sm:grid-cols-3 md:gap-6">
              {STATS.map((s) => (
                <article
                  key={s.label}
                  className="rounded-2xl border border-border bg-bg-soft p-7 text-center md:p-8"
                >
                  <p className="font-display text-[36px] font-semibold leading-none tracking-[-0.02em] text-ink md:text-[44px]">
                    {s.figure}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.label}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* What we stand for - values grid with icon-in-rounded-square + tick */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="values-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              <span aria-hidden className="h-px w-5 bg-ink-muted" />
              What we stand for
            </p>
            <h2
              id="values-heading"
              className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
            >
              Smart AI for the everyday, real people for the hard calls.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              Four things we will not budge on. They are why small businesses trust us with the calls
              that matter.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 md:gap-6">
              {VALUES.map((v) => {
                const Icon = v.icon
                return (
                  <article
                    key={v.t}
                    className="flex flex-col rounded-2xl border border-border bg-bg-soft p-6 transition-colors hover:border-border-strong md:p-8"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border text-ink-soft">
                      <Icon />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-ink">{v.t}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{v.d}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* The team + the why (reused) */}
        <FounderNote />

        {/* Enterprise nudge - in a card so it reads as part of the system */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="enterprise-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <article className="rounded-3xl border border-border bg-bg-elevated p-8 shadow-card md:p-12">
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">HR365 &amp; Recruit365</p>
              <h2
                id="enterprise-heading"
                className="mt-3 max-w-2xl font-display text-[26px] font-bold leading-snug tracking-tight text-ink md:text-[32px]"
              >
                Want a real person on your side too?
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft md:text-base">
                Our outsourced HR and recruitment pairs you with a dedicated Humanistiqs advisor, backed
                by the AI. The same human every time, for the calls where the stakes are high.
              </p>
              <div className="mt-7">
                <Link
                  href="/enterprise"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-7 text-sm font-semibold text-ink-on-accent transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Explore outsourced HR &amp; recruitment
                </Link>
              </div>
            </article>
          </div>
        </section>

        <FooterCta />
      </main>
      <MarketingFooter />
    </>
  )
}

function PeopleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="4" />
      <path d="M4 26a7 7 0 0 1 14 0" />
      <path d="M21 8a4 4 0 0 1 0 8" />
      <path d="M22 19a7 7 0 0 1 6 7" />
    </svg>
  )
}
function SourceIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5h10l5 5v17H9V5Z" />
      <path d="M19 5v5h5" />
      <path d="M13 16h6" />
      <path d="M13 21h6" />
    </svg>
  )
}
function FlagIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 27V5" />
      <path d="M8 6h15l-3 5 3 5H8" />
    </svg>
  )
}
function NoLockIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="14" width="18" height="12" rx="2" />
      <path d="M11 14V9a5 5 0 0 1 9-3" />
    </svg>
  )
}
