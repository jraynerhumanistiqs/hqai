'use client'

// AdaptiveSlider - vendored from https://registry.watermelon.sh/r/adaptive-slider.json
// (`npx shadcn add`, then owned locally as shadcn intends).
//
// Upstream ships a finished calorie-tracker demo rather than a control: a
// 60vh card with a hardcoded "Calories" heading and "kCal" unit, its own
// shadow, and no way to pass a label. What is reusable is the mechanic - an
// invisible range input layered over a spring-animated fill and thumb, with
// a per-character animated readout - so that is what is kept. The rest is
// rebuilt for this codebase:
//
//  1. Tailwind v3, not v4. Upstream uses `w-xs`, `sm:w-sm`, `h-13` and
//     `size-13`, which are v4 spellings and compile to nothing here.
//  2. One accent, no gradient. Upstream swaps between three hardcoded
//     palettes (emerald -> pink -> violet) and paints the fill with a
//     gradient. CLAUDE.md is explicit - one accent only, no gradients - so
//     the fill is a flat `bg-accent` and the value colour never changes.
//     The "adaptive" name is kept for registry traceability; the adaptive
//     behaviour it refers to is deliberately not reproduced.
//  3. It is a control, not a card. No wrapper, no fixed height, no shadow -
//     it sits inside whatever field the caller already has.
//  4. Accessible. Upstream gives the input `title="range"` and nothing
//     else; a screen reader announces a nameless slider reading raw
//     numbers. This takes a real label and emits `aria-valuetext` so the
//     value is announced with its unit.

import { useId, useMemo, type FC, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface AdaptiveSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Visible label, rendered above the track unless `hideLabel`. */
  label: string
  /**
   * Overrides the spoken name where the visible label repeats down a list
   * and only context distinguishes the rows - eg. every rubric row is
   * labelled "Importance share", so the criterion name goes here.
   */
  ariaLabel?: string
  hideLabel?: boolean
  /** Appended to the readout and to the spoken value, eg. '%' or 'questions'. */
  unit?: string
  disabled?: boolean
  /** Override how the number is displayed (the unit is appended after). */
  format?: (value: number) => string
  className?: string
}

const DOT_COUNT = 6

export const AdaptiveSlider: FC<AdaptiveSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  ariaLabel,
  hideLabel = false,
  unit,
  disabled = false,
  format,
  className,
}) => {
  const id = useId()
  // Guard against max === min, which would divide by zero and NaN the fill.
  const span = max - min || 1
  const pct = Math.min(100, Math.max(0, ((value - min) / span) * 100))
  const shown = format ? format(value) : String(value)

  const dots = useMemo(
    () => Array.from({ length: DOT_COUNT }).map((_, i) => (
      <span key={i} className="z-10 h-1 w-1 rounded-full bg-ink-muted/40" />
    )),
    [],
  )

  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))

  return (
    <div className={cn('w-full select-none', disabled && 'opacity-60', className)}>
      <div className={cn('mb-1.5 flex items-baseline justify-between gap-2', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <AnimatedNumber value={shown} />
          {unit && <span className="text-xs text-ink-muted">{unit}</span>}
        </div>
      </div>

      <div className="relative flex h-9 w-full items-center overflow-hidden rounded-full bg-bg-soft">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3.5">
          {dots}
        </div>

        {/* Fill. The 36px offsets keep the fill's right edge under the thumb
            centre rather than running past it at the extremes. */}
        {/* initial={false} makes the first paint land on the current value.
            Upstream omits it, so every slider animates in from zero on mount
            - and anywhere the frame loop is not running (a hidden tab, a
            screenshot worker) it simply stays at zero and the control reads
            as empty no matter what the value is. */}
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-20 h-full rounded-full bg-accent"
          initial={false}
          animate={{ width: `calc((${pct} / 100) * (100% - 36px) + 36px)` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handle}
          aria-label={ariaLabel}
          aria-valuetext={unit ? `${shown} ${unit}` : shown}
          className="absolute inset-0 z-40 h-9 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        <motion.div
          className="pointer-events-none absolute top-0 z-30 flex size-9 items-center justify-center"
          initial={false}
          animate={{ left: `calc((${pct} / 100) * (100% - 36px))` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <span className="size-6 rounded-full bg-bg-elevated shadow-[0_1px_3px_rgba(0,0,0,0.2)]" />
        </motion.div>
      </div>
    </div>
  )
}

/** Per-character roll, so a changing value animates digit by digit. */
const AnimatedNumber = ({ value }: { value: string }) => (
  <div className="flex text-sm font-bold tabular-nums text-ink will-change-transform" aria-hidden>
    <AnimatePresence mode="popLayout" initial={false}>
      {value.split('').map((char, i) => (
        <motion.span
          key={char + i}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }}
          exit={{ opacity: 0, y: 6, transition: { duration: 0.1 } }}
        >
          {char === ' ' ? ' ' : char}
        </motion.span>
      ))}
    </AnimatePresence>
  </div>
)
