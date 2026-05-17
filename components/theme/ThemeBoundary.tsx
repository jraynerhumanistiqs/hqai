'use client'

// A3 - theme boundary wrapper.
//
// We render two layers around the app:
//   1. <ThemeProvider> from next-themes drives the light/dark class
//      on <html>. attribute="class" + enableSystem mirrors the
//      brand-kit benchmark section 5.5 sketch.
//   2. <DataAppScope> sets data-app="marketing" | "product" on the
//      <html> root so the CSS-variable scopes in app/globals.css take
//      effect. The product chrome scopes route under the dashboard
//      layout / prescreen / review; everything else (login, marketing,
//      onboarding) reads as "marketing".
//
// Both effects run client-side; the server-rendered HTML has neither
// attribute so first paint uses the :root defaults (= product, light)
// which matches the product chrome. The marketing pages flash for a
// frame before the marketing scope kicks in - acceptable for now.

import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'

interface ThemeBoundaryProps {
  app: 'marketing' | 'product'
  children: React.ReactNode
}

function DataAppScope({ app }: { app: 'marketing' | 'product' }) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    const prev = html.getAttribute('data-app')
    html.setAttribute('data-app', app)
    return () => {
      // On unmount, restore the previous attribute so a back-button
      // navigation between marketing <-> product doesn't leave a stale
      // scope set on the html element.
      if (prev) html.setAttribute('data-app', prev)
      else html.removeAttribute('data-app')
    }
  }, [app])
  return null
}

export default function ThemeBoundary({ app, children }: ThemeBoundaryProps) {
  return (
    <ThemeProvider
      attribute="class"
      // Marketing routes stay light (per brand-kit Option 2). Product
      // surfaces follow the user's system preference now that the A4
      // chrome audit has migrated the bg-white / text-black literals
      // onto theme-aware tokens; dark mode renders correctly there.
      defaultTheme={app === 'marketing' ? 'light' : 'system'}
      enableSystem={app === 'product'}
      forcedTheme={app === 'marketing' ? 'light' : undefined}
      disableTransitionOnChange
    >
      <DataAppScope app={app} />
      {children}
    </ThemeProvider>
  )
}
