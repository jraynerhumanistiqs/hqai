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
  {
    t: 'Answers you can check',
    d: 'Every answer points to the Fair Work Act or your award, so you can see exactly where it came from.',
    icon: CheckIcon,
  },
  {
    t: '33 documents, written for you',
    d: 'Offer letters, warnings, performance plans, contracts and more - filled in with your details, ready to send.',
    icon: DocumentIcon,
  },
  {
    t: 'A real human when it counts',
    d: 'When a question is too tricky or too risky, the same Humanistiqs advisor steps in. No repeating yourself.',
    icon: PersonIcon,
  },
  {
    t: 'Australian law only',
    d: 'No US or UK clutter. Built on Australian workplace law, nothing else.',
    icon: ShieldIcon,
  },
]

const STATS = [
  { value: '33', label: 'HR documents drafted for you' },
  { value: '30 sec', label: 'to a cited answer' },
  { value: '122', label: 'Australian awards covered' },
]

export default function ProductPeoplePage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pt-16 text-center md:px-10 md:pt-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">HQ People</p>
          <h1 className="mx-auto max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]">
            An HR advisor that cites the law.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
            Ask anything about your staff, pay or the rules. HQ People answers in plain English, shows you
            the exact law it used, writes the document, and hands you to a real human when the stakes
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

          {/* Stat touch */}
          <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3 md:gap-6">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-3xl border border-border bg-bg-elevated p-6 text-center shadow-card"
              >
                <p className="font-display text-[28px] font-bold leading-none tracking-tight text-clay md:text-[32px]">
                  {s.value}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <PeopleDeepDive />

        {/* Feature grid */}
        <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="people-features-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">What you get</p>
            <h2
              id="people-features-heading"
              className="max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
            >
              Everything HQ People does for you.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              The everyday HR work, taken off your plate - with the law to back up every call.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 md:gap-6">
              {FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <article
                    key={f.t}
                    className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-6 shadow-card transition-colors hover:border-clay/50 md:p-8"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-soft/30 text-clay">
                      <Icon />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-ink">{f.t}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.d}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <FooterCta />
      </main>
      <MarketingFooter />
    </>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="11" />
      <path d="m11 16 3.5 3.5L21 12" />
    </svg>
  )
}
function DocumentIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5h10l5 5v17H9V5Z" />
      <path d="M19 5v5h5" />
      <path d="M13 16h7M13 20h7" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="12" r="5" />
      <path d="M7 26a9 9 0 0 1 18 0" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 5l9 3v7c0 6-4 10-9 12-5-2-9-6-9-12V8l9-3Z" />
      <path d="m12 16 3 3 5-6" />
    </svg>
  )
}
