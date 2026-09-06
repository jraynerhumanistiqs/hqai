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
  // themeMode controls the light/dark behaviour within the product scope:
  //   - 'dashboard'    -> defaults to DARK (brand consistency with the
  //     public site) and lets the user toggle to light via ThemeToggle;
  //     the choice persists under `hqai-theme`.
  //   - 'static-light' -> forces light, no toggle. Used by the public
  //     candidate-facing flows (prescreen, review) whose components are
  //     not yet dark-audited. This is the default so those surfaces keep
  //     their existing behaviour untouched.
  themeMode?: 'dashboard' | 'static-light'
  children: React.ReactNode
}

function DataAppScope({ app }: { app: 'marketing' | 'product' }) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    html.setAttribute('data-app', app)
    return () => {
      // Clear the scope outright on unmount rather than restoring whatever
      // was there before.
      //
      // Restoring was the bug: the pre-paint shim in app/layout.tsx stamps
      // data-app="product" onto <html> BEFORE React hydrates, so `prev` was
      // already "product" by the time this effect first ran. Unmounting then
      // "restored" product - it never cleared. Combined with next-themes,
      // which does not drop its .dark class when its provider unmounts, a
      // client-side navigation out of the dashboard (sign out -> /login)
      // left <html data-app="product" class="dark"> on a page that has no
      // ThemeBoundary. [data-app="product"].dark then matched, and /login
      // painted dark ink on its own light surfaces.
      //
      // The dark class is dropped here too, for the same reason: nothing
      // else removes it once the provider that set it has gone.
      html.removeAttribute('data-app')
      if (app === 'product') html.classList.remove('dark')
    }
  }, [app])
  return null
}

export default function ThemeBoundary({ app, themeMode = 'static-light', children }: ThemeBoundaryProps) {
  // June 2026: the dashboard chrome defaults to DARK to match the public
  // marketing site (brand consistency). The full hardcoded-colour audit
  // across Campaign Coach / Shortlist / Recruit / chat is complete, so the
  // [data-app="product"].dark variant is safe to ship there. Users flip to
  // light via ThemeToggle (sidebar + mobile top bar); the choice persists
  // under `hqai-theme`. The public candidate flows (prescreen / review)
  // stay forced-light until their components are dark-audited.
  const isDashboard = themeMode === 'dashboard'
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={isDashboard ? 'dark' : 'light'}
      enableSystem={false}
      storageKey="hqai-theme"
      forcedTheme={isDashboard ? undefined : 'light'}
      disableTransitionOnChange
    >
      <DataAppScope app={app} />
      {children}
    </ThemeProvider>
  )
}
