'use client'

// Vercel AI Elements - Reasoning. A collapsible panel for streamed model
// reasoning. Re-skinned to Wattle Gold. Provided as a first-class primitive;
// the HQ.ai backend does not currently stream reasoning tokens, so this is
// wired to open only when reasoning content is supplied.

import { cn } from '@/lib/utils'
import { RiArrowDownSLine, RiSparkling2Line } from '@remixicon/react'
import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from 'react'

const ReasoningContext = createContext<{ open: boolean; toggle: () => void }>({
  open: false,
  toggle: () => {},
})

export type ReasoningProps = HTMLAttributes<HTMLDivElement> & {
  defaultOpen?: boolean
}

export const Reasoning = ({ className, defaultOpen = false, children, ...props }: ReasoningProps) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <ReasoningContext.Provider value={{ open, toggle: () => setOpen((v) => !v) }}>
      <div className={cn('text-xs', className)} {...props}>
        {children}
      </div>
    </ReasoningContext.Provider>
  )
}

export type ReasoningTriggerProps = HTMLAttributes<HTMLButtonElement> & {
  label?: ReactNode
}

export const ReasoningTrigger = ({ label = 'Thinking', className, ...props }: ReasoningTriggerProps) => {
  const { open, toggle } = useContext(ReasoningContext)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-bold text-ink-muted',
        'transition-colors hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-md',
        className,
      )}
      {...props}
    >
      <RiSparkling2Line className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
      <RiArrowDownSLine
        className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
        aria-hidden="true"
      />
    </button>
  )
}

export type ReasoningContentProps = HTMLAttributes<HTMLDivElement>

export const ReasoningContent = ({ className, children, ...props }: ReasoningContentProps) => {
  const { open } = useContext(ReasoningContext)
  if (!open) return null
  return (
    <div
      className={cn('mt-2 border-l-2 border-border pl-3 text-xs text-ink-soft', className)}
      {...props}
    >
      {children}
    </div>
  )
}
