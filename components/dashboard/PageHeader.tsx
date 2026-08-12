// DASH-06 - shared dashboard page header.
//
// One header grammar for every dashboard surface: a font-mono Wattle Gold
// eyebrow with a short dash rule, a font-display (Schibsted) h1, and an
// optional ink-soft subtitle. Home's LocalGreeting was the reference
// treatment; Settings used a font-sans h1 + grey bold eyebrow + UPPERCASE
// section headings, which read as a different author. Both pages now
// consume this so the eyebrow/h1 treatment is identical - while each page
// keeps its own content width (Home stays wide, a settings form stays
// narrow). Consistency = header grammar, not column width.

import * as React from 'react'
import { twMerge } from 'tailwind-merge'

export interface PageHeaderProps {
  eyebrow: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Override the outer spacing (defaults to mb-6). */
  className?: string
}

export function PageHeader({ eyebrow, title, subtitle, className }: PageHeaderProps) {
  return (
    <div className={twMerge('mb-6', className)}>
      <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
        <span aria-hidden className="h-px w-5 bg-clay" />
        {eyebrow}
      </p>
      <h1 className="font-display text-2xl sm:text-h1 font-bold tracking-tight text-ink">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm sm:text-body text-ink-soft mt-1">{subtitle}</p>
      )}
    </div>
  )
}

export default PageHeader
