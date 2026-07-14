'use client'
// PlanSummaryCard - read-only plan confirmation card with an inline
// "Change plan" expansion. Used on onboarding step 2 (Advisor), the
// onboarding payment step, and the /welcome success screen (read-only).
//
// Design decisions (per the funnel UI spec):
// - Inline expansion, NOT a modal - the wizard card is max-w-lg and the
//   radio rows already exist as the established onboarding pattern.
// - The annual nudge is one quiet line, never a modal or a pre-switched
//   toggle, and never shows for recruit (no annual price is wired).
// - Prices always derive from lib/pricing-config.ts - never inline.

import { useEffect, useId, useRef, useState } from 'react'
import { C10_SELF_SERVE } from '@/lib/pricing-config'
import { trackFunnelEvent } from '@/lib/analytics'

const { bundle, recruit } = C10_SELF_SERVE

export type CheckoutPlanId = 'solo' | 'business' | 'recruit'

export function isCheckoutPlanId(value: unknown): value is CheckoutPlanId {
  return value === 'solo' || value === 'business' || value === 'recruit'
}

// The selectable plan rows (moved here from app/onboarding/page.tsx so
// the list lives beside PLAN_META). The bundle reuses the existing
// solo/business plan ids; recruit is the standalone hiring-only plan.
export const PLANS: Array<{ id: CheckoutPlanId; label: string; price: string; desc: string; recommended?: boolean }> = [
  {
    id: bundle.solo.planId,
    label: `${bundle.name} (${bundle.solo.label})`,
    price: `$${bundle.solo.monthly}/month`,
    desc: `HR and hiring, for teams ${bundle.solo.label}, unlimited logins`,
  },
  {
    id: bundle.business.planId,
    label: `${bundle.name} (${bundle.business.label})`,
    price: `$${bundle.business.monthly}/month`,
    desc: `HR and hiring, for teams ${bundle.business.label}, unlimited logins, founder-led onboarding`,
    recommended: true,
  },
  {
    id: recruit.standalonePlanId,
    label: `${recruit.name} (hiring only)`,
    price: `$${recruit.standaloneMonthly}/month`,
    desc: 'Hiring tools only - CV scoring, interviews and Campaign Coach. No HR subscription needed.',
  },
]

const PLAN_META: Record<CheckoutPlanId, { name: string; band: string; monthly: number; annualTotal?: number }> = {
  solo:     { name: bundle.name,  band: bundle.solo.label,     monthly: bundle.solo.monthly,     annualTotal: bundle.solo.annualTotal },
  business: { name: bundle.name,  band: bundle.business.label, monthly: bundle.business.monthly, annualTotal: bundle.business.annualTotal },
  recruit:  { name: recruit.name, band: 'hiring only',         monthly: recruit.standaloneMonthly },
}

export function getPlanMeta(planId: CheckoutPlanId) {
  return PLAN_META[planId]
}

/** "$89 a month" or "$890 a year ($74 a month, billed annually)". */
export function planPriceLine(planId: CheckoutPlanId, cycle: 'monthly' | 'annual'): string {
  const meta = PLAN_META[planId]
  if (cycle === 'annual' && meta.annualTotal) {
    return `$${meta.annualTotal.toLocaleString('en-AU')} a year ($${Math.round(meta.annualTotal / 12)} a month, billed annually)`
  }
  return `$${meta.monthly} a month`
}

// The 'up to 25' band ceiling (bundle.solo.label) as a number, for the
// headcount hint threshold.
const SOLO_MAX_HEADCOUNT = 25

interface PlanSummaryCardProps {
  planId: string
  cycle: 'monthly' | 'annual'
  /** Omit for a read-only card (no Change plan link). */
  onPlanChange?: (planId: string) => void
  /** Enables the annual nudge line (payment step only). */
  onCycleChange?: (cycle: 'monthly' | 'annual') => void
  /** Enables the over-25 headcount hint (advisor step only). */
  headcount?: number
  showAnnualNudge?: boolean
}

export default function PlanSummaryCard({
  planId, cycle, onPlanChange, onCycleChange, headcount, showAnnualNudge,
}: PlanSummaryCardProps) {
  const safeId: CheckoutPlanId = isCheckoutPlanId(planId) ? planId : 'business'
  const meta = PLAN_META[safeId]
  const [expanded, setExpanded] = useState(false)
  const linkRef = useRef<HTMLButtonElement>(null)
  const pickerId = useId()

  const showSoloHint = !!onPlanChange && safeId === 'solo'
    && typeof headcount === 'number' && headcount > SOLO_MAX_HEADCOUNT
  const soloHintTracked = useRef(false)
  useEffect(() => {
    if (showSoloHint && !soloHintTracked.current) {
      soloHintTracked.current = true
      trackFunnelEvent('upsell_shown', { surface: 'solo_to_business', plan: 'solo' })
    }
  }, [showSoloHint])

  function pick(id: string) {
    onPlanChange?.(id)
    setExpanded(false)
    linkRef.current?.focus()
  }

  const linkCls = 'font-semibold text-ink underline underline-offset-2 hover:text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-sm'
  const nudgeEligible = showAnnualNudge && (safeId === 'solo' || safeId === 'business') && !!meta.annualTotal

  return (
    <div>
      <div className="rounded-xl border border-border bg-bg-soft p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Your plan</p>
          {onPlanChange && (
            <button
              ref={linkRef}
              type="button"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              aria-controls={pickerId}
              className="text-xs font-semibold text-ink-soft underline underline-offset-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-sm"
            >
              Change plan
            </button>
          )}
        </div>
        <p className="mt-1.5 text-sm text-ink">
          <strong className="font-semibold">{meta.name} ({meta.band})</strong>
          {' - '}{planPriceLine(safeId, cycle)}. Unlimited logins, cancel any time.
        </p>
        {showSoloHint && (
          <p className="mt-2 border-t border-border pt-2 text-xs leading-relaxed text-ink-soft">
            You mentioned {headcount} staff - your plan covers teams {PLAN_META.solo.band}. {PLAN_META.business.name} ({PLAN_META.business.band}) is ${PLAN_META.business.monthly} a month.{' '}
            <button
              type="button"
              onClick={() => {
                trackFunnelEvent('upsell_clicked', { surface: 'solo_to_business', plan: 'solo' })
                pick('business')
              }}
              className={linkCls}
            >
              Switch to {PLAN_META.business.name} ({PLAN_META.business.band})
            </button>
          </p>
        )}
      </div>

      {expanded && onPlanChange && (
        <div
          id={pickerId}
          role="radiogroup"
          aria-label="Choose your plan"
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setExpanded(false)
              linkRef.current?.focus()
            }
          }}
          className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-base motion-reduce:animate-none"
        >
          {PLANS.map(p => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={safeId === p.id}
              onClick={() => pick(p.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all
                ${safeId === p.id ? 'border-ink bg-ink/5' : 'border-border hover:border-mid'}`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                ${safeId === p.id ? 'border-ink bg-ink' : 'border-border'}`}>
                {safeId === p.id && <div className="w-1.5 h-1.5 bg-bg-elevated rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{p.label}</span>
                  {p.recommended && <span className="text-[10px] bg-accent-soft text-accent border border-accent/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Popular</span>}
                  <span className="text-sm font-semibold text-ink ml-auto">{p.price}</span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">{p.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {nudgeEligible && onCycleChange && cycle === 'monthly' && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Pay annually and get 2 months free - ${meta.annualTotal!.toLocaleString('en-AU')} a year instead of ${(meta.monthly * 12).toLocaleString('en-AU')}.{' '}
          <button
            type="button"
            onClick={() => {
              trackFunnelEvent('annual_nudge_accepted', {
                plan: safeId,
                from_cycle: 'monthly',
                to_cycle: 'annual',
                saving_aud: meta.monthly * 12 - meta.annualTotal!,
              })
              onCycleChange('annual')
            }}
            className={linkCls}
          >
            Make it annual
          </button>
        </p>
      )}

      {nudgeEligible && onCycleChange && cycle === 'annual' && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Billed annually - 2 months free.{' '}
          <button type="button" onClick={() => onCycleChange('monthly')} className={linkCls}>
            Make it monthly
          </button>
        </p>
      )}
    </div>
  )
}
