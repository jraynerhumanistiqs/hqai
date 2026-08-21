'use client'

// InlineAction - vendored from https://registry.watermelon.sh/r/inline-action.json
// (`npx shadcn add`, then owned locally as shadcn intends).
//
// Three deliberate departures from the upstream file, each forced by this
// codebase rather than taste:
//
//  1. Tailwind v3, not v4. Upstream ships `bg-linear-to-r`, `w-xs` and
//     `md:w-sm`, which are v4-only spellings and compile to nothing here.
//     Replaced with `bg-gradient-to-r` / `max-w-xs` / `md:max-w-sm`.
//  2. Brand tokens, not hardcoded colours. Upstream hardcodes
//     white/#F0F0F0/zinc-900 plus its own `dark:` pairs. The dashboard
//     paints from CSS variables (--bg-elevated/--ink/--border) and
//     defaults to dark, so the literals would have rendered a white pill
//     on a dark page. Tokens repaint for free, which also makes the
//     upstream `theme` prop redundant - it is kept in the signature as a
//     no-op so callsites copied from the registry docs still typecheck.
//  3. The morphing control is split out as `InlineActionButton`. The
//     dashboard's action surfaces are mostly dense rows that already own
//     their own label, description, secondary buttons and error text;
//     they can adopt the idle -> loading -> success animation without
//     being forced into the full-width row card. `InlineAction` (the row
//     card) is unchanged in spirit and still the default export shape.
//
// Behaviour fixes on top of upstream: the control now reports `aria-busy`,
// announces success to screen readers, honours a `disabled` prop, and
// surfaces failures to the caller instead of silently returning to idle.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  motion,
  AnimatePresence,
  MotionConfig,
  type Transition,
} from 'motion/react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success'

const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
  mass: 1,
}

/**
 * Dense rows need a smaller control than the 48px registry default. `xs` is
 * the icon-only tier: it sits at 24px to match the quiet icon buttons it
 * shares a row with, and widens to `loading` only while the bar is on screen
 * so a 24px circle never has to render a progress track.
 */
const SIZES = {
  xs: { height: 'h-6', width: 24, collapsed: 24, loading: 60, pad: 'px-1', text: 'text-[11px]', check: 'size-3.5' },
  sm: { height: 'h-8', width: 92, collapsed: 32, loading: 92, pad: 'px-2 py-2', text: 'text-[11px]', check: 'size-4' },
  md: { height: 'h-12', width: 120, collapsed: 48, loading: 120, pad: 'px-2 py-2', text: 'text-[13px] sm:text-[15px]', check: 'size-6' },
} as const

export type InlineActionSize = keyof typeof SIZES

/**
 * Upstream has a single look. The dashboard distinguishes primary CTAs
 * (Wattle Gold `accent`) from quiet secondary actions, so the control
 * carries that distinction rather than flattening every button it
 * replaces into the same neutral pill.
 */
const TONES = {
  default: { track: 'bg-bg-soft', label: 'text-ink', bar: 'bg-ink', barTrack: 'bg-border' },
  accent: { track: 'bg-accent', label: 'text-ink-on-accent', bar: 'bg-ink-on-accent', barTrack: 'bg-ink-on-accent/30' },
} as const

export type InlineActionTone = keyof typeof TONES

interface InlineActionButtonProps {
  /** Label shown in the idle state. */
  actionText: string
  /** The work to run. Rejecting returns the control to idle. */
  onAction: () => Promise<void>
  size?: InlineActionSize
  /**
   * Idle/loading width in px. Motion animates `width` directly, so this
   * cannot be a utility class - longer labels ("Download DOCX") need to
   * widen the pill without fighting the collapse-to-tick animation.
   */
  width?: number
  /**
   * Render this instead of `actionText` in the idle state, as a circular
   * icon button. `actionText` is still required and becomes the accessible
   * name (plus the loading announcement), so the control never goes
   * unlabelled just because it went visual.
   */
  triggerIcon?: React.ReactNode
  /**
   * Fill the parent's width instead of animating to a pixel width. Used for
   * full-width CTAs, where collapsing to a 48px circle on success would
   * yank the surrounding layout. The tick centres in the full-width pill.
   */
  fullWidth?: boolean
  tone?: InlineActionTone
  disabled?: boolean
  /** Accessible name, when `actionText` alone is ambiguous in context. */
  ariaLabel?: string
  /** Announced to screen readers when the action succeeds. */
  successLabel?: string
  className?: string
}

/**
 * The registry's morphing control on its own: idle label -> indeterminate
 * progress bar -> success tick, which collapses back to idle after 2s.
 */
export const InlineActionButton: React.FC<InlineActionButtonProps> = ({
  actionText,
  onAction,
  size = 'md',
  width,
  triggerIcon,
  fullWidth = false,
  tone = 'default',
  disabled = false,
  ariaLabel,
  successLabel = 'Done',
  className,
}) => {
  const [status, setStatus] = useState<Status>('idle')
  // Upstream calls setState after an await with no unmount guard, which
  // warns (and leaks) when the row unmounts mid-request - common here,
  // since several of these live in lists that refetch on completion.
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const handleTrigger = useCallback(async () => {
    if (status !== 'idle' || disabled) return
    setStatus('loading')
    try {
      await onAction()
      if (alive.current) setStatus('success')
    } catch {
      // The caller owns error messaging (every callsite here already
      // renders its own inline error); we just release the control.
      if (alive.current) setStatus('idle')
    }
  }, [status, disabled, onAction])

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => { if (alive.current) setStatus('idle') }, 2000)
    return () => clearTimeout(timer)
  }, [status])

  const s = SIZES[size]
  const t = TONES[tone]

  // An icon trigger starts as a circle and only widens for the progress bar;
  // a text trigger holds one width until it collapses to the tick. fullWidth
  // opts out of width animation entirely and is driven by the `w-full` class,
  // because motion cannot animate cleanly between a percentage and a pixel.
  const restingWidth = triggerIcon ? s.collapsed : (width ?? s.width)
  const animatedWidth =
    status === 'success' ? s.collapsed
    : status === 'loading' ? (triggerIcon ? s.loading : (width ?? s.loading))
    : restingWidth

  return (
    <MotionConfig transition={springTransition}>
      <motion.div
        className={cn(
          'relative flex items-center overflow-hidden rounded-full',
          fullWidth ? 'w-full justify-center px-2 py-2' : s.pad,
          t.track,
          s.height,
          disabled && status === 'idle' && 'opacity-60',
          className,
        )}
        animate={fullWidth ? undefined : { width: animatedWidth }}
        initial={false}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {status === 'idle' && (
            <motion.button
              key="idle"
              type="button"
              disabled={disabled}
              // An icon-only trigger has no text node, so it always needs a
              // name - fall back to actionText rather than shipping a button
              // that screen readers announce as just "button".
              aria-label={ariaLabel ?? (triggerIcon ? actionText : undefined)}
              title={triggerIcon ? (ariaLabel ?? actionText) : undefined}
              aria-busy={false}
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              onClick={handleTrigger}
              className={cn(
                'w-full rounded-full font-bold whitespace-nowrap transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                'disabled:cursor-not-allowed',
                triggerIcon && 'flex h-full items-center justify-center',
                t.label,
                s.text,
              )}
            >
              {triggerIcon ?? actionText}
            </motion.button>
          )}

          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              className="w-full"
              role="status"
              aria-busy
              aria-label={`${actionText} in progress`}
            >
              <div className={cn('relative h-1.5 flex-1 rounded-full', t.barTrack)}>
                <motion.div
                  className={cn('absolute bottom-0 top-0 w-[30%] rounded-full', t.bar)}
                  initial={{ left: '0%' }}
                  animate={{ left: '70%' }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                  }}
                />
              </div>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ filter: 'blur(4px)', opacity: 0 }}
              animate={{ filter: 'blur(0px)', opacity: 1 }}
              exit={{ filter: 'blur(4px)', opacity: 0 }}
              className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-ink transition-colors"
            >
              <motion.div
                initial={{ x: '0%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
                className="absolute inset-0 z-10 h-full w-full skew-x-[-40deg] bg-gradient-to-r from-transparent via-bg-elevated/50 to-transparent"
              />
              <Check className={cn('stroke-2 text-bg-elevated', s.check)} aria-hidden />
              <span className="sr-only" role="status">{successLabel}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  )
}

interface InlineActionProps extends Omit<InlineActionButtonProps, 'className'> {
  label: string
  icon: React.ReactNode
  /** No-op: this app themes from CSS variables. Kept for registry parity. */
  theme?: 'light' | 'dark' | 'system'
  className?: string
}

/**
 * The registry's full row card: icon chip + label on the left, morphing
 * action on the right.
 */
export const InlineAction: React.FC<InlineActionProps> = ({
  label,
  icon,
  className,
  size = 'md',
  ...action
}) => (
  <div
    className={cn(
      'flex w-full max-w-xs items-center justify-between gap-3 overflow-hidden rounded-full',
      'border border-border bg-bg-elevated p-3 shadow-sm transition-colors md:max-w-sm',
      className,
    )}
  >
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex shrink-0 items-center justify-center rounded-full bg-bg-soft p-2.5 text-ink transition-colors sm:p-3.5">
        <div className="scale-90 sm:scale-100">{icon}</div>
      </div>
      <span className="truncate text-[15px] font-bold text-ink transition-colors sm:text-[18px]">
        {label}
      </span>
    </div>
    <InlineActionButton size={size} {...action} />
  </div>
)
