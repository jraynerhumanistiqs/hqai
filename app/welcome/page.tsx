'use client'
// /welcome - where Stripe Checkout returns the self-serve funnel.
// Two variants on one route, switched by ?state=success|cancelled
// (set by buildCheckoutReturnUrls in lib/stripe.ts):
//   success:   plan is active - restrained celebration, one CTA in.
//   cancelled: no payment taken - saved-state reassurance, resume CTA.
// A light standalone product surface like /login and /onboarding - no
// MarketingHeader, no data-app scope, no ThemeBoundary.

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import PlanSummaryCard, { isCheckoutPlanId, type CheckoutPlanId } from '@/components/onboarding/PlanSummaryCard'
import { trackFunnelEvent } from '@/lib/analytics'

const FIRST_ACTIONS: Array<[string, string]> = [
  ['Ask one real question', 'A leave question, a pay question - anything on your plate right now.'],
  ['Draft your first document', 'Try "draft a letter of offer for a part-time retail assistant."'],
  ['Add your managers', 'Unlimited logins on every plan, at no extra cost.'],
]

export default function WelcomePage() {
  const [ready, setReady] = useState(false)
  const [variant, setVariant] = useState<'success' | 'cancelled' | ''>('')
  const [plan, setPlan] = useState<CheckoutPlanId | null>(null)
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<'' | 'unconfigured' | 'generic'>('')
  const tracked = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function init() {
      const q = new URLSearchParams(window.location.search)
      const state = q.get('state')
      if (state !== 'success' && state !== 'cancelled') {
        // No zero-state on this page - anything else goes home.
        window.location.replace('/dashboard')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        window.location.href = '/login'
        return
      }

      const qPlan = q.get('plan')
      const qCycle = q.get('cycle')
      let resolvedPlan: CheckoutPlanId | null = isCheckoutPlanId(qPlan) ? qPlan : null
      if (!resolvedPlan) {
        // Fall back to the business row; if that fails too, render the
        // screen without the plan card - the copy stands alone.
        const { data: profile } = await supabase
          .from('profiles')
          .select('businesses(plan)')
          .eq('id', user.id)
          .maybeSingle()
        const bizPlan = (profile?.businesses as unknown as { plan?: string } | null)?.plan
        resolvedPlan = isCheckoutPlanId(bizPlan) ? bizPlan : null
      }
      if (cancelled) return

      setPlan(resolvedPlan)
      if (qCycle === 'monthly' || qCycle === 'annual') setCycle(qCycle)
      setVariant(state)
      setReady(true)
      document.title = state === 'success' ? 'Welcome - HQ.ai' : 'No payment taken - HQ.ai'

      if (!tracked.current) {
        tracked.current = true
        trackFunnelEvent('welcome_viewed', { plan: resolvedPlan ?? undefined, cycle: qCycle ?? undefined, source: state })
        if (state === 'cancelled') {
          trackFunnelEvent('checkout_cancelled', { plan: resolvedPlan ?? undefined, cycle: qCycle ?? undefined })
        }
      }
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-create checkout for the plan/cycle carried in the query params -
  // the same call the onboarding payment step makes.
  async function resumeCheckout() {
    setLoading(true)
    setCheckoutError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan ?? 'business', cycle, returnTo: 'onboarding' }),
      })
      const json = await res.json().catch(() => ({} as { url?: string }))
      if (res.ok && (json as { url?: string }).url) {
        trackFunnelEvent('checkout_started', { plan: plan ?? 'business', cycle, source: 'welcome_cancelled' })
        window.location.href = (json as { url: string }).url
        return
      }
      setCheckoutError(res.status === 503 ? 'unconfigured' : 'generic')
    } catch {
      setCheckoutError('generic')
    }
    setLoading(false)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-sm text-ink-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo-black.svg" alt="HQ.ai" width={1760} height={570} className="w-[112px] h-auto mx-auto block" />
        </div>

        <div className="bg-white shadow-modal rounded-2xl p-8">
          {variant === 'success' ? (
            <>
              <div className="text-center">
                {/* Restrained celebration - the clay-soft disc is the one
                    sanctioned highlight. No confetti. */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-soft text-clay-ink animate-in zoom-in-95 fade-in duration-base motion-reduce:animate-none">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h1 className="font-display text-[28px] font-bold tracking-tight text-ink leading-[1.1] mb-1.5">
                  You&apos;re in.
                </h1>
                <p className="text-sm text-ink-soft mb-6">
                  Your plan is active and your workspace is ready. Ask your first question - it&apos;s the fastest way to see what HQ can do.
                </p>
              </div>

              {plan && <PlanSummaryCard planId={plan} cycle={cycle} />}

              <ol className="mt-4 space-y-2">
                {FIRST_ACTIONS.map(([title, desc], i) => (
                  <li key={title} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-soft font-mono text-[11px] font-bold text-ink-soft">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-snug text-ink-soft">
                      <strong className="font-semibold text-ink">{title}.</strong> {desc}
                    </p>
                  </li>
                ))}
              </ol>

              <a
                href="/dashboard"
                className="mt-6 inline-flex w-full items-center justify-center bg-accent hover:bg-accent-hover text-ink-on-accent font-bold py-2.5 rounded-full text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Open my dashboard
              </a>

              <p className="mt-3 text-center text-xs text-ink-muted">
                Your receipt is on its way to your email.
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                {/* Neutral 'saved' bookmark - never red. Nothing went wrong
                    from the user's point of view. */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-soft text-ink-soft">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h1 className="font-display text-[28px] font-bold tracking-tight text-ink leading-[1.1] mb-1.5">
                  No payment taken
                </h1>
                <p className="text-sm text-ink-soft mb-6">
                  Everything you set up is saved - your business details, your advisor, your plan. Start it whenever you&apos;re ready. It takes about a minute.
                </p>
              </div>

              {checkoutError === 'unconfigured' && (
                <div role="alert" className="mb-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-sm text-danger">
                  Card payments for this plan aren&apos;t switched on just yet. Nothing has been charged and everything you set up is saved.{' '}
                  <a href="mailto:jrayner@humanistiqs.com.au" className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft">Email us</a>
                  {' '}and we&apos;ll sort it.
                </div>
              )}
              {checkoutError === 'generic' && (
                <div role="alert" className="mb-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-sm text-danger">
                  Something went wrong starting checkout. No payment was taken. Please try again.
                </div>
              )}

              <button
                type="button"
                onClick={resumeCheckout}
                disabled={loading}
                aria-busy={loading}
                className="w-full bg-accent hover:bg-accent-hover text-ink-on-accent font-bold py-2.5 rounded-full text-sm transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {loading ? 'Taking you to secure checkout...' : 'Start my plan'}
              </button>

              <p className="mt-4 text-center">
                <a href="/dashboard" className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">
                  Have a look around first
                </a>
              </p>

              <p className="mt-3 text-center text-xs text-ink-muted">
                No lock-in on any plan. Cancel any time.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
