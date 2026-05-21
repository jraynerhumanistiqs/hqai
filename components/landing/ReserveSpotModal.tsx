'use client'

// Email-capture modal for the marketplace "Reserve your spot" CTA.
// Posts to /api/marketplace/reserve. First-100-discount messaging per
// section 4 + section 9 of the brief.

import { useEffect, useRef, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ReserveSpotModal({ open, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setDone(false)
    // Focus the email input on open.
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/marketplace/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.ok === false) {
        setError(json.error || 'Something went wrong. Try again in a moment.')
      } else {
        setDone(true)
      }
    } catch {
      setError('Network error. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reserve-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-3xl border border-border bg-bg-elevated p-7 shadow-modal">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Reserve your spot</p>
            <h2 id="reserve-title" className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
              Get the $25 Letter of Offer first.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 rounded-full p-2 text-ink-muted transition-colors hover:bg-bg-soft hover:text-ink"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>

        {!done ? (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink">Your email</span>
              <input
                ref={inputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com.au"
                className="mt-1.5 block w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
                disabled={submitting}
              />
            </label>
            <p className="text-xs text-ink-muted">
              First 100 reservations get $10 off launch pricing. No card today.
            </p>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-ink-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? 'Reserving...' : 'Reserve my spot'}
            </button>
          </form>
        ) : (
          <div className="mt-5 rounded-2xl bg-accent-soft p-4 text-sm text-ink">
            You&apos;re on the list. We&apos;ll email you the moment the $25 Letter of Offer goes live.
          </div>
        )}
      </div>
    </div>
  )
}
