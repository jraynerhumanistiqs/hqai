'use client'

// Pricing - C10 model (June 2026). "Pick what you need: HR, hiring, or both."
// Three self-serve choices: HQ People (HR-only base), HQ Recruit (metered
// add-on), and Complete (the bundle, which reuses the existing solo/business
// plan ids + Stripe prices and keeps the $89 / $269 anchors). Below: the
// on-demand document library (carousel) and the HR365 / RECRUIT365
// done-for-you teaser.
//
// All prices source from lib/pricing-config.ts - never duplicate inline.

import Link from 'next/link'
import { useId, useMemo, useState } from 'react'
import { PRICING, C10_SELF_SERVE } from '@/lib/pricing-config'

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

export default function PricingSection() {
  // Team size sets the band for the Complete bundle. HQ People always
  // leads with its $59 entry price (see below), so the toggle drives the
  // bundle figure - keeping HQ Business on its $269 (up to 150) anchor.
  const [size, setSize] = useState<0 | 1>(1) // 0 = up to 25, 1 = up to 150
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')
  const [cat, setCat] = useState(0) // active document category

  const { people, recruit, bundle } = C10_SELF_SERVE
  const oneOffs = PRICING.oneOffs

  const cheapestOneOff = useMemo(
    () => oneOffs.reduce((min, sku) => (sku.price < min.price ? sku : min), oneOffs[0]),
    [oneOffs],
  )

  const bundlePlan = size === 0 ? bundle.solo : bundle.business
  const annual = cycle === 'annual'

  // On annual, the big number is the annual total (the real commitment),
  // with a smaller per-month equivalent note underneath. On monthly, the
  // big number is the monthly price with no note.
  const fmt = (n: number) => `$${n.toLocaleString('en-AU')}`

  // HQ People always leads with its entry price ($59 up to 25) so the
  // hero's "From $59/month" promise is delivered on-screen. The larger
  // $179 (up to 150) tier is surfaced as a secondary line, independent of
  // the team-size toggle (which drives the bundle price).
  const peopleEntry = people.bands[0]
  const peopleLarger = people.bands[1]
  const peopleEntryAnnual = annual && !!peopleEntry.annualTotal
  const peopleBig = peopleEntryAnnual ? fmt(peopleEntry.annualTotal!) : fmt(peopleEntry.monthly)
  const peopleSuffix = peopleEntryAnnual ? '/yr' : '/mo'
  const peopleLargerPrice = annual && peopleLarger.annualTotal
    ? `${fmt(peopleLarger.annualTotal)}/yr`
    : `${fmt(peopleLarger.monthly)}/mo`
  const peopleNote = `${peopleLargerPrice} for a team ${peopleLarger.label} people`
  const peopleSub = peopleEntryAnnual
    ? `For a team ${peopleEntry.label} people, ${peopleEntry.credits.toLocaleString('en-AU')} AI actions a month. ${fmt(Math.round(peopleEntry.annualTotal! / 12))} a month, billed annually.`
    : `For a team ${peopleEntry.label} people, ${peopleEntry.credits.toLocaleString('en-AU')} AI actions a month.`

  const bundleBig = annual ? fmt(bundlePlan.annualTotal) : fmt(bundlePlan.monthly)
  const bundleSuffix = annual ? '/yr' : '/mo'
  const bundleNote = annual ? `${fmt(Math.round(bundlePlan.annualTotal / 12))} a month, billed annually` : ''

  const activeCat = DOC_CATEGORIES[cat]
  const moveCat = (dir: 1 | -1) => setCat((c) => (c + dir + DOC_CATEGORIES.length) % DOC_CATEGORIES.length)

  return (
    <section id="pricing" className="bg-bg py-14 md:py-20" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
          <span aria-hidden className="h-px w-5 bg-clay" />
          Plans
        </p>
        <h2 id="pricing-heading" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
          Pick what you need: HR, hiring, or both.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
          HR only with HQ People, hiring only with HQ Recruit, or both with HQ Business - the best-value
          way to get the lot. Unlimited logins on every plan, with no lock-in.
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

        {/* Three self-serve choices, three equal-sized containers. The bundle
            leads on the "Best value" badge + a clay accent border, NOT on a
            bigger footprint - all three share HQ People's card dimensions.
            The kicker on each names the path in parallel (HR only / Hiring
            only / HR + hiring) so a first-time visitor can tell them apart at
            a glance. */}
        <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-3 md:gap-6">
          <PlanCard
            kicker="HR only"
            name={people.name}
            desc="The AI HR assistant, a full document library and the everyday HR jobs handled - no hiring tools."
            price={peopleBig}
            priceSuffix={peopleSuffix}
            priceNote={peopleNote}
            sub={peopleSub}
            features={people.features}
            cta="Get started"
            href="/signup"
            ctaStyle="ghost"
          />
          <PlanCard
            kicker={recruit.kicker}
            name={recruit.name}
            desc={recruit.desc}
            price={fmt(recruit.standaloneMonthly)}
            priceSuffix="/mo"
            sub={`Hiring on its own, billed monthly. Go Pro for unlimited roles at ${fmt(recruit.bands[1].monthly)}/mo.`}
            features={recruit.features}
            cta="Get started"
            href="/signup"
            ctaStyle="ghost"
            info={
              <PricingInfoDot label="HQ People subscriber add-on">
                {recruit.subscriberAddOnNote}
              </PricingInfoDot>
            }
          />
          <PlanCard
            highlight
            badge="Best value"
            kicker={bundle.kicker}
            name={bundle.name}
            desc="HR and hiring in one plan - the best-value way to get both."
            price={bundleBig}
            priceSuffix={bundleSuffix}
            priceNote={bundleNote}
            sub={`For a team ${bundlePlan.label} people. Everything in HQ People and HQ Recruit, together.`}
            features={bundle.features}
            cta="Get started"
            href={`/signup?plan=${bundlePlan.planId}&cycle=${cycle}`}
            ctaStyle="solid"
          />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-ink-muted">
          One question at sign-up: HR help, hiring help, or both? Unlimited logins on every plan - you are never charged per person.
        </p>

        {/* Bottom row: on-demand document library (carousel) + HR365/RECRUIT365 teaser */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* On-demand documents - AI Administrator */}
          <div className="rounded-2xl border border-border bg-bg-soft p-7 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">On-demand documents</p>
            <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
              Your self-service AI Administrator
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Need a document right now? Your AI Administrator drafts it on demand - professionally written
              and ready to use. The HR and recruitment documents that employers ask for most, filled in with
              your details, ready the moment you are. No subscription needed.
            </p>
            <p className="mt-3 text-sm font-semibold text-ink">Starting at ${cheapestOneOff.price}.</p>

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
                      <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden>
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
                    className={`h-1.5 rounded-full transition-all ${i === cat ? 'w-6 bg-ink-soft' : 'w-1.5 bg-border hover:bg-ink-muted'}`}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* HR365 / RECRUIT365 teaser */}
          <aside className="flex flex-col rounded-2xl border border-border bg-bg-soft p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Want a human on call?</p>
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

            {/* Conceptual graphic - a real one-to-one between your advisor and you, AI quietly doing the admin */}
            <div className="mt-auto pt-8">
              <svg viewBox="0 0 280 150" className="mx-auto w-full max-w-[260px]" fill="none" aria-hidden role="img">
                {/* the two people, leaning in toward each other - a genuine conversation */}
                <g className="text-ink-muted" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {/* your dedicated advisor (left) */}
                  <circle cx="64" cy="74" r="16" />
                  <path d="M40 116c0-13.3 10.7-24 24-24s24 10.7 24 24" />
                  {/* you (right), turned toward them */}
                  <circle cx="150" cy="74" r="16" />
                  <path d="M126 116c0-13.3 10.7-24 24-24s24 10.7 24 24" />
                </g>
                {/* warmth between them - a shared speech bubble with a heart, personal and approachable */}
                <g className="text-clay" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M88 38h38a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8h-19l-9 8v-8h-1a8 8 0 0 1-8-8V46a8 8 0 0 1 8-8z" />
                </g>
                {/* a small heart inside the bubble - approachable, personal */}
                <path d="M107 49c-2.6-3.6-9-3-9 2 0 3.5 4.6 6.4 9 9.4 4.4-3 9-5.9 9-9.4 0-5-6.4-5.6-9-2z" className="text-clay" fill="currentColor" stroke="none" />
                {/* AI, off to the side, quietly handling the admin */}
                <g className="text-ink-muted">
                  <rect x="218" y="92" width="40" height="40" rx="11" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7" />
                  <path d="M238 100l3.2 7 7 3.2-7 3.2-3.2 7-3.2-7-7-3.2 7-3.2z" fill="currentColor" opacity="0.7" />
                </g>
                <path d="M180 112h32" className="text-ink-muted" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 8" opacity="0.7" />
              </svg>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-muted">
                One advisor who knows you - the AI just does the admin.
              </p>
            </div>
          </aside>
        </div>

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
  kicker, name, desc, price, priceSuffix, priceNote, sub, features, cta, href, ctaStyle, highlight, badge, info,
}: {
  kicker: string
  name: string
  desc: string
  price: string
  priceSuffix: string
  priceNote?: string
  sub: string
  features: string[]
  cta: string
  href: string
  ctaStyle: 'solid' | 'ghost'
  highlight?: boolean
  badge?: string
  info?: React.ReactNode
}) {
  return (
    <article
      className={[
        // All three cards share one footprint (HQ People's dimensions):
        // same radius, padding, surface and full height. Emphasis on the
        // bundle comes from the badge + a clay accent border, never a
        // bigger container.
        'flex h-full flex-col rounded-2xl border bg-bg-soft p-6 md:p-7',
        highlight ? 'border-clay' : 'border-border',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{kicker}</p>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full bg-clay px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-on-accent">
              {badge}
            </span>
          )}
          {info}
        </div>
      </div>
      <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-ink">{name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{desc}</p>
      <p className="mt-4 text-3xl font-semibold text-ink">
        {price}
        <span className="ml-1 text-sm font-normal text-ink-muted">{priceSuffix}</span>
      </p>
      {priceNote && <p className="mt-1 text-xs font-medium text-ink-soft">{priceNote}</p>}
      <p className="mt-1 text-xs text-ink-muted">{sub}</p>
      <ul className="mt-5 space-y-2 text-sm text-ink-soft">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden>
              <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      {/* mt-auto pins the CTA to the bottom so all three align regardless of
          how many feature rows each card has. */}
      <div className="mt-auto pt-6">
        <Link
          href={href}
          className={[
            'inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            ctaStyle === 'solid'
              ? 'bg-clay text-ink-on-accent hover:bg-clay-hover focus-visible:outline-clay'
              : 'border border-ink text-ink hover:bg-bg-soft focus-visible:outline-accent',
          ].join(' ')}
        >
          {cta} -&gt;
        </Link>
      </div>
    </article>
  )
}

// Small, accessible info affordance for the HQ Recruit card. Opens on
// hover, focus or tap; dismissible via the button, blur or Escape. Mirrors
// the InfoDot in components/recruit/campaign-coach/Step5Launch.tsx but
// token-styled for the marketing surface and wired with aria-expanded +
// aria-describedby. Anchored to the top-right, so the popover opens from the
// right edge to avoid overflowing the card.
function PricingInfoDot({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className="relative inline-block leading-none">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg text-[11px] font-bold leading-none text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute right-0 top-full z-30 mt-2 w-60 max-w-[75vw] rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-left shadow-modal"
        >
          <span className="block text-xs font-normal leading-relaxed text-ink-soft">{children}</span>
        </span>
      )}
    </span>
  )
}
