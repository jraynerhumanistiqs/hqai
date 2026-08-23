'use client'

// Vercel AI Elements - Conversation. A scroll container that auto-sticks to
// the newest message while streaming (via use-stick-to-bottom) and offers a
// "jump to latest" affordance when the user has scrolled up. Re-skinned to
// the Wattle Gold tokens.

import { cn } from '@/lib/utils'
import { RiArrowDownLine } from '@remixicon/react'
import type { ComponentProps } from 'react'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'

export type ConversationProps = ComponentProps<typeof StickToBottom>

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn('relative flex-1 overflow-y-auto scrollbar-thin', className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
)

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>

export const ConversationContent = ({ className, ...props }: ConversationContentProps) => (
  <StickToBottom.Content className={cn('px-3 sm:px-6', className)} {...props} />
)

export type ConversationScrollButtonProps = ComponentProps<'button'>

export const ConversationScrollButton = ({ className, ...props }: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  if (isAtBottom) return null

  return (
    <button
      type="button"
      aria-label="Scroll to latest"
      onClick={() => scrollToBottom()}
      className={cn(
        'absolute bottom-4 left-1/2 -translate-x-1/2 z-10',
        'inline-flex items-center justify-center rounded-full',
        'h-9 w-9 bg-bg-elevated text-ink border border-border shadow-float',
        'hover:bg-bg-soft transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
        className,
      )}
      {...props}
    >
      <RiArrowDownLine className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
