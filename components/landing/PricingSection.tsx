'use client'

// Pricing - C10 model (June 2026). "Pick what you need: HR, hiring, or both."
// Three self-serve choices: HQ People (HR-only base), HQ Recruit (metered
// add-on), and Complete (the bundle, which reuses the existing solo/business
// plan ids + Stripe prices and keeps the $89 / $269 anchors). Below: the
// on-demand document library (carousel), the Foundation 100 banner, and the
// HR365 / RECRUIT365 done-for-you teaser.
//
// All prices source from lib/pricing-config.ts - never duplicate inline.

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PRICING, C10_SELF_SERVE } from '@/lib/pricing-config'

interface Props {
  onReserve: () => void
}

// On-demand document library - grouped by the most commonly requested HR
// categories. No per-document pricing here; this is the self-service AI
// Administrator surface ("starting at" the cheapest one-off).
const DOC_CATEGORIES: { title: string; docs: { name: string; desc: string }[] }[] = [
  {
    title: 'Hiring and onboarding',
    docs: [
      { name: 'Job descriptions', desc: 'Set out the role, responsibilities and the must-haves.' },
      { name: 'Employment contracts', desc: 'Pay, hours and conditions, tailored to full-time, part-time or casual.' },
      { name: 'Onboarding checklists', desc: 'Every form, tax declaration and system set-up, in order.' },
      { name: 'Workplace policies', desc: 'Conduct, leave, anti-discrimination and internet use - the ground rules.' },
    ],
  },
  {
    title: 'Performance management',
    docs: [
      { name: 'Probation reviews', desc: 'Check a new hire is the right fit in their first weeks.' },
      { name: 'Performance plans and reviews', desc: 'Set goals and track progress across the year.' },
      { name: 'Performance improvement plans (PIPs)', desc: 'A fair, clear path to fix underperformance.' },
    ],
  },
  {
    title: 'Employee relations and leave',
    docs: [
      { name: 'Leave request forms', desc: 'Annual, sick or parental leave, captured cleanly for payroll.' },
      { name: 'Flexible work agreements', desc: 'Request, review and approve arrangements like working from home.' },
      { name: 'Warning and disciplinary letters', desc: 'Worded properly to address conduct, with procedural fairness.' },
    ],
  },
  {
    title: 'Offboarding',
    docs: [
      { name: 'Resignation acknowledgements', desc: 'A clean, formal acceptance of a resignation.' },
      { name: 'Exit checklists', desc: 'Return equipment, revoke access and handle final pay.' },
      { name: 'Exit interview forms', desc: 'Capture why someone is leaving and what to learn from it.' },
    ],
  },
]

export default function PricingSection({ onReserve }: Props) {
  // Team size sets the band shared by HQ People and the Complete bundle.
  const [size, setSize] = useState<0 | 1>(1) // 0 = up to 25, 1 = up to 150
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')
  const [cat, setCat] = useState(0) // active document category

  const { people, recruit, bundle } = C10_SELF_SERVE
  const foundation = PRICING.foundation
  const oneOffs = PRICING.oneOffs

  const cheapestOneOff = useMemo(
    () => oneOffs.reduce((min, sku) => (sku.price < min.price ? sku : min), oneOffs[0]),
    [oneOffs],
  )

  const peopleBand = people.bands[size]
  const bundlePlan = size === 0 ? bundle.solo : bundle.business
  const annual = cycle === 'annual'

  const peoplePrice = annual && peopleBand.annualTotal ? Math.round(peopleBand.annualTotal / 12) : peopleBand.monthly
  const bundlePrice = annual ? Math.round(bundlePlan.annualTotal / 12) : bundlePlan.monthly

  const activeCat = DOC_CATEGORIES[cat]
  const moveCat = (dir: 1 | -1) => setCat((c) => (c + dir + DOC_CATEGORIES.length) % DOC_CATEGORIES.length)

  return (
    <section id="pricing" className="bg-bg py-20 md:py-28" aria-labelledby="pricing-heading">
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
            options={[{ k: 0, label: 'Team up to 25' }, { k: 1, label: 'Team up to 150' }]}
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
          <PlanCard
            kicker={people.kicker}
            name={people.name}
            desc={people.desc}
            price={`$${peoplePrice}`}
            priceSuffix="/mo"
            sub={`For a team of ${peopleBand.label.replace('up to ', 'up to ')} people, ${peopleBand.credits.toLocaleString('en-AU')} AI actions a month`}
            features={people.features}
            cta="Start the 14-day trial"
            href="/signup"
            ctaStyle="ghost"
          />
          <PlanCard
            kicker={recruit.kicker}
            name={recruit.name}
            desc={recruit.desc}
            price={`+$${recruit.bands[0].monthly}`}
            priceSuffix="/mo on top"
            sub={`Added to a plan. Light +$${recruit.bands[0].monthly} (1 open role) or Pro +$${recruit.bands[1].monthly} (unlimited). Already included in HQ Business.`}
            features={recruit.features}
            cta="Add to a plan"
            href="/signup"
            ctaStyle="ghost"
          />
          <PlanCard
            highlight
            badge="Best value"
            kicker={bundle.kicker}
            name={bundle.name}
            desc={bundle.desc}
            price={`$${bundlePrice}`}
            priceSuffix="/mo"
            sub={`For a team of ${bundlePlan.label.replace('up to ', 'up to ')} people${annual ? `, billed $${bundlePlan.annualTotal.toLocaleString('en-AU')}/yr` : ''}`}
            features={bundle.features}
            cta="Start the 14-day trial"
            href={`/signup?plan=${bundlePlan.planId}&cycle=${cycle}`}
            ctaStyle="solid"
          />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-ink-muted">
          One question at sign-up: HR help, hiring help, or both? Unlimited logins on every plan - you are never charged per person.
        </p>

        {/* Bottom row: on-demand document library (carousel) + HR365/RECRUIT365 teaser */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* On-demand documents - AI Administrator */}
          <div className="rounded-3xl border border-border bg-bg-elevated p-7 shadow-card md:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">On-demand documents</p>
            <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
              Your self-service AI Administrator
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Need a document right now? Your AI Administrator drafts it on demand - always current, always
              compliant with Australian workplace law. The HR and recruitment templates that employers ask
              for most - ready the moment you are. No subscription needed.
            </p>
            <p className="mt-3 text-sm font-semibold text-clay">Starting at ${cheapestOneOff.price}.</p>

            {/* Category carousel */}
            <div className="mt-6 rounded-2xl border border-border bg-bg p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Most commonly requested document types
                </p>
                <div className="flex items-center gap-1.5">
                  <CarouselBtn dir="prev" onClick={() => moveCat(-1)} />
                  <CarouselBtn dir="next" onClick={() => moveCat(1)} />
                </div>
              </div>

              <div key={cat} className="cat-fade mt-4 min-h-[188px]">
                <h4 className="font-display text-lg font-bold tracking-tight text-ink">{activeCat.title}</h4>
                <ul className="mt-3 space-y-2.5">
                  {activeCat.docs.map((d) => (
                    <li key={d.name} className="flex items-start gap-2.5">
                      <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-clay" aria-hidden>
                        <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
                      </svg>
                      <span className="text-sm leading-snug text-ink-soft">
                        <strong className="font-semibold text-ink">{d.name}.</strong> {d.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Dots */}
              <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3" role="tablist" aria-label="Document categories">
                {DOC_CATEGORIES.map((c, i) => (
                  <button
                    key={c.title}
                    type="button"
                    role="tab"
                    aria-selected={i === cat}
                    aria-label={c.title}
                    onClick={() => setCat(i)}
                    className={`h-1.5 rounded-full transition-all ${i === cat ? 'w-6 bg-clay' : 'w-1.5 bg-border hover:bg-ink-muted'}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onReserve}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-clay bg-transparent px-5 text-sm font-semibold text-clay transition-colors hover:bg-clay-soft/20"
            >
              Reserve early access -&gt;
            </button>
            <p className="mt-3 text-xs text-ink-muted">Launching soon. First 100 reservations get $10 off.</p>
          </div>

          {/* HR365 / RECRUIT365 teaser */}
          <aside className="flex flex-col rounded-3xl border border-border bg-bg-elevated p-7 shadow-card">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Want a human on call?</p>
            <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
              HR365 and RECRUIT365
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              You will be assigned a dedicated advisor who handles the hard 20% of HR or your hiring, while the
              AI does the admin. From ${PRICING.enterprise.variants[0].priceMonthlyDisplay}/month.
            </p>
            <Link
              href="/enterprise"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full border border-accent bg-transparent px-5 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
            >
              See HR365 and RECRUIT365 -&gt;
            </Link>

            {/* Conceptual graphic - a dedicated human advisor on call, backed by AI */}
            <div className="mt-auto pt-8">
              <svg viewBox="0 0 280 150" className="mx-auto w-full max-w-[260px]" fill="none" aria-hidden role="img">
                {/* advisor with headset */}
                <g className="text-ink-muted" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="70" cy="56" r="19" />
                  <path d="M40 102c0-16.5 13.5-30 30-30s30 13.5 30 30" />
                  <path d="M49 56a21 21 0 0 1 42 0" />
                  <rect x="44" y="54" width="8" height="15" rx="3.5" />
                  <rect x="88" y="54" width="8" height="15" rx="3.5" />
                  <path d="M92 69v5a9 9 0 0 1-9 9h-7" />
                </g>
                {/* on-call signal waves */}
                <g className="text-clay" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none">
                  <path d="M108 46a16 16 0 0 1 0 22" />
                  <path d="M117 39a27 27 0 0 1 0 36" opacity="0.5" />
                </g>
                {/* connection */}
                <path d="M150 92h52" className="text-ink-muted" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1 9" />
                {/* AI node */}
                <g className="text-clay">
                  <rect x="200" y="64" width="56" height="56" rx="15" stroke="currentColor" strokeWidth="2.2" fill="none" />
                  <path d="M228 76l4.5 10 10 4.5-10 4.5-4.5 10-4.5-10-10-4.5 10-4.5z" fill="currentColor" />
                  <circle cx="246" cy="74" r="2.5" fill="currentColor" opacity="0.6" />
                </g>
              </svg>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-muted">
                A dedicated advisor, on call - with the AI doing the admin.
              </p>
            </div>
          </aside>
        </div>

        {/* Foundation 100 banner */}
        {foundation.enabled && (
          <div className="mt-10 rounded-3xl border border-clay bg-clay-soft/40 p-7 shadow-card md:p-9">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Foundation {foundation.cap}</p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink md:text-[28px]">
                  Be one of our first {foundation.cap} customers and lock Complete at ${foundation.lockedMonthly}/month for your first 12 months.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Your rate held for the first year, plus founder Slack and first access to every new module. A 12-month sign-up.
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

      <style jsx>{`
        .cat-fade { animation: catFade 320ms ease-out both; }
        @keyframes catFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .cat-fade { animation: none; } }
      `}</style>
    </section>
  )
}

function CarouselBtn({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous category' : 'Next category'}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-ink-soft transition-colors hover:border-ink hover:text-ink"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dir === 'prev' ? <path d="M10 3 5 8l5 5" /> : <path d="M6 3l5 5-5 5" />}
      </svg>
    </button>
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
