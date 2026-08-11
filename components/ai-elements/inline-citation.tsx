'use client'

// Vercel AI Elements - InlineCitation. A glanceable numbered citation chip
// rendered inline in prose (superscript). Re-skinned to Wattle Gold. Links to
// the source when a URL is available; otherwise it is a titled marker.

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type InlineCitationProps = {
  n: number
  label: string
  url?: string
  className?: string
}

const CHIP =
  'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-soft px-1 align-super text-[10px] font-bold leading-none text-ink-soft no-underline transition-colors hover:bg-border mx-0.5'

export const InlineCitation = ({ n, label, url, className }: InlineCitationProps) => {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        aria-label={`Citation: ${label}`}
        className={cn(CHIP, className)}
      >
        {n}
      </a>
    )
  }
  return (
    <span role="note" title={label} aria-label={`Citation: ${label}`} className={cn(CHIP, className)}>
      {n}
    </span>
  )
}

export type InlineCitationTextProps = {
  children: ReactNode
  className?: string
}

export const InlineCitationText = ({ children, className }: InlineCitationTextProps) => (
  <span className={cn('inline', className)}>{children}</span>
)
