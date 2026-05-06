'use client'
import { useState, useCallback } from 'react'
import { ALL_RUBRICS } from '@/lib/cv-screening-rubrics'
import {
  type CandidateScreening,
  BAND_LABELS,
  ACTION_LABELS,
  BAND_COLOURS,
} from '@/lib/cv-screening-types'
import CandidateScorecardPanel from './CandidateScorecardPanel'

interface Props {
  businessName: string
  initialScreenings: CandidateScreening[]
}

interface PendingUpload {
  id: string
  filename: string
  status: 'queued' | 'parsing' | 'scoring' | 'done' | 'error'
  error?: string
}

export default function CvScreeningClient({ businessName, initialScreenings }: Props) {
  const [rubricId, setRubricId] = useState(ALL_RUBRICS[0].rubric_id)
  const [screenings, setScreenings] = useState<CandidateScreening[]>(initialScreenings)
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)

  const filtered = screenings.filter(s => s.rubric_id === rubricId)
  const counts = {
    all: filtered.length,
    strong: filtered.filter(s => s.band === 'strong_yes').length,
    yes: filtered.filter(s => s.band === 'yes').length,
    maybe: filtered.filter(s => s.band === 'maybe').length,
    no: filtered.filter(s => s.band === 'likely_no' || s.band === 'reject').length,
  }
  const selected = screenings.find(s => s.id === selectedId) ?? null

  const advanceableCount = filtered.filter(s => s.band === 'strong_yes' || s.band === 'yes').length
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ sent: number; failed: number } | null>(null)

  async function bulkSendVideo() {
    const advanceable = filtered.filter(s => s.band === 'strong_yes' || s.band === 'yes')
    if (!advanceable.length) return
    if (!confirm(`Generate and send video pre-screens for ${advanceable.length} candidate${advanceable.length === 1 ? '' : 's'}? This calls the AI question generator for each and creates a separate pre-screen session per candidate.`)) {
      return
    }
    setBulkBusy(true)
    setBulkResult(null)
    let sent = 0
    let failed = 0
    for (const s of advanceable) {
      try {
        const res = await fetch('/api/cv-screening/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screening_id: s.id }),
        })
        if (res.ok) sent++
        else failed++
      } catch {
        failed++
      }
    }
    setBulkResult({ sent, failed })
    setBulkBusy(false)
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    if (!fileArr.length) return
    setBusy(true)
    const queued: PendingUpload[] = fileArr.map(f => ({
      id: `pending-${Math.random().toString(36).slice(2)}`,
      filename: f.name,
      status: 'queued',
    }))
    setPending(p => [...p, ...queued])

    for (let i = 0; i < fileArr.length; i++) {
      const f = fileArr[i]
      const id = queued[i].id
      try {
        setPending(p => p.map(x => x.id === id ? { ...x, status: 'parsing' } : x))
        const fd = new FormData()
        fd.append('file', f)
        fd.append('rubricId', rubricId)
        const res = await fetch('/api/cv-screening/score', {
          method: 'POST',
          body: fd,
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `HTTP ${res.status}`)
        }
        const data = (await res.json()) as { screening: CandidateScreening }
        setScreenings(s => [data.screening, ...s])
        setPending(p => p.filter(x => x.id !== id))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setPending(p => p.map(x => x.id === id ? { ...x, status: 'error', error: msg } : x))
      }
    }
    setBusy(false)
  }, [rubricId])

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <header>
          <h1 className="font-display text-h2 font-bold text-charcoal">CV Screening</h1>
          <p className="text-sm text-mid mt-1">
            Drop CVs in, get a ranked, scored shortlist. Every score points to evidence in the CV. {businessName} keeps the final call - no candidate is auto-rejected.
          </p>
        </header>

        <section className="bg-white shadow-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                Rubric
              </p>
              <select
                value={rubricId}
                onChange={e => setRubricId(e.target.value)}
                className="bg-light text-sm text-charcoal rounded-full px-4 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal"
              >
                {ALL_RUBRICS.map(r => (
                  <option key={r.rubric_id} value={r.rubric_id}>
                    {r.role}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1.5">
                Rubric editing comes in v2. For the demo, pick the closest match - all three are AU-tuned and blind by default.
              </p>
            </div>
          </div>

          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
            }}
            className={`block border-2 border-dashed rounded-2xl px-6 py-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-charcoal bg-light' : 'border-border hover:border-mid hover:bg-light'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files) handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <p className="text-sm font-bold text-charcoal mb-1">
              Drop CVs here or click to upload
            </p>
            <p className="text-xs text-muted">
              PDF, DOCX or plain text. Up to 20 at a time. Each scored against the rubric above.
            </p>
          </label>

          {pending.length > 0 && (
            <ul className="space-y-1.5">
              {pending.map(p => (
                <li key={p.id} className="flex items-center justify-between text-xs bg-light rounded-full px-4 py-2">
                  <span className="text-charcoal font-bold truncate max-w-[60%]">{p.filename}</span>
                  <span className={p.status === 'error' ? 'text-danger' : 'text-mid'}>
                    {p.status === 'error' ? `error - ${p.error}` : p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white shadow-card rounded-3xl">
          <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-2">
            <FilterChip label={`All (${counts.all})`} active />
            <FilterChip label={`Strong (${counts.strong})`} />
            <FilterChip label={`Yes (${counts.yes})`} />
            <FilterChip label={`Maybe (${counts.maybe})`} />
            <FilterChip label={`No (${counts.no})`} />
            <div className="ml-auto flex items-center gap-2">
              {advanceableCount > 0 && (
                <button
                  onClick={bulkSendVideo}
                  disabled={bulkBusy}
                  className="bg-black text-white text-xs font-bold rounded-full px-3 py-1.5 hover:bg-charcoal disabled:opacity-50"
                >
                  {bulkBusy ? 'Sending...' : `Send video pre-screen to ${advanceableCount} Yes/Strong`}
                </button>
              )}
              <span className="text-xs text-muted">
                {busy ? 'Scoring...' : `${filtered.length} candidates`}
              </span>
            </div>
          </div>
          {bulkResult && (
            <div className="px-6 py-2 border-b border-border bg-light text-xs text-mid">
              Bulk handoff complete: {bulkResult.sent} sent
              {bulkResult.failed > 0 && `, ${bulkResult.failed} failed`}.
              Sessions are visible in the Video Pre-screen tab.
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-mid">
                No candidates yet. Upload some CVs above to get started.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered
                .slice()
                .sort((a, b) => Number(b.overall_score) - Number(a.overall_score))
                .map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className="w-full px-6 py-4 grid grid-cols-12 gap-3 items-center text-left hover:bg-light transition-colors"
                    >
                      <span className="col-span-4 text-sm font-bold text-charcoal truncate">
                        {s.candidate_label}
                      </span>
                      <span className="col-span-2 text-sm text-charcoal font-bold">
                        {Number(s.overall_score).toFixed(2)}
                      </span>
                      <span className={`col-span-2 inline-flex items-center text-[11px] font-bold rounded-full px-3 py-1 ${BAND_COLOURS[s.band as keyof typeof BAND_COLOURS] ?? ''}`}>
                        {BAND_LABELS[s.band as keyof typeof BAND_LABELS] ?? s.band}
                      </span>
                      <span className="col-span-3 text-xs text-mid truncate">
                        {ACTION_LABELS[s.next_action as keyof typeof ACTION_LABELS] ?? s.next_action}
                      </span>
                      <span className="col-span-1 text-xs text-muted text-right">View</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="bg-white shadow-card rounded-3xl p-6 text-xs text-muted leading-relaxed">
          <p className="font-bold text-charcoal mb-2 text-sm">How scoring works</p>
          <p>
            CVs are scored against a structured rubric with 6-8 weighted criteria. Names, photos, addresses, dates of birth and graduation years are masked from the model so it scores on substance, not signal. Every score points to a verbatim CV span as evidence. No candidate is auto-rejected - the system recommends a next step but a human always clicks through.
          </p>
          <p className="mt-2">
            Bias dashboards, counterfactual probes, and rubric editing come in v1.5. The full v1 spec lives in <code className="text-charcoal">docs/CV-SCREENING-RESEARCH.md</code>.
          </p>
        </section>
      </div>

      {selected && (
        <CandidateScorecardPanel
          screening={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`text-xs font-bold rounded-full px-3 py-1.5 ${
        active ? 'bg-black text-white' : 'bg-light text-mid'
      }`}
    >
      {label}
    </span>
  )
}
