'use client'
import { useState, useCallback } from 'react'
import { ALL_RUBRICS } from '@/lib/cv-screening-rubrics'
import {
  type CandidateScreening,
  type Rubric,
  BAND_LABELS,
  ACTION_LABELS,
  BAND_COLOURS,
  effectiveBand,
  effectiveNextAction,
} from '@/lib/cv-screening-types'
import CandidateScorecardPanel from './CandidateScorecardPanel'
import NewRubricModal from './NewRubricModal'
import EditRubricModal from './EditRubricModal'
import OverrideModal from './OverrideModal'

interface CustomRubricRow {
  id: string
  label: string
  label_family: string | null
  parent_rubric_id: string | null
  version_number: number | null
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
  const [editingRubric, setEditingRubric] = useState<CustomRubricRow | null>(null)
  const [overrideTarget, setOverrideTarget] = useState<CandidateScreening | null>(null)
  const [renamingRubricId, setRenamingRubricId] = useState<string | null>(null)
  const [rubricRenameDraft, setRubricRenameDraft] = useState('')
  const [confirmDeleteRubricId, setConfirmDeleteRubricId] = useState<string | null>(null)
  const [batchHandoffBusy, setBatchHandoffBusy] = useState(false)
  const [batchHandoffResult, setBatchHandoffResult] = useState<string | null>(null)
  const [savingStarterId, setSavingStarterId] = useState<string | null>(null)

  // Save a starter-library rubric into the user's "Saved scoring criteria"
  // list so they can reuse it for future roles - including editing it
  // (which the starter library can't be). Hits the same POST endpoint
  // that the New rubric modal uses, just supplying the starter's rubric
  // payload directly so no AI generation is needed.
  async function saveStarterToLibrary(r: { rubric_id: string; role: string } & Record<string, unknown>) {
    setSavingStarterId(r.rubric_id)
    try {
      const res = await fetch('/api/cv-screening/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: r.role,
          rubric: r,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      const saved = data.rubric as CustomRubricRow
      setCustomRubrics(prev => [saved, ...prev])
      // Auto-select the freshly saved copy so the user lands on it ready
      // to edit, since that's the typical reason for saving.
      setRubricId(saved.id)
      setCustomOpen(true)
    } catch (err) {
      console.warn('[cv-screening] save starter failed', err)
    }
    setSavingStarterId(null)
  }

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
      setBatchHandoffResult(`Created Shortlist role "${data.role_title}" with ${data.candidates_attached} candidates. Taking you there now...`)
      try { await navigator.clipboard.writeText(data.candidate_url) } catch {}
      clearSelected()
      // Auto-navigate to the new Shortlist Agent role so the user sees the
      // candidates that flowed through. Short delay so the success toast is
      // readable.
      setTimeout(() => {
        window.location.href = `/dashboard/recruit/shortlist?session=${data.session_id}`
      }, 800)
    } catch (err) {
      setBatchHandoffResult(`Failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
    setBatchHandoffBusy(false)
  }

  const filtered = screenings.filter(s => s.rubric_id === rubricId)
  const counts = {
    all: filtered.length,
    strong: filtered.filter(s => effectiveBand(s) === 'strong_yes').length,
    yes: filtered.filter(s => effectiveBand(s) === 'yes').length,
    maybe: filtered.filter(s => effectiveBand(s) === 'maybe').length,
    no: filtered.filter(s => { const b = effectiveBand(s); return b === 'likely_no' || b === 'reject' }).length,
  }
  const selected = screenings.find(s => s.id === selectedId) ?? null

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

  // Resolve the currently-selected rubric to a display label and origin
  // (custom vs standard). Used in the right-panel header.
  const activeCustom = customRubrics.find(cr => cr.id === rubricId)
  const activeStandard = ALL_RUBRICS.find(r => r.rubric_id === rubricId)
  const activeFamily = activeCustom
    ? customRubrics.filter(cr => (cr.parent_rubric_id ?? cr.id) === (activeCustom.parent_rubric_id ?? activeCustom.id))
        .sort((a, b) => (b.version_number ?? 1) - (a.version_number ?? 1))
    : []
  const activeRubricLabel = activeCustom
    ? (activeFamily.length > 1
        ? `${activeCustom.label_family ?? activeCustom.label} (v${activeCustom.version_number ?? 1})`
        : activeCustom.label)
    : (activeStandard?.role ?? 'Select a rubric')
  const activeRubricKind: 'custom' | 'standard' | null = activeCustom ? 'custom' : (activeStandard ? 'standard' : null)

  // Mobile back state: when a rubric is selected we hide the left panel
  // on small screens (mirrors Shortlist Agent role detail behaviour).
  const [mobileShowList, setMobileShowList] = useState(false)
  const showListPanel = mobileShowList || !rubricId

  const customCount = customRubrics.length
  const standardCount = ALL_RUBRICS.length

  // Group custom rubrics by their family (parent_rubric_id). Each family
  // contains its versions sorted newest first so "Senior Carpenter v2"
  // appears above "Senior Carpenter v1". Families themselves are sorted by
  // the most recent version's created_at so recently-edited families float
  // to the top of the list.
  const customFamilies = (() => {
    const byFamily = new Map<string, CustomRubricRow[]>()
    for (const cr of customRubrics) {
      const fid = cr.parent_rubric_id ?? cr.id
      const list = byFamily.get(fid) ?? []
      list.push(cr)
      byFamily.set(fid, list)
    }
    return [...byFamily.entries()]
      .map(([familyId, versions]) => {
        versions.sort((a, b) => (b.version_number ?? 1) - (a.version_number ?? 1))
        const familyLabel = versions[0]?.label_family ?? versions[0]?.label ?? 'Custom rubric'
        return { familyId, familyLabel, versions }
      })
      .sort((a, b) => new Date(b.versions[0].created_at).getTime() - new Date(a.versions[0].created_at).getTime())
  })()

  const [customOpen, setCustomOpen] = useState(true)
  const [standardOpen, setStandardOpen] = useState(true)

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-bg">

      {/* -- Left panel: rubric list -- */}
      <div className={`w-full lg:w-64 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex-col ${showListPanel ? 'flex' : 'hidden lg:flex'}`}>

        {/* Header - mirrors Shortlist Agent header style */}
        <div className="px-4 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-base sm:text-lg font-bold text-charcoal uppercase tracking-wider">
              CV Scoring Agent
            </h1>
            <span className="bg-light text-mid text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">
              New
            </span>
          </div>
          <p className="text-xs text-muted mb-2">
            {customCount} custom · {standardCount} standard
          </p>
          <button
            onClick={() => setShowNewRubric(true)}
            className="bg-black hover:bg-charcoal text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
          >
            + New scoring criteria
          </button>
        </div>

        {/* Rubric list (scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <RubricGroupHeader label="Saved scoring criteria" count={customCount} open={customOpen} onToggle={() => setCustomOpen(v => !v)} tone="active" />
          {customOpen && customCount === 0 && (
            <p className="text-xs text-mid px-4 py-3">No saved scoring criteria yet. Create one from a job ad or description and save it to reuse for future roles.</p>
          )}
          {customOpen && customFamilies.map(fam => (
            <div key={fam.familyId}>
              {/* Family header - only render if there are 2+ versions */}
              {fam.versions.length > 1 && (
                <div className="px-4 pt-2 pb-1 bg-white">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider truncate">{fam.familyLabel}</p>
                </div>
              )}
              {fam.versions.map((cr) => {
                const cohort = screenings.filter(s => s.rubric_id === cr.id).length
                const subParts = [
                  `v${cr.version_number ?? 1}`,
                  cohort > 0 ? `${cohort} scored` : 'no candidates yet',
                  fam.versions.length === 1 ? new Date(cr.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : null,
                ].filter(Boolean) as string[]
                return (
                  <RubricRow
                    key={cr.id}
                    label={fam.versions.length === 1 ? cr.label : `${cr.label_family ?? cr.label} (v${cr.version_number ?? 1})`}
                    sub={subParts.join(' - ')}
                    selected={rubricId === cr.id}
                    onSelect={() => { setRubricId(cr.id); setMobileShowList(false) }}
                    renaming={renamingRubricId === cr.id}
                    renameDraft={rubricRenameDraft}
                    onRenameDraft={setRubricRenameDraft}
                    onCommitRename={() => renameCustomRubric(cr.id)}
                    onCancelRename={() => setRenamingRubricId(null)}
                    onStartRename={() => { setRenamingRubricId(cr.id); setRubricRenameDraft(cr.label) }}
                    onStartEditCriteria={() => setEditingRubric(cr)}
                    confirmDelete={confirmDeleteRubricId === cr.id}
                    onConfirmDelete={() => deleteCustomRubric(cr.id)}
                    onAskDelete={() => setConfirmDeleteRubricId(cr.id)}
                    onCancelDelete={() => setConfirmDeleteRubricId(null)}
                    versionBadge={fam.versions.length > 1 ? `v${cr.version_number ?? 1}` : undefined}
                  />
                )
              })}
            </div>
          ))}

          <RubricGroupHeader label="HQ.ai starter library" count={standardCount} open={standardOpen} onToggle={() => setStandardOpen(v => !v)} tone="draft" />
          {standardOpen && ALL_RUBRICS.map(r => (
            <RubricRow
              key={r.rubric_id}
              label={r.role}
              sub="AU-tuned, blind by default"
              selected={rubricId === r.rubric_id}
              onSelect={() => { setRubricId(r.rubric_id); setMobileShowList(false) }}
              readOnly
              savingToLibrary={savingStarterId === r.rubric_id}
              onSaveToLibrary={() => saveStarterToLibrary(r)}
            />
          ))}
        </div>
      </div>

      {/* -- Right panel: rubric detail (upload + candidates + DI) -- */}
      <div className={`flex-1 overflow-hidden ${showListPanel ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
        {activeRubricKind ? (
          <>
            {/* Mobile back bar */}
            <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 border-b border-border bg-white flex-shrink-0">
              <button
                onClick={() => setMobileShowList(true)}
                className="flex items-center gap-1.5 text-sm font-bold text-charcoal hover:text-black transition-colors"
                aria-label="Back to scoring criteria"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd"/>
                </svg>
                Back to rubrics
              </button>
            </div>

            {/* Detail content (scrollable) */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

                {/* Rubric header */}
                <header className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                      {activeRubricKind === 'custom' ? 'Custom rubric' : 'Standard rubric'}
                    </p>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-1.5">
                      {activeRubricLabel}
                    </h2>
                    <p className="text-sm text-mid leading-relaxed max-w-2xl">
                      Drop CVs in - every score points to evidence in the CV. {businessName} keeps the final call, no candidate is auto-rejected.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activeCustom && (
                      <button
                        onClick={() => setEditingRubric(activeCustom)}
                        className="bg-white border border-border text-charcoal text-xs font-bold px-3 py-1.5 rounded-full hover:bg-light inline-flex items-center gap-1.5"
                        title="Edit criteria (creates a new version, keeps existing scores under v{activeCustom.version_number})"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2h2a1 1 0 010 2h-2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V8H3a1 1 0 010-2h2V4zm2 4v8h6V8H7zm2-4v2h2V4H9z"/>
                        </svg>
                        Edit criteria
                      </button>
                    )}
                    <a
                      href="/dashboard/recruit/shortlist"
                      className="bg-white border border-border text-charcoal text-xs font-bold px-3 py-1.5 rounded-full hover:bg-light hidden sm:inline-flex items-center"
                    >
                      Move to Shortlist Agent →
                    </a>
                  </div>
                </header>

                {/* Version switcher - only when this rubric has 2+ versions */}
                {activeCustom && activeFamily.length > 1 && (
                  <div className="bg-white shadow-card rounded-3xl px-5 py-3 flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] font-bold text-muted uppercase tracking-wider mr-2">Versions</p>
                    {activeFamily.map(v => {
                      const cohort = screenings.filter(s => s.rubric_id === v.id).length
                      const isActive = v.id === activeCustom.id
                      return (
                        <button
                          key={v.id}
                          onClick={() => setRubricId(v.id)}
                          className={`text-xs font-bold rounded-full px-3 py-1.5 transition-colors ${
                            isActive ? 'bg-black text-white' : 'bg-light text-mid hover:bg-border hover:text-charcoal'
                          }`}
                          title={`v${v.version_number ?? 1} - ${cohort} candidate${cohort === 1 ? '' : 's'} scored`}
                        >
                          v{v.version_number ?? 1}
                          <span className={`ml-1.5 ${isActive ? 'text-white/70' : 'text-muted'}`}>
                            {cohort}
                          </span>
                        </button>
                      )
                    })}
                    <p className="text-[10px] text-muted ml-1">
                      Each version keeps its own candidate scores.
                    </p>
                  </div>
                )}

                {/* Upload area */}
                <section className="bg-white shadow-card rounded-3xl p-6 space-y-5">
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
                      PDF, DOCX or plain text. Up to 20 at a time. Scored against <strong>{activeRubricLabel}</strong>.
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

                {/* Candidates */}
                <section className="bg-white shadow-card rounded-3xl">
                  <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-2">
                    <FilterChip label={`All (${counts.all})`} active />
                    <FilterChip label={`Strong (${counts.strong})`} />
                    <FilterChip label={`Yes (${counts.yes})`} />
                    <FilterChip label={`Maybe (${counts.maybe})`} />
                    <FilterChip label={`No (${counts.no})`} />
                    <span className="ml-auto text-xs text-muted">
                      {busy ? 'Analysing CVs...' : `${filtered.length} candidates`}
                    </span>
                  </div>
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
                          <span className="text-mid">{selectedCount} selected</span>
                        )}
                      </div>
                      <ul className="divide-y divide-border">
                        {/* Header row */}
                        <li className="px-6 py-2 hidden sm:grid grid-cols-12 gap-3 items-center text-[10px] font-bold uppercase tracking-wider text-muted bg-light/50">
                          <span className="col-span-1" />
                          <span className="col-span-3">Candidate</span>
                          <span className="col-span-1">Score</span>
                          <span className="col-span-2">Band</span>
                          <span className="col-span-2">Next step</span>
                          <span className="col-span-2">Comments</span>
                          <span className="col-span-1 text-right">View</span>
                        </li>
                        {filtered
                          .slice()
                          .sort((a, b) => Number(b.overall_score) - Number(a.overall_score))
                          .map(s => {
                            const checked = selectedIds.has(s.id)
                            const band = effectiveBand(s)
                            const action = effectiveNextAction(s)
                            const hasOverride = !!(s.override_band || s.override_next_action || s.override_comment)
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
                                  className="col-span-3 text-sm font-bold text-charcoal truncate text-left"
                                >
                                  {s.candidate_label}
                                </button>
                                <button
                                  onClick={() => setSelectedId(s.id)}
                                  className="col-span-1 text-sm text-charcoal font-bold text-left"
                                >
                                  {Number(s.overall_score).toFixed(2)}
                                </button>
                                <button
                                  onClick={() => setOverrideTarget(s)}
                                  title="Click to override the AI's band"
                                  className={`col-span-2 inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-3 py-1 hover:ring-1 hover:ring-charcoal transition-all justify-start ${BAND_COLOURS[band as keyof typeof BAND_COLOURS] ?? ''}`}
                                >
                                  {BAND_LABELS[band as keyof typeof BAND_LABELS] ?? band}
                                  {s.override_band && <span className="text-[9px] opacity-70">edited</span>}
                                </button>
                                <button
                                  onClick={() => setOverrideTarget(s)}
                                  title="Click to override the AI's next step"
                                  className="col-span-2 text-xs text-mid truncate text-left hover:text-charcoal hover:underline"
                                >
                                  {ACTION_LABELS[action as keyof typeof ACTION_LABELS] ?? action}
                                  {s.override_next_action && <span className="text-[9px] ml-1 opacity-70">edited</span>}
                                </button>
                                <button
                                  onClick={() => setOverrideTarget(s)}
                                  title={s.override_comment || 'Click to add a comment'}
                                  className={`col-span-2 text-xs truncate text-left ${hasOverride ? 'text-charcoal hover:underline' : 'text-muted hover:text-charcoal italic'}`}
                                >
                                  {s.override_comment ? s.override_comment : 'Add comment...'}
                                </button>
                                <button
                                  onClick={() => setSelectedId(s.id)}
                                  className="col-span-1 text-xs text-muted text-right hover:text-charcoal"
                                >
                                  View
                                </button>
                              </li>
                            )
                          })}
                      </ul>
                    </>
                  )}
                </section>

                {/* How the agent works - full-width info card.
                    Replaces the old two-up grid that paired with the
                    Disparate Impact Dashboard. Reframed into two clear
                    sections: HOW (explains what's happening behind the
                    scenes) and WHAT TO DO (concrete next steps the
                    user should take). */}
                <section className="bg-white shadow-card rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-black" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted">How the CV Scoring Agent works</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <div>
                      <p className="text-sm font-bold text-charcoal mb-2">What the agent does</p>
                      <ul className="space-y-2 text-xs text-mid leading-relaxed list-disc pl-4">
                        <li>Scores each CV against the criteria on the left, weighted by importance.</li>
                        <li>Masks names, photos, addresses, dates of birth and graduation years before scoring - the model judges substance, not signal.</li>
                        <li>Backs every score with a verbatim line from the CV so you can see exactly why.</li>
                        <li>Recommends a next step (Schedule panel, Phone screen, Hold for review, etc.) but never auto-rejects a candidate.</li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-charcoal mb-2">What to do from here</p>
                      <ol className="space-y-2 text-xs text-mid leading-relaxed list-decimal pl-4">
                        <li><strong className="text-charcoal">Open a candidate.</strong> Click a row to read their scorecard with the evidence quoted from their CV.</li>
                        <li><strong className="text-charcoal">Override the AI if you disagree.</strong> Click the score band or next-step on any row to change it and add a short comment explaining why.</li>
                        <li><strong className="text-charcoal">Run a fairness check.</strong> In any scorecard, use <em>Run name probe</em> under Fairness checks to test if the score moves when the candidate&apos;s name is swapped to a different cultural background.</li>
                        <li><strong className="text-charcoal">Send your shortlist forward.</strong> Tick the candidates you want and use <em>Send to Shortlist Agent</em> to bundle them as one campaign with their CV scoring carried through.</li>
                        <li><strong className="text-charcoal">Save criteria you&apos;ll reuse.</strong> If you hired for the same role last quarter, save the scoring criteria from the left panel so you don&apos;t rebuild it from scratch next time.</li>
                      </ol>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted italic mt-5 leading-relaxed border-t border-border pt-4">
                    HQ.ai does not make hiring decisions. It supports yours. Every recommendation here is reviewable, overridable, and auditable. You always click the button.
                  </p>
                </section>

              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs px-4">
              <div className="w-14 h-14 bg-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-charcoal mb-1 uppercase tracking-wider">Select scoring criteria</h2>
              <p className="text-sm text-mid mb-5">
                Pick a rubric from the left panel, or create a new one from a job ad.
              </p>
              <button
                onClick={() => setShowNewRubric(true)}
                className="bg-black hover:bg-charcoal text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
              >
                + New scoring criteria
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scorecard side panel */}
      {selected && (
        <CandidateScorecardPanel
          screening={selected}
          customRubrics={customRubrics}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* New rubric modal */}
      {showNewRubric && (
        <NewRubricModal
          onClose={() => setShowNewRubric(false)}
          onCreated={(saved) => {
            // NewRubricModal returns the legacy shape; coerce to the full
            // versioned row shape so the new list rendering stays happy.
            const row: CustomRubricRow = {
              ...(saved as unknown as { id: string; label: string; rubric: Rubric; created_at: string }),
              label_family: (saved as any).label ?? null,
              parent_rubric_id: (saved as any).id ?? null,
              version_number: 1,
            }
            setCustomRubrics(prev => [row, ...prev])
            setRubricId(row.id)
            setShowNewRubric(false)
          }}
        />
      )}

      {/* Edit criteria modal - creates a new version */}
      {editingRubric && (
        <EditRubricModal
          rubric={editingRubric}
          onClose={() => setEditingRubric(null)}
          onSaved={(newVersion) => {
            setCustomRubrics(prev => [newVersion, ...prev])
            setRubricId(newVersion.id)
            setEditingRubric(null)
          }}
        />
      )}

      {/* Manual override modal - human edit of band/next_action/comment */}
      {overrideTarget && (
        <OverrideModal
          screening={overrideTarget}
          onClose={() => setOverrideTarget(null)}
          onSaved={(updated) => {
            setScreenings(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
            setOverrideTarget(null)
          }}
        />
      )}

      {/* Sticky selection bar - single line, scales width with content */}
      {selectedCount > 0 && (
        <div className="absolute bottom-4 left-0 right-0 z-30 px-4 pointer-events-none">
          <div className="mx-auto w-fit max-w-[min(100%,_960px)] bg-black text-white rounded-full shadow-card flex items-center gap-3 px-5 py-2.5 whitespace-nowrap pointer-events-auto">
            <span className="text-sm font-bold flex-shrink-0">{selectedCount} selected</span>
            <span className="text-xs text-white/60 hidden md:inline">
              Generate a client-ready summary or send to Shortlist Agent.
            </span>
            <button
              onClick={clearSelected}
              className="text-xs font-bold text-white/70 hover:text-white px-2 py-1 flex-shrink-0"
            >
              Clear
            </button>
            <button
              onClick={batchSendToShortlist}
              disabled={batchHandoffBusy}
              className="bg-white/15 text-white text-sm font-bold rounded-full px-4 py-1.5 hover:bg-white/25 disabled:opacity-50 flex-shrink-0"
              title="Create one Shortlist Agent role with all selected CVs invited for video pre-screen"
            >
              {batchHandoffBusy ? 'Creating...' : 'Send to Shortlist Agent'}
            </button>
            <button
              onClick={generateReport}
              disabled={reportBusy}
              className="bg-white text-charcoal text-sm font-bold rounded-full px-4 py-1.5 hover:bg-light disabled:opacity-50 flex-shrink-0"
            >
              {reportBusy ? 'Generating...' : 'Download CV report'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Group header mirrors Shortlist Agent's GroupHeader visual.
function RubricGroupHeader({
  label, count, open, onToggle, tone,
}: {
  label: string; count: number; open: boolean; onToggle: () => void; tone: 'active' | 'draft'
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-light/60 border-b border-border text-left"
    >
      <span className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${tone === 'active' ? 'bg-black' : 'bg-mid'}`} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal">
          {label} <span className="text-mid font-normal">({count})</span>
        </span>
      </span>
      <svg className={`w-3 h-3 text-mid transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
      </svg>
    </button>
  )
}

// Row mirrors Shortlist Agent's SessionRow but for rubrics. Selected row
// gets a left accent bar + bg shift; custom rubrics expose Edit/Delete on
// hover, with inline rename and a confirm step on delete. The pencil icon
// opens the criteria editor (creates a new version); the inline rename
// path is reserved for label-only changes.
function RubricRow({
  label, sub, selected, onSelect, readOnly, versionBadge,
  renaming, renameDraft, onRenameDraft, onCommitRename, onCancelRename, onStartRename,
  onStartEditCriteria,
  confirmDelete, onConfirmDelete, onAskDelete, onCancelDelete,
  onSaveToLibrary, savingToLibrary,
}: {
  label: string
  sub?: string
  selected: boolean
  onSelect: () => void
  readOnly?: boolean
  versionBadge?: string
  renaming?: boolean
  renameDraft?: string
  onRenameDraft?: (v: string) => void
  onCommitRename?: () => void
  onCancelRename?: () => void
  onStartRename?: () => void
  onStartEditCriteria?: () => void
  confirmDelete?: boolean
  onConfirmDelete?: () => void
  onAskDelete?: () => void
  onCancelDelete?: () => void
  // Starter-library rows can offer a "Save to my criteria" action that
  // copies the starter rubric into the user's saved list so they can
  // edit + reuse it. Only the starter readOnly rows pass this.
  onSaveToLibrary?: () => void
  savingToLibrary?: boolean
}) {
  return (
    <div
      onClick={renaming || confirmDelete ? undefined : onSelect}
      className={`group relative w-full text-left px-4 py-3 border-b border-border cursor-pointer hover:bg-light/60 transition-colors ${
        selected ? 'bg-light' : ''
      }`}
    >
      {selected && <span className="absolute left-0 top-0 bottom-0 w-1 bg-black" />}
      {renaming ? (
        <input
          autoFocus
          value={renameDraft}
          onChange={e => onRenameDraft?.(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onCommitRename?.()
            if (e.key === 'Escape') onCancelRename?.()
          }}
          onBlur={onCommitRename}
          onClick={e => e.stopPropagation()}
          className="w-full text-sm font-medium text-charcoal bg-white border border-black rounded-md px-2 py-1 outline-none"
          maxLength={80}
        />
      ) : (
        <>
          <div className="flex items-center gap-1.5 pr-16">
            <p className="text-sm font-medium text-charcoal truncate flex-1">{label}</p>
            {versionBadge && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-light text-mid rounded-full px-1.5 py-0.5 flex-shrink-0">
                {versionBadge}
              </span>
            )}
          </div>
          {sub && <p className="text-[10px] text-muted mt-0.5 truncate pr-16">{sub}</p>}
        </>
      )}

      {/* Starter-library row action: save into the user's saved scoring
          criteria. Visible only on starter rows (readOnly), and on
          hover. Once saved, the new copy auto-selects so the user lands
          ready to edit. */}
      {readOnly && onSaveToLibrary && !renaming && !confirmDelete && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); if (!savingToLibrary) onSaveToLibrary() }}
            disabled={savingToLibrary}
            title="Save into your scoring criteria so you can edit it and reuse it for future roles"
            className="text-[10px] font-bold uppercase tracking-wider bg-white border border-border hover:bg-light text-charcoal rounded-full px-2 py-1 disabled:opacity-50"
          >
            {savingToLibrary ? 'Saving...' : '+ Save to mine'}
          </button>
        </div>
      )}

      {!readOnly && !renaming && !confirmDelete && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onStartEditCriteria && (
            <button
              onClick={e => { e.stopPropagation(); onStartEditCriteria() }}
              title="Edit criteria (creates a new version)"
              className="w-6 h-6 flex items-center justify-center rounded-full text-mid hover:bg-border hover:text-charcoal transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2h2a1 1 0 010 2h-2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V8H3a1 1 0 010-2h2V4zm2 4v8h6V8H7zm2-4v2h2V4H9z"/>
              </svg>
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onStartRename?.() }}
            title="Rename"
            className="w-6 h-6 flex items-center justify-center rounded-full text-mid hover:bg-border hover:text-charcoal transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onAskDelete?.() }}
            title="Delete"
            className="w-6 h-6 flex items-center justify-center rounded-full text-mid hover:bg-danger/10 hover:text-danger transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="mt-2 flex items-center gap-2 text-[11px]" onClick={e => e.stopPropagation()}>
          <span className="text-mid">Delete these scoring criteria?</span>
          <button onClick={onConfirmDelete} className="font-bold text-danger hover:underline">Delete</button>
          <button onClick={onCancelDelete} className="font-bold text-mid hover:underline">Cancel</button>
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

// Disparate Impact Dashboard removed in May 2026 - the surface
// confused clients more than it helped, and the population data we'd
// need to make it meaningful (opt-in demographic capture) doesn't
// exist yet. Adverse impact monitoring is now an internal operational
// task per docs/AI-FAIRNESS-FAIR-WORK.md Section 7. If we revisit this
// later, the implementation lives in git history at commit 476c6e9.

function _archivedDisparateImpactCard_unused({ screenings: _ }: { screenings: CandidateScreening[] }) {
  return null
}
// Below: original implementation kept commented for reference.
function _UNUSED_DisparateImpactCardImpl({ screenings }: { screenings: CandidateScreening[] }) {
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
