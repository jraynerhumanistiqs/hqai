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
  { t: 'Campaign Coach writes the ad', d: 'Turn a rough brief into a compliant, well-structured job ad - award, salary and must-haves confirmed before it goes live.' },
  { t: 'CV scoring with evidence', d: 'Every CV is scored against the criteria you set, with the reasoning quoted straight from the CV. No black box.' },
  { t: 'Video + phone pre-screens', d: 'Invite candidates to a short pre-screen, then review and score responses in one place.' },
  { t: 'Shortlist to decision maker', d: 'Promote your top picks and share a clean shortlist with the owner, client or hiring manager.' },
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
            Write the ad, score every CV against your criteria, run quick pre-screens, and hand a
            confident shortlist to whoever makes the call - all in one workflow.
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

        <RecruitDeepDive />

        {/* Feature grid */}
        <section className="bg-bg-soft py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
              What you get with HQ Recruit.
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
