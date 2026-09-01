'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SettingsSection } from './SettingsSection'
import { UpgradeModal } from './UpgradeModal'
import { StatusPill } from '@/components/ui/StatusPill'
import { InlineActionButton } from '@/components/ui/inline-action'

// v2 pricing (May 2026). Plan ids MUST match lib/pricing-config.ts + the
// /api/stripe/checkout validator, which only accepts 'solo' and 'business'.
const PLAN_DETAILS: Record<string, { name: string; priceMonthly: string; priceAnnual: string; seats: number }> = {
  free:     { name: 'Beta access', priceMonthly: '$0', priceAnnual: '$0', seats: 1 },
  solo:     { name: 'HQ Business (up to 25)', priceMonthly: '$89 / month', priceAnnual: '$890 / year', seats: 3 },
  business: { name: 'HQ Business (up to 150)', priceMonthly: '$269 / month', priceAnnual: '$2,690 / year', seats: 15 },
}

type PaidPlanId = 'solo' | 'business'

const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30'

export function BillingSection({
  plan,
  subscriptionStatus,
  hasStripe,
}: {
  plan: string
  subscriptionStatus: string
  hasStripe: boolean
}) {
  const searchParams = useSearchParams()
  const [billingError, setBillingError] = useState('')
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [checkoutBusyFor, setCheckoutBusyFor] = useState<PaidPlanId | null>(null)
  // Billing cycle toggle. Annual is ~2 months free; the checkout route
  // resolves the right Stripe price id from (planId, cycle).
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')

  // A stripe_customer_id gets created the moment checkout *starts* (before
  // any payment), so gate the plan picker on an ACTIVE subscription, not on
  // hasStripe - otherwise the picker vanished after one click.
  const isSubscribed = subscriptionStatus === 'active'

  // Resolves only when we are actually navigating to Stripe, so the
  // control keeps its loading bar running through the redirect. Every
  // failure throws, which drops it back to "Manage billing" beside the
  // error banner instead of ticking success on a portal that never opened.
  async function openPortal() {
    setBillingError('')
    let url: string | undefined
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      url = data.url
      if (!url) {
        setBillingError(data.error || 'Could not open the billing portal. Please try again or contact support.')
      }
    } catch {
      setBillingError('Could not open the billing portal. Please check your connection and try again.')
    }
    if (!url) throw new Error('Billing portal unavailable')
    window.location.assign(url)
  }

  // The destination is held in a local and navigated to once at the end,
  // so there is a single exit point rather than a redirect buried in a
  // branch. Navigation uses location.assign() rather than assigning
  // location.href: react-hooks/immutability reads the assignment form as
  // mutating a value from outside the component, and the method call says
  // "navigate" more plainly anyway.
  async function startCheckout(planId: PaidPlanId) {
    setBillingError('')
    setCheckoutBusyFor(planId)
    let checkoutUrl: string | undefined
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, cycle }),
      })
      const data = await res.json().catch(() => ({} as { url?: string; error?: string }))
      if (res.ok && data.url) {
        checkoutUrl = data.url
      } else if (res.status === 503) {
        // Stripe price ids not configured yet - fall back to the
        // "email us to upgrade" path so the user is never dead-ended.
        setUpgradeModalOpen(true)
      } else {
        setBillingError(data.error || `Could not start checkout (HTTP ${res.status}).`)
      }
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.')
    }
    if (checkoutUrl) {
      // Busy state is deliberately NOT cleared - the page is navigating to
      // Stripe, and clearing it would flash the picker back to idle first.
      window.location.assign(checkoutUrl)
      return
    }
    setCheckoutBusyFor(null)
  }

  return (
    <SettingsSection id="billing" title="Billing & subscription" description="Manage your HQ.ai plan and payment method">
      {billingError && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger mb-4 flex items-center">
          <span className="flex-1">{billingError}</span>
          <button
            onClick={() => setBillingError('')}
            aria-label="Dismiss error"
            className={`ml-2 font-bold text-danger hover:text-ink rounded-full ${ring}`}
          >
            ✕
          </button>
        </div>
      )}

      {searchParams.get('billing') === 'success' && (
        <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 text-sm text-success mb-4">
          Subscription activated successfully!
        </div>
      )}

      <div className="bg-bg-soft rounded-xl p-4 flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-ink">{PLAN_DETAILS[plan]?.name || plan} plan</p>
          <p className="text-xs text-ink-muted">
            {subscriptionStatus === 'active' ? 'Active' :
             subscriptionStatus === 'trialing' ? 'Beta access' :
             subscriptionStatus === 'cancelled' ? 'Cancelled' : subscriptionStatus}
            {PLAN_DETAILS[plan] && plan !== 'free' && ` · ${PLAN_DETAILS[plan].seats} seats · ${PLAN_DETAILS[plan].priceMonthly}`}
          </p>
        </div>
        {hasStripe && (
          <InlineActionButton
            size="sm"
            actionText="Manage billing"
            successLabel="Opening the billing portal"
            onAction={openPortal}
            width={140}
          />
        )}
      </div>

      {/* Plan picker - shown to anyone not on an ACTIVE paid plan. */}
      {!isSubscribed && (
        <>
          {/* Monthly / annual toggle */}
          <div className="flex items-center justify-center gap-1 bg-bg-soft rounded-full p-1 w-fit mx-auto mb-4">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors ${ring} ${cycle === 'monthly' ? 'bg-ink text-bg-elevated' : 'text-ink-soft hover:text-ink'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle('annual')}
              className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors ${ring} ${cycle === 'annual' ? 'bg-ink text-bg-elevated' : 'text-ink-soft hover:text-ink'}`}
            >
              Annual <span className="opacity-70">save ~2mo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['solo', 'business'] as const).map((pid) => {
              const p = PLAN_DETAILS[pid]
              const busy = checkoutBusyFor === pid
              const disabled = checkoutBusyFor !== null && !busy
              return (
                <button
                  type="button"
                  key={pid}
                  onClick={() => startCheckout(pid)}
                  disabled={disabled}
                  aria-busy={busy}
                  className={`text-left rounded-2xl border p-4 transition-colors hover:border-ink disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${plan === pid ? 'border-ink bg-ink/5' : 'border-border'}`}
                >
                  <p className="text-sm font-bold text-ink">{p.name}</p>
                  <p className="text-lg font-bold text-ink mt-1">{cycle === 'annual' ? p.priceAnnual : p.priceMonthly}</p>
                  <p className="text-xs text-ink-muted mt-1">{p.seats} seats</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink">
                      {busy ? 'Redirecting...' : `Choose ${p.name}`}
                    </span>
                    {pid === 'business' && <StatusPill tone="gold" label="Popular" />}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      <UpgradeModal open={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
    </SettingsSection>
  )
}
