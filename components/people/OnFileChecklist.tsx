'use client'

// "What is on file" - the evidence-gap indicator for one person. A
// completeness read on their own record; it never says what to do about a
// gap. Each item not yet on file offers a small "Upload" action that opens
// the uploader with that item preset.

import type { GapSummary } from '@/lib/record-gaps'

interface Props {
  gaps: GapSummary
  employmentLabel: string
  onUpload: (requirementKey: string) => void
}

export default function OnFileChecklist({ gaps, employmentLabel, onUpload }: Props) {
  return (
    <div className="mt-5">
      <h3 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
        What is on file
      </h3>
      <p className="mt-1 text-xs text-ink-soft">
        {gaps.satisfied} of {gaps.total} standard items for a {employmentLabel.toLowerCase()} role.
      </p>
      <ul className="mt-2 space-y-1.5">
        {gaps.items.filter(i => !i.notYetDue).map(i => (
          <li key={i.key} className="flex items-start gap-2 text-xs">
            <span
              aria-hidden="true"
              className={
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ' +
                (i.satisfied ? 'border-ink text-ink' : 'border-border text-ink-muted')
              }
            >
              {i.satisfied ? '✓' : ''}
            </span>
            <span className={'min-w-0 flex-1 ' + (i.satisfied ? 'text-ink' : 'text-ink-soft')}>
              {i.label}
              {i.satisfied && i.via === 'upload' && (
                <span className="ml-1 text-[11px] text-ink-muted">(file attached)</span>
              )}
              {!i.satisfied && (
                <span className="block text-[11px] text-ink-muted">{i.why}</span>
              )}
            </span>
            {!i.satisfied && (
              <button
                onClick={() => onUpload(i.key)}
                aria-label={`Attach a file as evidence of: ${i.label}`}
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                Upload
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
