'use client'
import { useState } from 'react'
import type { PrescreenSession } from '@/lib/recruit-types'

interface Props {
  session: PrescreenSession
  onCancel: () => void
  onConfirmed: (id: string) => Promise<void>
}

export function DeleteRoleConfirm({ session, onCancel, onConfirmed }: Props) {
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canConfirm = typed.trim().toLowerCase() === session.role_title.trim().toLowerCase()

  async function handleConfirm() {
    if (!canConfirm) return
    setLoading(true)
    setError('')
    try {
      await onConfirmed(session.id)
    } catch {
      setError('Failed to delete. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-modal max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider mb-2">
          Delete role?
        </h3>
        <p className="text-sm text-mid mb-4 leading-relaxed">
          This will move <span className="font-bold text-charcoal">&ldquo;{session.role_title}&rdquo;</span> to the Bin. You can restore it within 80 days.
        </p>

        <label className="block text-xs font-bold text-mid uppercase tracking-wider mb-1.5">
          Type <span className="text-charcoal">{session.role_title}</span> to confirm
        </label>
        <input
          type="text"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder="Type the role title to confirm"
          className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-black placeholder-mid/60 focus:outline-none focus:border-accent/60 bg-white transition-colors"
          autoFocus
        />

        {error && <p className="text-xs text-danger mt-2">{error}</p>}

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="bg-white border border-border text-mid hover:text-charcoal text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="bg-danger text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting…
              </>
            ) : (
              'Move to Bin'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
