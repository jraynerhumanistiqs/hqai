// HQ.ai Enterprise - the human-advisor-led top of the stack.
//
// Source of truth for inclusions, exclusions, pricing and capacity:
//   docs/research/enterprise-tier-strategy.md
//   docs/research/enterprise-tier-director-summary.md (one-pager framing)
//
// All prices and bullets pull from lib/pricing-config.ts (PRICING.enterprise).
// This route is a server component that mounts the inquiry form as a
// client subcomponent. No auth gating - cold visitors land here.

import type { Metadata } from 'next'
import Link from 'next/link'
import { PRICING, computeEnterprisePrice } from '@/lib/pricing-config'
import EnterpriseVariantCard from '@/components/enterprise/EnterpriseVariantCard'
import EnterpriseInquiryForm from '@/components/enterprise/EnterpriseInquiryForm'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'

const PAGE_DESCRIPTION =
  'A real Humanistiqs advisor or talent partner working inside your business, with HQ.ai doing the heavy lifting behind them.'

export const metadata: Metadata = {
  title: 'HQ.ai Enterprise - AI plus a real human for Australian small business',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/enterprise' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'HQ.ai Enterprise - AI plus a real human for Australian small business',
    description: PAGE_DESCRIPTION,
    url: '/enterprise',
    siteName: 'HQ.ai',
    locale: 'en_AU',
    type: 'website',
    images: [{ url: '/logo.svg', width: 1200, height: 630, alt: 'HQ.ai Enterprise' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HQ.ai Enterprise - AI plus a real human for Australian small business',
    description: PAGE_DESCRIPTION,
    images: ['/logo.svg'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'HQ.ai Enterprise',
  serviceType: 'AI-led HR and recruitment partnership',
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
    q: 'Annual or month-to-month?',
    a: "Your call. Annual gets you the best price. It also books your advisor or talent partner's time for the whole year. Month-to-month costs a bit more, about 17%, and you can leave with 30 days notice. Pick it if you want the flexibility more than the saving. If you plan to stay a year or more, annual is the better deal. You choose when you sign.",
  },
  {
    q: 'Who is my advisor, and can I meet them first?',
    a: 'Yes. Every Enterprise customer gets one named person, with a photo, a short bio and a direct mobile number. You meet them before you sign, not after. If they are not the right fit, we match you with someone else.',
  },
  {
    q: 'What counts as a busy month?',
    a: 'A round of redundancies, a workplace investigation, or a hiring rush. Anything that needs a lot more of your partner\'s time than usual. Each partner can flag this twice a year. When it happens, you can push the less urgent work back, bring in a second partner at the extra-hours rate, or hand the big job to a specialist.',
  },
  {
    q: 'How do extra hours work?',
    a: 'It is simple, and we never reopen the deal. Extra advisor time on People Enterprise is $250 an hour, billed in 15-minute blocks. A 5th role at once on Recruit Enterprise is $750 a month, pro-rata. Executive search is a fixed $8,500. You see any extra charge on your monthly statement before we bill it.',
  },
  {
    q: 'When can we start?',
    a: 'Fast. A first call within 48 hours. A written scope within 5 business days. A signed agreement that same week. Your 30-day setup starts the next Monday. From first call to first session in under three weeks is normal.',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'First call', body: '30 minutes. We work out where you are now, what the problem looks like, and which option fits. Jimmy runs this himself for the first 10 customers.' },
  { step: '02', title: 'Written scope', body: 'Within 5 business days of the call. We put the work, the hours, the rhythm and your named partner in writing. A PDF plus a draft invoice.' },
  { step: '03', title: '30-day setup', body: 'A tour of the tools, getting us up to speed on your business, setting your goals, and your first session. Everything settled by day 21.' },
  { step: '04', title: 'Ongoing partnership', body: 'Regular calls, advice between them, quarterly check-ins, yearly renewal. The same partner every time.' },
]

// -- "How pricing flexes" section ------------------------------------------
// Server-rendered. Every number sourced from PRICING.enterprise.enterpriseMultipliers
// via computeEnterprisePrice(). Worked examples lift Customers A-D from
// docs/research/enterprise-sliding-scale-analysis.md §3.4 verbatim.

function fmtAud(n: number): string {
  return `$${n.toLocaleString('en-AU')}`
}

interface WorkedExample {
  id: string
  customerLabel: string
  description: string
  variantName: string
  inputs: Parameters<typeof computeEnterprisePrice>[0]
  vsAlternative?: string
}

function PricingFlexesSection() {
  const mult = PRICING.enterprise.enterpriseMultipliers
  const variants = PRICING.enterprise.variants
  const peopleName = variants.find((v) => v.id === 'enterprise-people')?.name ?? 'HQ People Enterprise'
  const recruitName = variants.find((v) => v.id === 'enterprise-recruit')?.name ?? 'HQ Recruit Enterprise'
  const fullName = variants.find((v) => v.id === 'enterprise-full')?.name ?? 'Full Enterprise'

  // Worked examples - the four customer scenarios in §3.4 of the analysis doc.
  // Inputs lift the band indices directly off PRICING.enterprise.enterpriseMultipliers,
  // so when the schedule moves the page math moves with it.
  const examples: WorkedExample[] = [
    {
      id: 'customer-a',
      customerLabel: 'Customer A',
      description: '200-staff allied health business, one entity, wants People Enterprise.',
      variantName: peopleName,
      inputs: {
        variantId: 'enterprise-people',
        cycle: 'annual',
        headcountBandIndex: 1, // 151-250 staff
        volumeBandIndex: null, // not applicable to People
        entityBandIndex: 0,    // single entity
      },
    },
    {
      id: 'customer-b',
      customerLabel: 'Customer B',
      description: '75-staff cafe franchise with 4 sites, wants Full Enterprise.',
      variantName: fullName,
      inputs: {
        variantId: 'enterprise-full',
        cycle: 'annual',
        headcountBandIndex: 0, // 40-150 base
        volumeBandIndex: 0,    // base volume
        entityBandIndex: 2,    // 4-5 entities (+25%)
      },
    },
    {
      id: 'customer-c',
      customerLabel: 'Customer C',
      description: '120-staff growing tech business, about 75 hires a year, 6 roles open at once, wants Recruit Enterprise.',
      variantName: recruitName,
      inputs: {
        variantId: 'enterprise-recruit',
        cycle: 'annual',
        headcountBandIndex: 0, // 40-150 base
        volumeBandIndex: 1,    // 5-6 concurrent
        entityBandIndex: 0,    // single entity
      },
      vsAlternative: 'An in-house recruiter costs about $150k a year. This is still 3.3x cheaper.',
    },
    {
      id: 'customer-d',
      customerLabel: 'Customer D',
      description: '220-staff retail group across a few states, 3 entities, about 65 hires a year, wants Full Enterprise.',
      variantName: fullName,
      inputs: {
        variantId: 'enterprise-full',
        cycle: 'annual',
        headcountBandIndex: 1, // 151-250 staff
        volumeBandIndex: 1,    // 5-6 concurrent
        entityBandIndex: 1,    // 2-3 entities (+15%)
      },
    },
  ]

  return (
    <section id="pricing-flexes" className="bg-bg py-20 md:py-28" aria-labelledby="pricing-flexes-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">How the price works</p>
        <h2
          id="pricing-flexes-heading"
          className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Three simple add-ons. No surprises when you sign.
        </h2>
        <p className="mt-4 max-w-3xl text-base text-ink-soft md:text-lg">
          You start with a base price. Three things can add to it: your staff numbers, how much you
          hire, and how many entities you run. These are the things that make the work bigger. The rates
          are all shown below, so you can work out your own price. No haggling.
        </p>

        {/* Three multiplier tables, side-by-side on desktop, stacked on mobile. */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Headcount band */}
          <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card">
            <h3 className="font-display text-lg font-bold tracking-tight text-ink">Staff numbers</h3>
            <p className="mt-1 text-xs text-ink-muted">Added per month, in AUD, for each option.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-soft text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Range</th>
                    <th className="px-3 py-2 font-semibold">People</th>
                    <th className="px-3 py-2 font-semibold">Recruit</th>
                    <th className="px-3 py-2 font-semibold">Full</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mult.headcountBands.map((band) => (
                    <tr key={band.label}>
                      <td className="px-3 py-2 align-top text-ink-soft">{band.label}</td>
                      {band.isStrategicTier ? (
                        <td colSpan={3} className="px-3 py-2 align-top text-ink-muted italic">
                          Talk to us
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-2 align-top text-ink">
                            {band.upliftPeople === 0 ? 'base' : `+${fmtAud(band.upliftPeople ?? 0)}`}
                          </td>
                          <td className="px-3 py-2 align-top text-ink">
                            {band.upliftRecruit === 0 ? 'base' : `+${fmtAud(band.upliftRecruit ?? 0)}`}
                          </td>
                          <td className="px-3 py-2 align-top text-ink">
                            {band.upliftFull === 0 ? 'base' : `+${fmtAud(band.upliftFull ?? 0)}`}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hiring volume */}
          <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card">
            <h3 className="font-display text-lg font-bold tracking-tight text-ink">How much you hire</h3>
            <p className="mt-1 text-xs text-ink-muted">Recruit and Full only. People does not use this.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-soft text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Range</th>
                    <th className="px-3 py-2 font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mult.volumeBands.map((band) => (
                    <tr key={band.label}>
                      <td className="px-3 py-2 align-top text-ink-soft">{band.label}</td>
                      <td className="px-3 py-2 align-top text-ink">
                        {band.isQuotedSeparately
                          ? <span className="italic text-ink-muted">Bulk hiring priced for you</span>
                          : band.uplift === 0
                            ? 'base'
                            : `+${fmtAud(band.uplift ?? 0)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Entity complexity */}
          <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card">
            <h3 className="font-display text-lg font-bold tracking-tight text-ink">Number of entities</h3>
            <p className="mt-1 text-xs text-ink-muted">Applies to any option. A percentage of the base price.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-soft text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Range</th>
                    <th className="px-3 py-2 font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mult.entityBands.map((band) => (
                    <tr key={band.label}>
                      <td className="px-3 py-2 align-top text-ink-soft">{band.label}</td>
                      <td className="px-3 py-2 align-top text-ink">
                        {band.isStrategicTier
                          ? <span className="italic text-ink-muted">Talk to us</span>
                          : band.upliftPercent === 0
                            ? 'base'
                            : `+${band.upliftPercent}% of base`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Worked examples - calculated dynamically from PRICING via the helper. */}
        <div className="mt-14">
          <h3 className="font-display text-2xl font-bold tracking-tight text-ink md:text-[28px]">
            A few real examples
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Every number below is worked out straight from the rates above. Change the rates and these
            examples change too.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {examples.map((ex) => {
              const result = computeEnterprisePrice(ex.inputs)
              const hcBand = mult.headcountBands[ex.inputs.headcountBandIndex]
              const volBand =
                ex.inputs.volumeBandIndex !== null
                  ? mult.volumeBands[ex.inputs.volumeBandIndex]
                  : null
              const entBand = mult.entityBands[ex.inputs.entityBandIndex]
              return (
                <div
                  key={ex.id}
                  className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                    {ex.customerLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium text-ink">{ex.description}</p>
                  <p className="mt-1 text-xs text-ink-muted">{ex.variantName}, paid annually</p>

                  <dl className="mt-5 space-y-1.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Base {ex.variantName.replace(/^HQ\s+/, '')}</dt>
                      <dd className="font-medium text-ink">{fmtAud(result.baseMonthly)}/mo</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Staff numbers ({hcBand.label})</dt>
                      <dd className="font-medium text-ink">
                        {result.headcountUplift === 0 ? fmtAud(0) : `+${fmtAud(result.headcountUplift)}`}/mo
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">
                        How much you hire
                        {volBand ? ` (${volBand.label})` : ' (not used here)'}
                      </dt>
                      <dd className="font-medium text-ink">
                        {result.volumeUplift === 0 ? fmtAud(0) : `+${fmtAud(result.volumeUplift)}`}/mo
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">
                        Number of entities ({entBand.label}
                        {result.entityUpliftPercent > 0 ? `, +${result.entityUpliftPercent}% of base` : ''})
                      </dt>
                      <dd className="font-medium text-ink">
                        {result.entityUpliftAmount === 0
                          ? fmtAud(0)
                          : `+${fmtAud(result.entityUpliftAmount)}`}
                        /mo
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      What you pay
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
                      {fmtAud(result.subtotalMonthlyAnnualBasis)}/mo
                      <span className="ml-2 text-sm font-medium text-ink-muted">
                        ({fmtAud(result.effectiveAnnualTotal)}/yr)
                      </span>
                    </p>
                    {ex.vsAlternative && (
                      <p className="mt-2 text-xs text-ink-soft">{ex.vsAlternative}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sticky bands footnote */}
        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-ink-muted">
          {mult.stickyBandsRule}
        </p>
      </div>
    </section>
  )
}

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
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-clay">
              HQ.ai Enterprise - for Australian businesses with 30 to 250 staff
            </p>
            <h1
              id="enterprise-hero"
              className="font-display text-[40px] font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-[60px]"
            >
              AI does the heavy lifting. A real person makes the call.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
              This is where HQ.ai stops being a tool and becomes your partner. A real Humanistiqs advisor
              or talent partner works inside your business. The AI does the heavy lifting behind them.
              AI plus human judgement.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href="#inquiry"
                className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-white shadow-card transition-opacity hover:opacity-90"
              >
                Book a discovery call
              </a>
              <a
                href="#variants"
                className="inline-flex h-12 items-center justify-center rounded-full border border-accent bg-transparent px-6 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
              >
                See the three options -&gt;
              </a>
            </div>
            {/* Hero anchor price - both billing options shown. Sourced at
                runtime from PRICING.enterprise.variants[0]. */}
            <p className="mt-4 text-sm text-ink-muted">
              From ${minMonthly.toLocaleString('en-AU')}/mo when you pay annually. Or pay monthly for about {''}
              17% more, with 30 days notice. We only take on {enterprise.capacityCapYear1} partnerships in 2026.
            </p>
          </div>
        </section>

        {/* Three variant cards */}
        <section id="variants" className="bg-bg-soft py-20 md:py-28" aria-labelledby="variants-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Three options</p>
            <h2 id="variants-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
              Choose the surface you need covered.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
              People for the tricky HR you dread. Recruit for the hiring you have no time to run.
              Full Enterprise when you want one team across both.
            </p>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {variants.map((v) => (
                <EnterpriseVariantCard
                  key={v.id}
                  variant={v}
                  highlight={v.id === 'enterprise-full'}
                  highlightBadge={v.id === 'enterprise-full' ? 'Most chosen' : undefined}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How pricing flexes - the three published multipliers.
            Source: docs/research/enterprise-sliding-scale-analysis.md §3.2 (schedule),
            §3.4 (worked examples). Every number is sourced from PRICING via
            computeEnterprisePrice() so the page survives a future schedule edit. */}
        <PricingFlexesSection />

        {/* Capacity cap signal */}
        <section className="bg-bg py-14 md:py-20" aria-labelledby="capacity-heading">
          <div className="mx-auto max-w-5xl px-6 md:px-10">
            <div className="rounded-3xl border border-accent bg-bg-elevated p-7 shadow-card md:p-9">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Limited spots</p>
              <h2 id="capacity-heading" className="mt-2 font-display text-2xl font-bold tracking-tight text-ink md:text-[28px]">
                We only take on {enterprise.capacityCapYear1} partnerships in 2026. {slotsLeft} spots left.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft md:text-base">
                This is about keeping the service good, not a sales gimmick. Each customer books real time
                in their partner&apos;s calendar for the year. When the 9th customer signs, we hire the next
                advisor and talent partner before we run out of room.
              </p>
              {enterprise.inaugural.enabled && (
                <div className="mt-5 rounded-2xl border border-border bg-bg-soft p-5">
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
        <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="who-heading">
          <div className="mx-auto max-w-5xl px-6 md:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Who this is for</p>
            <h2 id="who-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[36px]">
              Is this a fit for you?
            </h2>
            <p className="mt-4 max-w-2xl text-base text-ink-soft">
              Enterprise suits a certain size of business. If you are smaller than this, our Business
              plan is the better fit, and we will tell you so on the call.
            </p>

            <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-soft text-xs uppercase tracking-[0.12em] text-ink-muted">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Option</th>
                    <th className="px-5 py-4 font-semibold">Staff</th>
                    <th className="px-5 py-4 font-semibold">Sounds like you if</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-5 py-4 font-semibold text-ink">HQ People Enterprise</td>
                    <td className="px-5 py-4 text-ink-soft">40 to 150 staff</td>
                    <td className="px-5 py-4 text-ink-soft">An office manager or ops lead does HR on the side and wants one named person for the tricky stuff.</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-ink">HQ Recruit Enterprise</td>
                    <td className="px-5 py-4 text-ink-soft">50 to 250 staff</td>
                    <td className="px-5 py-4 text-ink-soft">You hire 12 to 60 roles a year, you are sick of agency fees, and you do not want an in-house recruiter.</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-ink">Full Enterprise</td>
                    <td className="px-5 py-4 text-ink-soft">80 to 250 staff</td>
                    <td className="px-5 py-4 text-ink-soft">Both of the above. You want one team handling HR and hiring together.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How the partnership works */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="how-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">How it works</p>
            <h2 id="how-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[36px]">
              From first call to first advisory session in under three weeks.
            </h2>

            <ol className="mt-10 grid gap-5 md:grid-cols-4">
              {HOW_IT_WORKS.map((item) => (
                <li key={item.step} className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card">
                  <p className="font-display text-3xl font-bold tracking-tight text-accent">{item.step}</p>
                  <h3 className="mt-3 font-display text-lg font-bold tracking-tight text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Inquiry form */}
        <section id="inquiry" className="bg-bg-soft py-20 md:py-28" aria-labelledby="inquiry-heading">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Book a call</p>
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
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Questions</p>
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
