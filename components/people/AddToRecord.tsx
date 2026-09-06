'use client'

// "Add to a record" - attach a generated document to a person's record, with
// the user's own note on why it exists.
//
// This is what makes the evidence trail fill up from real work rather than
// from separate data entry: the warning letter you drafted becomes an event on
// Sarah's record, dated, with your context, the moment you say which Sarah.
// Never blocks a download - it is always offered, never required.

import { useEffect, useState } from 'react'
import { employeeName, type Employee } from '@/lib/employees'

interface Props {
  documentId: string
  documentTitle: string
  documentType?: string | null
  documentCreatedAt?: string | null
}

export default function AddToRecord({ documentId, documentTitle, documentType, documentCreatedAt }: Props) {
  const [open, setOpen] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [context, setContext] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || employees.length > 0) return
    fetch('/api/employees')
      .then(r => (r.ok ? r.json() : []))
      .then((rows: Employee[]) => setEmployees(Array.isArray(rows) ? rows : []))
      .catch(() => setEmployees([]))
  }, [open, employees.length])

  async function save() {
    if (!employeeId) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/compliance-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          event_type: 'document_linked',
          title: documentTitle,
          detail: context.trim() || null,
          document_id: documentId,
          metadata: {
            document_id: documentId,
            doc_title: documentTitle,
            doc_type: documentType ?? null,
            doc_created_at: documentCreatedAt ?? null,
          },
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not add to the record')
      const who = employees.find(e => e.id === employeeId)
      setDone(who ? employeeName(who) : 'the record')
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add to the record')
    } finally { setSaving(false) }
  }

  if (done) {
    return (
      <p className="mt-1.5 text-[11px] text-ink-muted">
        Added to {done}&apos;s record.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 text-[11px] font-bold text-ink-soft underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        Add to a team member&apos;s record
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-2xl border border-border bg-bg p-3 space-y-2">
      <p className="text-xs font-medium text-ink">Who is this document about?</p>
      {employees.length === 0 ? (
        <p className="text-xs text-ink-soft">
          No one in your team yet. Add people under HQ People, then come back to link this.
        </p>
      ) : (
        <select
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        >
          <option value="">Select a team member...</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{employeeName(e)}</option>
          ))}
        </select>
      )}
      <textarea
        value={context}
        onChange={e => setContext(e.target.value)}
        rows={2}
        placeholder="A line of context - why this document exists, what led to it (optional, but it helps later)"
        className="w-full resize-none rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink"
      />
      {error && <p className="text-xs text-ink-soft">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!employeeId || saving}
          className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-ink-on-accent hover:bg-accent-hover disabled:opacity-40"
        >
          {saving ? 'Adding...' : 'Add to record'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-bg-soft hover:text-ink"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
