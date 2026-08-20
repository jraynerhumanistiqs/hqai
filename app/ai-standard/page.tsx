// Public /ai-standard - "Our AI Accuracy Standard". Explains how HQ.ai
// grounds its answers in Australian workplace-law sources, keeps them
// current, and hands the hard calls to a real person. Static server
// component in the shared marketing chrome. Scope/grounding language only -
// the page is explicit that the AI does NOT give legal advice.

import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'

export const metadata: Metadata = {
  title: 'Our AI Accuracy Standard - how HQ.ai keeps its answers honest',
  description:
    'How HQ.ai grounds its answers in Australian workplace-law sources, keeps them current, and hands the hard calls to a real person. Plain English, no fine print.',
  alternates: { canonical: '/ai-standard' },
  robots: { index: true, follow: true },
}

const LIMITS: { title: string; body: string }[] = [
  {
    title: 'It does not give legal advice',
    body: 'HQ.ai is not a law firm and its answers are not a substitute for advice from a qualified professional about your specific situation.',
  },
  {
    title: 'It does not make decisions for you',
    body: 'It answers the everyday questions and lays out your options in plain English. The judgement calls stay with you.',
  },
  {
    title: 'It does not guess quietly',
    body: 'When it is not confident, it says so and brings in a human, rather than dressing up a guess as an answer.',
  },
  {
    title: 'It does not work outside Australia',
    body: 'Built for Australian workplaces only. If you need overseas HR answers, we are honestly not your tool.',
  },
]

export default function AiStandardPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        {/* Hero */}
        <section className="bg-bg py-14 md:py-20" aria-labelledby="ai-standard-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              Our AI Accuracy Standard
            </p>
            <h1
              id="ai-standard-heading"
              className="max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[56px]"
            >
              An AI you can trust is an AI that shows its working.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
              Plenty of AI tools will give you a confident answer about managing people. Confidence
              is easy. Being right, staying current, and knowing when to hand you to a human - that
              is the hard part. This page explains how we do it.
            </p>
          </div>
        </section>

        {/* Prose sections */}
        <section className="bg-bg pb-6" aria-label="How the standard works">
          <div className="mx-auto max-w-3xl space-y-12 px-6 md:px-10">
            <article>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                Grounded in Australian sources, not the whole internet.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                HQ.ai is not a general chatbot with an HR costume on. Its answers are grounded in
                Australian workplace-law sources, along with the practical HR and recruitment
                know-how our Humanistiqs owners have built up over 80+ years of combined experience.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                That grounding is the boundary, not just the starting point. The AI works inside
                Australian workplace rules and our own IP, and nothing else. No irrelevant US
                templates, no UK employment-law assumptions, no generic advice adjusted for an
                Australian audience.
              </p>
            </article>

            <article>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                Workplace rules change. So do we.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                Australian workplace rules move constantly - award rates change every July, and
                reforms have shifted the ground under small business more than once. An answer that
                was right last year can be wrong today.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                So keeping HQ.ai current is a standing job, not a one-off:
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  'We review and update the AI\'s grounding when significant workplace changes land, including the annual wage review each July.',
                  'We are building deeper coverage of the most recent financial year\'s reforms right now - it is on our public roadmap, not hidden in a backlog.',
                  'When something changes that affects an answer you have already acted on, our aim is to tell you, not leave you to find out the hard way.',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                The AI knows what it should not handle.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                Some situations are too important for any AI to handle alone - things like
                dismissals, redundancies, serious complaints, health and safety issues, or anything
                heading towards a dispute.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                HQ.ai is built to recognise those moments and say so. Instead of staying agreeable or
                bluffing through a hard question, it tells you this one needs a person, and points
                you to our outsourced HR team - HR365 and Recruit365.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                Whether it is a conversation with your dedicated HR365 or Recruit365 advisor, or a
                one-off block of advisory time, you get the answers you are looking for - without the
                pain of another onboarding call or explaining who you are and what your business does
                all over again.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                That honesty is the standard we hold the AI to: a tool that knows its limits beats a
                tool that pretends it has none.
              </p>
            </article>

            <article>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                Let us be straight about the limits.
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {LIMITS.map((l) => (
                  <div key={l.title} className="rounded-2xl border border-border bg-bg-soft p-5">
                    <h3 className="text-sm font-semibold text-ink">{l.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{l.body}</p>
                  </div>
                ))}
              </div>
            </article>

            <article>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                We are building the scorecard, and we will show you.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                A standard you cannot measure is just marketing. We are building an accuracy audit
                process - regularly testing the AI's answers against what our human HR advisors would
                say, and using what we find to make it better.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                Our intent is to publish what we can from that process, so you are not just taking
                our word for it. It is on the{' '}
                <Link href="/roadmap" className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-clay">
                  roadmap
                </Link>{' '}
                as the accuracy audit dashboard.
              </p>
            </article>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-bg py-14 md:py-20" aria-label="Questions about how it works">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <div className="rounded-3xl border border-border bg-bg-soft p-8 md:p-10">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Questions about how it works?
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                Ask us. We would rather explain it properly than hide behind fine print.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-clay px-6 py-3 text-sm font-bold text-clay-ink transition-colors hover:bg-clay-hover"
                >
                  Talk to us
                </Link>
                <Link
                  href="/roadmap"
                  className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink"
                >
                  See the roadmap
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
