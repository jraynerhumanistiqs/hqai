'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import type { PrescreenSession, CandidateResponse } from '@/lib/recruit-types'
import { RoleDetail } from './RoleDetail'
// The create / edit / delete-role modals and the bin panel only render when
// the recruiter opens them, so keep their JS out of the recruit dashboard's
// initial bundle - each chunk loads the first time it's opened. (Named
// exports, so map through .then. ssr:false - nothing to render until open.)
const CreateRoleModal = dynamic(() => import('./CreateRoleModal').then(m => m.CreateRoleModal), { ssr: false })
const EditRoleModal = dynamic(() => import('./EditRoleModal').then(m => m.EditRoleModal), { ssr: false })
const DeleteRoleConfirm = dynamic(() => import('./DeleteRoleConfirm').then(m => m.DeleteRoleConfirm), { ssr: false })
const BinPanel = dynamic(() => import('./BinPanel').then(m => m.BinPanel), { ssr: false })

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
        // lands directly on the candidates they just sent through. This is
        // the only auto-select: when there is no ?session= match the user
        // lands on the clean Active Roles list and picks a role themselves.
        if (requestedSessionId) {
          const match = list.find(s => s.id === requestedSessionId)
          if (match) setSelected(match)
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSessions(false))
  }, [requestedSessionId])

  // Close the per-row actions menu on outside click
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
      // Return to the full Active Roles list rather than silently jumping
      // to another role, so the user keeps their place in the new flow.
      setSelected(null)
      setCandidateUrl('')
    }
    setDeleteTarget(null)
  }

  async function handlePatchResponse(id: string, patch: Partial<CandidateResponse>) {
    const res = await fetch(`/api/prescreen/responses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    // Prefer the server's returned row. The patch we send can contain
    // virtual verbs (e.g. shortlist_action: 'promote') that the route
    // translates into real columns (shortlisted_at + shortlisted_by) -
    // merging the raw patch would never reflect those, so the Shortlist
    // and Decision steps wouldn't update. Fall back to the optimistic
    // patch only if the response body is unusable.
    let merged: Partial<CandidateResponse> | null = null
    try {
      const data = await res.json()
      if (data && data.response) merged = data.response as Partial<CandidateResponse>
    } catch {
      // ignore - fall back below
    }
    const applied = merged ?? patch
    setResponses(prev => prev.map(r => r.id === id ? { ...r, ...applied } : r))
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

  // ── Role selected: full-width detail with a breadcrumb + role switcher ──
  if (selected) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-bg">
        <RoleBreadcrumb
          selected={selected}
          activeSessions={activeSessions}
          draftSessions={draftSessions}
          onBackToRoles={() => { setSelected(null); setCandidateUrl('') }}
          onSwitch={(s) => { setSelected(s); setCandidateUrl('') }}
          onNewRole={() => setShowCreate(true)}
        />
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

        {/* Create role modal (reachable from the switcher popover) */}
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

  // ── No role selected: clean full-width "Active Roles" list ──
  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">

          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">
                Active Roles
              </h1>
              <p className="text-xs text-ink-muted mt-1">
                {activeCount} active · {draftCount} draft / pending
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-accent hover:bg-accent-hover text-ink-on-accent text-xs sm:text-sm font-bold px-4 py-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              + New role
            </button>
          </div>

          {/* List */}
          {loadingSessions ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border border-border bg-bg-elevated">
              <div className="w-14 h-14 bg-bg-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h2 className="font-display text-lg font-bold text-ink mb-1">No roles yet</h2>
              <p className="text-sm text-ink-soft mb-5 max-w-xs mx-auto">
                Create a role to start receiving video pre-screens from candidates.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-accent hover:bg-accent-hover text-ink-on-accent text-sm font-bold px-5 py-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                + New role
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <RoleGroup
                label="Active"
                count={activeCount}
                open={activeOpen}
                onToggle={() => setActiveOpen(v => !v)}
                sessions={activeSessions}
                emptyLabel="No active roles."
                menuOpenFor={menuOpenFor}
                setMenuOpenFor={setMenuOpenFor}
                menuRef={menuRef}
                onSelect={(s) => { setSelected(s); setCandidateUrl('') }}
                onEdit={(s) => { setEditTarget(s); setMenuOpenFor(null) }}
                onDelete={(s) => { setDeleteTarget(s); setMenuOpenFor(null) }}
              />
              <RoleGroup
                label="Draft & closed"
                count={draftCount}
                open={draftOpen}
                onToggle={() => setDraftOpen(v => !v)}
                sessions={draftSessions}
                emptyLabel='No drafts. Use "Save as draft" when creating a role.'
                menuOpenFor={menuOpenFor}
                setMenuOpenFor={setMenuOpenFor}
                menuRef={menuRef}
                onSelect={(s) => { setSelected(s); setCandidateUrl('') }}
                onEdit={(s) => { setEditTarget(s); setMenuOpenFor(null) }}
                onDelete={(s) => { setDeleteTarget(s); setMenuOpenFor(null) }}
              />
            </div>
          )}

          {/* Bin panel */}
          <div className="mt-6">
            <BinPanel onRestored={handleRestored} />
          </div>
        </div>
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

/* ── Breadcrumb bar + role switcher (shown above RoleDetail) ───────────── */

function RoleBreadcrumb({
  selected, activeSessions, draftSessions, onBackToRoles, onSwitch, onNewRole,
}: {
  selected: PrescreenSession
  activeSessions: PrescreenSession[]
  draftSessions: PrescreenSession[]
  onBackToRoles: () => void
  onSwitch: (s: PrescreenSession) => void
  onNewRole: () => void
}) {
  const [open, setOpen] = useState(false)
  const popRef = useRef<HTMLDivElement | null>(null)

  // Dismiss on outside click + Escape
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative flex-shrink-0 border-b border-border bg-bg-elevated">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 px-3 sm:px-5 py-2 min-h-touch"
      >
        <button
          onClick={onBackToRoles}
          className="inline-flex items-center min-h-touch px-2 -ml-1 rounded-lg text-sm font-bold text-ink-soft hover:text-ink hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          Roles
        </button>

        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="w-4 h-4 text-ink-muted flex-shrink-0">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>

        <button
          onClick={() => setOpen(v => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 min-h-touch min-w-0 px-2.5 rounded-lg text-sm font-bold text-ink hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <span className="truncate max-w-[12rem] sm:max-w-xs">{selected.role_title}</span>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={`w-4 h-4 flex-shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </nav>

      {open && (
        <div
          ref={popRef}
          role="menu"
          aria-label="Switch role"
          className="absolute left-3 sm:left-5 top-full mt-1 z-30 w-72 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto bg-bg-elevated border border-border rounded-2xl shadow-popover py-2"
        >
          <SwitcherGroup
            label="Active"
            sessions={activeSessions}
            selectedId={selected.id}
            onChoose={(s) => { onSwitch(s); setOpen(false) }}
          />
          <SwitcherGroup
            label="Draft & closed"
            sessions={draftSessions}
            selectedId={selected.id}
            onChoose={(s) => { onSwitch(s); setOpen(false) }}
          />

          <div className="border-t border-border mt-1 pt-1">
            <button
              role="menuitem"
              onClick={() => { onBackToRoles(); setOpen(false) }}
              className="w-full text-left flex items-center min-h-touch px-3 text-sm font-bold text-ink-soft hover:bg-bg-soft hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              View all roles
            </button>
            <button
              role="menuitem"
              onClick={() => { onNewRole(); setOpen(false) }}
              className="w-full text-left flex items-center min-h-touch px-3 text-sm font-bold text-accent hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              + New role
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SwitcherGroup({
  label, sessions, selectedId, onChoose,
}: {
  label: string
  sessions: PrescreenSession[]
  selectedId: string
  onChoose: (s: PrescreenSession) => void
}) {
  if (sessions.length === 0) return null
  return (
    <div className="pb-1">
      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
      {sessions.map(s => {
        const current = s.id === selectedId
        return (
          <button
            key={s.id}
            role="menuitem"
            aria-current={current ? 'true' : undefined}
            onClick={() => onChoose(s)}
            className={`w-full text-left flex items-center gap-2 min-h-touch px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
              current ? 'bg-accent-soft text-ink font-bold' : 'text-ink font-bold hover:bg-bg-soft'
            }`}
          >
            <span className="truncate flex-1">{s.role_title}</span>
            {current && (
              <svg className="w-4 h-4 flex-shrink-0 text-accent" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Collapsible group of compact role rows (list view) ───────────────── */

function RoleGroup({
  label, count, open, onToggle, sessions, emptyLabel,
  menuOpenFor, setMenuOpenFor, menuRef, onSelect, onEdit, onDelete,
}: {
  label: string
  count: number
  open: boolean
  onToggle: () => void
  sessions: PrescreenSession[]
  emptyLabel: string
  menuOpenFor: string | null
  setMenuOpenFor: React.Dispatch<React.SetStateAction<string | null>>
  menuRef: React.RefObject<HTMLDivElement | null>
  onSelect: (s: PrescreenSession) => void
  onEdit: (s: PrescreenSession) => void
  onDelete: (s: PrescreenSession) => void
}) {
  return (
    <section>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-1.5 mb-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-lg"
      >
        <span className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={`w-3 h-3 text-ink-muted transition-transform ${open ? 'rotate-90' : ''}`}
          >
            <path fillRule="evenodd" d="M6 4l8 6-8 6V4z" clipRule="evenodd" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</span>
          <span className="text-[11px] font-bold text-ink-muted">{count}</span>
        </span>
      </button>

      {open && (
        sessions.length === 0 ? (
          <p className="text-xs text-ink-muted px-1 py-2">{emptyLabel}</p>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-bg-elevated">
            {sessions.map(s => (
              <RoleRow
                key={s.id}
                s={s}
                menuOpen={menuOpenFor === s.id}
                onMenuToggle={() => setMenuOpenFor(prev => prev === s.id ? null : s.id)}
                menuRef={menuRef}
                onSelect={() => onSelect(s)}
                onEdit={() => onEdit(s)}
                onDelete={() => onDelete(s)}
              />
            ))}
          </div>
        )
      )}
    </section>
  )
}

function RoleRow({
  s, menuOpen, onMenuToggle, menuRef, onSelect, onEdit, onDelete,
}: {
  s: PrescreenSession
  menuOpen: boolean
  onMenuToggle: () => void
  menuRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isActive = s.status === 'active'
  const statusLabel = isActive ? 'Active' : (s.status === 'closed' ? 'Closed' : 'Draft')
  const chipCls = isActive
    ? 'bg-success/10 text-success'
    : 'bg-bg-soft text-ink-muted border border-border'

  return (
    <div className="relative w-full hover:bg-bg-soft transition-colors">
      <button
        onClick={onSelect}
        className="w-full text-left flex items-center gap-3 pl-4 pr-12 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink truncate leading-snug">{s.role_title}</span>
            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${chipCls}`}>
              {statusLabel}
            </span>
          </span>
          <span className="block text-xs text-ink-muted truncate mt-0.5">{s.company}</span>
        </span>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onMenuToggle() }}
        className="absolute top-1/2 -translate-y-1/2 right-2 w-9 h-9 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        aria-label="Role actions"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <circle cx="10" cy="4"  r="1.6"/>
          <circle cx="10" cy="10" r="1.6"/>
          <circle cx="10" cy="16" r="1.6"/>
        </svg>
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute top-11 right-2 z-20 bg-bg-elevated shadow-modal rounded-xl border border-border py-1 w-36"
          onClick={e => e.stopPropagation()}
        >
          <button
            role="menuitem"
            onClick={onEdit}
            className="w-full text-left px-3 py-2 text-sm font-bold text-ink hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            Edit
          </button>
          <button
            role="menuitem"
            onClick={onDelete}
            className="w-full text-left px-3 py-2 text-sm font-bold text-danger hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
