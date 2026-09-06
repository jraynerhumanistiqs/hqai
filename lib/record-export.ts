// Builds one person's record as a StructuredDocument, so the existing PDF and
// DOCX renderers produce it - same branded pipeline as every other HQ.ai
// document.
//
// What goes in, per the owner's spec: the record snapshot (including dashboard
// file notes and feedback given), the dated timeline, and the list of linked
// documents each with the user's own context note. It is a faithful account of
// what is on file, written for a reader who may be a lawyer, accountant or
// regulator - so it states facts and dates and never characterises them.

import type { StructuredDocument, DocumentBlock } from './doc-model'
import {
  EVENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  employeeName,
  monthsOfService,
  type ComplianceEvent,
  type Employee,
} from './employees'
import { computeGaps } from './record-gaps'

export interface LinkedDocument {
  id: string
  title: string
  type: string | null
  created_at: string
  /** The user's own note on why this document exists / its history. */
  context: string | null
  linked_at: string
}

export interface RecordExportInput {
  employee: Employee
  events: ComplianceEvent[]
  documents: LinkedDocument[]
  business: { name: string; abn?: string | null }
  headcount: number
  generatedAt?: Date
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

/** Plain-hyphen only, per the house style. */
function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/[—–]/g, '-').trim()
}

export function buildRecordDocument(input: RecordExportInput): StructuredDocument {
  const { employee: e, events, documents, business, headcount } = input
  const generatedAt = input.generatedAt ?? new Date()
  const name = employeeName(e)

  const gaps = computeGaps(
    e,
    events,
    documents.map(d => d.type ?? ''),
    headcount,
    generatedAt,
  )

  // Sort oldest -> newest for a readable history.
  const timeline = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  )
  const notes = timeline.filter(ev => ev.event_type === 'file_note')

  // ---- Section: the record -------------------------------------------------
  const recordBlocks: DocumentBlock[] = [
    {
      type: 'kv',
      items: [
        { label: 'Name', value: name },
        { label: 'Role', value: clean(e.job_title) || '-' },
        { label: 'Employment type', value: EMPLOYMENT_TYPE_LABELS[e.employment_type] },
        { label: 'Start date', value: fmtDate(e.start_date) },
        ...(e.end_date ? [{ label: 'End date', value: fmtDate(e.end_date) }] : []),
        { label: 'Length of service', value: `${monthsOfService(e.start_date, e.end_date ? new Date(e.end_date) : generatedAt)} months` },
        { label: 'State', value: e.state ?? '-' },
        {
          label: 'Award',
          value: e.award_confirmed && e.award ? clean(e.award) : 'Not confirmed',
        },
        ...(e.classification ? [{ label: 'Classification', value: clean(e.classification) }] : []),
        { label: 'Status', value: e.status === 'active' ? 'Current employee' : 'Employment ended' },
      ],
    },
  ]
  if (e.notes) {
    recordBlocks.push({ type: 'paragraph', text: `Notes on file: ${clean(e.notes)}` })
  }

  // ---- Section: what is on file -------------------------------------------
  const onFileBlocks: DocumentBlock[] = [
    {
      type: 'paragraph',
      text: `${gaps.satisfied} of ${gaps.total} standard items are on file for this employment type.`,
    },
    {
      type: 'table',
      headers: ['Item', 'On file', 'How'],
      rows: gaps.items
        .filter(i => !i.notYetDue)
        .map(i => [
          i.label,
          i.satisfied ? 'Yes' : 'No',
          i.satisfied ? (i.via === 'document' ? 'Linked document' : 'Recorded event') : '-',
        ]),
    },
  ]
  if (gaps.missing.length > 0) {
    onFileBlocks.push({
      type: 'notice',
      variant: 'info',
      text: `Not yet on file: ${gaps.missing.map(m => m.label.toLowerCase()).join('; ')}.`,
    })
  }

  // ---- Section: file notes ------------------------------------------------
  // Each note is rendered in the template's own shape: the Details header,
  // then the key points, then the sections that were filled in. Empty
  // sections are left out rather than printed as "-".
  const noteBlocks: DocumentBlock[] = notes.length === 0
    ? [{ type: 'paragraph', text: 'No file notes recorded.' }]
    : notes.flatMap<DocumentBlock>(n => {
        const m = (n.metadata ?? {}) as Record<string, unknown>
        const s = (k: string) => (typeof m[k] === 'string' ? clean(m[k] as string) : '')
        const kind = s('note_type') ? s('note_type').replace(/_/g, ' ') : 'note'
        const topic = s('topic') || clean(n.title).replace(/^File note - /, '')
        const kv: Array<{ label: string; value: string }> = [
          { label: 'Date of discussion', value: fmtDate(n.occurred_at) },
          { label: 'Type', value: kind },
          ...(topic ? [{ label: 'Topic', value: topic }] : []),
          ...(s('conducted_by') ? [{ label: 'Conducted by', value: s('conducted_by') }] : []),
          ...(m.staff_aware === true ? [{ label: 'Team member aware', value: 'Yes' }] : []),
          { label: 'Entered', value: fmtDateTime(n.created_at) },
        ]
        const blocks: DocumentBlock[] = [
          { type: 'heading', level: 3, text: topic || kind },
          { type: 'kv', items: kv },
          { type: 'paragraph', text: clean(n.detail) || '-' },
        ]
        const extras: Array<[string, string]> = [
          ['Their response', s('employee_response')],
          ['Previous discussions', s('previous_discussions')],
          ['Policies or documents referred to', s('policies_referenced')],
          ['Agreed outcome', s('agreed_outcome')],
          ['Follow-up', s('follow_up_date') ? fmtDate(s('follow_up_date')) : ''],
        ]
        for (const [label, value] of extras) {
          if (value) blocks.push({ type: 'paragraph', text: `${label}: ${value}` })
        }
        blocks.push({ type: 'spacer', size: 'sm' })
        return blocks
      })

  // ---- Section: timeline ---------------------------------------------------
  const timelineBlocks: DocumentBlock[] = timeline.length === 0
    ? [{ type: 'paragraph', text: 'No events recorded.' }]
    : [{
        type: 'table',
        headers: ['When', 'What', 'Detail'],
        rows: timeline
          .filter(ev => ev.event_type !== 'file_note') // notes have their own section
          .map(ev => [
            fmtDateTime(ev.occurred_at),
            EVENT_TYPES[ev.event_type]?.label ?? clean(ev.title),
            clean(ev.detail) || '-',
          ]),
      }]

  // ---- Section: documents --------------------------------------------------
  const docBlocks: DocumentBlock[] = documents.length === 0
    ? [{ type: 'paragraph', text: 'No documents linked to this record.' }]
    : [{
        type: 'table',
        headers: ['Document', 'Created', 'Added to record', 'Context'],
        rows: documents.map(d => [
          clean(d.title),
          fmtDate(d.created_at),
          fmtDate(d.linked_at),
          clean(d.context) || '-',
        ]),
      }]

  return {
    template_id: 'employee-record',
    title: `${name} - record`,
    subtitle: `Prepared ${fmtDate(generatedAt.toISOString())} from HQ People`,
    locale: 'en-AU',
    issuer: {
      business_name: clean(business.name) || 'Business',
      ...(business.abn ? { abn: business.abn } : {}),
    },
    sections: [
      { id: 'record', title: 'Record', blocks: recordBlocks },
      { id: 'on-file', title: 'What is on file', blocks: onFileBlocks },
      { id: 'notes', title: 'File notes', blocks: noteBlocks },
      { id: 'timeline', title: 'Timeline', blocks: timelineBlocks },
      { id: 'documents', title: 'Documents', blocks: docBlocks },
      {
        id: 'about',
        title: 'About this record',
        blocks: [
          {
            type: 'notice',
            variant: 'info',
            text:
              'This is a record of information entered into HQ People, with the date each entry was made. ' +
              'It is general information about your own records and is not legal advice. ' +
              'For advice on a specific situation, speak to your Humanistiqs advisor or a qualified professional.',
          },
        ],
      },
    ],
  } as StructuredDocument
}
