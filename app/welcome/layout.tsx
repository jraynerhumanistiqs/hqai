'use client'

// The Stripe-return screen is the tail of the self-serve funnel, so it
// wears the same dark, warm marketing palette (Ivory & Clay) as the
// onboarding wizard - one continuous brand from pricing page through
// checkout. Mirrors components/landing/MarketingHeader: it flips the
// design tokens under [data-app="marketing"] in app/globals.css for this
// route only and restores the previous value on unmount, so the "Open my
// dashboard" hop lands on the product palette.

import { useEffect } from 'react'

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    const prev = html.getAttribute('data-app')
    html.setAttribute('data-app', 'marketing')
    return () => {
      if (prev) html.setAttribute('data-app', prev)
      else html.removeAttribute('data-app')
    }
  }, [])
  return <>{children}</>
}
