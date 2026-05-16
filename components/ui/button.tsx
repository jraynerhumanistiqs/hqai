'use client'

// A4 - typed button variants via class-variance-authority.
//
// Replaces the .btn-* string-soup in globals.css. Variants encode the
// brand-kit's 4 button roles (primary, secondary, ghost, danger),
// 3 sizes (sm / md / lg) plus the icon-only variant which enforces the
// A0.7 44px touch target. All colours go through CSS variables so the
// same component renders correctly under Option 2 (marketing) and
// Option 3 (product) without a single per-theme code path.
//
// Borrowed from shadcn/ui but hand-rolled - no CLI, no peer deps,
// no namespace clashes.

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

function cn(...classes: Array<string | undefined | false | null>) {
  return twMerge(classes.filter(Boolean).join(' '))
}

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-bold whitespace-nowrap select-none',
    'transition-colors duration-fast ease-natural',
    // A0.6 - focus-visible ring uses --accent so it has clear contrast
    // on both light and dark themes.
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'disabled:opacity-60 disabled:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:   'bg-accent text-ink-on-accent hover:bg-accent-hover',
        secondary: 'bg-bg-soft text-ink hover:bg-bg-elevated border border-border',
        ghost:     'bg-transparent text-ink hover:bg-bg-soft',
        outline:   'bg-transparent text-ink border border-border hover:bg-bg-soft',
        danger:    'bg-danger text-white hover:opacity-90',
        link:      'bg-transparent text-accent underline-offset-4 hover:underline px-0',
      },
      size: {
        sm:   'h-9 px-3.5 text-xs rounded-full',
        md:   'h-10 px-5 text-small rounded-full',
        lg:   'h-12 px-6 text-body rounded-full',
        // A0.7 - min 44x44 touch target. Used by icon-only buttons.
        icon: 'min-h-touch min-w-touch p-2 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size:    'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * When true, renders as a link-style affordance with no padding so
   * inline text actions don't get button-sized hit areas they shouldn't.
   */
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...rest}
      />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
