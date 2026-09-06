'use client'

// Team management (owner only): invite people, set roles, and choose which
// team members an admin can access.
//
// The scope picker is the piece the owner asked for: when granting admin,
// "Which team member/s would you like this user to have Admin access for?" -
// Everyone, Selected people (multi-select with Select all), or User's team
// only (themselves plus everyone who reports to them, resolved live from the
// register's reporting line).

import { useEffect, useMemo, useState } from 'react'
import { employeeName, type Employee } from '@/lib/employees'
import { ROLE_LABELS, SCOPE_LABELS, type AdminScope, type PendingInvite, type Role, type TeamMember } from '@/lib/team'

interface ScopeState { role: Role; admin_scope: AdminScope; scope_employee_ids: string[] }

export default function TeamMembers({ currentUserId: initialUserId }: { currentUserId?: string }) {
  // The API tells us who "you" are, so the component works with or without
  // a server-provided id (inline in settings, or on its own page).
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(initialUserId)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pending, setPending] = useState<PendingInvite[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // invite form
  const [email, setEmail] = useState('')
  const [invite, setInvite] = useState<ScopeState>({ role: 'admin', admin_scope: 'all', scope_employee_ids: [] })
  const [sending, setSending] = useState(false)

  // per-member edits
  const [editing, setEditing] = useState<string | null>(null)
  const [edit, setEdit] = useState<ScopeState>({ role: 'admin', admin_scope: 'all', scope_employee_ids: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [t, e] = await Promise.all([fetch('/api/team'), fetch('/api/employees?includeEnded=false')])
      if (!t.ok) throw new Error((await t.json()).error ?? 'Could not load your team')
      const team = await t.json()
      setMembers(team.members ?? [])
      setPending(team.pending ?? [])
      if (team.me_id) setCurrentUserId(team.me_id)
      setEmployees(e.ok ? await e.json() : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your team')
    } finally { setLoading(false) }
  }

  async function sendInvite(ev: React.FormEvent) {
    ev.preventDefault()
    setSending(true); setError(null); setNotice(null)
    try {
      const res = await fetch('/api/team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...invite }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not send the invite')
      setNotice(data.emailSent
        ? `Invite sent to ${email}.`
        : `Invite created for ${email}. Email is not configured here, so share this link: ${data.inviteUrl}`)
      setEmail('')
      setInvite({ role: 'admin', admin_scope: 'all', scope_employee_ids: [] })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the invite')
    } finally { setSending(false) }
  }

  async function revoke(id: string) {
    await fetch(`/api/team/invites?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    await load()
  }

  function startEdit(m: TeamMember) {
    setEditing(m.id)
    setEdit({ role: m.role === 'owner' ? 'admin' : m.role, admin_scope: m.admin_scope, scope_employee_ids: m.scope_employee_ids })
  }

  async function saveEdit(id: string) {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edit),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not save')
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally { setSaving(false) }
  }

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees])

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">Settings</p>
        <h1 className="font-display text-2xl text-ink mt-1">Team access</h1>
        <p className="mt-1 text-sm text-ink-soft max-w-xl">
          Invite people to help, and choose exactly which team members each admin can see. Only you, as the owner, can change this.
        </p>
      </div>

      {error && <p className="rounded-2xl border border-border bg-bg-elevated p-3 text-sm text-ink-soft">{error}</p>}
      {notice && <p className="rounded-2xl border border-border bg-bg-elevated p-3 text-sm text-ink break-all">{notice}</p>}

      {/* Invite */}
      <form onSubmit={sendInvite} className="rounded-2xl border border-border bg-bg-elevated p-5 shadow-card space-y-4">
        <h2 className="font-display text-lg text-ink">Invite someone</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">Email</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls + ' mt-1.5'} placeholder="name@business.com.au" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">Role</span>
            <select value={invite.role} onChange={e => setInvite({ ...invite, role: e.target.value as Role })} className={inputCls + ' mt-1.5'}>
              <option value="admin">{ROLE_LABELS.admin} - manages people records</option>
              <option value="member">{ROLE_LABELS.member} - no access to people records</option>
            </select>
          </label>
        </div>
        {invite.role === 'admin' && (
          <ScopePicker state={invite} onChange={setInvite} employees={activeEmployees} />
        )}
        <button type="submit" disabled={sending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent hover:bg-accent-hover disabled:opacity-40">
          {sending ? 'Sending...' : 'Send invite'}
        </button>
      </form>

      {/* Members */}
      <section>
        <h2 className="font-display text-lg text-ink">People with access</h2>
        {loading ? <p className="mt-2 text-sm text-ink-muted">Loading...</p> : (
          <ul className="mt-3 space-y-2">
            {members.map(m => (
              <li key={m.id} className="rounded-2xl border border-border bg-bg-elevated p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{m.full_name || m.email}{m.id === currentUserId ? ' (you)' : ''}</p>
                    <p className="text-xs text-ink-muted">{m.email}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {ROLE_LABELS[m.role]}
                      {m.role === 'admin' && ` - ${SCOPE_LABELS[m.admin_scope].label}`}
                      {m.role === 'admin' && m.admin_scope === 'selected' && ` (${m.scope_employee_ids.length})`}
                    </p>
                  </div>
                  {m.role !== 'owner' && editing !== m.id && (
                    <button onClick={() => startEdit(m)} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-bg-soft">
                      Change access
                    </button>
                  )}
                </div>
                {editing === m.id && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <label className="block sm:max-w-xs">
                      <span className="text-xs font-medium text-ink-soft">Role</span>
                      <select value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value as Role })} className={inputCls + ' mt-1.5'}>
                        <option value="admin">{ROLE_LABELS.admin}</option>
                        <option value="member">{ROLE_LABELS.member}</option>
                      </select>
                    </label>
                    {edit.role === 'admin' && <ScopePicker state={edit} onChange={setEdit} employees={activeEmployees} />}
                    <div className="flex items-center gap-2">
                      <button onClick={() => void saveEdit(m.id)} disabled={saving} className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-ink-on-accent hover:bg-accent-hover disabled:opacity-40">
                        {saving ? 'Saving...' : 'Save access'}
                      </button>
                      <button onClick={() => setEditing(null)} className="rounded-full px-3 py-2 text-xs font-bold text-ink-soft hover:bg-bg-soft hover:text-ink">Cancel</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-ink">Invites waiting</h2>
          <ul className="mt-3 space-y-2">
            {pending.map(p => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-bg-elevated p-4">
                <div>
                  <p className="text-sm text-ink">{p.email}</p>
                  <p className="text-xs text-ink-muted">
                    {ROLE_LABELS[p.role]}{p.role === 'admin' ? ` - ${SCOPE_LABELS[p.admin_scope].label}` : ''} &middot; expires {new Date(p.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <button onClick={() => void revoke(p.id)} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-bg-soft hover:text-ink">
                  Cancel invite
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** "Which team member/s would you like this user to have Admin access for?" */
function ScopePicker({ state, onChange, employees }: {
  state: ScopeState
  onChange: (s: ScopeState) => void
  employees: Employee[]
}) {
  const all = employees.map(e => e.id)
  const allSelected = all.length > 0 && all.every(id => state.scope_employee_ids.includes(id))

  return (
    <div className="rounded-2xl border border-border p-4 space-y-3">
      <p className="text-sm text-ink">Which team members should this person have admin access for?</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(SCOPE_LABELS) as AdminScope[]).map(s => (
          <button
            type="button"
            key={s}
            onClick={() => onChange({ ...state, admin_scope: s })}
            className={
              'rounded-2xl border p-3 text-left transition-colors ' +
              (state.admin_scope === s ? 'border-ink' : 'border-border hover:border-ink-muted')
            }
          >
            <p className="text-sm font-medium text-ink">{SCOPE_LABELS[s].label}</p>
            <p className="mt-0.5 text-[11px] text-ink-soft">{SCOPE_LABELS[s].hint}</p>
          </button>
        ))}
      </div>

      {state.admin_scope === 'selected' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-ink-soft">Select people</p>
            <button
              type="button"
              onClick={() => onChange({ ...state, scope_employee_ids: allSelected ? [] : all })}
              className="text-xs font-bold text-ink underline underline-offset-2"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          {employees.length === 0 ? (
            <p className="text-xs text-ink-muted">No one in the register yet - add people under HQ People first.</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {employees.map(e => {
                const on = state.scope_employee_ids.includes(e.id)
                return (
                  <li key={e.id}>
                    <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-ink cursor-pointer hover:bg-bg-soft">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => onChange({
                          ...state,
                          scope_employee_ids: on
                            ? state.scope_employee_ids.filter(id => id !== e.id)
                            : [...state.scope_employee_ids, e.id],
                        })}
                      />
                      <span className="truncate">{employeeName(e)}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {state.admin_scope === 'team' && (
        <p className="text-xs text-ink-muted">
          For this to work, this person needs their own entry in the register marked as &quot;this is me&quot;, and their reports need &quot;reports to&quot; set to them.
        </p>
      )}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink'
