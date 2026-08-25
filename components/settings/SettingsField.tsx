'use client'

// SET-08 / DASH-02 - shared settings field wrapper + input styles.
//
// Follows the house FormField token pattern (ink-soft bold label, ink
// text, ink-muted placeholder) and adds the
// house focus-visible ring the settings inputs were missing. Inputs use a
// premium underline; selects keep a subtle box because a bare underline +
// native chevron renders inconsistently across OSes.

import * as React from 'react'

export const inputCls =
  'w-full border-b border-ink/30 bg-transparent px-1 py-2.5 text-sm text-ink placeholder-ink-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/30 rounded-sm'

export const selectCls =
  'w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm text-ink placeholder-ink-muted outline-none transition-colors appearance-none focus-visible:ring-2 focus-visible:ring-accent/30'

export function Field({
  label,
  htmlFor,
  hint,
  required,
  optional,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: React.ReactNode
  // required renders a gold asterisk; optional renders a muted "(optional)".
  // Mandatory fields help HQ tailor its advice and documents.
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-bold text-ink-soft mb-1.5">
        {label}
        {required && <span className="text-clay-ink dark:text-clay ml-0.5" aria-hidden="true">*</span>}
        {optional && <span className="text-ink-muted font-normal ml-1">(optional)</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-ink-muted mt-1">{hint}</p>}
    </div>
  )
}
