'use client'

// Section 7: pricing v2. Two subscription tiers (Solo + Business) with
// a monthly/annual toggle, the Foundation 100 banner below, and the
// marketplace one-off block on the right.
//
// All prices source from lib/pricing-config.ts - never duplicate inline.

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PRICING } from '@/lib/pricing-config'

interface Props {
  onReserve: () => void
}

export default function PricingSection({ onReserve }: Props) {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')

  const tiers = PRICING.tiers
  const foundation = PRICING.foundation
  const oneOffs = PRICING.oneOffs

  // Annual savings per tier (12 months at headline rate vs annual total).
  const annualSavings = useMemo(() => {
    return tiers.reduce<Record<string, number>>((acc, t) => {
      acc[t.id] = t.priceMonthly * 12 - t.priceAnnualTotal
      return acc
    }, {})
  }, [tiers])

  // The Letter of Offer is the cheapest one-off and the anchor price.
  const cheapestOneOff = useMemo(
    () => oneOffs.reduce((min, sku) => (sku.price < min.price ? sku : min), oneOffs[0]),
    [oneOffs],
  )

  // Pick four marquee SKUs for the marketplace block (matches the v1 list).
  const marqueeIds = ['letter-of-offer', 'termination-letter', 'first-and-final-warning', 'position-description']
  const marqueeSkus = marqueeIds
    .map((id) => oneOffs.find((s) => s.id === id))
    .filter((s): s is (typeof oneOffs)[number] => Boolean(s))

  return (
    <section id="pricing" className="bg-bg-soft py-20 md:py-28" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <h2 id="pricing-heading" className="font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
          Two ways to start.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
          Subscribe for the lot, or buy one document at a time.
        </p>

        {/* Monthly / annual toggle - matches the pill-toggle pattern used elsewhere. */}
        <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated p-1">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            aria-pressed={cycle === 'monthly'}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              cycle === 'monthly' ? 'bg-ink text-bg-elevated' : 'text-ink-soft hover:text-ink',
            ].join(' ')}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            aria-pressed={cycle === 'annual'}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              cycle === 'annual' ? 'bg-ink text-bg-elevated' : 'text-ink-soft hover:text-ink',
            ].join(' ')}
          >
            Annual <span className="text-xs font-normal opacity-80">(2 months free)</span>
          </button>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* LEFT: subscription tiers */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">If you have ongoing HR and hiring work</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {tiers.map((t) => {
                const monthlyEquivalent = cycle === 'annual' ? t.priceAnnualMonthly : t.priceMonthly
                const saving = annualSavings[t.id] ?? 0
                return (
                  <article
                    key={t.id}
                    className={[
                      'flex flex-col rounded-3xl border p-6 transition-shadow',
                      t.highlight
                        ? 'border-accent bg-bg-elevated shadow-float'
                        : 'border-border bg-bg-elevated shadow-card',
                    ].join(' ')}
                  >
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-xl font-bold tracking-tight text-ink">{t.name}</h3>
                      {t.highlight && t.badge && (
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-on-accent">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-ink">
                      ${monthlyEquivalent}
                      <span className="ml-1 text-sm font-normal text-ink-muted">/month</span>
                    </p>
                    {cycle === 'annual' && saving > 0 && (
                      <p className="mt-1 text-xs font-semibold text-accent">Save ${saving}/yr</p>
                    )}
                    <p className="mt-2 text-sm text-ink-soft">{t.tagline}</p>
                    <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden><path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" /></svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/signup?plan=${t.id}&cycle=${cycle}`}
                      className={[
                        'mt-6 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors',
                        t.highlight
                          ? 'bg-accent text-ink-on-accent hover:bg-accent-hover'
                          : 'border border-border text-ink hover:bg-bg-soft',
                      ].join(' ')}
                    >
                      {t.cta} -&gt;
                    </Link>
                  </article>
                )
              })}
            </div>

            {/* Up-sell to Enterprise rather than disqualify. Larger or
                more complex businesses are exactly who the Enterprise
                tier (AI + a dedicated Humanistiqs advisor) is built for. */}
            <p className="mt-6 text-xs leading-relaxed text-ink-muted">
              <strong className="text-ink-soft">Bigger or more complex?</strong> If you have over 250 staff, multiple entities, or you want a dedicated human advisor on call, that is exactly what our{' '}
              <Link href="/enterprise" className="font-semibold text-accent hover:underline">Enterprise tier</Link>{' '}
              is built for - HQ.ai paired with a Humanistiqs advisor or talent partner.
            </p>
          </div>

          {/* RIGHT: marketplace re-statement */}
          <aside className="rounded-3xl border border-border bg-bg-elevated p-7 shadow-card">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">If you just need one thing today</p>
            <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
              From ${cheapestOneOff.price}. No subscription. Pay once.
            </h3>
            <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-2">
              {marqueeSkus.map((sku) => (
                <li key={sku.id} className="rounded-xl bg-bg-soft px-3 py-2">
                  <strong className="text-ink">{sku.name}</strong> - from ${sku.price}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onReserve}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full border border-accent bg-transparent px-5 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
            >
              Reserve the ${cheapestOneOff.price} {cheapestOneOff.name} -&gt;
            </button>
            <p className="mt-3 text-xs text-ink-muted">First 100 reservations get $10 off launch pricing.</p>
          </aside>
        </div>

        {/* Foundation 100 banner. Full-width below the two tiers. This is
            one of the two sparing Clay highlights on the public site - the
            scarcity moment earns the warmth. */}
        {foundation.enabled && (
          <div className="mt-10 rounded-3xl border border-clay bg-clay-soft/40 p-7 shadow-card md:p-9">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Foundation {foundation.cap}</p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink md:text-[28px]">
                  First {foundation.cap} customers lock Business at ${foundation.lockedMonthly}/month forever.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Lifetime-locked rate, founder Slack, first access to new modules. 12-month commit required.
                </p>
              </div>
              <Link
                href={`/signup?plan=business&cycle=annual&foundation=1`}
                className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Reserve a Foundation slot -&gt;
              </Link>
            </div>
          </div>
        )}

        {/* Enterprise teaser. Third row of the pricing stack - the human-led layer above the AI tool. */}
        <div className="mt-6 rounded-3xl border border-border bg-bg-elevated p-7 shadow-card md:p-9">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">Enterprise</p>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink md:text-[28px]">
                AI plus human judgement.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                A Humanistiqs Advisor or Talent Partner embedded into your business. Three SKUs, annual contract or
                month-to-month, capacity-capped at {PRICING.enterprise.capacityCapYear1} partnerships in 2026.
              </p>
              {/* Anchor price sourced from PRICING.enterprise.variants[0] - both
                  annual-equiv and monthly-rolling shown so customers self-select. */}
              <p className="mt-3 text-sm font-semibold text-ink">
                From ${PRICING.enterprise.variants[0].priceMonthlyDisplay.toLocaleString('en-AU')}/mo on annual,
                or ${PRICING.enterprise.variants[0].priceMonthlyRolling.toLocaleString('en-AU')}/mo billed monthly
              </p>
            </div>
            <Link
              href="/enterprise"
              className="inline-flex h-12 items-center justify-center rounded-full border border-accent bg-transparent px-6 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
            >
              See Enterprise variants -&gt;
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
