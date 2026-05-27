'use client'
import { useState, useEffect, useCallback } from 'react'
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
  // Optional role anchor. When set, uploads carry the prescreen_session_id
  // through to the API so each new cv_screening row is scoped to the
  // role's Step 1, and the list view shows only role-scoped screenings.
  // Standalone /dashboard/recruit/cv-screening continues to render
  // without these props - behaviour is unchanged.
  prescreenSessionId?: string
  roleContextLabel?: string
}

interface PendingUpload {
  id: string
  filename: string
  status: 'queued' | 'parsing' | 'scoring' | 'done' | 'error'
  error?: string
}

export default function CvScreeningClient({ businessName, initialScreenings, initialCustomRubrics, prescreenSessionId, roleContextLabel }: Props) {
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

  // Rescore toast - when the user saves a new rubric version we offer
  // a one-click "rescore N candidates against the new version" CTA.
  // Tracks both the target version id and the list of screenings
  // eligible for rescore (i.e. all rows in the rubric family on the
  // previous version).
  const [rescorePrompt, setRescorePrompt] = useState<{
    targetRubricId: string
    targetVersion: number
    eligibleScreeningIds: string[]
  } | null>(null)
  const [rescoreBusy, setRescoreBusy] = useState(false)
  const [rescoreProgress, setRescoreProgress] = useState<{ done: number; total: number } | null>(null)
  const [rescoreError, setRescoreError] = useState<string | null>(null)

  // Campaign Coach handoff - Step 5 ("Finalise Campaign (Move to CV
  // Scoring Agent)") stashes the FULL role + ad payload to
  // sessionStorage and routes the user here. We hydrate that into a
  // pre-filled "New scoring criteria" modal so the recruiter only
  // has to review + save. The modal also shows an explanatory banner
  // (fromCampaignCoach flag) explaining where the draft came from
  // and inviting edits.
  const [campaignHandoff, setCampaignHandoff] = useState<{
    title: string
    jd: string
    fromCampaignCoach: boolean
  } | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem('hqai:campaign-coach:handoff')
      if (!raw) return
      window.sessionStorage.removeItem('hqai:campaign-coach:handoff')
      const data = JSON.parse(raw) as {
        title?: string
        must_have?: string[]
        nice_to_have?: string[]
        location?: { suburb?: string; state?: string }
        salary?:   { min?: number; max?: number; currency?: string }
        questions?: string[]
        interview_types?: Array<'video' | 'phone'>
        ad?: {
          overview?:          string
          about_us?:          string
          responsibilities?:  string[]
          requirements_must?: string[]
          requirements_nice?: string[]
          benefits?:          string[]
          apply_cta?:         string
        } | null
      }
      if (!data.title) return
      // Synthesise a comprehensive job description from the full
      // Campaign Coach output. Previously we only carried title +
      // must-haves which produced thin / wrong-named rubrics
      // (feedback #14). Now the rubric-suggestion endpoint sees the
      // overview, about_us, responsibilities, requirements (must +
      // nice), benefits, apply_cta and structured role profile so
      // the criteria reflect the actual brief.
      const lines: string[] = [`Role: ${data.title}`]
      if (data.location?.suburb || data.location?.state) {
        lines.push(`Location: ${[data.location.suburb, data.location.state].filter(Boolean).join(', ')}`)
      }
      if (data.salary?.min || data.salary?.max) {
        lines.push(`Salary: ${data.salary.currency ?? 'AUD'} ${data.salary.min ?? '-'} to ${data.salary.max ?? '-'}`)
      }
      if (data.ad?.overview) {
        lines.push('', 'Overview:', data.ad.overview)
      }
      if (data.ad?.about_us) {
        lines.push('', 'About us:', data.ad.about_us)
      }
      if (data.ad?.responsibilities?.length) {
        lines.push('', 'Responsibilities:', ...data.ad.responsibilities.map(r => `- ${r}`))
      }
      // Requirements - prefer the ad's structured must/nice (which the
      // recruiter explicitly approved in Step 3-4) and fall back to the
      // role_profile lists if the ad blocks are empty.
      const must = (data.ad?.requirements_must?.length ? data.ad.requirements_must : data.must_have) ?? []
      const nice = (data.ad?.requirements_nice?.length ? data.ad.requirements_nice : data.nice_to_have) ?? []
      if (must.length) {
        lines.push('', 'Must-have skills:', ...must.map(s => `- ${s}`))
      }
      if (nice.length) {
        lines.push('', 'Nice-to-have skills:', ...nice.map(s => `- ${s}`))
      }
      if (data.ad?.benefits?.length) {
        lines.push('', 'Benefits:', ...data.ad.benefits.map(b => `- ${b}`))
      }
      if (data.ad?.apply_cta) {
        lines.push('', `Apply CTA: ${data.ad.apply_cta}`)
      }
      if (data.questions?.length) {
        lines.push('', 'Screening questions:', ...data.questions.map((q, i) => `${i + 1}. ${q}`))
      }
      // Echo the recruiter's interview-type choice so they see it
      // flowed through. Persistence to prescreen_sessions happens in
      // the batch-handoff route when the recruiter sends scored
      // candidates to the Shortlist Agent.
      if (data.interview_types?.length) {
        lines.push('', `Interview types: ${data.interview_types.join(', ')}`)
      }
      setCampaignHandoff({ title: data.title, jd: lines.join('\n'), fromCampaignCoach: true })
      setShowNewRubric(true)
    } catch {
      // sessionStorage parse / read failure - silently skip the handoff
      // so the user lands on a normal CV Scoring Agent page.
    }
  }, [])

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
        body: JSON.stringify({
          screening_ids: Array.from(selectedIds),
          // When this surface is hosted inside Step 1 of an existing role,
          // attach the CVs to that role's session instead of spawning a
          // new one. The role's Step 2 (Prescreen) view picks them up
          // immediately.
          ...(prescreenSessionId ? { target_session_id: prescreenSessionId } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      if (prescreenSessionId) {
        // In-role flow: stay on the page so the recruiter can keep
        // promoting CVs. Step 2 fetches its responses again on focus.
        setBatchHandoffResult(`Attached ${data.candidates_attached} candidate${data.candidates_attached === 1 ? '' : 's'} to this role. Switch to Step 2 (Prescreen) to send their invites.`)
        clearSelected()
      } else {
        setBatchHandoffResult(`Created Shortlist role "${data.role_title}" with ${data.candidates_attached} candidates. Taking you there now...`)
        try { await navigator.clipboard.writeText(data.candidate_url) } catch {}
        clearSelected()
        // Auto-navigate to the new Shortlist Agent role so the user sees
        // the candidates that flowed through. Short delay so the success
        // toast is readable.
        setTimeout(() => {
          window.location.href = `/dashboard/recruit/shortlist?session=${data.session_id}`
        }, 800)
      }
    } catch (err) {
      setBatchHandoffResult(`Failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
    setBatchHandoffBusy(false)
  }

  // Include screenings scored against ANY version of the active rubric
  // family, not just the currently-selected version. Previously the
  // filter was `s.rubric_id === rubricId` which meant switching to v2
  // hid every candidate that had been scored under v1, even though
  // they're the same role - confused users into thinking their data
  // had disappeared. Each row carries its own version badge so the
  // recruiter can still tell which version produced each score.
  // Resolve once - we re-derive activeCustom / activeStandard later in
  // the component for the right-panel header; computing the family ids
  // here keeps the filter declaration above the band-count derivations
  // that depend on it.
  const activeFamilyIds = (() => {
    const ac = customRubrics.find(cr => cr.id === rubricId)
    if (ac) {
      const familyKey = ac.parent_rubric_id ?? ac.id
      return new Set(customRubrics.filter(cr => (cr.parent_rubric_id ?? cr.id) === familyKey).map(cr => cr.id))
    }
    if (ALL_RUBRICS.find(r => r.rubric_id === rubricId)) return new Set<string>([rubricId])
    return new Set<string>()
  })()
  const filtered = screenings.filter(s => activeFamilyIds.has(s.rubric_id))
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
        // When the screen is hosted inside Step 1 of a role, the role's
        // prescreen_session_id rides along so the new row is scoped to
        // the role instead of landing in the standalone pool.
        if (prescreenSessionId) fd.append('prescreenSessionId', prescreenSessionId)
        const res = await fetch('/api/cv-screening/score', {
          method: 'POST',
          body: fd,
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `HTTP ${res.status}`)
        }
        const data = (await res.json()) as { screening: CandidateScreening; persistence_warning?: string | null }
        // If the score API couldn't persist the row to Supabase (typically
        // a schema migration that hasn't been applied), surface that on
        // the pending tile rather than slipping a "local-*" placeholder
        // into the list as if it had saved. Downloads won't work for
        // these rows; the user sees the real Postgres message + can act.
        if (data.persistence_warning) {
          setPending(p => p.map(x => x.id === id ? {
            ...x,
            status: 'error',
            error: `Score generated but not saved to database - ${data.persistence_warning}. Check the Vercel logs for the full Postgres detail.`,
          } : x))
        } else {
          setScreenings(s => [data.screening, ...s])
          setPending(p => p.filter(x => x.id !== id))
        }
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
    : (activeStandard?.role ?? 'Select scoring criteria')
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
      <div className={`w-full lg:w-64 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-bg-elevated flex-col ${showListPanel ? 'flex' : 'hidden lg:flex'}`}>

        {/* Header - AI Administrator pattern (eyebrow + sans h1 + body). */}
        <div className="px-4 pt-5 pb-4 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
            HQ Recruit
          </p>
          <h1 className="font-sans text-lg font-bold text-ink tracking-tight mb-1">
            CV Scoring Agent
          </h1>
          <p className="text-xs text-ink-soft mb-2">
            {customCount} saved criteria. Score CVs against your criteria, then send the shortlist to video pre-screen.
          </p>
          <button
            onClick={() => setShowNewRubric(true)}
            className="bg-accent hover:bg-accent-hover text-ink-on-accent text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
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
            <RubricFamily
              key={fam.familyId}
              family={fam}
              screenings={screenings}
              rubricId={rubricId}
              setRubricId={(id) => { setRubricId(id); setMobileShowList(false) }}
              renamingRubricId={renamingRubricId}
              rubricRenameDraft={rubricRenameDraft}
              setRubricRenameDraft={setRubricRenameDraft}
              renameCustomRubric={renameCustomRubric}
              setRenamingRubricId={setRenamingRubricId}
              setEditingRubric={setEditingRubric}
              confirmDeleteRubricId={confirmDeleteRubricId}
              deleteCustomRubric={deleteCustomRubric}
              setConfirmDeleteRubricId={setConfirmDeleteRubricId}
            />
          ))}

          {/* HQ.ai starter library removed per founder request - users
              create their own criteria from the job ad via the
              "+ New scoring criteria" affordance above. */}
        </div>
      </div>

      {/* -- Right panel: rubric detail (upload + candidates + DI) -- */}
      <div className={`flex-1 overflow-hidden ${showListPanel ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
        {activeRubricKind ? (
          <>
            {/* Mobile back bar */}
            <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg-elevated flex-shrink-0">
              <button
                onClick={() => setMobileShowList(true)}
                className="flex items-center gap-1.5 text-sm font-bold text-charcoal hover:text-ink transition-colors"
                aria-label="Back to scoring criteria"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd"/>
                </svg>
                Back to scoring criteria
              </button>
            </div>

            {/* Detail content (scrollable) */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

                {/* Rubric header */}
                <header className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                      {activeRubricKind === 'custom' ? 'Custom scoring criteria' : 'Standard scoring criteria'}
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
                        className="bg-bg-elevated border border-border text-charcoal text-xs font-bold px-3 py-1.5 rounded-full hover:bg-light inline-flex items-center gap-1.5"
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
                      className="bg-bg-elevated border border-border text-charcoal text-xs font-bold px-3 py-1.5 rounded-full hover:bg-light hidden sm:inline-flex items-center"
                    >
                      Move to Shortlist Agent →
                    </a>
                  </div>
                </header>

                {/* Version switcher - only when this rubric has 2+ versions */}
                {activeCustom && activeFamily.length > 1 && (
                  <div className="bg-bg-elevated shadow-card rounded-3xl px-5 py-3 flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] font-bold text-muted uppercase tracking-wider mr-2">Versions</p>
                    {activeFamily.map(v => {
                      const cohort = screenings.filter(s => s.rubric_id === v.id).length
                      const isActive = v.id === activeCustom.id
                      return (
                        <button
                          key={v.id}
                          onClick={() => setRubricId(v.id)}
                          className={`text-xs font-bold rounded-full px-3 py-1.5 transition-colors ${
                            isActive ? 'bg-accent text-ink-on-accent' : 'bg-light text-mid hover:bg-border hover:text-charcoal'
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
                <section className="bg-bg-elevated shadow-card rounded-3xl p-6 space-y-5">
                  {/* Pre-flight nudge when no candidates yet - reminds the
                      recruiter to sanity-check the criteria match the PD
                      before they pour CVs in. Same scoring criteria seed
                      the video pre-screen questions, so getting the rubric
                      right pays off twice. */}
                  {filtered.length === 0 && (
                    <>
                      <div className="bg-warning/10 border border-warning/30 rounded-2xl px-4 py-3 text-xs text-charcoal leading-relaxed">
                        <strong className="text-warning">Before you upload:</strong> double-check the scoring criteria on the left match your PD. They shape both the CV scores AND the video pre-screen questions, so editing them later means rescoring.
                      </div>
                      {/* Live preview of the active rubric's criteria + their
                          relative weighting. Gives the recruiter a quick
                          visual of where the AI will spend its attention
                          BEFORE the first CV lands - cheaper to spot a
                          mis-weighted rubric here than after scoring 20
                          CVs and having to rebuild. */}
                      {(() => {
                        const criteria = activeCustom?.rubric?.criteria ?? activeStandard?.criteria ?? []
                        if (criteria.length === 0) return null
                        const totalWeight = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0) || 1
                        return (
                          <div className="bg-light/60 border border-border rounded-2xl px-4 py-4">
                            <div className="flex items-baseline justify-between mb-3">
                              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                                How the score is weighted
                              </p>
                              <p className="text-[10px] text-muted">
                                {criteria.length} criteria
                              </p>
                            </div>
                            <ul className="space-y-2">
                              {criteria.map(c => {
                                const pct = Math.round(((Number(c.weight) || 0) / totalWeight) * 100)
                                return (
                                  <li key={c.id}>
                                    <div className="flex items-baseline justify-between gap-3 mb-1">
                                      <span className="text-xs text-charcoal font-medium truncate">{c.label}</span>
                                      <span className="text-xs font-bold text-charcoal tabular-nums shrink-0">{pct}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-accent rounded-full transition-all"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                            <p className="text-[10px] text-muted mt-3 leading-snug">
                              Percentages show how each criterion is weighted in the overall CV score. Edit the criteria on the left to change the weighting.
                            </p>
                          </div>
                        )
                      })()}
                    </>
                  )}
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
                    <>
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
                      {/* Reset SME expectations. Jess noted the scoring
                          feels slow because she expected instant. This
                          calmly explains the depth trade-off so she
                          doesn't refresh halfway through. Anti-Employsure
                          tone - professional, no panic. */}
                      <p className="text-[11px] text-muted leading-relaxed mt-2">
                        Scoring usually takes 30-90 seconds per CV. We run each one through your criteria with full reasoning, not a keyword match - the depth is what makes the ranking trustworthy.
                      </p>
                    </>
                  )}
                </section>

                {/* Candidates */}
                <section className="bg-bg-elevated shadow-card rounded-3xl">
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
                                <div className="col-span-3 text-sm font-bold text-charcoal truncate text-left flex items-center gap-1.5 group">
                                  <button
                                    onClick={() => setSelectedId(s.id)}
                                    className="truncate text-left flex-1 min-w-0"
                                    title={s.candidate_label}
                                  >
                                    {s.candidate_label}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      const next = window.prompt('Rename candidate', s.candidate_label)
                                      if (!next || !next.trim() || next.trim() === s.candidate_label) return
                                      try {
                                        const r = await fetch(`/api/cv-screening/screenings/${s.id}`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ candidate_label: next.trim() }),
                                        })
                                        const data = await r.json()
                                        if (!r.ok) throw new Error(data.error || 'Update failed')
                                        setScreenings(prev => prev.map(row => row.id === s.id ? { ...row, candidate_label: data.screening.candidate_label } : row))
                                      } catch (err) {
                                        window.alert(err instanceof Error ? err.message : 'Could not rename candidate')
                                      }
                                    }}
                                    aria-label="Rename candidate"
                                    title="Rename candidate"
                                    className="opacity-0 group-hover:opacity-100 text-[10px] text-mid hover:text-charcoal rounded p-0.5 flex-shrink-0 transition-opacity"
                                  >
                                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                      <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                                      <path d="M10 3l3 3" />
                                    </svg>
                                  </button>
                                </div>
                                <button
                                  onClick={() => setSelectedId(s.id)}
                                  className="col-span-1 text-sm text-charcoal font-bold text-left inline-flex items-center gap-1.5"
                                >
                                  <span>{Number(s.overall_score).toFixed(2)}</span>
                                  {/* Version badge - shows which rubric
                                      version this candidate was scored
                                      under. Helps the recruiter spot
                                      candidates scored on older versions
                                      now that we show the whole family
                                      in a single view. Hidden when the
                                      row was scored against the active
                                      version itself (no information). */}
                                  {(() => {
                                    const scoredAgainst = customRubrics.find(cr => cr.id === s.rubric_id)
                                    if (!scoredAgainst || scoredAgainst.id === rubricId) return null
                                    return (
                                      <span
                                        title={`Scored under v${scoredAgainst.version_number ?? 1}`}
                                        className="text-[9px] font-bold text-mid bg-light border border-border rounded-full px-1.5 py-0.5"
                                      >
                                        v{scoredAgainst.version_number ?? 1}
                                      </span>
                                    )
                                  })()}
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
                <section className="bg-bg-elevated shadow-card rounded-3xl p-6 sm:p-8">
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
                        <li>Recommends a next step (Schedule Interview, Phone screen, Hold for review, etc.) but never auto-rejects a candidate.</li>
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
          <div className="flex items-center justify-center h-full px-4 py-10">
            <div className="max-w-md w-full">
              <h2 className="font-display text-xl font-bold text-charcoal mb-2 uppercase tracking-wider text-center">
                Get started in two steps
              </h2>
              <p className="text-sm text-mid mb-6 text-center">
                Set up the scoring criteria first, then upload CVs to score against them.
              </p>

              {/* Numbered onboarding. Explicit "1 -> 2" so SMEs who
                  don't know the word "rubric" still see that criteria
                  come BEFORE uploads. Jess uploaded CVs first and
                  waited; this stops that. */}
              <ol className="space-y-3 mb-6">
                <li className="flex items-start gap-3 bg-bg-elevated shadow-card rounded-2xl px-4 py-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">1</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-charcoal">Create scoring criteria</p>
                    <p className="text-xs text-mid leading-relaxed">
                      The questions and skills each CV will be judged against. Paste a job ad or upload a PD and the AI drafts the criteria for you.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 bg-bg-elevated shadow-card rounded-2xl px-4 py-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-light text-charcoal text-sm font-bold flex items-center justify-center">2</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-charcoal">Upload CVs to score</p>
                    <p className="text-xs text-mid leading-relaxed">
                      Drop a batch in. Each CV is scored against your criteria, with the evidence quoted from the CV.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="flex justify-center">
                <button
                  onClick={() => setShowNewRubric(true)}
                  className="bg-accent hover:bg-accent-hover text-ink-on-accent text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
                >
                  + Create scoring criteria
                </button>
              </div>
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
          onRenameCandidate={(next) =>
            setScreenings(prev => prev.map(row => row.id === selected.id ? { ...row, candidate_label: next } : row))
          }
          onDeleteCandidate={(id) => {
            setScreenings(prev => prev.filter(row => row.id !== id))
            setSelectedIds(prev => {
              if (!prev.has(id)) return prev
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }}
        />
      )}

      {/* New rubric modal */}
      {showNewRubric && (
        <NewRubricModal
          initialLabel={campaignHandoff?.title}
          initialJd={campaignHandoff?.jd}
          fromCampaignCoach={campaignHandoff?.fromCampaignCoach ?? false}
          onClose={() => { setShowNewRubric(false); setCampaignHandoff(null) }}
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
            setCampaignHandoff(null)
          }}
        />
      )}

      {/* Edit criteria modal - creates a new version */}
      {editingRubric && (
        <EditRubricModal
          rubric={editingRubric}
          onClose={() => setEditingRubric(null)}
          onSaved={(newVersion) => {
            // Capture the previous rubric family BEFORE we add the new
            // version so we know which existing screenings are eligible
            // for the rescore-to-the-new-version toast prompt.
            const familyKey = newVersion.parent_rubric_id ?? newVersion.id
            const familyIds = new Set(
              customRubrics
                .filter(cr => (cr.parent_rubric_id ?? cr.id) === familyKey)
                .map(cr => cr.id),
            )
            const eligible = screenings.filter(s => familyIds.has(s.rubric_id) && s.rubric_id !== newVersion.id)

            setCustomRubrics(prev => [newVersion, ...prev])
            setRubricId(newVersion.id)
            setEditingRubric(null)

            if (eligible.length > 0) {
              setRescorePrompt({
                targetRubricId: newVersion.id,
                targetVersion: newVersion.version_number ?? 1,
                eligibleScreeningIds: eligible.map(s => s.id),
              })
              setRescoreError(null)
              setRescoreProgress(null)
            }
          }}
        />
      )}

      {/* Rescore-against-new-version modal. Was a bottom-anchored toast
          but pilots missed it (May 2026 founder note). Now a centered
          overlay with backdrop so it's unmissable. The rescore call
          itself creates NEW cv_screenings rows attached to the target
          rubric_id - v1 rows are left intact, so the candidate appears
          in both version tabs after the rescore. */}
      {rescorePrompt && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
          onClick={() => {
            if (rescoreBusy) return
            setRescorePrompt(null); setRescoreError(null); setRescoreProgress(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rescore-modal-title"
            className="bg-bg-elevated shadow-modal rounded-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="rescore-modal-title" className="font-display text-lg font-bold text-charcoal mb-1">
              v{rescorePrompt.targetVersion} saved
            </p>
            {rescoreError ? (
              <p className="text-sm text-danger mb-4">{rescoreError}</p>
            ) : rescoreBusy && rescoreProgress ? (
              <p className="text-sm text-mid mb-4">
                Rescoring {rescoreProgress.done} of {rescoreProgress.total}...
              </p>
            ) : (
              <>
                <p className="text-sm text-mid mb-2">
                  You have {rescorePrompt.eligibleScreeningIds.length} candidate{rescorePrompt.eligibleScreeningIds.length === 1 ? '' : 's'} scored on the previous version. Rescore them against v{rescorePrompt.targetVersion}?
                </p>
                <p className="text-xs text-muted mb-4">
                  v1 scores stay intact for comparison - each candidate will appear in both version tabs.
                </p>
              </>
            )}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => { setRescorePrompt(null); setRescoreError(null); setRescoreProgress(null) }}
                disabled={rescoreBusy}
                className="text-sm font-bold text-mid hover:text-charcoal px-4 py-2 disabled:opacity-50"
              >
                Not now
              </button>
              <button
                onClick={async () => {
                  if (!rescorePrompt) return
                  setRescoreBusy(true)
                  setRescoreError(null)
                  const total = rescorePrompt.eligibleScreeningIds.length
                  let done = 0
                  setRescoreProgress({ done, total })
                  const failures: string[] = []
                  // Sequential rather than Promise.all to avoid hammering
                  // Claude with N concurrent scoring calls. Each call is
                  // already 30-90 seconds; concurrency would push us into
                  // rate-limit territory on the pilot account.
                  for (const sid of rescorePrompt.eligibleScreeningIds) {
                    try {
                      const res = await fetch(`/api/cv-screening/screenings/${sid}/rescore`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rubric_id: rescorePrompt.targetRubricId }),
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
                      // Rescore now creates a NEW screening row attached
                      // to the target rubric_id; the v1 row at `sid` is
                      // untouched. Splice the new row into local state
                      // so it appears alongside the v1 row.
                      if (data?.screening) {
                        setScreenings(prev => [data.screening as CandidateScreening, ...prev])
                      }
                    } catch (err) {
                      failures.push(err instanceof Error ? err.message : 'unknown')
                    }
                    done += 1
                    setRescoreProgress({ done, total })
                  }
                  setRescoreBusy(false)
                  if (failures.length > 0) {
                    setRescoreError(`${failures.length} of ${total} failed. ${failures[0]}`)
                  } else {
                    setRescorePrompt(null)
                    setRescoreProgress(null)
                  }
                }}
                disabled={rescoreBusy}
                className="bg-accent hover:bg-accent-hover text-ink-on-accent text-sm font-bold rounded-full px-5 py-2 disabled:opacity-50"
              >
                {rescoreBusy
                  ? 'Rescoring...'
                  : `Rescore ${rescorePrompt.eligibleScreeningIds.length} candidate${rescorePrompt.eligibleScreeningIds.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
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
              className="bg-bg-elevated text-charcoal text-sm font-bold rounded-full px-4 py-1.5 hover:bg-light disabled:opacity-50 flex-shrink-0"
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
// A "family" of rubrics is one role with one-or-many versions. Each
// family renders as its own collapsible dropdown inside the Saved
// Criteria list, expanding to show every version of that role. The
// family auto-opens when the active rubricId belongs to one of its
// versions, so the user always sees their current selection in context.
function RubricFamily({
  family,
  screenings,
  rubricId,
  setRubricId,
  renamingRubricId,
  rubricRenameDraft,
  setRubricRenameDraft,
  renameCustomRubric,
  setRenamingRubricId,
  setEditingRubric,
  confirmDeleteRubricId,
  deleteCustomRubric,
  setConfirmDeleteRubricId,
}: {
  family: { familyId: string; familyLabel: string; versions: CustomRubricRow[] }
  screenings: CandidateScreening[]
  rubricId: string
  setRubricId: (id: string) => void
  renamingRubricId: string | null
  rubricRenameDraft: string
  setRubricRenameDraft: (s: string) => void
  renameCustomRubric: (id: string) => void
  setRenamingRubricId: (s: string | null) => void
  setEditingRubric: (r: CustomRubricRow | null) => void
  confirmDeleteRubricId: string | null
  deleteCustomRubric: (id: string) => void
  setConfirmDeleteRubricId: (s: string | null) => void
}) {
  const single = family.versions.length === 1
  const familyContainsActive = family.versions.some(v => v.id === rubricId)
  const [open, setOpen] = useState(single || familyContainsActive)
  // Keep open in sync when the active rubric changes to a member of this family.
  useEffect(() => {
    if (familyContainsActive) setOpen(true)
  }, [familyContainsActive])

  // Single-version families don't need a wrapping dropdown - render the
  // row directly so the sidebar doesn't have an extra layer of UI for
  // roles the user has only iterated on once.
  if (single) {
    const cr = family.versions[0]
    const cohort = screenings.filter(s => s.rubric_id === cr.id).length
    const sub = [
      `v${cr.version_number ?? 1}`,
      cohort > 0 ? `${cohort} scored` : 'no candidates yet',
      new Date(cr.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    ].join(' - ')
    return (
      <RubricRow
        label={cr.label}
        sub={sub}
        selected={rubricId === cr.id}
        onSelect={() => setRubricId(cr.id)}
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
      />
    )
  }

  // Multi-version family - render a clickable header that toggles open
  // to reveal each version of the role. Picking a version sets the
  // active rubric (and switching versions happens here, in the sidebar,
  // never in the main page).
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 border-b border-border text-left transition-colors ${familyContainsActive ? 'bg-light/40' : 'hover:bg-light/60'}`}
        aria-expanded={open}
      >
        <span className="flex-1 text-sm font-bold text-charcoal truncate">{family.familyLabel}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {family.versions.length} version{family.versions.length === 1 ? '' : 's'}
        </span>
        <svg className={`w-4 h-4 text-mid transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </button>
      {open && family.versions.map(cr => {
        const cohort = screenings.filter(s => s.rubric_id === cr.id).length
        const sub = [`v${cr.version_number ?? 1}`, cohort > 0 ? `${cohort} scored` : 'no candidates yet'].join(' - ')
        return (
          <div key={cr.id} className="pl-4 bg-bg-elevated">
            <RubricRow
              label={`v${cr.version_number ?? 1}`}
              sub={sub}
              selected={rubricId === cr.id}
              onSelect={() => setRubricId(cr.id)}
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
            />
          </div>
        )
      })}
    </div>
  )
}

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
          className="w-full text-sm font-medium text-charcoal bg-bg-elevated border border-black rounded-md px-2 py-1 outline-none"
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
            className="text-[10px] font-bold uppercase tracking-wider bg-bg-elevated border border-border hover:bg-light text-charcoal rounded-full px-2 py-1 disabled:opacity-50"
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
    <div className="bg-bg-elevated shadow-card rounded-3xl p-6 text-xs text-muted leading-relaxed">
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
        active ? 'bg-accent text-ink-on-accent' : 'bg-light text-mid'
      }`}
    >
      {label}
    </span>
  )
}
