'use client'
// ProductPicker - the onboarding plan chooser (tester feedback,
// 2026-07-14). Instead of a flat radio list of plan SKUs, the buyer
// multi-selects what they actually need (HR help and/or hiring) and the
// plan resolves itself: both -> the HQ Business bundle, HR only ->
// HQ People, hiring only -> HQ Recruit. The band (up to 25 / up to 150)
// comes from the headcount given on step 1, shown as a suggestion line.
// Fine-grained overrides stay on the payment step's Change plan list.

import { C10_SELF_SERVE } from '@/lib/pricing-config'
import { suggestPlanId, type CheckoutPlanId, type ProductNeeds } from '@/lib/plan-suggest'
import { getPlanMeta, planPriceLine } from '@/components/onboarding/PlanSummaryCard'

const { people, recruit, bundle } = C10_SELF_SERVE

const PRODUCT_OPTIONS: Array<{ key: keyof ProductNeeds; label: string; desc: string }> = [
  {
    key: 'people',
    label: `HR help - ${people.name}`,
    desc: 'The AI HR assistant, a full document library and the everyday HR jobs handled.',
  },
  {
    key: 'recruit',
    label: `Hiring - ${recruit.name}`,
    desc: 'Post roles, score CVs, run interviews - hiring from ad to offer.',
  },
]

interface ProductPickerProps {
  needs: ProductNeeds
  headcount?: number
  planId: CheckoutPlanId | null
  cycle: 'monthly' | 'annual'
  onNeedsChange: (needs: ProductNeeds) => void
}

export default function ProductPicker({ needs, headcount, planId, cycle, onNeedsChange }: ProductPickerProps) {
  const both = needs.people && needs.recruit
  const meta = planId ? getPlanMeta(planId) : null

  return (
    <div>
      <label className="block text-xs font-bold text-mid mb-2">What do you need? (select all that apply)</label>
      <div className="space-y-2">
        {PRODUCT_OPTIONS.map(opt => {
          const on = needs[opt.key]
          return (
            <button
              key={opt.key}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onNeedsChange({ ...needs, [opt.key]: !on })}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all
                ${on ? 'border-ink bg-ink/5' : 'border-border hover:border-mid'}`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors
                ${on ? 'border-ink bg-ink' : 'border-border'}`}>
                {on && (
                  <svg className="w-2.5 h-2.5 text-bg-elevated" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-ink">{opt.label}</span>
                <p className="text-xs text-ink-muted mt-0.5">{opt.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* The resolved plan, or the pick-one prompt. aria-live so screen
          readers hear the suggestion change as toggles flip. */}
      <div aria-live="polite">
        {planId && meta ? (
          <div className="mt-3 rounded-xl border border-border bg-bg-soft p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              {typeof headcount === 'number' && headcount > 0
                ? `Suggested for your team of ${headcount}`
                : 'Your plan'}
            </p>
            <p className="mt-1.5 text-sm text-ink">
              <strong className="font-semibold">{meta.name} ({meta.band})</strong>
              {' - '}{planPriceLine(planId, cycle)}. Unlimited logins, cancel any time.
            </p>
            {both && (
              <p className="mt-1 text-xs text-ink-muted">
                {bundle.name} is {people.name} and {recruit.name} together, at a saving.
              </p>
            )}
            <p className="mt-1 text-xs text-ink-muted">You can change the plan at the payment step.</p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-soft">Pick at least one so we know which plan to set up.</p>
        )}
      </div>
    </div>
  )
}

export { suggestPlanId }
