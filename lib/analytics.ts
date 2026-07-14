// lib/analytics.ts
//
// Fire-and-forget funnel analytics. trackFunnelEvent() never throws,
// never blocks the UI, and no-ops server-side - a lost analytics event
// must never cost a signup. Events post to /api/telemetry/funnel via
// navigator.sendBeacon (survives page navigation, which matters for
// events fired right before a redirect to Stripe) with a
// fetch-keepalive fallback.
//
// Pre-signup events are anonymous: a random anon id is minted once and
// persisted in localStorage so the funnel can be stitched across the
// pricing -> signup -> onboarding hops.

import { isFunnelEvent } from './funnel-events'

const ANON_ID_KEY = 'hqai-anon-id'

function getAnonId(): string | null {
  try {
    let id = window.localStorage.getItem(ANON_ID_KEY)
    if (!id) {
      id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(ANON_ID_KEY, id)
    }
    return id
  } catch {
    // localStorage unavailable (private mode, blocked storage) - the
    // event still sends, just without a stitchable anon id.
    return null
  }
}

export function trackFunnelEvent(event: string, props: Record<string, unknown> = {}): void {
  try {
    if (typeof window === 'undefined') return
    if (!isFunnelEvent(event)) return

    const { plan, cycle, step, source, ...rest } = props
    const payload = JSON.stringify({
      event,
      anon_id: getAnonId(),
      plan: typeof plan === 'string' ? plan : undefined,
      cycle: typeof cycle === 'string' ? cycle : undefined,
      step: typeof step === 'number' ? step : undefined,
      source: typeof source === 'string' ? source : undefined,
      props: rest,
    })

    const url = '/api/telemetry/funnel'
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
      if (ok) return
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Analytics must never break the product.
  }
}
