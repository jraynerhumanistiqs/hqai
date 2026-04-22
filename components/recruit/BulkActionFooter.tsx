'use client'
import { useState, useRef, useEffect } from 'react'

type Stage = 'new' | 'in_review' | 'shortlisted' | 'rejected'

interface Props {
  selectedCount: number
  selectedIds: string[]
  onCompare: () => void
  onClear: () => void
  onAfterBulk: (result: { moved?: number; shared?: number; emailsSent?: number; emailsPending?: number }) => void
}

const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: 'new',         label: 'New' },
  { value: 'in_review',   label: 'In review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected',    label: 'Rejected' },
]

export function BulkActionFooter({ selectedCount, selectedIds, onCompare, onClear, onAfterBulk }: Props) {
  const [stageOpen, setStageOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [busy, setBusy]           = useState(false)
  const [toast, setToast]         = useState<string | null>(null)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const shareRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (stageRef.current && !stageRef.current.contains(e.target as Node)) setStageOpen(false)
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  async function bulkStage(stage: Stage) {
    setStageOpen(false)
    setBusy(true)
    try {
      const res = await fetch('/api/prescreen/responses/bulk/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, stage }),
      })
      const data = await res.json()
      if (!res.ok) { setToast(data.error || 'Bulk update failed'); return }
      const label = STAGE_OPTIONS.find(o => o.value === stage)?.label ?? stage
      const parts = [`${data.updated ?? selectedIds.length} candidates moved to ${label}`]
      if (data.emailsSent) parts.push(`${data.emailsSent} outcome emails sent`)
      else if (data.emailsPending) parts.push(`${data.emailsPending} pending (auto-send off)`)
      setToast(parts.join('. ') + '.')
      onAfterBulk({ moved: data.updated ?? selectedIds.length, emailsSent: data.emailsSent, emailsPending: data.emailsPending })
    } catch {
      setToast('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function bulkShare(days: number) {
    setShareOpen(false)
    setBusy(true)
    try {
      const res = await fetch('/api/prescreen/responses/bulk/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, expiresInDays: days }),
      })
      const data = await res.json()
      if (!res.ok) { setToast(data.error || 'Bulk share failed'); return }
      setToast(`${data.links?.length ?? selectedIds.length} share links created.`)
      onAfterBulk({ shared: data.links?.length ?? selectedIds.length })
    } catch {
      setToast('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function bulkReject() { await bulkStage('rejected') }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black text-white rounded-full shadow-card px-4 py-2 flex items-center gap-3">
        <span className="text-xs font-bold">{selectedCount} selected</span>

        <button
          onClick={onCompare}
          disabled={selectedCount < 2 || selectedCount > 4}
          className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed"
        >Compare ({selectedCount})</button>

        <div ref={stageRef} className="relative">
          <button
            onClick={() => { setStageOpen(v => !v); setShareOpen(false) }}
            disabled={busy}
            className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
          >Move to stage &#9662;</button>
          {stageOpen && (
            <div className="absolute bottom-full mb-2 right-0 bg-white text-black rounded-xl shadow-card border border-border overflow-hidden min-w-[160px]">
              {STAGE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => bulkStage(o.value)}
                  className="block w-full text-left text-xs font-bold px-3 py-2 hover:bg-light"
                >{o.label}</button>
              ))}
            </div>
          )}
        </div>

        <div ref={shareRef} className="relative">
          <button
            onClick={() => { setShareOpen(v => !v); setStageOpen(false) }}
            disabled={busy}
            className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
          >Share all &#9662;</button>
          {shareOpen && (
            <div className="absolute bottom-full mb-2 right-0 bg-white text-black rounded-xl shadow-card border border-border overflow-hidden min-w-[180px]">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => bulkShare(d)}
                  className="block w-full text-left text-xs font-bold px-3 py-2 hover:bg-light"
                >Expires in {d} days</button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={bulkReject}
          disabled={busy}
          className="text-xs font-bold px-3 py-1 rounded-full bg-danger/20 text-white hover:bg-danger/30 disabled:opacity-40"
        >Reject all</button>

        <button
          onClick={onClear}
          className="text-xs font-bold text-white/70 hover:text-white"
        >Clear</button>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black text-white rounded-2xl shadow-card px-4 py-3 text-xs font-bold max-w-md">
          {toast}
        </div>
      )}
    </>
  )
}
