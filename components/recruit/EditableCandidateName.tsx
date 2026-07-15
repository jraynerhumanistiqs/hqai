'use client'

// EditableCandidateName - click to edit a candidate's display name
// in the recruiter UI. Used across HQ Recruit surfaces:
//   - CV Scoring (rewrites cv_screenings.candidate_label)
//   - Shortlist / Phone screen / Video screen (rewrites
//     candidate_responses.candidate_name)
//
// The pencil icon nudges discoverability. Enter saves; Esc cancels.
// Optimistic UI - the parent receives the new name immediately and
// rolls back if the PATCH fails.

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onSave: (next: string) => Promise<void> | void
  className?: string
  inputClassName?: string
  /** Hide the pencil glyph until the row is hovered (parent must
   *  apply group / group-hover). Default true. */
  hoverOnly?: boolean
}

export default function EditableCandidateName({
  value,
  onSave,
  className,
  inputClassName,
  hoverOnly = true,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  async function commit() {
    const next = draft.trim()
    if (!next || next === value) { setEditing(false); setDraft(value); return }
    setBusy(true)
    try {
      await onSave(next)
      setEditing(false)
    } catch {
      // Roll back on failure - parent will surface the toast/error.
      setDraft(value)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); void commit() }
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setDraft(value) }
        }}
        onBlur={() => void commit()}
        disabled={busy}
        className={inputClassName ?? 'bg-bg-elevated border border-ink rounded px-1.5 py-0.5 text-sm font-bold text-ink focus:outline-none focus:ring-1 focus:ring-accent w-full max-w-[260px]'}
      />
    )
  }

  return (
    <span
      className={(className ?? 'inline-flex items-center gap-1.5') + (hoverOnly ? ' group' : '')}
      title="Click to rename"
    >
      <span>{value}</span>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setEditing(true) }}
        aria-label="Edit candidate name"
        className={
          'text-[10px] font-bold text-ink-muted hover:text-ink rounded p-0.5 transition-opacity ' +
          (hoverOnly ? 'opacity-0 group-hover:opacity-100' : '')
        }
      >
        {/* Pencil icon */}
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
          <path d="M10 3l3 3" />
        </svg>
      </button>
    </span>
  )
}
