'use client'

// Scope the self-serve onboarding funnel to the dark, warm marketing
// palette (Ivory & Clay) so it reads as one brand with the public site,
// instead of the plain white product surface. Mirrors the scope set by
// components/landing/MarketingHeader on the public pages: it flips the
// design tokens under [data-app="marketing"] in app/globals.css for this
// route only, and restores the previous value on unmount so navigating on
// to the dashboard keeps the product palette. Onboarding never mounts a
// MarketingHeader, so this layout is the one place that sets the scope.

import { useEffect } from 'react'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
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
