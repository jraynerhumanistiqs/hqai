'use client'
import { useEffect, useState } from 'react'
import type { PrescreenSession } from '@/lib/recruit-types'

interface Props {
  onRestored?: () => void
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/**
 * Compact Bin panel that lives at the bottom of the HQ Recruit active-roles
 * container. Collapsed by default (just a header), expands inline to show
 * deleted roles with Restore / Delete permanently actions.
 */
export function BinPanel({ onRestored }: Props) {
  const [open, setOpen]             = useState(false)
  const [sessions, setSessions]     = useState<PrescreenSession[]>([])
  const [loading, setLoading]       = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [busyId, setBusyId]         = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const d = await fetch('/api/prescreen/sessions/bin').then(r => r.json())
      setSessions(d.sessions ?? [])
      setLoadedOnce(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && !loadedOnce) load()
  }, [open, loadedOnce])

  async function handleRestore(id: string) {
    setBusyId(id)
    try {
      await fetch(`/api/prescreen/sessions/${id}/restore`, { method: 'POST' })
      await load()
      onRestored?.()
    } finally {
      setBusyId(null)
    }
  }

  async function handlePurge(id: string) {
    if (!window.confirm('Permanently delete? This cannot be undone.')) return
    setBusyId(id)
    try {
      await fetch(`/api/prescreen/sessions/${id}/purge`, { method: 'DELETE' })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const count = sessions.length

  return (
    <div className="mt-auto border-t border-border bg-bg/40 flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-mid hover:text-black transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 uppercase tracking-widest">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          Bin
          {loadedOnce && count > 0 && (
            <span className="ml-1 text-[10px] font-bold text-mid">({count})</span>
          )}
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </button>

      {open && (
        <div className="max-h-48 overflow-y-auto border-t border-border">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="px-4 py-3 text-xs text-mid">Bin is empty. Deleted roles appear here for 80 days.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map(s => (
                <li key={s.id} className="px-4 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-charcoal truncate">{s.role_title}</p>
                    <p className="text-[11px] text-mid truncate">
                      {s.company}
                      {s.deleted_at && <> &middot; {relTime(s.deleted_at)}</>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(s.id)}
                    disabled={busyId === s.id}
                    className="text-[11px] font-bold text-accent hover:text-accent2 transition-colors disabled:opacity-50"
                  >
                    {busyId === s.id ? '…' : 'Restore'}
                  </button>
                  <button
                    onClick={() => handlePurge(s.id)}
                    disabled={busyId === s.id}
                    className="text-[11px] font-bold text-danger hover:text-black transition-colors disabled:opacity-50"
                    title="Delete permanently"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
