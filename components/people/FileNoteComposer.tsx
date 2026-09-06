'use client'

// File-note composer - notes written in the dashboard, at the time, against a
// person's record.
//
// Flow (per the owner's spec and the Humanistiqs file-note template):
//   1. Pick a note type and fill the header: date, who conducted it, topic,
//      and confirm the team member knows a note is being made.
//   2. Two buttons appear: "Write it myself" (freeform, third-person hint) or
//      "I need help writing this" - which offers either a few guided questions
//      or a paste box for rough text / a voice transcript to tidy up.
//   3. Either path lands on the same review form. The user edits, then saves.
//
// Saved as an append-only compliance_event of type 'file_note'. The body goes
// in `detail`; the template's other sections go in `metadata`. The date of
// discussion becomes `occurred_at` (it can be backdated - the record also
// keeps when it was entered, so the gap is visible, not hidden).

import { useState } from 'react'
import { GUIDED_QUESTIONS, NOTE_TYPES, type FileNoteDraft, type NoteType } from '@/lib/file-note-kb'
import { PROTECTED_KINDS, type ProtectedKind } from '@/lib/timing-gate'

interface Props {
  employeeId: string
  employeeName: string
  onSaved: () => void
  onCancel: () => void
}

type Path = 'choose' | 'freeform' | 'help' | 'guided' | 'cleanup' | 'review'

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_DRAFT: FileNoteDraft = {
  topic: '', key_points: '', employee_response: '', previous_discussions: '',
  policies_referenced: '', agreed_outcome: '', follow_up_date: '',
}

export default function FileNoteComposer({ employeeId, employeeName, onSaved, onCancel }: Props) {
  const [noteType, setNoteType] = useState<NoteType>('conversation')
  const [date, setDate] = useState(today())
  const [conductedBy, setConductedBy] = useState('')
  const [topic, setTopic] = useState('')
  const [staffAware, setStaffAware] = useState(false)

  const [path, setPath] = useState<Path>('choose')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [rawText, setRawText] = useState('')
  const [draft, setDraft] = useState<FileNoteDraft>(EMPTY_DRAFT)
  const [source, setSource] = useState<'freeform' | 'guided' | 'cleanup'>('freeform')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Kind of protected matter - only for the "Leave, complaint or disclosure"
  // type. This is what the timing gate reads.
  const [protectedKind, setProtectedKind] = useState<ProtectedKind>('complaint')

  // Observations do not involve the person, and a protected-event log is a
  // fact record rather than a discussion, so awareness is not required there.
  const awarenessRequired = noteType !== 'observation' && noteType !== 'protected_event'
  const headerComplete =
    Boolean(date) && Boolean(topic.trim()) && (!awarenessRequired || staffAware)

  async function askForHelp(mode: 'guided' | 'cleanup') {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/file-notes/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode, note_type: noteType, employee_name: employeeName,
          conducted_by: conductedBy, discussion_date: date,
          answers, raw_text: rawText,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not draft the note')
      setDraft({ ...data.draft, topic: data.draft.topic || topic })
      setSource(mode)
      setPath('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not draft the note')
    } finally { setBusy(false) }
  }

  async function save() {
    if (!draft.key_points.trim()) { setError('Add the key points before saving'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/compliance-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          event_type: 'file_note',
          title: `File note - ${(draft.topic || topic).trim()}`,
          detail: draft.key_points.trim(),
          occurred_at: `${date}T12:00:00`,
          metadata: {
            note_type: noteType,
            ...(noteType === 'protected_event' ? { protected_kind: protectedKind } : {}),
            topic: (draft.topic || topic).trim(),
            conducted_by: conductedBy.trim(),
            staff_aware: staffAware,
            employee_response: draft.employee_response.trim(),
            previous_discussions: draft.previous_discussions.trim(),
            policies_referenced: draft.policies_referenced.trim(),
            agreed_outcome: draft.agreed_outcome.trim(),
            follow_up_date: draft.follow_up_date || null,
            source,
          },
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not save the note')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the note')
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-bg p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">Add a file note</p>
          <p className="mt-1 text-xs text-ink-soft">
            A dated record of what happened and what was agreed. Write it as facts - the team member can ask to see their file.
          </p>
        </div>
        <button onClick={onCancel} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-bg-soft hover:text-ink">
          Close
        </button>
      </div>

      {/* Header - the template's Details block */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">
          <select value={noteType} onChange={e => setNoteType(e.target.value as NoteType)} className={inputCls}>
            {(Object.keys(NOTE_TYPES) as NoteType[]).map(k => (
              <option key={k} value={k}>{NOTE_TYPES[k].label}</option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-ink-muted">{NOTE_TYPES[noteType].hint}</span>
        </Field>
        <Field label="Date of discussion">
          <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Conducted by">
          <input value={conductedBy} onChange={e => setConductedBy(e.target.value)} placeholder="Your name and role" className={inputCls} />
        </Field>
        <Field label="Topic">
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Punctuality" className={inputCls} />
        </Field>
        {noteType === 'protected_event' && (
          <Field label="What kind of matter" hint="Recording the date is what matters - HQ uses it to flag timing risk later.">
            <select value={protectedKind} onChange={e => setProtectedKind(e.target.value as ProtectedKind)} className={inputCls}>
              {(Object.keys(PROTECTED_KINDS) as ProtectedKind[]).map(k => (
                <option key={k} value={k}>{PROTECTED_KINDS[k].label}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {awarenessRequired && (
        <label className="flex items-start gap-2 text-xs text-ink-soft">
          <input type="checkbox" checked={staffAware} onChange={e => setStaffAware(e.target.checked)} className="mt-0.5" />
          <span>{employeeName} knows a note of this discussion is being placed on their file.</span>
        </label>
      )}

      {/* Step 2 - the two buttons, once the header is complete */}
      {path === 'choose' && (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!headerComplete}
            onClick={() => { setSource('freeform'); setDraft({ ...EMPTY_DRAFT, topic }); setPath('review') }}
            className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-ink-on-accent hover:bg-accent-hover disabled:opacity-40"
          >
            Write it myself
          </button>
          <button
            disabled={!headerComplete}
            onClick={() => setPath('help')}
            className="rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:bg-bg-soft disabled:opacity-40"
          >
            I need help writing this
          </button>
          {!headerComplete && (
            <p className="w-full text-[11px] text-ink-muted">
              Fill in the date and topic{awarenessRequired ? ', and confirm they know about the note,' : ''} to continue.
            </p>
          )}
        </div>
      )}

      {/* Help - choose how */}
      {path === 'help' && (
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={() => setPath('guided')} className="rounded-2xl border border-border p-3 text-left hover:border-ink-muted">
            <p className="text-sm font-medium text-ink">Answer a few questions</p>
            <p className="mt-0.5 text-xs text-ink-soft">Four short questions. HQ turns your answers into a proper note.</p>
          </button>
          <button onClick={() => setPath('cleanup')} className="rounded-2xl border border-border p-3 text-left hover:border-ink-muted">
            <p className="text-sm font-medium text-ink">Paste my rough notes</p>
            <p className="mt-0.5 text-xs text-ink-soft">A voice transcript or dot points. HQ tidies it into third person without adding anything.</p>
          </button>
          <button onClick={() => setPath('choose')} className="text-left text-xs font-bold text-ink-soft underline underline-offset-2">Back</button>
        </div>
      )}

      {/* Guided */}
      {path === 'guided' && (
        <div className="space-y-3">
          {GUIDED_QUESTIONS.map(q => (
            <Field key={q.key} label={q.label}>
              <textarea rows={2} value={answers[q.key] ?? ''} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder={q.placeholder} className={inputCls + ' resize-none'} />
            </Field>
          ))}
          <ActionRow busy={busy} primary="Draft the note" onPrimary={() => void askForHelp('guided')} onBack={() => setPath('help')} />
        </div>
      )}

      {/* Cleanup */}
      {path === 'cleanup' && (
        <div className="space-y-3">
          <Field label="Paste your rough notes or transcript">
            <textarea rows={6} value={rawText} onChange={e => setRawText(e.target.value)} placeholder="Paste anything - it does not need to be tidy." className={inputCls + ' resize-y'} />
          </Field>
          <ActionRow busy={busy} primary="Tidy it up" onPrimary={() => void askForHelp('cleanup')} onBack={() => setPath('help')} />
        </div>
      )}

      {/* Review - shared by all paths */}
      {path === 'review' && (
        <div className="space-y-3">
          {source !== 'freeform' && (
            <p className="text-[11px] text-ink-muted">
              Drafted from your {source === 'guided' ? 'answers' : 'notes'}. Check every fact - only you know what happened.
            </p>
          )}
          <Field label="Key points of discussion" hint="Third person, with dates. What was said, what happened.">
            <textarea rows={6} value={draft.key_points} onChange={e => setDraft({ ...draft, key_points: e.target.value })} className={inputCls + ' resize-y'} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Their response">
              <textarea rows={2} value={draft.employee_response} onChange={e => setDraft({ ...draft, employee_response: e.target.value })} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Agreed outcome">
              <textarea rows={2} value={draft.agreed_outcome} onChange={e => setDraft({ ...draft, agreed_outcome: e.target.value })} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Previous discussions referenced">
              <input value={draft.previous_discussions} onChange={e => setDraft({ ...draft, previous_discussions: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Policies or documents referred to">
              <input value={draft.policies_referenced} onChange={e => setDraft({ ...draft, policies_referenced: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Follow-up date">
              <input type="date" value={draft.follow_up_date} onChange={e => setDraft({ ...draft, follow_up_date: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <ActionRow busy={busy} primary="Save to record" onPrimary={() => void save()} onBack={() => setPath('choose')} />
        </div>
      )}

      {error && <p className="text-xs text-ink-soft">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-ink-muted">{hint}</span>}
    </label>
  )
}

function ActionRow({ busy, primary, onPrimary, onBack }: { busy: boolean; primary: string; onPrimary: () => void; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrimary} disabled={busy} className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-ink-on-accent hover:bg-accent-hover disabled:opacity-40">
        {busy ? 'Working...' : primary}
      </button>
      <button onClick={onBack} disabled={busy} className="rounded-full px-3 py-2 text-xs font-bold text-ink-soft hover:bg-bg-soft hover:text-ink">
        Back
      </button>
    </div>
  )
}
