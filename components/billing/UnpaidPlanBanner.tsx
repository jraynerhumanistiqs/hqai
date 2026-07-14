'use client'
// Unpaid soft-gate banner. Mounted by app/dashboard/layout.tsx when the
// business has no active subscription. Slim by construction - one row,
// no icon, no heading - it reads as chrome, not an alert. Browsing is
// never blocked; the banner just carries the "start your plan" load.
//
// Tokens only, so it renders correctly in BOTH product themes with zero
// conditional classes: light = soft grey strip + black pill, dark =
// near-black strip + gold pill (bg-accent flips via the CSS vars).
//
// Dismissal is session-scoped (sessionStorage) on purpose - it must
// come back next session, so never localStorage.

import { useEffect, useState } from 'react'
import { trackFunnelEvent } from '@/lib/analytics'

const DISMISS_KEY = 'hqai-unpaid-banner'

export default function UnpaidPlanBanner({ planId }: { planId: string }) {
  // Start hidden to avoid an SSR flash; reveal after the session check.
  const [dismissed, setDismissed] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let hidden = false
    try {
      hidden = sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      hidden = false
    }
    setDismissed(hidden)
    if (!hidden) {
      trackFunnelEvent('billing_banner_shown', { plan: planId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startPlan() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, cycle: 'monthly', returnTo: 'onboarding' }),
      })
      const json = await res.json().catch(() => ({} as { url?: string }))
      if (res.ok && (json as { url?: string }).url) {
        trackFunnelEvent('checkout_started', { plan: planId, cycle: 'monthly', source: 'unpaid_banner' })
        window.location.href = (json as { url: string }).url
        return
      }
      setError(true)
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Storage blocked - hide for this render anyway.
    }
    trackFunnelEvent('billing_banner_dismissed', { plan: planId })
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div
      role="region"
      aria-label="Plan not active"
      className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-bg-soft px-4 py-2 sm:px-6"
    >
      <p className="min-w-0 flex-1 truncate text-sm text-ink">
        <span className="hidden sm:inline">Your workspace is saved but your plan isn&apos;t active yet.</span>
        <span className="sm:hidden">Your plan isn&apos;t active yet.</span>
        {error && <span className="ml-2 text-danger">Checkout didn&apos;t start - try again.</span>}
      </p>
      <button
        type="button"
        onClick={startPlan}
        disabled={loading}
        aria-busy={loading}
        className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-ink-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {loading ? 'One moment...' : 'Start my plan'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide this for now"
        className="flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-bg-elevated hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
