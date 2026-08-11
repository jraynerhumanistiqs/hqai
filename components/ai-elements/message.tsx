'use client'

// Vercel AI Elements - Message. Row + bubble primitives for the transcript.
// Re-skinned to HQ.ai: user turns are a contained ink bubble aligned right;
// assistant turns are flat, full-width prose (calm, document-like reading for
// an anxious user - per the UX brief). Alignment is driven by a `from` prop
// and exposed to children via the `.is-user` / `.is-assistant` group classes.

import { cn } from '@/lib/utils'
import type { ComponentProps, HTMLAttributes } from 'react'

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant' | 'system'
}

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group/message flex w-full flex-col gap-1',
      from === 'user' ? 'is-user items-end' : 'is-assistant items-start',
      className,
    )}
    data-role={from}
    {...props}
  />
)

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'contained' | 'flat'
}

export const MessageContent = ({ children, className, variant = 'contained', ...props }: MessageContentProps) => (
  <div
    className={cn(
      'text-sm leading-relaxed',
      variant === 'contained'
        ? 'max-w-[85%] rounded-2xl rounded-tr-md bg-ink px-4 py-2.5 text-bg-elevated'
        : 'w-full text-ink',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)

export type MessageAvatarProps = ComponentProps<'span'> & {
  name?: string
}

// Optional avatar primitive. The HQ.ai transcript is avatar-free by design
// (calmer, less "chatbot"), but the primitive is provided for completeness.
export const MessageAvatar = ({ name, className, ...props }: MessageAvatarProps) => (
  <span
    className={cn(
      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
      'bg-bg-soft text-xs font-bold text-ink-soft',
      className,
    )}
    {...props}
  >
    {(name || 'AI').slice(0, 2).toUpperCase()}
  </span>
)
