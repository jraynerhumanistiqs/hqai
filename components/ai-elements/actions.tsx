'use client'

// Vercel AI Elements - Actions. A row of per-message icon actions (copy,
// regenerate, feedback thumbs). Re-skinned to Wattle Gold; each Action keeps
// a 44px touch target for WCAG AA one-handed mobile use.

import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export type ActionsProps = HTMLAttributes<HTMLDivElement>

export const Actions = ({ className, children, ...props }: ActionsProps) => (
  <div className={cn('flex items-center gap-0.5', className)} {...props}>
    {children}
  </div>
)

export type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip?: string
  label?: string
  active?: boolean
  children: ReactNode
}

export const Action = ({ tooltip, label, active, className, children, ...props }: ActionProps) => (
  <button
    type="button"
    title={tooltip}
    aria-label={label ?? tooltip}
    aria-pressed={active}
    className={cn(
      'inline-flex min-h-touch min-w-touch items-center justify-center rounded-full',
      'text-ink-muted transition-colors',
      'hover:bg-bg-soft hover:text-ink',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      active && 'text-clay-ink',
      className,
    )}
    {...props}
  >
    {children}
  </button>
)
