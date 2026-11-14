'use client'

// Attach a file to a person's record.
//
// Stored privately on the record only (never the documents library) via
// POST /api/employees/[id]/documents, which appends a 'document_uploaded'
// event to the trail. Optionally marked as evidence of one "What is on file"
// item, which ticks that item. Copy states facts only.

import { useEffect, useRef, useState } from 'react'
import { RiAttachment2 } from '@remixicon/react'
import type { Requirement } from '@/lib/record-gaps'
import { ACCEPT_ATTR, ALLOWED_LABEL, checkUpload, formatBytes } from './upload-rules'

interface Props {
  employeeId: string
  /** Requirements for this person's employment type, for the select. */
  requirements: Requirement[]
  /** Preset when opened from a checklist item; the select is then hidden. */
  presetKey?: string | null
  onUploaded: () => void
  onCancel: () => void
}

export default function UploadDocument({ employeeId, requirements, presetKey, onUploaded, onCancel }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [satisfies, setSatisfies] = useState(presetKey ?? '')
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const preset = presetKey ? requirements.find(r => r.key === presetKey) : undefined
  const busy = progress !== null

  // Opened from a checklist item higher up the drawer - bring it into view.
  useEffect(() => { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [])

  function pick(f: File | null) {
    setError(null)
    if (!f) { setFile(null); return }
    const check = checkUpload(f.name, f.size)
    if ('error' in check) { setFile(null); setError(check.error); return }
    setFile(f)
  }

  function upload() {
    if (!file) { setError('Choose a file to attach'); return }
    const body = new FormData()
    body.append('file', file)
    if (satisfies) body.append('satisfies', satisfies)
    if (title.trim()) body.append('title', title.trim())

    // XMLHttpRequest rather than fetch, for upload progress.
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/employees/${employeeId}/documents`)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { setProgress(null); onUploaded(); return }
      let msg = 'The file could not be attached'
      try { msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg } catch { /* keep default */ }
      setProgress(null); setError(msg)
    }
    xhr.onerror = () => { setProgress(null); setError('The upload did not go through. Check your connection and try again.') }
    setError(null); setProgress(0)
    xhr.send(body)
  }

  return (
    <div ref={panelRef} className="mt-4 space-y-3 rounded-2xl border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">Attach a file</p>
          <p className="mt-1 text-xs text-ink-soft">
            {preset
              ? <>Attach a file as evidence of: <span className="text-ink">{preset.label}</span></>
              : 'Kept privately on this person\'s record, with the date it was added.'}
          </p>
        </div>
        <button onClick={onCancel} disabled={busy} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-bg-soft hover:text-ink disabled:opacity-40">
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept={ACCEPT_ATTR}
          onChange={e => pick(e.target.files?.[0] ?? null)}
          disabled={busy}
          className="sr-only"
          id={`upload-${employeeId}`}
        />
        <label
          htmlFor={`upload-${employeeId}`}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-bg-soft"
        >
          <RiAttachment2 className="h-3.5 w-3.5" aria-hidden="true" />
          {file ? 'Choose a different file' : 'Choose a file'}
        </label>
        {file ? (
          <span className="min-w-0 truncate text-xs text-ink">
            {file.name} <span className="text-ink-muted">({formatBytes(file.size)})</span>
          </span>
        ) : (
          <span className="text-[11px] text-ink-muted">{ALLOWED_LABEL}, up to 10 MB.</span>
        )}
      </div>

      {!preset && (
        <label className="block">
          <span className="text-xs font-medium text-ink-soft">This is evidence of (optional)</span>
          <select value={satisfies} onChange={e => setSatisfies(e.target.value)} disabled={busy} className={inputCls + ' mt-1.5'}>
            <option value="">Nothing specific</option>
            {requirements.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </label>
      )}

      <label className="block">
        <span className="text-xs font-medium text-ink-soft">Title (optional)</span>
        <input value={title} onChange={e => setTitle(e.target.value)} disabled={busy} placeholder={file?.name ?? 'Uses the file name if left blank'} className={inputCls + ' mt-1.5'} />
      </label>

      {busy && (
        <div className="space-y-1" role="status" aria-live="polite">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
            <div className="h-full rounded-full bg-ink-muted transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[11px] text-ink-muted">{progress === 100 ? 'Adding to the record...' : `Uploading ${progress}%`}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={upload}
          disabled={!file || busy}
          className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-ink-on-accent hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? 'Attaching...' : 'Attach to record'}
        </button>
      </div>

      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink'
