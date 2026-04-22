'use client'
import { useEffect, useState } from 'react'
import type { PrescreenSession } from '@/lib/recruit-types'

function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

export default function RecruitBinPage() {
  const [sessions, setSessions] = useState<PrescreenSession[]>([])
  const [loading, setLoading]   = useState(true)
  const [busyId, setBusyId]     = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const d = await fetch('/api/prescreen/sessions/bin').then(r => r.json())
      setSessions(d.sessions ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleRestore(id: string) {
    setBusyId(id)
    try {
      await fetch(`/api/prescreen/sessions/${id}/restore`, { method: 'POST' })
      await load()
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

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <h1 className="font-display text-2xl sm:text-h1 font-bold text-charcoal uppercase tracking-wide mb-1">Bin</h1>
        <p className="text-xs sm:text-sm text-mid mb-6 sm:mb-8">
          Deleted roles are kept for 80 days, then permanently removed.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white shadow-card rounded-2xl p-10 text-center">
            <div className="w-14 h-14 bg-light rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-mid" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-charcoal">Bin is empty</p>
            <p className="text-xs text-mid mt-1">Deleted roles will appear here for 80 days.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="bg-white shadow-card rounded-2xl p-4 sm:p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-charcoal truncate">{s.role_title}</p>
                  <p className="text-xs text-mid truncate">{s.company}</p>
                  {s.deleted_at && (
                    <p className="text-[11px] text-muted mt-1">Deleted {relTime(s.deleted_at)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRestore(s.id)}
                    disabled={busyId === s.id}
                    className="bg-black hover:bg-[#1a1a1a] text-white text-xs font-bold px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                  >
                    {busyId === s.id ? '…' : 'Restore'}
                  </button>
                  <button
                    onClick={() => handlePurge(s.id)}
                    disabled={busyId === s.id}
                    className="bg-white hover:bg-light border border-border text-danger text-xs font-bold px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                  >
                    Delete permanently
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
