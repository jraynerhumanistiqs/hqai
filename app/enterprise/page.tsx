// HQ.ai HR365 + Recruit365 - the human-advisor-led top of the stack.
//
// Source of truth for inclusions, exclusions and pricing:
//   lib/pricing-config.ts (PRICING.enterprise)
//
// The model is hours-based and sales-assisted: a dedicated Humanistiqs advisor
// is on call for the hard 20% of HR or your hiring, with the AI doing the
// admin behind them. No self-serve calculator - the public path is the
// discovery-call inquiry form. This route is a server component that mounts
// the inquiry form as a client subcomponent. No auth gating - cold visitors
// land here.

import type { Metadata } from 'next'
import { PRICING } from '@/lib/pricing-config'
import EnterpriseVariantCard from '@/components/enterprise/EnterpriseVariantCard'
import EnterpriseInquiryForm from '@/components/enterprise/EnterpriseInquiryForm'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'

const PAGE_DESCRIPTION =
  'A dedicated Humanistiqs advisor on call for the hard 20% of your HR or your hiring, with HQ.ai doing the admin behind them.'

export const metadata: Metadata = {
  title: 'HR365 + Recruit365 - AI does the admin, a real person makes the call',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/enterprise' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'HR365 + Recruit365 - AI does the admin, a real person makes the call',
    description: PAGE_DESCRIPTION,
    url: '/enterprise',
    siteName: 'HQ.ai',
    locale: 'en_AU',
    type: 'website',
    images: [{ url: '/logo.svg', width: 1200, height: 630, alt: 'HR365 + Recruit365' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HR365 + Recruit365 - AI does the admin, a real person makes the call',
    description: PAGE_DESCRIPTION,
    images: ['/logo.svg'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'HR365 + Recruit365',
  serviceType: 'AI-led HR and recruitment advisory on call',
  provider: {
    '@type': 'Organization',
    name: 'Humanistiqs (Rayner Consulting Group Pty Ltd)',
  },
  areaServed: 'Australia',
  description: PAGE_DESCRIPTION,
  offers: PRICING.enterprise.variants.map((v) => ({
    '@type': 'Offer',
    name: v.name,
    price: String(v.priceMonthlyDisplay),
    priceCurrency: 'AUD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: String(v.priceMonthlyDisplay),
      priceCurrency: 'AUD',
      unitText: 'MONTH',
    },
  })),
}

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What is HR365, and what is Recruit365?',
    a: 'HR365 is a dedicated Humanistiqs HR advisor on call for the hard parts of HR - the tricky stuff the AI cannot decide for you. Recruit365 is the same idea for hiring: a dedicated talent advisor on call to run the roles you have no time to run. The AI does the admin in both. Take one, or take both as HR365 + Recruit365 and get one coordinated team.',
  },
  {
    q: 'How many advisor hours do I get?',
    a: 'HR365 starts at $799 a month and includes 3 advisor hours each month. That covers the everyday hard calls. If you need more, extra advisor time is $250 an hour. If your needs are bigger than a few hours a month, we tailor a plan to suit - just book a call and we will scope it with you.',
  },
  {
    q: 'Who is my advisor, and can I meet them first?',
    a: 'Yes. You get one dedicated person, with a photo, a short bio and a direct mobile number. You meet them before you sign, not after. If they are not the right fit, we match you with someone else.',
  },
  {
    q: 'How do extra hours work?',
    a: 'It is simple, and we never reopen the deal. Extra advisor time is $250 an hour, billed in 15-minute blocks. You see any extra charge on your monthly statement before we bill it. If you find you need a lot more time every month, we will move you to a tailored plan rather than nickel-and-dime you.',
  },
  {
    q: 'Annual or month-to-month?',
    a: 'Your call. Annual gets you the best price and books your advisor time for the whole year. Month-to-month costs a bit more, about 17%, and you can leave with 30 days notice. Pick it if you want the flexibility more than the saving. You choose when you sign.',
  },
  {
    q: 'When can we start?',
    a: 'Fast. A first call within 48 hours. A written scope within 5 business days. A signed agreement that same week. From first call to your first advisory session in under three weeks is normal.',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'First call', body: '30 minutes. We work out where you are now, what the problem looks like, and whether HR365, Recruit365, or both is the right fit. Jimmy runs this himself for the first 10 customers.' },
  { step: '02', title: 'Written scope', body: 'Within 5 business days of the call. We put the work, the hours, the rhythm and your dedicated advisor in writing. A PDF plus a draft invoice.' },
  { step: '03', title: 'Setup', body: 'A tour of the tools, getting us up to speed on your business, setting your goals, and your first session. Everything settled by week three.' },
  { step: '04', title: 'Ongoing', body: 'Regular calls, advice between them, and your monthly advisor hours. The same person every time.' },
]

export default function EnterprisePage() {
  const enterprise = PRICING.enterprise
  const variants = enterprise.variants
  const minMonthly = Math.min(...variants.map((v) => v.priceMonthlyDisplay))
  const slotsFilled = 0
  const slotsLeft = Math.max(0, enterprise.capacityCapYear1 - slotsFilled)

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        {/* Hero */}
        <section className="relative isolate overflow-hidden" aria-labelledby="enterprise-hero">
          <div className="mx-auto max-w-5xl px-6 pb-16 pt-16 text-center md:px-10 md:pb-24 md:pt-24">
            <p className="mb-5 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              HR365 + Recruit365
            </p>
            <h1
              id="enterprise-hero"
              className="font-display text-[40px] font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-[60px]"
            >
              AI does the admin. A real person makes the call.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
              A dedicated Humanistiqs advisor on call for the hard 20% of HR or your hiring. The AI does
              the admin behind them, so the human time goes where it matters. AI plus human judgement.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href="#inquiry"
                className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                Book a discovery call
              </a>
              <a
                href="#variants"
                className="inline-flex h-12 items-center justify-center rounded-full border border-accent bg-transparent px-6 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
              >
                See the plans -&gt;
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              From ${minMonthly.toLocaleString('en-AU')}/mo when you pay annually, with 3 advisor hours
              a month included. Or pay monthly for about 17% more, with 30 days notice. We only take on{' '}
              {enterprise.capacityCapYear1} partnerships in 2026.
            </p>
          </div>
        </section>

        {/* Plan cards */}
        <section id="variants" className="bg-bg py-20 md:py-28" aria-labelledby="variants-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              The plans
            </p>
            <h2 id="variants-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
              Choose the surface you need covered.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
              HR365 for the tricky HR you dread. Recruit365 for the hiring you have no time to run.
              HR365 + Recruit365 when you want one team across both. Every plan is a dedicated advisor on
              call, with advisor hours each month and the AI doing the admin.
            </p>

            <div className="mt-10 grid items-end gap-6 lg:grid-cols-3">
              {variants.map((v) => (
                <EnterpriseVariantCard
                  key={v.id}
                  variant={v}
                  highlight={v.id === 'enterprise-full'}
                  highlightBadge={v.id === 'enterprise-full' ? 'Both advisors' : undefined}
                />
              ))}
            </div>

            <p className="mt-8 max-w-2xl text-sm text-ink-muted">
              Extra advisor time is $250/hour where it applies. Need more hours? Tailored to your needs -
              book a call and we will scope a plan that fits.
            </p>
          </div>
        </section>

        {/* Capacity cap signal */}
        <section className="bg-bg py-14 md:py-20" aria-labelledby="capacity-heading">
          <div className="mx-auto max-w-5xl px-6 md:px-10">
            <div className="rounded-3xl border border-clay bg-bg-elevated p-7 shadow-card md:p-9">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                <span aria-hidden className="h-px w-5 bg-clay" />
                Limited spots
              </p>
              <h2 id="capacity-heading" className="mt-2 font-display text-2xl font-bold tracking-tight text-ink md:text-[28px]">
                We only take on {enterprise.capacityCapYear1} partnerships in 2026. {slotsLeft} spots left.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft md:text-base">
                This is about keeping the service good, not a sales gimmick. Each customer books real time
                in their advisor&apos;s calendar for the year. When the 9th customer signs, we bring on the
                next advisor before we run out of room.
              </p>
              {enterprise.inaugural.enabled && (
                <div className="mt-5 rounded-2xl border border-border bg-bg-elevated p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Founding partners</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    The first {enterprise.inaugural.slotsRemaining} customers join as founding partners
                    and save ${enterprise.inaugural.discountPerMonth} a month. In return, they let us share their
                    story once we are 90 days in.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Who this is for */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="who-heading">
          <div className="mx-auto max-w-5xl px-6 md:px-10">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              Who this is for
            </p>
            <h2 id="who-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[36px]">
              Is this a fit for you?
            </h2>
            <p className="mt-4 max-w-2xl text-base text-ink-soft">
              These plans suit a business that hits hard HR or hiring calls often enough to want a named
              person on call, but not often enough to hire one in-house. If you are smaller than this, our
              Business plan is the better fit, and we will tell you so on the call.
            </p>

            <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-soft text-xs uppercase tracking-[0.12em] text-ink-muted">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Plan</th>
                    <th className="px-5 py-4 font-semibold">Sounds like you if</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-5 py-4 font-semibold text-ink">HR365</td>
                    <td className="px-5 py-4 text-ink-soft">An office manager or ops lead does HR on the side and wants one dedicated person for the tricky stuff, with a few advisor hours each month.</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-ink">Recruit365</td>
                    <td className="px-5 py-4 text-ink-soft">You are sick of agency fees, you do not want an in-house recruiter, and you want a dedicated talent advisor on call to run your hiring.</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-ink">HR365 + Recruit365</td>
                    <td className="px-5 py-4 text-ink-soft">Both of the above. You want one team handling HR and hiring together, with the AI doing the admin behind them.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="how-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              How it works
            </p>
            <h2 id="how-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[36px]">
              From first call to first advisory session in under three weeks.
            </h2>

            {/* Connected vertical timeline - a real 2px line links the
                four steps, more distinctive than four identical cards. */}
            <ol className="relative mt-10 max-w-2xl">
              <span
                aria-hidden
                className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border"
              />
              {HOW_IT_WORKS.map((item) => (
                <li key={item.step} className="relative flex gap-5 pb-10 last:pb-0">
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-bg font-mono text-[11px] font-semibold text-ink-soft">
                    {item.step}
                  </span>
                  <div className="pt-0.5">
                    <h3 className="font-display text-lg font-bold tracking-tight text-ink">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Inquiry form */}
        <section id="inquiry" className="bg-bg py-20 md:py-28" aria-labelledby="inquiry-heading">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              Book a call
            </p>
            <h2 id="inquiry-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
              Tell Jimmy what is going on.
            </h2>
            <p className="mt-4 text-base text-ink-soft md:text-lg">
              Two minutes to fill in. Jimmy reads every message himself and replies within 48 hours to
              book a 30-minute call.
            </p>

            <div className="mt-8">
              <EnterpriseInquiryForm />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="enterprise-faq-heading">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
              <span aria-hidden className="h-px w-5 bg-clay" />
              Questions
            </p>
            <h2 id="enterprise-faq-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
              What people ask before they sign.
            </h2>

            <ul className="mt-10 divide-y divide-border border-y border-border">
              {FAQS.map((item) => (
                <li key={item.q} className="py-6">
                  <p className="text-base font-semibold text-ink md:text-lg">{item.q}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft md:text-base">{item.a}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

      </main>
      <MarketingFooter />
    </>
  )
}
