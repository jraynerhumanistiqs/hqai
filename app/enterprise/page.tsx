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
  'A Humanistiqs Advisor and Talent Partner embedded into your business, with HQ.ai as their leverage.'

export const metadata: Metadata = {
  title: 'HQ.ai Enterprise - AI plus human judgement for Australian SMEs',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/enterprise' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'HQ.ai Enterprise - AI plus human judgement for Australian SMEs',
    description: PAGE_DESCRIPTION,
    url: '/enterprise',
    siteName: 'HQ.ai',
    locale: 'en_AU',
    type: 'website',
    images: [{ url: '/logo.svg', width: 1200, height: 630, alt: 'HQ.ai Enterprise' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HQ.ai Enterprise - AI plus human judgement for Australian SMEs',
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
    q: 'Annual contract or month-to-month?',
    a: "Both. Annual gives you the headline rate and locks the slot in your advisor or talent partner's calendar for the year. Month-to-month carries a ~17% premium and runs on 30 days notice, which is the right fit if cash-flow flexibility matters more than the saving. Most customers staying 12+ months are better off on annual, but the choice is yours at signing.",
  },
  {
    q: 'Who is my advisor and can I meet them first?',
    a: 'Yes. Every Enterprise customer gets a named human with a photo, bio and direct mobile. You meet them on the scoping call before you sign, not after. If the fit is wrong, we re-pair you.',
  },
  {
    q: 'What counts as an intensive month?',
    a: 'A redundancy round, an investigation, or a hiring surge that pushes the partner above their usual hours for you. Each partner can flag this twice a year. The options are defer the non-urgent items, bring in a second partner at the overage rate, or refer the spike to a specialist.',
  },
  {
    q: 'How does overage work?',
    a: 'Mechanical, never a renegotiation. Additional advisor time on People Enterprise is $250 an hour billed in 15-minute increments. A 5th concurrent role on Recruit Enterprise is $750 a month, pro-rata. Executive search is $8,500 fixed-fee. We surface the overage on your monthly statement before it bills.',
  },
  {
    q: 'When can we start?',
    a: 'The fastest path is a discovery call within 48 hours, a scoping doc within 5 business days, a signed engagement letter that week, and your 30-day onboarding sprint starting the next Monday. From first call to first advisory session in under three weeks is normal.',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Discovery call', body: '30 minutes. We map your current state, the shape of the problem, and which variant fits. Jimmy runs this personally for the first 10 customers.' },
  { step: '02', title: 'Scoping doc', body: 'Within 5 business days of the call. Written scope, hours, cadence, named partner. PDF plus a Stripe Invoice draft.' },
  { step: '03', title: '30-day onboarding sprint', body: 'Tool walkthrough, knowledge ingestion, goal definition, first advisory call or role calibration. Cadence locked by day 21.' },
  { step: '04', title: 'Ongoing partnership', body: 'Standing calls, async advisory, quarterly health checks, annual renewal. Same partner every time.' },
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
      description: '200-staff single-entity allied health, wants People Enterprise.',
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
      description: '75-staff franchise group of 4 cafes, wants Full Enterprise.',
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
      description: '120-staff scaling tech business, ~75 roles/year, 6 concurrent, wants Recruit Enterprise.',
      variantName: recruitName,
      inputs: {
        variantId: 'enterprise-recruit',
        cycle: 'annual',
        headcountBandIndex: 0, // 40-150 base
        volumeBandIndex: 1,    // 5-6 concurrent
        entityBandIndex: 0,    // single entity
      },
      vsAlternative: 'vs internal RPO recruiter at $150k/yr: still 3.3x cheaper.',
    },
    {
      id: 'customer-d',
      customerLabel: 'Customer D',
      description: '220-staff multi-state retail group with 3 entities, wants Full Enterprise, hires ~65 roles/year.',
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
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">How pricing flexes</p>
        <h2
          id="pricing-flexes-heading"
          className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]"
        >
          Three published multipliers. No surprises at signing.
        </h2>
        <p className="mt-4 max-w-3xl text-base text-ink-soft md:text-lg">
          Base price is the headline. Three multipliers - headcount, hiring volume, and entity count -
          flex the price on the dimensions that actually drive advisor and talent-partner workload. The
          schedule is published, the customer can self-calculate, no negotiation.
        </p>

        {/* Three multiplier tables, side-by-side on desktop, stacked on mobile. */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Headcount band */}
          <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card">
            <h3 className="font-display text-lg font-bold tracking-tight text-ink">Headcount band</h3>
            <p className="mt-1 text-xs text-ink-muted">Per variant, in AUD/month uplift.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-soft text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Band</th>
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
            <h3 className="font-display text-lg font-bold tracking-tight text-ink">Hiring volume</h3>
            <p className="mt-1 text-xs text-ink-muted">Recruit and Full only. People variant ignores volume.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-soft text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Band</th>
                    <th className="px-3 py-2 font-semibold">Uplift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mult.volumeBands.map((band) => (
                    <tr key={band.label}>
                      <td className="px-3 py-2 align-top text-ink-soft">{band.label}</td>
                      <td className="px-3 py-2 align-top text-ink">
                        {band.isQuotedSeparately
                          ? <span className="italic text-ink-muted">Bulk Hiring quoted separately</span>
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
            <h3 className="font-display text-lg font-bold tracking-tight text-ink">Entity complexity</h3>
            <p className="mt-1 text-xs text-ink-muted">Applies to any variant. Percent of base price.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-soft text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Band</th>
                    <th className="px-3 py-2 font-semibold">Uplift</th>
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
            Worked examples
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Every figure below is calculated live from the schedule above. Edit the schedule and the
            examples move with it.
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
                  <p className="mt-1 text-xs text-ink-muted">{ex.variantName}, annual contract</p>

                  <dl className="mt-5 space-y-1.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Base {ex.variantName.replace(/^HQ\s+/, '')}</dt>
                      <dd className="font-medium text-ink">{fmtAud(result.baseMonthly)}/mo</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Headcount uplift ({hcBand.label})</dt>
                      <dd className="font-medium text-ink">
                        {result.headcountUplift === 0 ? fmtAud(0) : `+${fmtAud(result.headcountUplift)}`}/mo
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">
                        Volume uplift
                        {volBand ? ` (${volBand.label})` : ' (not applicable)'}
                      </dt>
                      <dd className="font-medium text-ink">
                        {result.volumeUplift === 0 ? fmtAud(0) : `+${fmtAud(result.volumeUplift)}`}/mo
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">
                        Entity uplift ({entBand.label}
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
                      Effective price
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
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
              HQ.ai Enterprise - for 30 to 250-staff Australian businesses
            </p>
            <h1
              id="enterprise-hero"
              className="font-display text-[40px] font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-[60px]"
            >
              AI is the leverage. Human judgement is the partner.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
              Enterprise is where HQ.ai stops being a tool and starts being a partner. A Humanistiqs
              Advisor or Talent Partner embeds into your business, with the AI as their leverage rather
              than as the product itself. AI plus HQ - human intelligence and judgement.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href="#inquiry"
                className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 text-sm font-semibold text-ink-on-accent shadow-card transition-colors hover:bg-accent-hover"
              >
                Book a discovery call
              </a>
              <a
                href="#variants"
                className="inline-flex h-12 items-center justify-center rounded-full border border-accent bg-transparent px-6 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
              >
                See the three variants -&gt;
              </a>
            </div>
            {/* Hero anchor price - both billing options shown. Sourced at
                runtime from PRICING.enterprise.variants[0]. */}
            <p className="mt-4 text-sm text-ink-muted">
              From ${minMonthly.toLocaleString('en-AU')}/mo on annual contract, or month-to-month at a {''}
              ~17% premium with 30 days notice. Capped at {enterprise.capacityCapYear1} partnerships in 2026.
            </p>
          </div>
        </section>

        {/* Three variant cards */}
        <section id="variants" className="bg-bg-soft py-20 md:py-28" aria-labelledby="variants-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">Three variants</p>
            <h2 id="variants-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
              Pick the surface you need a partner on.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
              People for the hard 20% of HR. Recruit for the hiring funnel you don&apos;t have time to run.
              Full Enterprise when you want one partner team across both.
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
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Capacity</p>
              <h2 id="capacity-heading" className="mt-2 font-display text-2xl font-bold tracking-tight text-ink md:text-[28px]">
                We&apos;re capping Enterprise at {enterprise.capacityCapYear1} partnerships in 2026. {slotsLeft} slots left.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft md:text-base">
                The cap is a service-quality protection, not a marketing trick. Each Enterprise customer reserves
                a slot in their named partner&apos;s calendar for the year. When customer 9 lands, we hire the next
                contract Advisor and Talent Partner ahead of capacity.
              </p>
              {enterprise.inaugural.enabled && (
                <div className="mt-5 rounded-2xl border border-border bg-bg-soft p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Inaugural partners</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    The first {enterprise.inaugural.slotsRemaining} Enterprise sign-ons join as inaugural partners
                    at a ${enterprise.inaugural.discountPerMonth}/month discount in exchange for a public case study
                    once we&apos;re 90 days into the partnership.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Who this is for */}
        <section className="bg-bg-soft py-20 md:py-28" aria-labelledby="who-heading">
          <div className="mx-auto max-w-5xl px-6 md:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">Who this is for</p>
            <h2 id="who-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[36px]">
              The qualifying band.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-ink-soft">
              Enterprise is built for a specific shape of business. If you&apos;re below the band, the Business
              tier is the right call and we&apos;ll say so on the call.
            </p>

            <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-soft text-xs uppercase tracking-[0.12em] text-ink-muted">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Variant</th>
                    <th className="px-5 py-4 font-semibold">Headcount</th>
                    <th className="px-5 py-4 font-semibold">Best fit signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-5 py-4 font-semibold text-ink">HQ People Enterprise</td>
                    <td className="px-5 py-4 text-ink-soft">40 to 150 staff</td>
                    <td className="px-5 py-4 text-ink-soft">Office Manager or Operations Lead doing HR on the side, wants a named human for the hard 20%.</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-ink">HQ Recruit Enterprise</td>
                    <td className="px-5 py-4 text-ink-soft">50 to 250 staff</td>
                    <td className="px-5 py-4 text-ink-soft">Hires 12 to 60 roles a year, tired of agency fees, won&apos;t hire an internal recruiter.</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-ink">Full Enterprise</td>
                    <td className="px-5 py-4 text-ink-soft">80 to 250 staff</td>
                    <td className="px-5 py-4 text-ink-soft">Both shapes of problem above. Wants one partner team across People and Recruit.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How the partnership works */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="how-heading">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">How it works</p>
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
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">Discovery call</p>
            <h2 id="inquiry-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
              Send Jimmy the shape of your situation.
            </h2>
            <p className="mt-4 text-base text-ink-soft md:text-lg">
              Two minutes to fill in. Jimmy personally reads every inquiry and replies within 48 hours to
              book a 30-minute discovery call.
            </p>

            <div className="mt-8">
              <EnterpriseInquiryForm />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-bg py-20 md:py-28" aria-labelledby="enterprise-faq-heading">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">Questions</p>
            <h2 id="enterprise-faq-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
              The things people ask before signing.
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
