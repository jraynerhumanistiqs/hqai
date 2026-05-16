'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import type { PrescreenSession, CandidateResponse } from '@/lib/recruit-types'
import { CreateRoleModal } from './CreateRoleModal'
import { EditRoleModal } from './EditRoleModal'
import { DeleteRoleConfirm } from './DeleteRoleConfirm'
import { RoleDetail } from './RoleDetail'
import { BinPanel } from './BinPanel'

export function RecruitDashboard() {
  const searchParams = useSearchParams()
  const requestedSessionId = searchParams?.get('session') ?? null

  const [sessions, setSessions]         = useState<PrescreenSession[]>([])
  const [selected, setSelected]         = useState<PrescreenSession | null>(null)
  const [responses, setResponses]       = useState<CandidateResponse[]>([])
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [loadingSessions, setLoadingSessions]   = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [candidateUrl, setCandidateUrl] = useState('')
  const [menuOpenFor, setMenuOpenFor]   = useState<string | null>(null)
  const [editTarget, setEditTarget]     = useState<PrescreenSession | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PrescreenSession | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch('/api/prescreen/sessions')
      .then(r => r.json())
      .then(d => {
        const list: PrescreenSession[] = d.sessions ?? []
        setSessions(list)
        // If the URL has ?session=<id> (set by CV Scoring Agent's
        // Send-to-Shortlist redirect), auto-select that role so the user
        // lands directly on the candidates they just sent through. Fall
        // back to first session if the id can't be matched (e.g. fresh
        // mount with no fetched data yet).
        if (requestedSessionId) {
          const match = list.find(s => s.id === requestedSessionId)
          if (match) {
            setSelected(match)
            return
          }
        }
        if (list.length > 0) setSelected(list[0])
      })
      .catch(console.error)
      .finally(() => setLoadingSessions(false))
  }, [requestedSessionId])

  // Close the ⋮ menu on outside click
  useEffect(() => {
    if (!menuOpenFor) return
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenFor(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpenFor])

  const loadResponses = useCallback(async (session: PrescreenSession) => {
    setLoadingResponses(true)
    try {
      const d = await fetch(`/api/prescreen/sessions/${session.id}/responses`).then(r => r.json())
      setResponses(d.responses ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingResponses(false)
    }
  }, [])

  useEffect(() => {
    if (!selected) return
    setResponses([])
    loadResponses(selected)
  }, [selected, loadResponses])

  function handleCreated(session: PrescreenSession, url: string) {
    setSessions(prev => [session, ...prev])
    setSelected(session)
    setCandidateUrl(url)
    setResponses([])
    setShowCreate(false)
  }

  function handleEdited(updated: PrescreenSession) {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
    if (selected?.id === updated.id) setSelected(updated)
    setEditTarget(null)
  }

  function handleSessionUpdated(updated: PrescreenSession) {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
    if (selected?.id === updated.id) setSelected(updated)
  }

  async function handleRestored() {
    // Reload sessions so the restored role appears in the active list
    try {
      const d = await fetch('/api/prescreen/sessions').then(r => r.json())
      setSessions(d.sessions ?? [])
    } catch (e) { console.error(e) }
  }

  async function handleDeleteConfirmed(id: string) {
    await fetch(`/api/prescreen/sessions/${id}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== id))
    if (selected?.id === id) {
      setSelected(prev => {
        const rest = sessions.filter(s => s.id !== id)
        return rest.length > 0 ? rest[0] : null
      })
      setCandidateUrl('')
    }
    setDeleteTarget(null)
  }

  async function handlePatchResponse(id: string, patch: Partial<CandidateResponse>) {
    await fetch(`/api/prescreen/responses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setResponses(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  async function handleShareResponse(id: string): Promise<string> {
    const data = await fetch(`/api/prescreen/responses/${id}/share-export`, { method: 'POST' }).then(r => r.json())
    setResponses(prev => prev.map(r => r.id === id ? { ...r, status: 'shared' } : r))
    return data.shareUrl
  }

  const activeSessions = sessions.filter(s => s.status === 'active')
  const draftSessions  = sessions.filter(s => s.status === 'draft' || s.status === 'closed')
  const activeCount    = activeSessions.length
  const draftCount     = draftSessions.length

  const [activeOpen, setActiveOpen] = useState(true)
  const [draftOpen,  setDraftOpen]  = useState(true)

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-bg">

      {/* -- Left panel: role list -- */}
      <div className={`w-full lg:w-64 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-bg-elevated flex-col ${selected ? 'hidden lg:flex' : 'flex'}`}>

        {/* Header - matches Campaign Coach + CV Screening header style */}
        <div className="px-4 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-base sm:text-lg font-bold text-charcoal uppercase tracking-wider">
              Shortlist Agent
            </h1>
            <span className="bg-light text-mid text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">
              New
            </span>
          </div>
          <p className="text-xs text-muted mb-2">
            {activeCount} active · {draftCount} draft / pending
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-black hover:bg-charcoal text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
          >
            + New role
          </button>
        </div>

        {/* Role list (scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-mid mb-2">No roles yet</p>
              <button
                onClick={() => setShowCreate(true)}
                className="text-xs text-accent hover:text-accent2 font-bold transition-colors"
              >
                Create your first role →
              </button>
            </div>
          ) : (
            <>
              <GroupHeader label="Active" count={activeCount} open={activeOpen} onToggle={() => setActiveOpen(v => !v)} tone="active" />
              {activeOpen && activeSessions.length === 0 && (
                <p className="text-xs text-mid px-4 py-3">No active roles.</p>
              )}
              {activeOpen && activeSessions.map(s => (
                <SessionRow
                  key={s.id}
                  s={s}
                  selected={selected?.id === s.id}
                  onSelect={() => { setSelected(s); setCandidateUrl('') }}
                  menuOpen={menuOpenFor === s.id}
                  onMenuToggle={() => setMenuOpenFor(prev => prev === s.id ? null : s.id)}
                  menuRef={menuRef}
                  onEdit={() => { setEditTarget(s); setMenuOpenFor(null) }}
                  onDelete={() => { setDeleteTarget(s); setMenuOpenFor(null) }}
                />
              ))}

              <GroupHeader label="Draft / Pending" count={draftCount} open={draftOpen} onToggle={() => setDraftOpen(v => !v)} tone="draft" />
              {draftOpen && draftSessions.length === 0 && (
                <p className="text-xs text-mid px-4 py-3">No drafts. Use “Save as draft” when creating a role.</p>
              )}
              {draftOpen && draftSessions.map(s => (
                <SessionRow
                  key={s.id}
                  s={s}
                  selected={selected?.id === s.id}
                  onSelect={() => { setSelected(s); setCandidateUrl('') }}
                  menuOpen={menuOpenFor === s.id}
                  onMenuToggle={() => setMenuOpenFor(prev => prev === s.id ? null : s.id)}
                  menuRef={menuRef}
                  onEdit={() => { setEditTarget(s); setMenuOpenFor(null) }}
                  onDelete={() => { setDeleteTarget(s); setMenuOpenFor(null) }}
                />
              ))}
            </>
          )}
        </div>

        {/* Bin panel: pinned to the bottom-right of the active-roles container */}
        <BinPanel onRestored={handleRestored} />
      </div>

      {/* -- Right panel: role detail -- */}
      <div className={`flex-1 overflow-hidden ${selected ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
        {selected ? (
          <>
            {/* Mobile back bar */}
            <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg-elevated flex-shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1.5 text-sm font-bold text-charcoal hover:text-ink transition-colors"
                aria-label="Back to roles"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd"/>
                </svg>
                Back to roles
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RoleDetail
                session={selected}
                responses={responses}
                loadingResponses={loadingResponses}
                initialCandidateUrl={candidateUrl}
                onPatchResponse={handlePatchResponse}
                onShareResponse={handleShareResponse}
                onSessionUpdated={handleSessionUpdated}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs px-4">
              <div className="w-14 h-14 bg-accent3 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-bold text-ink mb-1">Select a role</h2>
              <p className="text-sm text-mid mb-5">
                Choose a role from the left panel, or create a new one to start receiving video pre-screens.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-accent hover:bg-accent2 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
              >
                + New Role
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create role modal */}
      {showCreate && (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Edit role modal */}
      {editTarget && (
        <EditRoleModal
          session={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEdited}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteRoleConfirm
          session={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirmed={handleDeleteConfirmed}
        />
      )}
    </div>
  )
}

function GroupHeader({ label, count, open, onToggle, tone }: {
  label: string; count: number; open: boolean; onToggle: () => void
  tone: 'active' | 'draft'
}) {
  const toneCls = tone === 'active'
    ? 'bg-success/10 text-success hover:bg-success/15'
    : 'bg-warning/10 text-warning hover:bg-warning/15'
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-4 py-2 border-b border-border transition-colors ${toneCls}`}
    >
      <span className="flex items-center gap-1.5">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path fillRule="evenodd" d="M6 4l8 6-8 6V4z" clipRule="evenodd" />
        </svg>
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </span>
      <span className="text-[11px] font-bold">{count}</span>
    </button>
  )
}

function SessionRow({
  s, selected, onSelect, menuOpen, onMenuToggle, menuRef, onEdit, onDelete,
}: {
  s: PrescreenSession
  selected: boolean
  onSelect: () => void
  menuOpen: boolean
  onMenuToggle: () => void
  menuRef: React.RefObject<HTMLDivElement | null>
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`relative w-full transition-all border-l-2 ${
        selected ? 'bg-accent3 border-l-accent' : 'border-l-transparent hover:bg-bg'
      }`}
    >
      <button onClick={onSelect} className="w-full text-left px-4 py-3 pr-10">
        <p className={`text-sm font-bold truncate leading-snug ${selected ? 'text-accent2' : 'text-ink'}`}>
          {s.role_title}
        </p>
        <p className="text-xs text-mid truncate mt-0.5">{s.company}</p>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onMenuToggle() }}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-charcoal hover:bg-light transition-colors"
        aria-label="Role actions"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <circle cx="10" cy="4"  r="1.6"/>
          <circle cx="10" cy="10" r="1.6"/>
          <circle cx="10" cy="16" r="1.6"/>
        </svg>
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-9 right-2 z-20 bg-bg-elevated shadow-modal rounded-xl border border-border py-1 w-36"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="w-full text-left px-3 py-2 text-sm font-bold text-charcoal hover:bg-light transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="w-full text-left px-3 py-2 text-sm font-bold text-danger hover:bg-light transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
