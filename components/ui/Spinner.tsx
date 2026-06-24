'use client'

// Shared spinner. Single source of truth for loading affordances so the
// dashboard stops mixing border-t-accent / border-t-black / pulsing-dot
// variants. Respects prefers-reduced-motion via the motion-reduce variant.

import * as React from 'react'
import { twMerge } from 'tailwind-merge'

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
} as const

export interface SpinnerProps {
  size?: keyof typeof sizeMap
  className?: string
  label?: string
}

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={twMerge(
        'inline-block animate-spin rounded-full border-border border-t-accent motion-reduce:animate-none',
        sizeMap[size],
        className,
      )}
    />
  )
}

export default Spinner
