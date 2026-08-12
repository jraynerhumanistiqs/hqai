'use client'

// SET-08 - lightweight section anchor-nav. The cheap, robust version of
// tabs for a save-once form: in-page #anchors + an IntersectionObserver
// scroll-spy that highlights the section currently in view. The brief
// asked about "settings tab synchronisation" - there was nothing to sync
// because the page was one monolith; this is the honest replacement.

import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'logo', label: 'Logo' },
  { id: 'profile', label: 'Profile' },
  { id: 'business', label: 'Business' },
  { id: 'advisor', label: 'Advisor' },
  { id: 'billing', label: 'Billing' },
] as const

export function SettingsNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      // Activate a section when it crosses the upper third of the viewport.
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <nav aria-label="Settings sections" className="flex flex-col gap-1 text-sm">
      {SECTIONS.map((s) => {
        const isActive = active === s.id
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={isActive ? 'true' : undefined}
            className={`rounded-lg px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
              isActive ? 'bg-bg-soft text-ink font-semibold' : 'text-ink-muted hover:text-ink hover:bg-bg-soft'
            }`}
          >
            {s.label}
          </a>
        )
      })}
    </nav>
  )
}
