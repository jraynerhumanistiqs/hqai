'use client'

// SET-08 / DASH-06 - one settings section shell. Gives every section a
// stable #anchor (for the section nav + IntersectionObserver scroll-spy),
// the shared card chrome, and the standardised Title-case font-display
// heading (Settings used to shout UPPERCASE tracking-wider font-charcoal,
// out of step with Home).

import * as React from 'react'
import { twMerge } from 'tailwind-merge'

export function SettingsSection({
  id,
  title,
  description,
  className,
  children,
}: {
  id: string
  title: string
  description?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={twMerge(
        'scroll-mt-8 bg-bg-elevated border border-border rounded-3xl p-4 sm:p-6 mb-4 sm:mb-5',
        className,
      )}
    >
      <h2 className={`font-display text-lg font-bold tracking-tight text-ink ${description ? 'mb-1' : 'mb-4'}`}>
        {title}
      </h2>
      {description && <p className="text-xs text-ink-muted mb-4">{description}</p>}
      {children}
    </section>
  )
}
