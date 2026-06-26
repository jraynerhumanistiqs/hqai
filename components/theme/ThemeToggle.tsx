'use client'

// Light/dark toggle for the product (dashboard) chrome.
//
// The dashboard defaults to dark (brand consistency with the public
// marketing site) and the user can flip to light. next-themes drives a
// `.dark` class on <html> which the [data-app="product"].dark token
// scope in globals.css repaints against. Stored under `hqai-theme`.
//
// Two presentations:
//   - variant="row"  -> a full nav-style row for the sidebar Account
//     group. Collapses to an icon when the sidebar is in icons-only mode
//     (the generic span:not([data-sidebar-keep]) selector hides the label).
//   - variant="icon" -> a compact 36px icon button for the mobile top bar.
//
// Pre-mount we render a stable, theme-agnostic placeholder so the server
// HTML and first client paint match (next-themes can't know the stored
// theme until it hydrates) - this avoids a hydration mismatch.

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="flex-shrink-0">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="flex-shrink-0">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  )
}

export default function ThemeToggle({ variant = 'row' }: { variant?: 'row' | 'icon' }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted ? resolvedTheme === 'dark' : true
  const next = isDark ? 'light' : 'dark'
  const label = isDark ? 'Light mode' : 'Dark mode'

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={mounted ? `Switch to ${next} mode` : 'Toggle theme'}
        title={label}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-soft hover:bg-bg-soft hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        {/* Show the icon for the mode you'd switch TO. */}
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    )
  }

  // Sidebar row - matches the Account group nav items.
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={mounted ? `Switch to ${next} mode` : 'Toggle theme'}
      title={label}
      className="sidebar-row w-full flex items-center gap-2.5 h-9 px-3 rounded-full text-[13px] text-ink-soft hover:bg-bg-soft hover:text-ink transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
    >
      <span className="flex-shrink-0 opacity-60">{isDark ? <SunIcon /> : <MoonIcon />}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}
