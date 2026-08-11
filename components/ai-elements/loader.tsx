'use client'

// Vercel AI Elements - Loader, re-skinned to the HQ.ai Wattle Gold tokens.
// A quiet spinner used for in-flight status. Colour comes from the theme
// tokens (ink-muted) so it reads calmly in both light and dark product themes.

import { cn } from '@/lib/utils'
import { Loader2Icon } from 'lucide-react'
import type { ComponentProps } from 'react'

export type LoaderProps = ComponentProps<'span'> & {
  size?: number
}

export const Loader = ({ className, size = 16, ...props }: LoaderProps) => (
  <span
    role="status"
    aria-label="Working"
    className={cn('inline-flex items-center justify-center text-ink-muted', className)}
    {...props}
  >
    <Loader2Icon className="animate-spin" style={{ width: size, height: size }} aria-hidden="true" />
  </span>
)
