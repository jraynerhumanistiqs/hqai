'use client'

// Vercel AI Elements - PromptInput. The composer: a rounded form with an
// auto-growing textarea, a toolbar for tools, and a status-aware submit
// button. Re-skinned to the Wattle Gold tokens and the existing composer
// look (rounded-3xl, hairline border, focus-within lift). Enter sends,
// Shift+Enter inserts a newline.

import { cn } from '@/lib/utils'
import { ArrowUpIcon, Loader2Icon, SquareIcon } from 'lucide-react'
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

export type PromptInputProps = FormHTMLAttributes<HTMLFormElement>

export const PromptInput = ({ className, ...props }: PromptInputProps) => (
  <form
    className={cn(
      'flex flex-col gap-1 rounded-3xl border border-border bg-bg-elevated px-4 py-2',
      'shadow-sm transition-colors focus-within:border-ink',
      className,
    )}
    {...props}
  />
)

export type PromptInputTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const PromptInputTextarea = forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  ({ className, onChange, onKeyDown, rows = 1, ...props }, ref) => {
    const autosize = (el: HTMLTextAreaElement) => {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }

    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full resize-none bg-transparent py-1 text-sm leading-relaxed text-ink',
          'placeholder:text-ink-muted outline-none',
          'max-h-[160px]',
          className,
        )}
        onChange={(e) => {
          autosize(e.currentTarget)
          onChange?.(e)
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.defaultPrevented) return
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            const form = e.currentTarget.closest('form')
            form?.requestSubmit()
          }
        }}
        {...props}
      />
    )
  },
)
PromptInputTextarea.displayName = 'PromptInputTextarea'

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement>

export const PromptInputToolbar = ({ className, ...props }: PromptInputToolbarProps) => (
  <div className={cn('flex items-center justify-between gap-2', className)} {...props} />
)

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>

export const PromptInputTools = ({ className, ...props }: PromptInputToolsProps) => (
  <div className={cn('flex items-center gap-1', className)} {...props} />
)

export type PromptInputButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export const PromptInputButton = ({ className, type = 'button', ...props }: PromptInputButtonProps) => (
  <button
    type={type}
    className={cn(
      'inline-flex min-h-touch items-center justify-center gap-1.5 rounded-full px-3',
      'text-xs font-bold text-ink-soft transition-colors',
      'hover:bg-bg-soft hover:text-ink',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      'disabled:opacity-40 disabled:pointer-events-none',
      className,
    )}
    {...props}
  />
)

export type PromptInputStatus = 'ready' | 'submitted' | 'streaming' | 'error'

export type PromptInputSubmitProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  status?: PromptInputStatus
}

export const PromptInputSubmit = ({ status = 'ready', className, disabled, ...props }: PromptInputSubmitProps) => {
  const busy = status === 'submitted' || status === 'streaming'
  return (
    <button
      type="submit"
      aria-label={busy ? 'Stop generating' : 'Send message'}
      className={cn(
        'inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full',
        'bg-accent text-ink-on-accent transition-all',
        'hover:bg-accent-hover',
        'disabled:cursor-not-allowed disabled:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
        className,
      )}
      disabled={!busy && disabled}
      {...props}
    >
      {status === 'submitted' ? (
        <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : status === 'streaming' ? (
        <SquareIcon className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
      ) : (
        <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  )
}
