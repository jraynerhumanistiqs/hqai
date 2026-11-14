'use client'

// "What has been done" - one person's evidence trail, newest first.
//
// Every entry stays on screen, including ones a correction replaced: the
// trail is append-only, so a superseded entry renders muted with a
// "Superseded" label and a jump to the entry that corrected it. Live file
// notes (and only file notes) offer "Correct this entry". Uploaded files show
// their name with a "View" link that opens a short-lived signed copy.

import type { ReactNode } from 'react'
import { RiExternalLinkLine } from '@remixicon/react'
import { EVENT_TYPES, type ComplianceEvent } from '@/lib/employees'
import { correctionsById } from '@/lib/trail'

interface Props {
  employeeId: string
  events: ComplianceEvent[]
  /** Id of the note currently being corrected, if any. */
  correctingId: string | null
  /** The composer, rendered under the entry being corrected. */
  correctionSlot: ReactNode
  onCorrect: (ev: ComplianceEvent) => void
}

function fmtDate(d: string | null) {
  if (!d) return '-'
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const anchor = (id: string) => `trail-${id}`

function jumpTo(id: string) {
  const el = document.getElementById(anchor(id))
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.focus({ preventScroll: true })
}

export default function RecordTrail({ employeeId, events, correctingId, correctionSlot, onCorrect }: Props) {
  const correctedBy = correctionsById(events)
  const byId = new Map(events.map(ev => [ev.id, ev]))

  return (
    <ol className="mt-3 space-y-3">
      {events.map(ev => {
        const correction = correctedBy.get(ev.id)
        const superseded = Boolean(correction)
        const meta = (ev.metadata ?? {}) as Record<string, unknown>
        const isUpload = ev.event_type === 'document_uploaded'
        const fileName = isUpload && typeof meta.file_name === 'string' ? meta.file_name : null
        const original = ev.supersedes ? byId.get(ev.supersedes) : undefined

        return (
          <li
            key={ev.id}
            id={anchor(ev.id)}
            tabIndex={-1}
            className={'border-l-2 pl-3 outline-none ' + (superseded ? 'border-border opacity-60' : 'border-border')}
          >
            <p className={'text-sm ' + (superseded ? 'text-ink-muted line-through' : 'text-ink')}>{ev.title}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {fmtDate(ev.occurred_at)}
              {ev.bmp_code ? ` · ${EVENT_TYPES[ev.event_type]?.label ?? ev.event_type}` : ''}
              {isUpload ? ` · ${EVENT_TYPES.document_uploaded.label}` : ''}
            </p>

            {superseded && correction && (
              <p className="mt-1 text-[11px] text-ink-muted">
                <span className="font-mono font-bold uppercase tracking-wider">Superseded</span>
                {' '}on {fmtDate(correction.created_at)}.{' '}
                <button onClick={() => jumpTo(correction.id)} className="font-bold underline underline-offset-2 hover:text-ink">
                  See the correction
                </button>
              </p>
            )}
            {ev.supersedes && (
              <p className="mt-1 text-[11px] text-ink-muted">
                Correction of an earlier entry
                {original && (
                  <>
                    {' '}dated {fmtDate(original.occurred_at)}.{' '}
                    <button onClick={() => jumpTo(original.id)} className="font-bold underline underline-offset-2 hover:text-ink">
                      See the original
                    </button>
                  </>
                )}
              </p>
            )}

            {ev.detail && <p className={'mt-1 text-xs ' + (superseded ? 'text-ink-muted' : 'text-ink-soft')}>{ev.detail}</p>}

            {fileName && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                <span className="min-w-0 truncate">{fileName}</span>
                <a
                  href={`/api/employees/${employeeId}/documents/${ev.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-ink underline underline-offset-2 hover:text-ink-soft"
                >
                  View
                  <RiExternalLinkLine className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </p>
            )}

            {ev.event_type === 'file_note' && !superseded && correctingId !== ev.id && (
              <button
                onClick={() => onCorrect(ev)}
                className="mt-1 text-[11px] font-bold text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                Correct this entry
              </button>
            )}
            {correctingId === ev.id && correctionSlot}
          </li>
        )
      })}
    </ol>
  )
}
