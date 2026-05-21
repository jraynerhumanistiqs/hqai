'use client'

// Reusable variant card for the three Enterprise SKUs. Used on the
// dedicated /enterprise page (large layout) and could be embedded
// elsewhere via the same component. All copy and numbers source from
// the EnterpriseVariant object passed in - no inline literals.

import { useState } from 'react'
import type { EnterpriseVariant } from '@/lib/pricing-config'

interface Props {
  variant: EnterpriseVariant
  highlight?: boolean
  highlightBadge?: string
}

export default function EnterpriseVariantCard({ variant, highlight = false, highlightBadge }: Props) {
  const [referralsOpen, setReferralsOpen] = useState(false)
  const annual = variant.priceAnnualTotal.toLocaleString('en-AU')
  const monthlyEquiv = variant.priceMonthlyDisplay.toLocaleString('en-AU')
  const monthlyRolling = variant.priceMonthlyRolling.toLocaleString('en-AU')
  // Annual-vs-monthly saving over a 12-month horizon. Helps customers
  // who plan to stay 12+ months see the economic argument for annual.
  const annualSavingVsMonthly =
    (variant.priceMonthlyRolling * 12 - variant.priceAnnualTotal).toLocaleString('en-AU')

  return (
    <article
      className={[
        'flex h-full flex-col rounded-3xl border p-6 transition-shadow md:p-7',
        highlight
          ? 'border-accent bg-bg-elevated shadow-float'
          : 'border-border bg-bg-elevated shadow-card',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl font-bold tracking-tight text-ink md:text-2xl">
          {variant.name}
        </h3>
        {highlight && highlightBadge && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-on-accent">
            {highlightBadge}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-3xl font-semibold text-ink">
          ${monthlyEquiv}
          <span className="ml-1 text-sm font-normal text-ink-muted">/mo on annual</span>
        </p>
        <p className="text-xs text-ink-muted">
          ${annual} annual contract, {variant.contractTermMonths}-month minimum
        </p>
        <div className="flex items-baseline gap-2 pt-2">
          <p className="text-base font-semibold text-ink-soft">
            ${monthlyRolling}
            <span className="ml-1 text-xs font-normal text-ink-muted">/mo billed monthly</span>
          </p>
          <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            {variant.monthlyRollingNoticePeriodDays}-day notice
          </span>
        </div>
        <p className="text-[10px] text-ink-muted">
          Annual saves ${annualSavingVsMonthly}/yr over month-to-month
        </p>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{variant.tagline}</p>

      <ul className="mt-5 space-y-2 text-sm text-ink-soft">
        {variant.includedSummary.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden>
              <path fill="currentColor" d="M6.2 11.4 3 8.2l1.1-1.1 2.1 2.1 5.7-5.7 1.1 1.1z" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setReferralsOpen((v) => !v)}
          aria-expanded={referralsOpen}
          className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted hover:text-ink"
        >
          <span>What we refer to specialists</span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className={['h-4 w-4 transition-transform', referralsOpen ? 'rotate-180' : ''].join(' ')}
          >
            <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {referralsOpen && (
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-ink-muted">
            {variant.notIncluded.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span aria-hidden className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto pt-5">
        <a
          href="#inquiry"
          className={[
            'inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors',
            highlight
              ? 'bg-accent text-ink-on-accent hover:bg-accent-hover'
              : 'border border-border text-ink hover:bg-bg-soft',
          ].join(' ')}
        >
          Book a discovery call -&gt;
        </a>
        <details className="mt-4 text-[11px] leading-relaxed text-ink-muted">
          <summary className="cursor-pointer font-semibold uppercase tracking-[0.1em] text-ink-muted hover:text-ink">
            Overage rates
          </summary>
          <ul className="mt-2 space-y-1">
            {variant.overage.map((line) => (
              <li key={line.label}>
                <span className="text-ink-soft">{line.label}:</span> {line.rate}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  )
}
