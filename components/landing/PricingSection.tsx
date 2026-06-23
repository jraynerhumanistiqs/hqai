'use client'

// Pricing - C10 model (June 2026). "Pick what you need: HR, hiring, or both."
// Three self-serve choices: HQ People (HR-only base), HQ Recruit (metered
// add-on), and Complete (the bundle, which reuses the existing solo/business
// plan ids + Stripe prices and keeps the $89 / $269 anchors). Below: the
// one-off marketplace, the Foundation 100 banner, and the HR365 / Recruit365
// done-for-you teaser.
//
// All prices source from lib/pricing-config.ts - never duplicate inline.

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PRICING, C10_SELF_SERVE } from '@/lib/pricing-config'

interface Props {
  onReserve: () => void
}

export default function PricingSection({ onReserve }: Props) {
  // Team size sets the band shared by HQ People and the Complete bundle.
  const [size, setSize] = useState<0 | 1>(1) // 0 = up to 25, 1 = up to 150
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')

  const { people, recruit, bundle } = C10_SELF_SERVE
  const foundation = PRICING.foundation
  const oneOffs = PRICING.oneOffs

  const cheapestOneOff = useMemo(
    () => oneOffs.reduce((min, sku) => (sku.price < min.price ? sku : min), oneOffs[0]),
    [oneOffs],
  )
  const marqueeIds = ['letter-of-offer', 'termination-letter', 'first-and-final-warning', 'position-description']
  const marqueeSkus = marqueeIds
    .map((id) => oneOffs.find((s) => s.id === id))
    .filter((s): s is (typeof oneOffs)[number] => Boolean(s))

  const peopleBand = people.bands[size]
  const bundlePlan = size === 0 ? bundle.solo : bundle.business
  const annual = cycle === 'annual'

  // Display the monthly figure (annual shows the monthly-equivalent).
  const peoplePrice = annual && peopleBand.annualTotal ? Math.round(peopleBand.annualTotal / 12) : peopleBand.monthly
  const bundlePrice = annual ? Math.round(bundlePlan.annualTotal / 12) : bundlePlan.monthly

  return (
    <section id="pricing" className="bg-bg-soft py-20 md:py-28" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Plans</p>
        <h2 id="pricing-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
          Pick what you need: HR, hiring, or both.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
          Start with HR, add hiring when you need it, or take the lot. Every plan starts with a 14-day free trial. No card.
        </p>

        {/* Toggles */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Toggle
            options={[{ k: 0, label: people.bands[0].label }, { k: 1, label: people.bands[1].label }]}
            value={size}
            onChange={(k) => setSize(k as 0 | 1)}
            ariaLabel="Team size"
          />
          <Toggle
            options={[{ k: 'monthly', label: 'Monthly' }, { k: 'annual', label: 'Annual (2 months free)' }]}
            value={cycle}
            onChange={(k) => setCycle(k as 'monthly' | 'annual')}
            ariaLabel="Billing cycle"
          />
        </div>

        {/* Three self-serve choices */}
        <div className="mt-10 grid gap-4 lg:grid-cols-3 md:gap-6">
          {/* HQ People */}
          <PlanCard
            kicker={people.kicker}
            name={people.name}
            desc={people.desc}
            price={`$${peoplePrice}`}
            priceSuffix="/mo"
            sub={`${peopleBand.label} - ${peopleBand.credits.toLocaleString('en-AU')} AI actions/mo`}
            features={people.features}
            cta="Start the 14-day trial"
            href="/signup"
            ctaStyle="ghost"
          />

          {/* HQ Recruit add-on */}
          <PlanCard
            kicker={recruit.kicker}
            name={recruit.name}
            desc={recruit.desc}
            price={`from $${recruit.bands[0].monthly}`}
            priceSuffix="/mo"
            sub={`Light $${recruit.bands[0].monthly} (1 role) - Pro $${recruit.bands[1].monthly} (unlimited)`}
            features={recruit.features}
            cta="Add to any plan"
            href="/signup"
            ctaStyle="ghost"
          />

          {/* Complete bundle - highlighted */}
          <PlanCard
            highlight
            badge="Most popular"
            kicker={bundle.kicker}
            name={bundle.name}
            desc={bundle.desc}
            price={`$${bundlePrice}`}
            priceSuffix="/mo"
            sub={`${bundlePlan.label}${annual ? `  -  $${bundlePlan.annualTotal.toLocaleString('en-AU')}/yr` : ''}`}
            features={bundle.features}
            cta="Start the 14-day trial"
            href={`/signup?plan=${bundlePlan.planId}&cycle=${cycle}`}
            ctaStyle="solid"
          />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-ink-muted">
          One question at sign-up: HR help, hiring help, or both? Unlimited logins on every plan - you are never charged per person.
        </p>

        {/* One-off marketplace */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-border bg-bg-elevated p-7 shadow-card md:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">If you just need one thing today</p>
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
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-clay bg-transparent px-5 text-sm font-semibold text-clay transition-colors hover:bg-clay-soft/20"
            >
              Reserve the ${cheapestOneOff.price} {cheapestOneOff.name} -&gt;
            </button>
            <p className="mt-3 text-xs text-ink-muted">First 100 reservations get $10 off launch pricing.</p>
          </div>

          {/* HR365 / Recruit365 teaser */}
          <aside className="rounded-3xl border border-border bg-bg-elevated p-7 shadow-card">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Want a human on call?</p>
            <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
              HR365 and Recruit365
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              A named Humanistiqs advisor handles the hard 20% of HR or your hiring, with the AI doing the admin. From ${PRICING.enterprise.variants[0].priceMonthlyDisplay}/month.
            </p>
            <Link
              href="/enterprise"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full border border-accent bg-transparent px-5 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
            >
              See HR365 and Recruit365 -&gt;
            </Link>
          </aside>
        </div>

        {/* Foundation 100 banner */}
        {foundation.enabled && (
          <div className="mt-10 rounded-3xl border border-clay bg-clay-soft/40 p-7 shadow-card md:p-9">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Foundation {foundation.cap}</p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink md:text-[28px]">
                  First {foundation.cap} customers lock Complete at ${foundation.lockedMonthly}/month forever.
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
      </div>
    </section>
  )
}

function Toggle<T extends string | number>({
  options, value, onChange, ariaLabel,
}: {
  options: { k: T; label: string }[]
  value: T
  onChange: (k: T) => void
  ariaLabel: string
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated p-1">
      {options.map((o) => {
        const on = o.k === value
        return (
          <button
            key={String(o.k)}
            type="button"
            onClick={() => onChange(o.k)}
            aria-pressed={on}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              on ? 'bg-accent text-ink-on-accent' : 'text-ink-soft hover:text-ink',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function PlanCard({
  kicker, name, desc, price, priceSuffix, sub, features, cta, href, ctaStyle, highlight, badge,
}: {
  kicker: string
  name: string
  desc: string
  price: string
  priceSuffix: string
  sub: string
  features: string[]
  cta: string
  href: string
  ctaStyle: 'solid' | 'ghost'
  highlight?: boolean
  badge?: string
}) {
  return (
    <article
      className={[
        'flex flex-col rounded-3xl border p-6 shadow-card md:p-7',
        highlight ? 'border-clay bg-clay-soft/15' : 'border-border bg-bg-elevated',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">{kicker}</p>
        {badge && (
          <span className="rounded-full bg-clay px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-ink">{name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{desc}</p>
      <p className="mt-4 text-3xl font-semibold text-ink">
        {price}
        <span className="ml-1 text-sm font-normal text-ink-muted">{priceSuffix}</span>
      </p>
      <p className="mt-1 text-xs text-ink-muted">{sub}</p>
      <ul className="mt-5 space-y-2 text-sm text-ink-soft">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-clay" aria-hidden>
              <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={[
          'mt-6 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors',
          ctaStyle === 'solid'
            ? 'bg-clay text-white hover:opacity-90'
            : 'border border-ink text-ink hover:bg-bg-soft',
        ].join(' ')}
      >
        {cta} -&gt;
      </Link>
    </article>
  )
}
