'use client'

// Vercel AI Elements - Tool. A collapsible card that surfaces a tool
// invocation (name, state, input, output). Re-skinned to Wattle Gold.
// Provided as a first-class primitive for step surfacing; the HQ.ai chat
// route grounds answers via a knowledge-search tool server-side, so this can
// be used to show "what I checked" without leaking raw internals.

import { cn } from '@/lib/utils'
import { RiArrowDownSLine, RiCheckboxCircleLine, RiWrenchLine } from '@remixicon/react'
import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from 'react'

export type ToolState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error'

const ToolContext = createContext<{ open: boolean; toggle: () => void }>({
  open: false,
  toggle: () => {},
})

export type ToolProps = HTMLAttributes<HTMLDivElement> & {
  defaultOpen?: boolean
}

export const Tool = ({ className, defaultOpen = false, children, ...props }: ToolProps) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <ToolContext.Provider value={{ open, toggle: () => setOpen((v) => !v) }}>
      <div className={cn('rounded-2xl border border-border bg-bg-soft/60', className)} {...props}>
        {children}
      </div>
    </ToolContext.Provider>
  )
}

export type ToolHeaderProps = HTMLAttributes<HTMLButtonElement> & {
  name: ReactNode
  state?: ToolState
}

export const ToolHeader = ({ name, state = 'output-available', className, ...props }: ToolHeaderProps) => {
  const { open, toggle } = useContext(ToolContext)
  const done = state === 'output-available'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      className={cn(
        'flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-bold text-ink-soft',
        'transition-colors hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-2xl',
        className,
      )}
      {...props}
    >
      {done ? (
        <RiCheckboxCircleLine className="h-3.5 w-3.5 text-success" aria-hidden="true" />
      ) : (
        <RiWrenchLine className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
      )}
      <span className="flex-1">{name}</span>
      <RiArrowDownSLine
        className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
        aria-hidden="true"
      />
    </button>
  )
}

export type ToolContentProps = HTMLAttributes<HTMLDivElement>

export const ToolContent = ({ className, children, ...props }: ToolContentProps) => {
  const { open } = useContext(ToolContext)
  if (!open) return null
  return (
    <div className={cn('border-t border-border px-3.5 py-2.5 text-xs text-ink-soft', className)} {...props}>
      {children}
    </div>
  )
}
