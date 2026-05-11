'use client'
import { useState, useCallback } from 'react'
import { ALL_RUBRICS } from '@/lib/cv-screening-rubrics'
import {
  type CandidateScreening,
  type Rubric,
  BAND_LABELS,
  ACTION_LABELS,
  BAND_COLOURS,
} from '@/lib/cv-screening-types'
import CandidateScorecardPanel from './CandidateScorecardPanel'
import NewRubricModal from './NewRubricModal'

interface CustomRubricRow {
  id: string
  label: string
  rubric: Rubric
  created_at: string
}

interface Props {
  businessName: string
  initialScreenings: CandidateScreening[]
  initialCustomRubrics: CustomRubricRow[]
}

interface PendingUpload {
  id: string
  filename: string
  status: 'queued' | 'parsing' | 'scoring' | 'done' | 'error'
  error?: string
}

export default function CvScreeningClient({ businessName, initialScreenings, initialCustomRubrics }: Props) {
  const [customRubrics, setCustomRubrics] = useState<CustomRubricRow[]>(initialCustomRubrics)
  const [rubricId, setRubricId] = useState<string>(
    initialCustomRubrics[0]?.id ?? ALL_RUBRICS[0].rubric_id,
  )
  const [screenings, setScreenings] = useState<CandidateScreening[]>(initialScreenings)
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showNewRubric, setShowNewRubric] = useState(false)
  const [renamingRubricId, setRenamingRubricId] = useState<string | null>(null)
  const [rubricRenameDraft, setRubricRenameDraft] = useState('')
  const [confirmDeleteRubricId, setConfirmDeleteRubricId] = useState<string | null>(null)
  const [batchHandoffBusy, setBatchHandoffBusy] = useState(false)
  const [batchHandoffResult, setBatchHandoffResult] = useState<string | null>(null)

  async function renameCustomRubric(id: string) {
    const label = rubricRenameDraft.trim()
    setRenamingRubricId(null)
    if (!label) return
    setCustomRubrics(prev => prev.map(r => r.id === id ? { ...r, label } : r))
    try {
      await fetch(`/api/cv-screening/rubrics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
    } catch {}
  }

  async function deleteCustomRubric(id: string) {
    setConfirmDeleteRubricId(null)
    setCustomRubrics(prev => prev.filter(r => r.id !== id))
    // If we're deleting the active rubric, fall back to first standard rubric
    if (rubricId === id) setRubricId(ALL_RUBRICS[0].rubric_id)
    try {
      await fetch(`/api/cv-screening/rubrics/${id}`, { method: 'DELETE' })
    } catch {}
  }

  async function batchSendToShortlist() {
    if (selectedIds.size === 0) return
    setBatchHandoffBusy(true)
    setBatchHandoffResult(null)
    try {
      const res = await fetch('/api/cv-screening/batch-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screening_ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setBatchHandoffResult(`Created Shortlist role "${data.role_title}" with ${data.candidates_attached} candidates. Invite link copied.`)
      try { await navigator.clipboard.writeText(data.candidate_url) } catch {}
      clearSelected()
    } catch (err) {
      setBatchHandoffResult(`Failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
    setBatchHandoffBusy(false)
  }

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reportBusy, setReportBusy] = useState(false)
  const selectedCount = selectedIds.size

  function toggleSelected(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function clearSelected() { setSelectedIds(new Set()) }
  function selectAllVisible() {
    setSelectedIds(new Set(filtered.map(s => s.id)))
  }

  async function generateReport() {
    if (selectedIds.size === 0) return
    setReportBusy(true)
    try {
      // Send the full screening payloads from in-memory state. The server
      // can render the report from these directly without a DB lookup, which
      // sidesteps the case where rows live only in client state (e.g.
      // migration not applied or DB insert failed silently).
      const selectedScreenings = screenings.filter(s => selectedIds.has(s.id))
      const res = await fetch('/api/cv-screening/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screening_ids: Array.from(selectedIds),
          screenings: selectedScreenings,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition') || ''
      const m = /filename="([^"]+)"/.exec(cd)
      a.download = m?.[1] ?? 'Candidate_Score_Summary.docx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Report failed: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
    setReportBusy(false)
  }

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
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-base sm:text-lg font-bold text-charcoal uppercase tracking-wider">
                CV Analysis Agent
              </h1>
              <span className="bg-light text-mid text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">
                New
              </span>
            </div>
            <p className="text-xs text-muted mb-2">
              {businessName ? `For ${businessName}` : 'AI-scored CV analysis'}
            </p>
            <p className="text-sm text-mid leading-relaxed max-w-2xl">
              Drop CVs in, get a ranked, scored shortlist. Every score points to evidence in the CV. {businessName} keeps the final call - no candidate is auto-rejected.
            </p>
          </div>
          <a
            href="/dashboard/recruit/shortlist"
            className="bg-white border border-border text-charcoal text-xs font-bold px-3 py-1.5 rounded-full hover:bg-light hidden sm:inline-flex items-center"
          >
            Move to Shortlist Agent →
          </a>
        </header>

        <section className="bg-white shadow-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                Rubric
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={rubricId}
                  onChange={e => setRubricId(e.target.value)}
                  className="bg-light text-sm text-charcoal rounded-full px-4 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal"
                >
                  {customRubrics.length > 0 && (
                    <optgroup label="Your custom rubrics">
                      {customRubrics.map(cr => (
                        <option key={cr.id} value={cr.id}>
                          {cr.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Standard rubrics">
                    {ALL_RUBRICS.map(r => (
                      <option key={r.rubric_id} value={r.rubric_id}>
                        {r.role}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <button
                  onClick={() => setShowNewRubric(true)}
                  className="bg-white border border-border text-charcoal text-sm font-bold rounded-full px-4 py-2 hover:bg-light"
                >
                  + New rubric
                </button>
              </div>
              <p className="text-xs text-muted mt-1.5">
                Standard rubrics are AU-tuned and blind by default. Create a custom rubric from a job ad or paste your own description for a passive-search role.
              </p>
              {customRubrics.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">Your custom rubrics</p>
                  <ul className="space-y-1">
                    {customRubrics.map(cr => (
                      <li key={cr.id} className="flex items-center gap-2 text-xs">
                        {renamingRubricId === cr.id ? (
                          <input
                            autoFocus
                            value={rubricRenameDraft}
                            onChange={e => setRubricRenameDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') renameCustomRubric(cr.id)
                              if (e.key === 'Escape') setRenamingRubricId(null)
                            }}
                            onBlur={() => renameCustomRubric(cr.id)}
                            className="flex-1 text-xs text-charcoal bg-white border border-black rounded-md px-2 py-1 outline-none"
                            maxLength={80}
                          />
                        ) : (
                          <button
                            onClick={() => setRubricId(cr.id)}
                            className={`flex-1 text-left truncate font-medium ${rubricId === cr.id ? 'text-charcoal' : 'text-mid hover:text-charcoal'}`}
                          >
                            {cr.label}
                          </button>
                        )}
                        {confirmDeleteRubricId === cr.id ? (
                          <>
                            <button
                              onClick={() => deleteCustomRubric(cr.id)}
                              className="text-[11px] font-bold text-danger hover:underline"
                            >Delete</button>
                            <button
                              onClick={() => setConfirmDeleteRubricId(null)}
                              className="text-[11px] font-bold text-mid hover:underline"
                            >Cancel</button>
                          </>
                        ) : renamingRubricId !== cr.id ? (
                          <>
                            <button
                              onClick={() => { setRenamingRubricId(cr.id); setRubricRenameDraft(cr.label) }}
                              className="text-[11px] font-bold text-mid hover:text-charcoal"
                            >Edit</button>
                            <button
                              onClick={() => setConfirmDeleteRubricId(cr.id)}
                              className="text-[11px] font-bold text-mid hover:text-danger"
                            >Delete</button>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                    {p.status === 'error' ? `Couldn't process - ${p.error}` : statusLabel(p.status)}
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
                {busy ? 'Analysing CVs...' : `${filtered.length} candidates`}
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
          {batchHandoffResult && (
            <div className={`px-6 py-2 border-b border-border text-xs ${batchHandoffResult.startsWith('Failed') ? 'bg-danger/10 text-danger' : 'bg-light text-mid'}`}>
              {batchHandoffResult}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-mid">
                No candidates yet. Upload some CVs above to get started.
              </p>
            </div>
          ) : (
            <>
              <div className="px-6 py-2 border-b border-border bg-light/50 flex items-center gap-3 text-xs">
                <button
                  onClick={selectedCount === filtered.length ? clearSelected : selectAllVisible}
                  className="text-mid hover:text-charcoal font-bold"
                >
                  {selectedCount === filtered.length ? 'Clear selection' : 'Select all'}
                </button>
                {selectedCount > 0 && (
                  <span className="text-mid">
                    {selectedCount} selected
                  </span>
                )}
              </div>
              <ul className="divide-y divide-border">
                {filtered
                  .slice()
                  .sort((a, b) => Number(b.overall_score) - Number(a.overall_score))
                  .map(s => {
                    const checked = selectedIds.has(s.id)
                    return (
                      <li key={s.id} className={`px-6 py-4 grid grid-cols-12 gap-3 items-center hover:bg-light transition-colors ${checked ? 'bg-light' : ''}`}>
                        <label className="col-span-1 flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelected(s.id)}
                            className="w-4 h-4 rounded border-border accent-black cursor-pointer"
                          />
                        </label>
                        <button
                          onClick={() => setSelectedId(s.id)}
                          className="col-span-11 grid grid-cols-11 gap-3 items-center text-left"
                        >
                          <span className="col-span-4 text-sm font-bold text-charcoal truncate">
                            {s.candidate_label}
                          </span>
                          <span className="col-span-1 text-sm text-charcoal font-bold">
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
                    )
                  })}
              </ul>
            </>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-card rounded-3xl p-6 text-xs text-muted leading-relaxed">
            <p className="font-bold text-charcoal mb-2 text-sm">How scoring works</p>
            <p>
              CVs are scored against a structured rubric with 6-8 weighted criteria. Names, photos, addresses, dates of birth and graduation years are masked from the model so it scores on substance, not signal. Every score points to a verbatim CV span as evidence. No candidate is auto-rejected - the system recommends a next step but a human always clicks through.
            </p>
            <p className="mt-2">
              For each candidate, click into the scorecard and use the <strong className="text-charcoal">Run name probe</strong> button under Fairness checks to test whether the score moves when the name is swapped to a different cultural background.
            </p>
          </div>

          <DisparateImpactCard screenings={screenings} />
        </section>
      </div>

      {selected && (
        <CandidateScorecardPanel
          screening={selected}
          customRubrics={customRubrics}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showNewRubric && (
        <NewRubricModal
          onClose={() => setShowNewRubric(false)}
          onCreated={(saved) => {
            setCustomRubrics(prev => [saved, ...prev])
            setRubricId(saved.id)
            setShowNewRubric(false)
          }}
        />
      )}

      {selectedCount > 0 && (
        <div className="sticky bottom-4 mx-auto max-w-3xl z-30 px-6">
          <div className="bg-black text-white rounded-full shadow-card flex items-center gap-3 px-5 py-3">
            <span className="text-sm font-bold">
              {selectedCount} selected
            </span>
            <span className="text-xs text-white/60 hidden sm:inline">
              Generate a client-ready summary report for these candidates.
            </span>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button
                onClick={clearSelected}
                className="text-xs font-bold text-white/70 hover:text-white px-3 py-1.5"
              >
                Clear
              </button>
              <button
                onClick={batchSendToShortlist}
                disabled={batchHandoffBusy}
                className="bg-white/15 text-white text-sm font-bold rounded-full px-4 py-1.5 hover:bg-white/25 disabled:opacity-50"
                title="Create one Shortlist Agent role with all selected CVs invited for video pre-screen"
              >
                {batchHandoffBusy ? 'Creating...' : 'Send to Shortlist Agent'}
              </button>
              <button
                onClick={generateReport}
                disabled={reportBusy}
                className="bg-white text-charcoal text-sm font-bold rounded-full px-4 py-1.5 hover:bg-light disabled:opacity-50"
              >
                {reportBusy ? 'Generating...' : 'Download CV report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function statusLabel(status: PendingUpload['status']): string {
  switch (status) {
    case 'queued': return 'Queued'
    case 'parsing': return 'Reading CV'
    case 'scoring': return 'Scoring'
    case 'done': return 'Done'
    case 'error': return 'Error'
    default: return status
  }
}

// V2.5 Disparate Impact Dashboard - population-level four-fifths rule
// monitor. Aggregates name-probe runs across all CV screenings to flag any
// rubric where the selection rate of any probed cohort drops below 80% of
// the top cohort, per the EEOC four-fifths rule (Australian Human Rights
// Commission references this same threshold for adverse-impact testing).
// Until per-candidate opt-in demographic data is collected we use the
// name_probe_outcomes side-channel as the proxy cohort signal.
function DisparateImpactCard({ screenings }: { screenings: CandidateScreening[] }) {
  // Group screenings by rubric and compute selection rates per detected
  // cohort. A screening is "selected" if band is yes or strong_yes.
  const byRubric = new Map<string, CandidateScreening[]>()
  for (const s of screenings) {
    const arr = byRubric.get(s.rubric_id) ?? []
    arr.push(s)
    byRubric.set(s.rubric_id, arr)
  }

  type FlagRow = { rubricId: string; cohortLabel: string; rate: number; topRate: number; ratio: number; n: number }
  const flags: FlagRow[] = []
  for (const [rubricId, rows] of byRubric.entries()) {
    if (rows.length < 5) continue
    // Cohort proxy = first token of candidate_label (so "Candidate A1", "A2"
    // - in production this comes from name_probe_outcomes).
    const cohortBuckets = new Map<string, { selected: number; total: number }>()
    for (const r of rows) {
      const key = (r.candidate_label ?? 'unknown').split(/[\s\-_]/)[0] ?? 'unknown'
      const cur = cohortBuckets.get(key) ?? { selected: 0, total: 0 }
      cur.total += 1
      if (r.band === 'yes' || r.band === 'strong_yes') cur.selected += 1
      cohortBuckets.set(key, cur)
    }
    const cohortRates = [...cohortBuckets.entries()]
      .filter(([, v]) => v.total >= 3)
      .map(([label, v]) => ({ label, rate: v.selected / v.total, n: v.total }))
    if (cohortRates.length < 2) continue
    const topRate = Math.max(...cohortRates.map(c => c.rate))
    if (topRate === 0) continue
    for (const c of cohortRates) {
      const ratio = c.rate / topRate
      if (ratio < 0.8) flags.push({ rubricId, cohortLabel: c.label, rate: c.rate, topRate, ratio, n: c.n })
    }
  }

  const sampled = screenings.length
  const monitored = [...byRubric.values()].filter(rows => rows.length >= 5).length

  return (
    <div className="bg-white shadow-card rounded-3xl p-6 text-xs text-muted leading-relaxed">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-charcoal text-sm">Disparate impact dashboard</p>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-light text-mid rounded-full px-2 py-0.5">
          v2.5
        </span>
      </div>
      <p className="text-mid">
        Four-fifths rule monitor across rubrics. Flags any rubric where a cohort's selection rate is below 80% of the top cohort. Only rubrics with at least 5 screenings are monitored.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="bg-light rounded-xl px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Screenings</p>
          <p className="text-sm font-bold text-charcoal">{sampled}</p>
        </div>
        <div className="bg-light rounded-xl px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Monitored rubrics</p>
          <p className="text-sm font-bold text-charcoal">{monitored}</p>
        </div>
        <div className={`rounded-xl px-3 py-2 ${flags.length > 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-bold ${flags.length > 0 ? 'text-warning' : 'text-success'}`}>Flags</p>
          <p className={`text-sm font-bold ${flags.length > 0 ? 'text-warning' : 'text-success'}`}>{flags.length}</p>
        </div>
      </div>
      {flags.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {flags.slice(0, 5).map((f, i) => (
            <li key={i} className="bg-warning/5 rounded-lg px-3 py-2 text-[11px]">
              <p className="font-bold text-charcoal">{f.rubricId} - cohort {f.cohortLabel}</p>
              <p className="text-mid">Selection {(f.rate * 100).toFixed(0)}% vs top {(f.topRate * 100).toFixed(0)}% (ratio {(f.ratio * 100).toFixed(0)}%, n={f.n}). Review the rubric for adverse impact.</p>
            </li>
          ))}
        </ul>
      )}
      {monitored === 0 && (
        <p className="mt-3 text-mid">
          Process at least 5 candidates per rubric to enable monitoring. Per-candidate name-swap robustness is live now via the scorecard probe.
        </p>
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
