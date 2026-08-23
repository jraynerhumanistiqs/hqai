'use client'

// Vercel AI Elements - Sources. A collapsible "show your working" panel that
// lists the grounded references behind a compliance answer (Fair Work Act,
// NES, Modern Awards, FWO). Re-skinned to Wattle Gold. Trust is the product,
// so sources are glanceable and one tap away - per the UX brief.

import { cn } from '@/lib/utils'
import { RiArrowDownSLine, RiBookOpenLine, RiExternalLinkLine } from '@remixicon/react'
import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from 'react'

const SourcesContext = createContext<{ open: boolean; toggle: () => void }>({
  open: false,
  toggle: () => {},
})

export type SourcesProps = HTMLAttributes<HTMLDivElement> & {
  defaultOpen?: boolean
}

export const Sources = ({ className, defaultOpen = false, children, ...props }: SourcesProps) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <SourcesContext.Provider value={{ open, toggle: () => setOpen((v) => !v) }}>
      <div className={cn('mt-3 border-t border-border pt-2', className)} {...props}>
        {children}
      </div>
    </SourcesContext.Provider>
  )
}

export type SourcesTriggerProps = HTMLAttributes<HTMLButtonElement> & {
  count: number
}

export const SourcesTrigger = ({ count, className, children, ...props }: SourcesTriggerProps) => {
  const { open, toggle } = useContext(SourcesContext)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      className={cn(
        'group/sources inline-flex items-center gap-1.5 rounded-full py-1',
        'text-[10px] font-bold uppercase tracking-wider text-ink-muted',
        'transition-colors hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
        className,
      )}
      {...props}
    >
      <RiBookOpenLine className="h-3 w-3" aria-hidden="true" />
      {children ?? <span>{count} {count === 1 ? 'source' : 'sources'}</span>}
      <RiArrowDownSLine
        className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
        aria-hidden="true"
      />
    </button>
  )
}

export type SourcesContentProps = HTMLAttributes<HTMLDivElement>

export const SourcesContent = ({ className, children, ...props }: SourcesContentProps) => {
  const { open } = useContext(SourcesContext)
  if (!open) return null
  return (
    <div className={cn('mt-2 space-y-1.5 text-xs text-ink-soft', className)} {...props}>
      {children}
    </div>
  )
}

export type SourceProps = {
  n?: number
  title: ReactNode
  href?: string
  className?: string
}

export const Source = ({ n, title, href, className }: SourceProps) => (
  <div className={cn('flex gap-1.5 leading-snug', className)}>
    {typeof n === 'number' && <span className="font-bold text-ink">{n}.</span>}
    {href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-start gap-1 text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        <span>{title}</span>
        <RiExternalLinkLine className="mt-0.5 h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
      </a>
    ) : (
      <span>{title}</span>
    )}
  </div>
)
