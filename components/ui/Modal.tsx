'use client'

// Shared modal shell. One backdrop (bg-ink/60 backdrop-blur-sm), one
// panel radius (rounded-panel), one shadow (shadow-modal), consistent
// header/footer padding. Replaces the per-modal soup of bg-ink/30 vs /60
// vs /70 backdrops and ad-hoc panel chrome.
//
// Closes on Escape and backdrop click (unless dismissable={false}).
// Respects prefers-reduced-motion via tailwindcss-animate motion-reduce.

import * as React from 'react'
import { twMerge } from 'tailwind-merge'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  /** Eyebrow micro-label shown above the title. */
  eyebrow?: string
  children: React.ReactNode
  /** Footer actions row, rendered with a top border + padding. */
  footer?: React.ReactNode
  /** Tailwind max-width class for the panel. Defaults to max-w-lg. */
  size?: string
  /** When false, backdrop click + Escape do not close. */
  dismissable?: boolean
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = 'max-w-lg',
  dismissable = true,
  className,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissable) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, dismissable, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-fast motion-reduce:animate-none"
      onClick={dismissable ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={twMerge(
          'w-full bg-bg-elevated text-ink rounded-panel shadow-modal border border-border max-h-[90vh] flex flex-col overflow-hidden',
          'animate-in zoom-in-95 fade-in duration-base motion-reduce:animate-none',
          size,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || eyebrow) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div className="min-w-0">
              {eyebrow && (
                <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted mb-1">
                  {eyebrow}
                </div>
              )}
              {title && (
                <h2 className="font-display text-h3 text-ink leading-tight">{title}</h2>
              )}
            </div>
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 -mr-2 -mt-1 min-h-touch min-w-touch flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="px-6 pb-6 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-soft/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
