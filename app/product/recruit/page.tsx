// Public /product/recruit - HQ Recruit deep-dive page in the shared chrome.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'
import RecruitDeepDive from '@/components/landing/RecruitDeepDive'
import FooterCta from '@/components/landing/FooterCta'

export const metadata: Metadata = {
  title: 'HQ Recruit - score CVs and run pre-screens in one place',
  description:
    'Write the ad with Campaign Coach, score every CV against criteria you set, run video and phone pre-screens, and shortlist with evidence - one workflow from role to decision.',
  alternates: { canonical: '/product/recruit' },
  robots: { index: true, follow: true },
}

const FEATURES = [
  {
    t: 'It writes the job ad',
    d: 'Turn a rough brief into a clear, well-written job ad - award, salary and must-haves sorted before it goes live.',
    icon: AdIcon,
  },
  {
    t: 'Scores every CV with proof',
    d: 'Each CV is scored against what you asked for, with the reason quoted straight from the CV. Nothing hidden.',
    icon: ScoreIcon,
  },
  {
    t: 'Video and phone interviews',
    d: 'Invite people to a short interview, then watch and score the answers all in one place.',
    icon: InterviewIcon,
  },
  {
    t: 'A clean shortlist to share',
    d: 'Pick your top few and send a tidy shortlist to the owner, client or hiring manager.',
    icon: ShortlistIcon,
  },
]

const STATS = [
  { figure: 'Minutes', label: 'to score a stack of CVs, not days' },
  { figure: 'One link', label: 'for video and phone pre-screens' },
  { figure: 'Every score', label: 'backed by a quote from the CV' },
]

export default function ProductRecruitPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <section className="mx-auto max-w-5xl px-6 pt-16 text-center md:px-10 md:pt-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">HQ Recruit</p>
          <h1 className="mx-auto max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]">
            From job ad to shortlist, without the chaos.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
            Write the ad, score every CV against what you need, run quick interviews, and hand a
            confident shortlist to whoever makes the call - all in one place.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-white shadow-card transition-opacity hover:opacity-90">
              Start the 14-day trial
            </Link>
            <Link href="/pricing" className="inline-flex h-12 items-center justify-center rounded-full border border-border px-6 text-sm font-medium text-ink transition-colors hover:bg-bg-soft">
              See pricing
            </Link>
          </div>

          {/* Stat strip - quick proof under the hero */}
          <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3 md:gap-6">
            {STATS.map((s) => (
              <div
                key={s.figure}
                className="rounded-3xl border border-border bg-bg-elevated p-6 text-center shadow-card"
              >
                <p className="font-display text-xl font-bold tracking-tight text-clay">{s.figure}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <RecruitDeepDive />

        {/* Feature grid */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="features-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">What you get</p>
            <h2
              id="features-heading"
              className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
            >
              Everything from job ad to offer, in one place.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              Four steps that used to live in your inbox, spreadsheets and gut feel - now one tidy workflow.
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

function AdIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 6h18v20H7z" />
      <path d="M11 12h10" />
      <path d="M11 17h10" />
      <path d="M11 22h6" />
    </svg>
  )
}
function ScoreIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 24V14" />
      <path d="M13 24V9" />
      <path d="M20 24v-7" />
      <path d="M27 24V12" />
      <path d="M5 27h22" />
    </svg>
  )
}
function InterviewIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h12v12H6z" />
      <path d="m18 13 8-4v10l-8-4" />
    </svg>
  )
}
function ShortlistIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 stroke-current" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 10 3 3 5-6" />
      <path d="m7 21 3 3 5-6" />
      <path d="M20 9h6" />
      <path d="M20 20h6" />
    </svg>
  )
}
