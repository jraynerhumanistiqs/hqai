'use client'

// Vercel AI Elements - Suggestion. Pill-shaped quick-start chips for the
// empty state (the UX brief's "never open with a blank box"). Re-skinned to
// the Wattle Gold tokens as calm, low-commitment scenario prompts.

import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export type SuggestionsProps = HTMLAttributes<HTMLDivElement>

export const Suggestions = ({ className, children, ...props }: SuggestionsProps) => (
  <div className={cn('flex flex-wrap gap-2', className)} {...props}>
    {children}
  </div>
)

export type SuggestionProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  suggestion: string
  onClick?: (suggestion: string) => void
  children?: ReactNode
}

export const Suggestion = ({ suggestion, onClick, className, children, ...props }: SuggestionProps) => (
  <button
    type="button"
    onClick={() => onClick?.(suggestion)}
    className={cn(
      'rounded-full bg-bg-soft px-4 py-2 text-sm font-medium text-ink',
      'transition-colors hover:bg-border',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      className,
    )}
    {...props}
  >
    {children ?? suggestion}
  </button>
)
