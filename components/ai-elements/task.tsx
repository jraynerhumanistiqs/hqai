'use client'

// Vercel AI Elements - Task. A compact, collapsible list of the steps the
// assistant is working through (e.g. "Checking the Fair Work rules" ->
// "Writing your answer"). Re-skinned to Wattle Gold and used to keep an
// anxious user informed while a grounded answer is retrieved and drafted.

import { cn } from '@/lib/utils'
import { CheckIcon, ChevronDownIcon, Loader2Icon } from 'lucide-react'
import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from 'react'

const TaskContext = createContext<{ open: boolean; toggle: () => void }>({
  open: true,
  toggle: () => {},
})

export type TaskProps = HTMLAttributes<HTMLDivElement> & {
  defaultOpen?: boolean
}

export const Task = ({ className, defaultOpen = true, children, ...props }: TaskProps) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <TaskContext.Provider value={{ open, toggle: () => setOpen((v) => !v) }}>
      <div
        className={cn('rounded-2xl border border-border bg-bg-soft/60 px-3.5 py-2.5', className)}
        {...props}
      >
        {children}
      </div>
    </TaskContext.Provider>
  )
}

export type TaskTriggerProps = HTMLAttributes<HTMLButtonElement> & {
  title: ReactNode
}

export const TaskTrigger = ({ title, className, ...props }: TaskTriggerProps) => {
  const { open, toggle } = useContext(TaskContext)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      className={cn(
        'flex w-full items-center gap-1.5 text-left text-xs font-bold text-ink-soft',
        'transition-colors hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-md',
        className,
      )}
      {...props}
    >
      <span className="flex-1">{title}</span>
      <ChevronDownIcon
        className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
        aria-hidden="true"
      />
    </button>
  )
}

export type TaskContentProps = HTMLAttributes<HTMLDivElement>

export const TaskContent = ({ className, children, ...props }: TaskContentProps) => {
  const { open } = useContext(TaskContext)
  if (!open) return null
  return (
    <div className={cn('mt-2 space-y-1.5', className)} {...props}>
      {children}
    </div>
  )
}

export type TaskItemProps = HTMLAttributes<HTMLDivElement> & {
  state?: 'active' | 'done' | 'pending'
}

export const TaskItem = ({ state = 'pending', className, children, ...props }: TaskItemProps) => (
  <div
    className={cn(
      'flex items-center gap-2 text-xs',
      state === 'done' ? 'text-ink-soft' : state === 'active' ? 'text-ink' : 'text-ink-muted',
      className,
    )}
    {...props}
  >
    <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
      {state === 'active' ? (
        <Loader2Icon className="h-3.5 w-3.5 animate-spin text-clay-ink" />
      ) : state === 'done' ? (
        <CheckIcon className="h-3.5 w-3.5 text-success" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
      )}
    </span>
    <span>{children}</span>
  </div>
)
