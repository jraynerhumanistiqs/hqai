'use client'

// The employee register - HQ People's first system-of-record surface.
//
// Two jobs, matching the two opportunities this release backs:
//   1. Hold the people data the compliance clock will derive dates from.
//   2. Show the evidence trail - what was done for each person, and when.
//
// Deliberate choices:
//   - Award is never a blocking field. "I'm not sure" is a first-class answer,
//     because identifying the right award is one of the things users come here
//     confused about. Clocks that need it stay dormant until it is confirmed.
//   - No date of birth. The only v1 rule needing it (over-45 notice) is handled
//     as a prompt at termination instead.

import { useEffect, useMemo, useState } from 'react'
import {
  AU_STATES,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  EVENT_TYPES,
  employeeName,
  monthsOfService,
  type ComplianceEvent,
  type Employee,
} from '@/lib/employees'

function fmtDate(d: string | null) {
  if (!d) return '-'
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', job_title: '',
  start_date: '', employment_type: 'full_time', state: '',
  award: '', award_confirmed: false, notes: '',
}

export default function TeamRegister() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [events, setEvents] = useState<ComplianceEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load your team')
      setEmployees(await res.json())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your team')
    } finally {
      setLoading(false)
    }
  }

  async function openEmployee(emp: Employee) {
    setSelected(emp)
    setEventsLoading(true)
    try {
      const res = await fetch(`/api/employees/${emp.id}`)
      const data = await res.json()
      setEvents(res.ok ? (data.events ?? []) : [])
    } catch { setEvents([]) } finally { setEventsLoading(false) }
  }

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not add that person')
      setEmployees(prev => [data, ...prev])
      setForm(EMPTY_FORM)
      setShowAdd(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that person')
    } finally { setSaving(false) }
  }

  const stats = useMemo(() => {
    const needAward = employees.filter(e => !e.award_confirmed).length
    return { total: employees.length, needAward }
  }, [employees])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">HQ People</p>
          <h1 className="font-display text-2xl text-ink mt-1">Your team</h1>
          <p className="text-sm text-ink-soft mt-1 max-w-xl">
            The people you employ, and a record of what has been done for each of them. This is what
            lets HQ keep track of dates for you - and gives you something to show if you are ever asked.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {showAdd ? 'Cancel' : 'Add someone'}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-border bg-bg-elevated p-4 text-sm text-ink-soft">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addEmployee} className="rounded-2xl border border-border bg-bg-elevated p-5 shadow-card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Last name">
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Start date" required hint="We use this to work out dates that matter later.">
              <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Employment type">
              <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })} className={inputCls}>
                {EMPLOYMENT_TYPES.map(t => (
                  <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Job title">
              <input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} className={inputCls} />
            </Field>
            <Field label="State">
              <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className={inputCls}>
                <option value="">Select...</option>
                {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Award" hint="Not sure? Leave it blank - you can sort this out later.">
              <input value={form.award} onChange={e => setForm({ ...form, award: e.target.value })} placeholder="I'm not sure" className={inputCls} />
            </Field>
            <Field label="Anything else">
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent transition-colors hover:bg-accent-hover disabled:opacity-40">
              {saving ? 'Adding...' : 'Add to team'}
            </button>
            <p className="text-xs text-ink-muted">We only ask for what we need to track dates. No date of birth.</p>
          </div>
        </form>
      )}

      {/* Summary */}
      {!loading && employees.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-border px-3 py-1 text-ink-soft">
            {stats.total} {stats.total === 1 ? 'person' : 'people'}
          </span>
          {stats.needAward > 0 && (
            <span className="rounded-full border border-border px-3 py-1 text-ink-soft">
              {stats.needAward} without a confirmed award
            </span>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-ink-muted">Loading your team...</p>
      ) : employees.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-elevated p-8 text-center shadow-card">
          <h2 className="font-display text-lg text-ink">No one here yet</h2>
          <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
            Add the people you employ and HQ can start keeping track of the dates that matter -
            probation reviews, casual conversion, pay reviews - so you do not have to hold them in your head.
          </p>
          <button onClick={() => setShowAdd(true)} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent hover:bg-accent-hover">
            Add your first person
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {employees.map(emp => (
            <li key={emp.id}>
              <button
                onClick={() => void openEmployee(emp)}
                className="w-full rounded-2xl border border-border bg-bg-elevated p-4 text-left shadow-card transition-colors hover:border-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{employeeName(emp)}</p>
                    <p className="text-xs text-ink-muted mt-0.5 truncate">
                      {emp.job_title || EMPLOYMENT_TYPE_LABELS[emp.employment_type]}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    {EMPLOYMENT_TYPE_LABELS[emp.employment_type]}
                  </span>
                </div>
                <p className="mt-3 text-xs text-ink-soft">
                  Started {fmtDate(emp.start_date)} &middot; {monthsOfService(emp.start_date)} months
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Detail drawer - the evidence trail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={`${employeeName(selected)} record`}>
          <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]" onClick={() => setSelected(null)} />
          <div className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border bg-bg-elevated p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-ink">{employeeName(selected)}</h2>
                <p className="text-sm text-ink-soft mt-1">
                  {EMPLOYMENT_TYPE_LABELS[selected.employment_type]} &middot; started {fmtDate(selected.start_date)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-bg-soft">
                Close
              </button>
            </div>

            {!selected.award_confirmed && (
              <div className="mt-4 rounded-2xl border border-border p-3">
                <p className="text-xs text-ink-soft">
                  No award confirmed yet. HQ will hold off on anything that depends on the award until
                  you have sorted it - ask in the chat if you are not sure which one applies.
                </p>
              </div>
            )}

            <h3 className="mt-6 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              What has been done
            </h3>
            {eventsLoading ? (
              <p className="mt-3 text-sm text-ink-muted">Loading...</p>
            ) : events.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">
                Nothing recorded yet. As you work through things with HQ, they will show up here with
                the date they happened.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {events.map(ev => (
                  <li key={ev.id} className="border-l-2 border-border pl-3">
                    <p className="text-sm text-ink">{ev.title}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {fmtDate(ev.occurred_at)}
                      {ev.bmp_code ? ` · ${EVENT_TYPES[ev.event_type]?.label ?? ev.event_type}` : ''}
                    </p>
                    {ev.detail && <p className="text-xs text-ink-soft mt-1">{ev.detail}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink'

function Field({ label, children, required, hint }: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-soft">
        {label}{required && <span className="text-ink-muted"> (required)</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-ink-muted">{hint}</span>}
    </label>
  )
}
