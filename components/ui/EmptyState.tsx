'use client'

// Shared empty-state. Token-tinted SVG icon tile + Fraunces headline +
// soft body + optional action. Replaces emoji-in-a-beige-box empties.

import * as React from 'react'
import { twMerge } from 'tailwind-merge'

export interface EmptyStateProps {
  /** SVG icon node (e.g. an inline <svg>). Rendered inside a tinted tile. */
  icon?: React.ReactNode
  /** Tile tint classes, e.g. "bg-clay-soft text-clay-ink". */
  tone?: string
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  tone = 'bg-bg-soft text-ink-muted',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={twMerge('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
      {icon && (
        <div className={twMerge('w-14 h-14 rounded-xl flex items-center justify-center mb-4', tone)}>
          {icon}
        </div>
      )}
      <h3 className="font-display text-h3 text-ink mb-1.5">{title}</h3>
      {description && (
        <p className="text-small text-ink-soft max-w-sm mb-5">{description}</p>
      )}
      {action}
    </div>
  )
}

export default EmptyState
