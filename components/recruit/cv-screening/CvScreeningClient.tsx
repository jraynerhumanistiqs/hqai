'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
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
// The scorecard drawer (944 lines) and the three rubric/override modals only
// render on interaction (click a candidate / edit a rubric / override a
// score). Code-split them with next/dynamic so their JS stays out of the CV
// Screening page's initial bundle and is fetched the first time each opens.
// ssr:false is correct here - they render nothing until opened, so there's
// no server HTML to produce.
const CandidateScorecardPanel = dynamic(() => import('./CandidateScorecardPanel'), { ssr: false })
const NewRubricModal = dynamic(() => import('./NewRubricModal'), { ssr: false })
const EditRubricModal = dynamic(() => import('./EditRubricModal'), { ssr: false })
const OverrideModal = dynamic(() => import('./OverrideModal'), { ssr: false })
import RecruitFlowRail, { type FlowStep } from '@/components/recruit/RecruitFlowRail'

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
  // Start with NO rubric selected so a fresh landing shows the explicit
  // "choose or create criteria" empty state rather than silently
  // auto-selecting a saved or standard rubric. Bianca (2026-06-04) read
  // the auto-selected rubric as "I must have picked the wrong role". The
  // user now deliberately picks criteria before anything is scored.
  const [rubricId, setRubricId] = useState<string>('')
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
    // Carried from Campaign Coach Step 5 so the eventual Shortlist role
    // honours the recruiter's Video + Phone choice instead of defaulting
    // to video-only.
    interviewTypes?: Array<'video' | 'phone'>
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
      setCampaignHandoff({ title: data.title, jd: lines.join('\n'), fromCampaignCoach: true, interviewTypes: data.interview_types })
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
          // New-session path only: carry the Campaign Coach interview-type
          // choice (Video + Phone) through so the role isn't video-only.
          ...(!prescreenSessionId && campaignHandoff?.interviewTypes?.length
            ? { interview_types: campaignHandoff.interviewTypes }
            : {}),
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

  // Single-candidate "Send to Prescreen" - used by the scorecard drawer
  // when this surface is hosted inside a role (Step 1). Attaches the one
  // CV to the role's prescreen session so it appears in Step 2. Throws on
  // failure so the drawer can surface the error inline.
  async function sendCandidateToPrescreen(screeningId: string): Promise<void> {
    const res = await fetch('/api/cv-screening/batch-handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screening_ids: [screeningId],
        ...(prescreenSessionId ? { target_session_id: prescreenSessionId } : {}),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`)
  }

  // "Reject candidate" - records an override band of 'reject' on the CV
  // screening so the candidate drops into the rejected ("No") grouping.
  // Updates local state so the list reflects it without a refetch.
  async function rejectScreening(screeningId: string): Promise<void> {
    const res = await fetch(`/api/cv-screening/screenings/${screeningId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ override_band: 'reject' }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error((d as { error?: string })?.error || `HTTP ${res.status}`)
    }
    setScreenings(prev => prev.map(row =>
      row.id === screeningId
        ? { ...row, override_band: 'reject' } as CandidateScreening
        : row,
    ))
  }

  const [bandFilter, setBandFilter] = useState<'all' | 'strong' | 'yes' | 'maybe' | 'no'>('all')
  const [reportError, setReportError] = useState<string | null>(null)
  const [renameState, setRenameState] = useState<{ id: string; draft: string; error: string | null } | null>(null)

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
  const filteredByRubric = screenings.filter(s => activeFamilyIds.has(s.rubric_id))
  const counts = {
    all: filteredByRubric.length,
    strong: filteredByRubric.filter(s => effectiveBand(s) === 'strong_yes').length,
    yes: filteredByRubric.filter(s => effectiveBand(s) === 'yes').length,
    maybe: filteredByRubric.filter(s => effectiveBand(s) === 'maybe').length,
    no: filteredByRubric.filter(s => { const b = effectiveBand(s); return b === 'likely_no' || b === 'reject' }).length,
  }
  const filtered = bandFilter === 'all'
    ? filteredByRubric
    : bandFilter === 'no'
      ? filteredByRubric.filter(s => { const b = effectiveBand(s); return b === 'likely_no' || b === 'reject' })
      : bandFilter === 'strong'
        ? filteredByRubric.filter(s => effectiveBand(s) === 'strong_yes')
        : filteredByRubric.filter(s => effectiveBand(s) === bandFilter)
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
      setReportError(`Report failed: ${err instanceof Error ? err.message : 'unknown error'}`)
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
          // Vercel returns an opaque FUNCTION_INVOCATION_TIMEOUT body when
          // a CV takes too long to score. Translate it into something a
          // recruiter can act on rather than a raw platform error string.
          if (res.status === 504 || /FUNCTION_INVOCATION_TIMEOUT/i.test(text)) {
            throw new Error('Scoring timed out on this CV - it may be very large or image-heavy. Try re-uploading it on its own, or export it to a text-based PDF first.')
          }
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

  // Criteria confirmation gate. Before the first CV is uploaded against
  // a given rubric, the recruiter confirms the scoring criteria in a
  // modal ("Yes, use this criteria" / "Change criteria"). Keyed by
  // rubricId so switching to a different rubric re-prompts. This keeps
  // the criteria preview out of the main Score CVs surface (it used to
  // take up space) and forces a deliberate check before scoring.
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false)
  const [confirmedCriteria, setConfirmedCriteria] = useState<Record<string, boolean>>({})
  const criteriaConfirmed = Boolean(confirmedCriteria[rubricId])

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

  // Standalone "click along to progress" rail step. Only drives the
  // !prescreenSessionId layout - the in-role (Shortlist Step 1) path
  // ignores this entirely and renders exactly as before.
  //   1 Choose criteria  2 Upload CVs  3 Review scores
  const [standaloneStep, setStandaloneStep] = useState(1)

  // A rubric is selected once rubricId resolves to a known rubric.
  const rubricSelected = Boolean(activeRubricKind)
  // The active cohort has at least one scored candidate (any version of
  // the selected rubric family). filteredByRubric already scopes to the
  // active family, so its length is the cohort size.
  const cohortScoredCount = filteredByRubric.length

  // Gentle, non-surprising auto-advance: fires only on the TRANSITION
  // (rubric becoming selected, cohort gaining its first scored
  // candidate), never on every render. This means clicking back to an
  // earlier step does NOT bounce the user forward again - the condition
  // staying true is not enough, it has to have just become true. Forward
  // only; we never auto-advance backwards.
  const prevRubricSelected = useRef(rubricSelected)
  const prevHasScored = useRef(cohortScoredCount > 0)
  useEffect(() => {
    if (prescreenSessionId) return
    const hasScored = cohortScoredCount > 0
    if (rubricSelected && !prevRubricSelected.current && standaloneStep === 1) {
      setStandaloneStep(2)
    } else if (hasScored && !prevHasScored.current && standaloneStep === 2) {
      setStandaloneStep(3)
    }
    prevRubricSelected.current = rubricSelected
    prevHasScored.current = hasScored
  }, [prescreenSessionId, rubricSelected, cohortScoredCount, standaloneStep])

  // Steps + reachability for the rail (standalone only).
  const flowSteps: FlowStep[] = [
    { label: 'Choose criteria', hint: 'Pick a saved set or create one', done: rubricSelected },
    { label: 'Upload CVs', hint: 'Drop a batch to score against it', done: cohortScoredCount > 0 },
    { label: 'Review scores', hint: 'Ranked, with evidence from each CV' },
  ].map((s, i) => ({ id: i + 1, ...s }))

  function goToStep(id: number) {
    // Step 1 is the chooser. Returning there keeps the selected rubric
    // intact (clearing rubricId would discard the cohort filter and the
    // criteria-confirm state); the chooser simply shows the library again
    // with the current selection highlighted.
    setStandaloneStep(id)
  }

  // CV Formatter cross-link, relocated out of the cramped sidebar header
  // and pinned to the rail footer. Standalone only (the rail itself only
  // renders when !prescreenSessionId).
  const railFooter = (
    <p className="text-[11px] text-ink-soft leading-relaxed">
      Have an existing CV?{' '}
      <Link href="/dashboard/people/administrator/ingest" className="text-clay underline-offset-2 hover:underline font-bold">
        Reformat it with the CV Formatter
      </Link>{' '}
      - it restructures the CV into the Humanistiqs house format without changing a word.
    </p>
  )

  // ----------------------------------------------------------------
  // Standalone "Quick CV score" - the calm click-along rail layout.
  // Only rendered when !prescreenSessionId. The in-role (Shortlist
  // Agent Step 1) path below this block is left exactly as it was.
  // ----------------------------------------------------------------
  if (!prescreenSessionId) {
    return (
      <div className="flex flex-col md:flex-row h-full overflow-hidden bg-bg">
        <RecruitFlowRail
          eyebrow="HQ Recruit"
          title="Quick CV score"
          blurb="Score CVs against your criteria, no role needed. Promote your picks to spin up a Shortlist Agent role."
          steps={flowSteps}
          current={standaloneStep}
          onStepChange={goToStep}
          canNavigate={(step) => {
            if (step.id === 1) return true
            if (step.id === 2) return rubricSelected
            return cohortScoredCount > 0
          }}
          footer={railFooter}
        />

        {/* Main pane - one step's content at a time, with room. */}
        <div className="flex-1 overflow-y-auto bg-bg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

            {/* ===== STEP 1 - Choose criteria ===== */}
            {standaloneStep === 1 && (
              <div className="space-y-6">
                <header>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-ink mb-1.5">
                    Choose your scoring criteria
                  </h2>
                  <p className="text-sm text-ink-soft leading-relaxed max-w-2xl">
                    Pick a saved set of criteria, or create one from a job ad or position description. The criteria shape both the CV scores and any prescreen questions. Selecting a set takes you to upload.
                  </p>
                </header>

                {/* Numbered onboarding - explicit "1 then 2" so SMEs who
                    do not know the word "rubric" still see criteria come
                    BEFORE uploads. */}
                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <li className="flex items-start gap-3 bg-bg-elevated shadow-card rounded-2xl px-4 py-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-ink-on-accent text-sm font-bold flex items-center justify-center">1</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-ink">Create scoring criteria</p>
                      <p className="text-xs text-ink-soft leading-relaxed">
                        The questions and skills each CV will be judged against. Paste a job ad or upload a PD and the AI drafts the criteria for you.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 bg-bg-elevated shadow-card rounded-2xl px-4 py-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-bg-soft text-ink text-sm font-bold flex items-center justify-center">2</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-ink">Upload CVs to score</p>
                      <p className="text-xs text-ink-soft leading-relaxed">
                        Drop a batch in. Each CV is scored against your criteria, with the evidence quoted from the CV.
                      </p>
                    </div>
                  </li>
                </ol>

                {/* Saved scoring criteria library - relocated out of the
                    cramped left sidebar into the main pane with room. A
                    tidy grid of selectable cards; picking one advances to
                    Upload via the auto-advance effect. */}
                <section className="bg-bg-elevated shadow-card rounded-3xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-0.5">
                        Saved scoring criteria
                      </p>
                      <p className="text-xs text-ink-soft">
                        {customCount === 0
                          ? 'No saved criteria yet. Create one from a job ad and reuse it for future roles.'
                          : `${customCount} saved ${customCount === 1 ? 'set' : 'sets'}. Pick one to score against, or create a new set.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewRubric(true)}
                      className="bg-accent hover:bg-accent-hover text-ink-on-accent text-xs font-bold px-4 min-h-touch py-2 rounded-full transition-colors inline-flex items-center"
                    >
                      + New scoring criteria
                    </button>
                  </div>

                  {customCount === 0 ? (
                    <div className="border-2 border-dashed border-border rounded-2xl px-6 py-10 text-center">
                      <p className="text-sm font-bold text-ink mb-1">No scoring criteria yet</p>
                      <p className="text-xs text-ink-muted mb-4 max-w-md mx-auto">
                        Paste a job ad or upload a position description and the AI drafts a weighted set of criteria you can review, edit and reuse.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowNewRubric(true)}
                        className="bg-accent text-ink-on-accent text-xs font-bold rounded-full px-5 min-h-touch py-2.5 hover:bg-accent-hover inline-flex items-center"
                      >
                        + Create scoring criteria
                      </button>
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customFamilies.map(fam => {
                        // Newest version is the default selectable for the
                        // family card; switching versions still happens in
                        // Step 2 via the version switcher.
                        const latest = fam.versions[0]
                        const familyIds = new Set(fam.versions.map(v => v.id))
                        const cohort = screenings.filter(s => familyIds.has(s.rubric_id)).length
                        const isActive = familyIds.has(rubricId)
                        return (
                          <li key={fam.familyId}>
                            <button
                              type="button"
                              onClick={() => { setRubricId(latest.id); setMobileShowList(false) }}
                              className={`group relative w-full text-left rounded-2xl border px-4 py-3.5 min-h-touch transition-colors ${
                                isActive
                                  ? 'border-accent bg-accent-soft'
                                  : 'border-border bg-bg hover:bg-bg-soft'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-ink truncate flex-1">{fam.familyLabel}</p>
                                {fam.versions.length > 1 && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-bg-soft text-ink-soft rounded-full px-1.5 py-0.5 flex-shrink-0">
                                    {fam.versions.length} versions
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-ink-muted mt-1">
                                {cohort > 0 ? `${cohort} scored` : 'No candidates yet'} - updated {new Date(latest.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              </p>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {/* ===== STEP 2 - Upload CVs ===== */}
            {standaloneStep === 2 && activeRubricKind && (
              <div className="space-y-6">
                {/* Rubric header - name + edit, with a quiet "Change
                    criteria" affordance back to Step 1. */}
                <header className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="text-[11px] font-bold text-ink-soft hover:text-ink mb-1.5 inline-flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd"/>
                      </svg>
                      Change criteria
                    </button>
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                      {activeRubricKind === 'custom' ? 'Custom scoring criteria' : 'Standard scoring criteria'}
                    </p>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-ink mb-1.5">
                      {activeRubricLabel}
                    </h2>
                    <p className="text-sm text-ink-soft leading-relaxed max-w-2xl">
                      Drop CVs in - every score points to evidence in the CV. {businessName} keeps the final call, no candidate is auto-rejected.
                    </p>
                  </div>
                  {activeCustom && (
                    <button
                      onClick={() => setEditingRubric(activeCustom)}
                      className="bg-bg-elevated border border-border text-ink text-xs font-bold px-3 min-h-touch py-2 rounded-full hover:bg-bg-soft inline-flex items-center gap-1.5 flex-shrink-0"
                      title="Edit criteria (creates a new version, keeps existing scores)"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2h2a1 1 0 010 2h-2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V8H3a1 1 0 010-2h2V4zm2 4v8h6V8H7zm2-4v2h2V4H9z"/>
                      </svg>
                      Edit criteria
                    </button>
                  )}
                </header>

                {/* Version switcher - only when this rubric has 2+ versions */}
                {activeCustom && activeFamily.length > 1 && (
                  <div className="bg-bg-elevated shadow-card rounded-3xl px-5 py-3 flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mr-2">Versions</p>
                    {activeFamily.map(v => {
                      const cohort = screenings.filter(s => s.rubric_id === v.id).length
                      const isActive = v.id === activeCustom.id
                      return (
                        <button
                          key={v.id}
                          onClick={() => setRubricId(v.id)}
                          className={`text-xs font-bold rounded-full px-3 py-1.5 transition-colors ${
                            isActive ? 'bg-accent text-ink-on-accent' : 'bg-bg-soft text-ink-soft hover:bg-border hover:text-ink'
                          }`}
                          title={`v${v.version_number ?? 1} - ${cohort} candidate${cohort === 1 ? '' : 's'} scored`}
                        >
                          v{v.version_number ?? 1}
                          <span className={`ml-1.5 ${isActive ? 'text-ink-on-accent/70' : 'text-ink-muted'}`}>
                            {cohort}
                          </span>
                        </button>
                      )
                    })}
                    <p className="text-[10px] text-ink-muted ml-1">
                      Each version keeps its own candidate scores.
                    </p>
                  </div>
                )}

                {/* Upload area - criteria-confirm gate + dropzone + pending. */}
                <section className="bg-bg-elevated shadow-card rounded-3xl p-6 space-y-5">
                  {!criteriaConfirmed ? (
                    <div className="border-2 border-dashed border-border rounded-2xl px-6 py-10 text-center">
                      <p className="text-sm font-bold text-ink mb-1">
                        Confirm your scoring criteria before uploading
                      </p>
                      <p className="text-xs text-ink-muted mb-4 max-w-md mx-auto">
                        The criteria shape both the CV scores and the prescreen questions. Take a quick look before any CV lands - editing them later means rescoring.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCriteriaModalOpen(true)}
                        className="bg-accent text-ink-on-accent text-xs font-bold rounded-full px-5 min-h-touch py-2.5 hover:bg-accent-hover inline-flex items-center"
                      >
                        Review scoring criteria
                      </button>
                    </div>
                  ) : (
                    <label
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => {
                        e.preventDefault()
                        setDragOver(false)
                        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
                      }}
                      className={`block border-2 border-dashed rounded-2xl px-6 py-10 text-center cursor-pointer transition-colors ${
                        dragOver ? 'border-ink bg-bg-soft' : 'border-border hover:border-ink-soft hover:bg-bg-soft'
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
                      <p className="text-sm font-bold text-ink mb-1">
                        Drop CVs here or click to upload
                      </p>
                      <p className="text-xs text-ink-muted">
                        PDF, DOCX or plain text. Up to 20 at a time. Scored against <strong>{activeRubricLabel}</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setCriteriaModalOpen(true) }}
                        className="mt-3 text-[11px] font-bold text-ink-soft hover:text-ink underline"
                      >
                        Review criteria again
                      </button>
                    </label>
                  )}

                  {pending.length > 0 && (
                    <>
                      <ul className="space-y-1.5">
                        {pending.map(p => (
                          <li key={p.id} className="flex items-center justify-between text-xs bg-bg-soft rounded-full px-4 py-2">
                            <span className="text-ink font-bold truncate max-w-[60%]">{p.filename}</span>
                            <span className={p.status === 'error' ? 'text-danger' : 'text-ink-soft'}>
                              {p.status === 'error' ? `Couldn't process - ${p.error}` : statusLabel(p.status)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-ink-muted leading-relaxed mt-2">
                        Scoring usually takes 30-90 seconds per CV. We run each one through your criteria with full reasoning, not a keyword match - the depth is what makes the ranking trustworthy.
                      </p>
                    </>
                  )}
                </section>

                {/* Once a candidate is scored the rail auto-advances to
                    Review; offer a manual jump too for anyone who scrolled. */}
                {cohortScoredCount > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => goToStep(3)}
                      className="bg-bg-elevated border border-border text-ink text-xs font-bold px-4 min-h-touch py-2 rounded-full hover:bg-bg-soft inline-flex items-center gap-1.5"
                    >
                      Review scores ({cohortScoredCount})
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 3 - Review scores ===== */}
            {standaloneStep === 3 && activeRubricKind && (
              <div className="space-y-6">
                <header className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="text-[11px] font-bold text-ink-soft hover:text-ink mb-1.5 inline-flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd"/>
                      </svg>
                      Back to upload
                    </button>
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                      {activeRubricKind === 'custom' ? 'Custom scoring criteria' : 'Standard scoring criteria'}
                    </p>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-ink mb-1.5">
                      {activeRubricLabel}
                    </h2>
                    <p className="text-sm text-ink-soft leading-relaxed max-w-2xl">
                      Ranked by score, each backed by evidence quoted from the CV. Tick your picks and send them across to spin up a Shortlist Agent role.
                    </p>
                  </div>
                  <a
                    href="/dashboard/recruit/shortlist"
                    className="bg-bg-elevated border border-border text-ink text-xs font-bold px-3 min-h-touch py-2 rounded-full hover:bg-bg-soft hidden sm:inline-flex items-center flex-shrink-0"
                  >
                    Move to Shortlist Agent
                  </a>
                </header>

                {/* Candidates */}
                <section className="bg-bg-elevated shadow-card rounded-3xl">
                  <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-2">
                    <FilterChip label={`All (${counts.all})`} active={bandFilter === 'all'} onClick={() => setBandFilter('all')} />
                    <FilterChip label={`Strong (${counts.strong})`} active={bandFilter === 'strong'} onClick={() => setBandFilter('strong')} />
                    <FilterChip label={`Yes (${counts.yes})`} active={bandFilter === 'yes'} onClick={() => setBandFilter('yes')} />
                    <FilterChip label={`Maybe (${counts.maybe})`} active={bandFilter === 'maybe'} onClick={() => setBandFilter('maybe')} />
                    <FilterChip label={`No (${counts.no})`} active={bandFilter === 'no'} onClick={() => setBandFilter('no')} />
                    <span className="ml-auto text-xs text-ink-muted">
                      {busy ? 'Analysing CVs...' : `${filtered.length} candidate${filtered.length === 1 ? '' : 's'}`}
                    </span>
                  </div>
                  {batchHandoffResult && (
                    <div className={`px-6 py-2 border-b border-border text-xs ${batchHandoffResult.startsWith('Failed') ? 'bg-danger/10 text-danger' : 'bg-bg-soft text-ink-soft'}`}>
                      {batchHandoffResult}
                    </div>
                  )}

                  {filtered.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm text-ink-soft">
                        {bandFilter !== 'all'
                          ? `No candidates in the ${bandFilter === 'strong' ? 'Strong yes' : bandFilter === 'yes' ? 'Yes' : bandFilter === 'maybe' ? 'Maybe' : 'No'} band.`
                          : 'No candidates yet. Upload some CVs in the previous step to get started.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="px-6 py-2 border-b border-border bg-bg-soft/50 flex items-center gap-3 text-xs">
                        <button
                          onClick={selectedCount === filtered.length ? clearSelected : selectAllVisible}
                          className="text-ink-soft hover:text-ink font-bold"
                        >
                          {selectedCount === filtered.length ? 'Clear selection' : 'Select all'}
                        </button>
                        {selectedCount > 0 && (
                          <span className="text-ink-soft">{selectedCount} selected</span>
                        )}
                      </div>
                      <ul className="divide-y divide-border">
                        {/* Header row - hidden on mobile */}
                        <li className="px-6 py-2 hidden sm:grid grid-cols-12 gap-3 items-center text-[10px] font-bold uppercase tracking-wider text-ink-muted bg-bg-soft/50">
                          <span className="col-span-1" />
                          <span className="col-span-3">Candidate</span>
                          <span className="col-span-1">Score</span>
                          <span className="col-span-2">Band</span>
                          <span className="col-span-2">Next step</span>
                          <span className="col-span-2 hidden sm:block">Comments</span>
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
                              <li key={s.id} className={`px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-1 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center hover:bg-bg-soft transition-colors ${checked ? 'bg-bg-soft' : ''}`}>
                                <label className="col-span-1 flex items-center cursor-pointer self-start" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleSelected(s.id)}
                                    className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                                  />
                                </label>
                                <div className="sm:col-span-3 text-sm font-bold text-ink truncate text-left flex items-center gap-1.5 group">
                                  {renameState?.id === s.id ? (
                                    <div className="flex-1 min-w-0 space-y-0.5" onClick={e => e.stopPropagation()}>
                                      <input
                                        autoFocus
                                        value={renameState.draft}
                                        onChange={e => setRenameState(prev => prev ? { ...prev, draft: e.target.value } : null)}
                                        onKeyDown={async (e) => {
                                          if (e.key === 'Escape') { setRenameState(null); return }
                                          if (e.key === 'Enter') {
                                            const next = renameState.draft.trim()
                                            if (!next || next === s.candidate_label) { setRenameState(null); return }
                                            try {
                                              const r = await fetch(`/api/cv-screening/screenings/${s.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ candidate_label: next }),
                                              })
                                              const data = await r.json()
                                              if (!r.ok) throw new Error(data.error || 'Update failed')
                                              setScreenings(prev => prev.map(row => row.id === s.id ? { ...row, candidate_label: data.screening.candidate_label } : row))
                                              setRenameState(null)
                                            } catch (err) {
                                              setRenameState(prev => prev ? { ...prev, error: err instanceof Error ? err.message : 'Could not rename' } : null)
                                            }
                                          }
                                        }}
                                        className="w-full text-xs text-ink bg-bg border border-border rounded-full px-2 py-1 outline-none focus:border-ink"
                                      />
                                      {renameState.error && <span className="text-[10px] text-danger block">{renameState.error}</span>}
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setSelectedId(s.id)}
                                        className="truncate text-left flex-1 min-w-0"
                                        title={s.candidate_label}
                                      >
                                        {s.candidate_label}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); setRenameState({ id: s.id, draft: s.candidate_label ?? '', error: null }) }}
                                        aria-label="Rename candidate"
                                        title="Rename candidate"
                                        className="opacity-0 group-hover:opacity-100 text-[10px] text-ink-soft hover:text-ink rounded p-0.5 flex-shrink-0 transition-opacity"
                                      >
                                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                          <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                                          <path d="M10 3l3 3" />
                                        </svg>
                                      </button>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={() => setSelectedId(s.id)}
                                  className="sm:col-span-1 text-sm text-ink font-bold text-left inline-flex items-center gap-1.5"
                                >
                                  <span>{Number(s.overall_score).toFixed(2)}</span>
                                  {(() => {
                                    const scoredAgainst = customRubrics.find(cr => cr.id === s.rubric_id)
                                    if (!scoredAgainst || scoredAgainst.id === rubricId) return null
                                    return (
                                      <span
                                        title={`Scored under v${scoredAgainst.version_number ?? 1}`}
                                        className="text-[9px] font-bold text-ink-soft bg-bg-soft border border-border rounded-full px-1.5 py-0.5"
                                      >
                                        v{scoredAgainst.version_number ?? 1}
                                      </span>
                                    )
                                  })()}
                                </button>
                                <button
                                  onClick={() => setOverrideTarget(s)}
                                  title="Click to override the AI's band"
                                  className={`sm:col-span-2 inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-3 py-1 hover:ring-1 hover:ring-ink transition-all justify-start w-fit ${BAND_COLOURS[band as keyof typeof BAND_COLOURS] ?? ''}`}
                                >
                                  {BAND_LABELS[band as keyof typeof BAND_LABELS] ?? band}
                                  {s.override_band && <span className="text-[9px] opacity-70">edited</span>}
                                </button>
                                <button
                                  onClick={() => setOverrideTarget(s)}
                                  title="Click to override the AI's next step"
                                  className="sm:col-span-2 text-xs text-ink-soft truncate text-left hover:text-ink hover:underline"
                                >
                                  {ACTION_LABELS[action as keyof typeof ACTION_LABELS] ?? action}
                                  {s.override_next_action && <span className="text-[9px] ml-1 opacity-70">edited</span>}
                                </button>
                                <button
                                  onClick={() => setOverrideTarget(s)}
                                  title={s.override_comment || 'Click to add a comment'}
                                  className={`sm:col-span-2 hidden sm:block text-xs truncate text-left ${hasOverride ? 'text-ink hover:underline' : 'text-ink-muted hover:text-ink italic'}`}
                                >
                                  {s.override_comment ? s.override_comment : 'Add comment...'}
                                </button>
                                <button
                                  onClick={() => setSelectedId(s.id)}
                                  className="sm:col-span-1 text-xs text-ink-muted text-left sm:text-right hover:text-ink"
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

                {/* How the agent works - shown only when the candidate list
                    is empty so it doesn't clutter once candidates arrive. */}
                {filtered.length === 0 && <section className="bg-bg-elevated shadow-card rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-ink" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">How the CV Scoring Agent works</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <div>
                      <p className="text-sm font-bold text-ink mb-2">What the agent does</p>
                      <ul className="space-y-2 text-xs text-ink-soft leading-relaxed list-disc pl-4">
                        <li>Scores each CV against your chosen criteria, weighted by importance.</li>
                        <li>Masks names, photos, addresses, dates of birth and graduation years before scoring - the model judges substance, not signal.</li>
                        <li>Backs every score with a verbatim line from the CV so you can see exactly why.</li>
                        <li>Recommends a next step (Schedule Interview, Phone screen, Hold for review, etc.) but never auto-rejects a candidate.</li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-ink mb-2">What to do from here</p>
                      <ol className="space-y-2 text-xs text-ink-soft leading-relaxed list-decimal pl-4">
                        <li><strong className="text-ink">Open a candidate.</strong> Click a row to read their scorecard with the evidence quoted from their CV.</li>
                        <li><strong className="text-ink">Override the AI if you disagree.</strong> Click the score band or next-step on any row to change it and add a short comment explaining why.</li>
                        <li><strong className="text-ink">Run a fairness check.</strong> In any scorecard, use <em>Run name probe</em> under Fairness checks to test if the score moves when the candidate&apos;s name is swapped to a different cultural background.</li>
                        <li><strong className="text-ink">Send your shortlist forward.</strong> Tick the candidates you want and use <em>Send to Shortlist Agent</em> to bundle them as one campaign with their CV scoring carried through.</li>
                        <li><strong className="text-ink">Save criteria you&apos;ll reuse.</strong> If you hired for the same role last quarter, save the scoring criteria from Step 1 so you don&apos;t rebuild it from scratch next time.</li>
                      </ol>
                    </div>
                  </div>

                  <p className="text-[11px] text-ink-muted italic mt-5 leading-relaxed border-t border-border pt-4">
                    HQ.ai does not make hiring decisions. It supports yours. Every recommendation here is reviewable, overridable, and auditable. You always click the button.
                  </p>
                </section>}
              </div>
            )}

            {/* Guard: if a later step is shown but the rubric was cleared,
                fall back to the chooser. */}
            {standaloneStep !== 1 && !activeRubricKind && (
              <div className="bg-bg-elevated shadow-card rounded-3xl px-6 py-12 text-center">
                <p className="text-sm font-bold text-ink mb-1">Choose your scoring criteria first</p>
                <p className="text-xs text-ink-muted mb-4">Pick a saved set or create new criteria to score CVs against.</p>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="bg-accent text-ink-on-accent text-xs font-bold rounded-full px-5 min-h-touch py-2.5 hover:bg-accent-hover inline-flex items-center"
                >
                  Choose criteria
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scorecard side panel */}
        {selected && (
          <CandidateScorecardPanel
            screening={selected}
            customRubrics={customRubrics}
            inRole={false}
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

        {/* Criteria confirmation modal - gates CV upload. */}
        {criteriaModalOpen && (() => {
          const criteria = activeCustom?.rubric?.criteria ?? activeStandard?.criteria ?? []
          // Hard gates (location / work rights) are considerations, not
          // scored merit, so they're left out of the weighting maths.
          const totalWeight = criteria.filter(c => !c.hard_gate).reduce((s, c) => s + (Number(c.weight) || 0), 0) || 1
          return (
            <div
              className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4"
              onClick={() => setCriteriaModalOpen(false)}
            >
              <div
                className="bg-bg-elevated rounded-3xl border border-border ring-1 ring-ink/5 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-6 pt-5 pb-4 border-b border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                    Confirm scoring criteria
                  </p>
                  <h2 className="font-sans text-lg font-bold text-ink tracking-tight">
                    {activeRubricLabel}
                  </h2>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div className="bg-warning/10 border border-warning/30 rounded-2xl px-4 py-3 text-xs text-ink leading-relaxed">
                    <strong className="text-warning">Before you upload:</strong> these criteria shape both the CV scores AND the prescreen questions, so editing them later means rescoring. Double-check they match your PD.
                  </div>
                  {criteria.length > 0 && (
                    <div className="bg-bg-soft/60 border border-border rounded-2xl px-4 py-4">
                      <div className="flex items-baseline justify-between mb-3">
                        <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                          How the score is weighted
                        </p>
                        <p className="text-[10px] text-ink-muted">{criteria.length} criteria</p>
                      </div>
                      <ul className="space-y-2">
                        {criteria.map(c => {
                          if (c.hard_gate) {
                            return (
                              <li key={c.id} className="flex items-baseline justify-between gap-3">
                                <span className="text-xs text-ink font-medium truncate">{c.label}</span>
                                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider shrink-0">Consideration</span>
                              </li>
                            )
                          }
                          const pct = Math.round(((Number(c.weight) || 0) / totalWeight) * 100)
                          return (
                            <li key={c.id}>
                              <div className="flex items-baseline justify-between gap-3 mb-1">
                                <span className="text-xs text-ink font-medium truncate">{c.label}</span>
                                <span className="text-xs font-bold text-ink tabular-nums shrink-0">{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                      <p className="text-[10px] text-ink-muted mt-3 leading-snug">
                        Percentages show how each criterion is weighted in the overall CV score. Considerations (location / work rights) are checked but do not affect the score.
                      </p>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-border flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCriteriaModalOpen(false)
                      if (activeCustom) setEditingRubric(activeCustom)
                      else setShowNewRubric(true)
                    }}
                    className="text-xs font-bold px-4 min-h-touch py-2 rounded-full border border-border bg-bg-elevated text-ink-soft hover:text-ink transition-colors"
                  >
                    Change criteria
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedCriteria(prev => ({ ...prev, [rubricId]: true }))
                      setCriteriaModalOpen(false)
                    }}
                    className="text-xs font-bold px-4 min-h-touch py-2 rounded-full bg-accent text-ink-on-accent hover:bg-accent-hover transition-colors"
                  >
                    Yes, use this criteria
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* New rubric modal */}
        {showNewRubric && (
          <NewRubricModal
            initialLabel={campaignHandoff?.title}
            initialJd={campaignHandoff?.jd}
            fromCampaignCoach={campaignHandoff?.fromCampaignCoach ?? false}
            onClose={() => { setShowNewRubric(false); setCampaignHandoff(null) }}
            onCreated={(saved) => {
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

        {/* Rescore-against-new-version modal. */}
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
              aria-labelledby="rescore-modal-title-standalone"
              className="bg-bg-elevated shadow-modal rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <p id="rescore-modal-title-standalone" className="font-display text-lg font-bold text-ink mb-1">
                v{rescorePrompt.targetVersion} saved
              </p>
              {rescoreError ? (
                <p className="text-sm text-danger mb-4">{rescoreError}</p>
              ) : rescoreBusy && rescoreProgress ? (
                <p className="text-sm text-ink-soft mb-4">
                  Rescoring {rescoreProgress.done} of {rescoreProgress.total}...
                </p>
              ) : (
                <>
                  <p className="text-sm text-ink-soft mb-2">
                    You have {rescorePrompt.eligibleScreeningIds.length} candidate{rescorePrompt.eligibleScreeningIds.length === 1 ? '' : 's'} scored on the previous version. Rescore them against v{rescorePrompt.targetVersion}?
                  </p>
                  <p className="text-xs text-ink-muted mb-4">
                    v1 scores stay intact for comparison - each candidate will appear in both version tabs.
                  </p>
                </>
              )}
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setRescorePrompt(null); setRescoreError(null); setRescoreProgress(null) }}
                  disabled={rescoreBusy}
                  className="text-sm font-bold text-ink-soft hover:text-ink px-4 py-2 disabled:opacity-50"
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
                    for (const sid of rescorePrompt.eligibleScreeningIds) {
                      try {
                        const res = await fetch(`/api/cv-screening/screenings/${sid}/rescore`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ rubric_id: rescorePrompt.targetRubricId }),
                        })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
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

        {/* Manual override modal */}
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

        {/* Sticky selection bar */}
        {selectedCount > 0 && (
          <div className="absolute bottom-4 left-0 right-0 z-30 px-4 pointer-events-none">
            <div className="mx-auto w-fit max-w-[min(100%,_960px)] bg-ink text-ink-on-accent rounded-full shadow-card flex items-center gap-3 px-5 py-2.5 whitespace-nowrap pointer-events-auto">
              <span className="text-sm font-bold flex-shrink-0">{selectedCount} selected</span>
              <span className="text-xs opacity-60 hidden md:inline">
                Generate a client-ready summary or send to Shortlist Agent.
              </span>
              <button
                onClick={clearSelected}
                className="text-xs font-bold opacity-70 hover:opacity-100 px-2 py-1 flex-shrink-0"
              >
                Clear
              </button>
              <button
                onClick={batchSendToShortlist}
                disabled={batchHandoffBusy}
                className="bg-white/15 text-ink-on-accent text-sm font-bold rounded-full px-4 py-1.5 hover:bg-white/25 disabled:opacity-50 flex-shrink-0"
                title="Create one Shortlist Agent role with all selected CVs invited for video pre-screen"
              >
                {batchHandoffBusy ? 'Creating...' : 'Send to Shortlist Agent'}
              </button>
              <button
                onClick={generateReport}
                disabled={reportBusy}
                className="bg-bg-elevated text-ink text-sm font-bold rounded-full px-4 py-1.5 hover:bg-bg-soft disabled:opacity-50 flex-shrink-0"
              >
                {reportBusy ? 'Generating...' : 'Download CV report'}
              </button>
              {reportError && (
                <span className="text-xs text-danger flex-shrink-0 max-w-[200px] truncate" title={reportError}>
                  {reportError}
                  <button type="button" onClick={() => setReportError(null)} className="ml-1 font-bold">x</button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ----------------------------------------------------------------
  // In-role path (Shortlist Agent Step 1). Rendered only when
  // prescreenSessionId is truthy. UNCHANGED from before the rail
  // reflow - same markup, same behaviour.
  // ----------------------------------------------------------------
  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-bg">

      {/* -- Left panel: rubric list. Hidden entirely when the component
           is hosted inside Step 1 of the role workflow stepper. The
           left rail of the role already does the navigating; showing
           the rubric library here makes the screen feel like three
           stacked sidebars. The role's own criteria are still surfaced
           in the detail panel header. -- */}
      <div className={`w-full md:w-64 md:flex-shrink-0 border-b md:border-b-0 md:border-r border-border bg-bg-elevated flex-col ${prescreenSessionId ? 'hidden' : (showListPanel ? 'flex' : 'hidden md:flex')}`}>

        {/* Header - AI Administrator pattern (eyebrow + sans h1 + body). */}
        <div className="px-4 pt-5 pb-4 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
            HQ Recruit
          </p>
          <h1 className="font-sans text-lg font-bold text-ink tracking-tight mb-1">
            Quick CV score
          </h1>
          <p className="text-xs text-ink-soft mb-2">
            {customCount} saved criteria. Score CVs ad-hoc with no role attached. To build a shortlist, select scored CVs and send them across - that spins up a Shortlist Agent role with Step 1 already done.
          </p>
          <button
            onClick={() => setShowNewRubric(true)}
            className="bg-accent hover:bg-accent-hover text-ink-on-accent text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
          >
            + New scoring criteria
          </button>
          {/* CV Formatter cross-link (relocated here from the AI
              Administrator subheading). Lives in the standalone Quick CV
              score header only - this whole left panel is hidden in the
              in-role stepper, so the role flow stays uncluttered. */}
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[11px] text-ink-soft leading-relaxed">
              Have an existing CV?{' '}
              <Link href="/dashboard/people/administrator/ingest" className="text-accent underline-offset-2 hover:underline font-bold">
                Reformat it with the CV Formatter
              </Link>{' '}
              - it restructures the CV into the Humanistiqs house format without changing a word.
            </p>
          </div>
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

      {/* -- Right panel: rubric detail (upload + candidates + DI). In
           role context the left panel is hidden, so we always show the
           right panel as the full-width detail surface. -- */}
      <div className={`flex-1 overflow-hidden ${prescreenSessionId ? 'flex flex-col' : (showListPanel ? 'hidden md:flex md:flex-col' : 'flex flex-col')}`}>
        {/* In-role context header - always visible in role context (even
            before a rubric is chosen) so the criteria selector + manage
            affordances are reachable. The full rubric library panel is
            hidden in role context, so this is the only place to pick or
            edit criteria. */}
        {prescreenSessionId && (
          <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-border bg-bg-elevated flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
              Step 1 - Score CVs
            </p>
            <h1 className="font-sans text-lg font-bold text-ink tracking-tight">
              {roleContextLabel ?? 'Role'}
            </h1>
            <p className="text-xs text-mid mt-1 mb-3">
              CVs uploaded here only count toward this role. Use the left rail to move to Step 2 once you&apos;ve promoted your picks.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Scoring criteria
              </label>
              <select
                value={rubricId}
                onChange={(e) => setRubricId(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-border bg-bg text-ink min-w-[200px]"
              >
                <option value="">Choose criteria...</option>
                {customFamilies.length > 0 && (
                  <optgroup label="Saved criteria">
                    {customFamilies.flatMap(fam =>
                      fam.versions.map(v => (
                        <option key={v.id} value={v.id}>
                          {fam.familyLabel}{fam.versions.length > 1 ? ` (v${v.version_number ?? 1})` : ''}
                        </option>
                      )),
                    )}
                  </optgroup>
                )}
                <optgroup label="Standard rubrics">
                  {ALL_RUBRICS.map(r => (
                    <option key={r.rubric_id} value={r.rubric_id}>{r.role}</option>
                  ))}
                </optgroup>
              </select>
              {activeCustom && (
                <button
                  type="button"
                  onClick={() => setEditingRubric(activeCustom)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border border-border bg-bg text-mid hover:text-ink transition-colors"
                >
                  Edit criteria
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNewRubric(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-accent text-ink-on-accent hover:bg-accent-hover transition-colors"
              >
                + New criteria
              </button>
            </div>
          </div>
        )}
        {activeRubricKind ? (
          <>
            {/* Mobile back bar - only meaningful when the left panel
                exists. In-role mode hides the left panel entirely so
                the back bar would point to nothing. */}
            {!prescreenSessionId && (
              <div className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg-elevated flex-shrink-0">
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
            )}
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
                    {/* Standalone-only. Inside a role this CV scoring
                        surface IS Step 1 of the Shortlist Agent, so a
                        "Move to Shortlist Agent" link would point at
                        itself. Hidden when prescreenSessionId is set. */}
                    {!prescreenSessionId && (
                      <a
                        href="/dashboard/recruit/shortlist"
                        className="bg-bg-elevated border border-border text-charcoal text-xs font-bold px-3 py-1.5 rounded-full hover:bg-light hidden sm:inline-flex items-center"
                      >
                        Move to Shortlist Agent →
                      </a>
                    )}
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
                          <span className={`ml-1.5 ${isActive ? 'text-ink-on-accent/70' : 'text-muted'}`}>
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
                  {/* Criteria confirmation gate. Until the recruiter has
                      confirmed the scoring criteria for this rubric (in
                      the modal), the dropzone is replaced by a review
                      prompt. The note + weighting visual that used to sit
                      inline here now live inside that modal so the Score
                      CVs surface stays clean. */}
                  {!criteriaConfirmed ? (
                    <div className="border-2 border-dashed border-border rounded-2xl px-6 py-10 text-center">
                      <p className="text-sm font-bold text-charcoal mb-1">
                        Confirm your scoring criteria before uploading
                      </p>
                      <p className="text-xs text-muted mb-4 max-w-md mx-auto">
                        The criteria shape both the CV scores and the prescreen questions. Take a quick look before any CV lands - editing them later means rescoring.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCriteriaModalOpen(true)}
                        className="bg-accent text-ink-on-accent text-xs font-bold rounded-full px-5 py-2.5 hover:bg-accent-hover"
                      >
                        Review scoring criteria
                      </button>
                    </div>
                  ) : (
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
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setCriteriaModalOpen(true) }}
                        className="mt-3 text-[11px] font-bold text-mid hover:text-ink underline"
                      >
                        Review criteria again
                      </button>
                    </label>
                  )}

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
                    <FilterChip label={`All (${counts.all})`} active={bandFilter === 'all'} onClick={() => setBandFilter('all')} />
                    <FilterChip label={`Strong (${counts.strong})`} active={bandFilter === 'strong'} onClick={() => setBandFilter('strong')} />
                    <FilterChip label={`Yes (${counts.yes})`} active={bandFilter === 'yes'} onClick={() => setBandFilter('yes')} />
                    <FilterChip label={`Maybe (${counts.maybe})`} active={bandFilter === 'maybe'} onClick={() => setBandFilter('maybe')} />
                    <FilterChip label={`No (${counts.no})`} active={bandFilter === 'no'} onClick={() => setBandFilter('no')} />
                    <span className="ml-auto text-xs text-muted">
                      {busy ? 'Analysing CVs...' : `${filtered.length} candidate${filtered.length === 1 ? '' : 's'}`}
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
                        {!criteriaConfirmed
                          ? 'Confirm your scoring criteria above before uploading CVs.'
                          : bandFilter !== 'all'
                            ? `No candidates in the ${bandFilter === 'strong' ? 'Strong yes' : bandFilter === 'yes' ? 'Yes' : bandFilter === 'maybe' ? 'Maybe' : 'No'} band.`
                            : 'No candidates yet. Upload some CVs above to get started.'}
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
                        {/* Header row - hidden on mobile */}
                        <li className="px-6 py-2 hidden sm:grid grid-cols-12 gap-3 items-center text-[10px] font-bold uppercase tracking-wider text-muted bg-light/50">
                          <span className="col-span-1" />
                          <span className="col-span-3">Candidate</span>
                          <span className="col-span-1">Score</span>
                          <span className="col-span-2">Band</span>
                          <span className="col-span-2">Next step</span>
                          <span className="col-span-2 hidden sm:block">Comments</span>
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
                              <li key={s.id} className={`px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-1 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center hover:bg-light transition-colors ${checked ? 'bg-light' : ''}`}>
                                <label className="col-span-1 flex items-center cursor-pointer self-start" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleSelected(s.id)}
                                    className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                                  />
                                </label>
                                <div className="sm:col-span-3 text-sm font-bold text-charcoal truncate text-left flex items-center gap-1.5 group">
                                  {renameState?.id === s.id ? (
                                    <div className="flex-1 min-w-0 space-y-0.5" onClick={e => e.stopPropagation()}>
                                      <input
                                        autoFocus
                                        value={renameState.draft}
                                        onChange={e => setRenameState(prev => prev ? { ...prev, draft: e.target.value } : null)}
                                        onKeyDown={async (e) => {
                                          if (e.key === 'Escape') { setRenameState(null); return }
                                          if (e.key === 'Enter') {
                                            const next = renameState.draft.trim()
                                            if (!next || next === s.candidate_label) { setRenameState(null); return }
                                            try {
                                              const r = await fetch(`/api/cv-screening/screenings/${s.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ candidate_label: next }),
                                              })
                                              const data = await r.json()
                                              if (!r.ok) throw new Error(data.error || 'Update failed')
                                              setScreenings(prev => prev.map(row => row.id === s.id ? { ...row, candidate_label: data.screening.candidate_label } : row))
                                              setRenameState(null)
                                            } catch (err) {
                                              setRenameState(prev => prev ? { ...prev, error: err instanceof Error ? err.message : 'Could not rename' } : null)
                                            }
                                          }
                                        }}
                                        className="w-full text-xs text-charcoal bg-bg border border-border rounded-full px-2 py-1 outline-none focus:border-charcoal"
                                      />
                                      {renameState.error && <span className="text-[10px] text-danger block">{renameState.error}</span>}
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setSelectedId(s.id)}
                                        className="truncate text-left flex-1 min-w-0"
                                        title={s.candidate_label}
                                      >
                                        {s.candidate_label}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); setRenameState({ id: s.id, draft: s.candidate_label ?? '', error: null }) }}
                                        aria-label="Rename candidate"
                                        title="Rename candidate"
                                        className="opacity-0 group-hover:opacity-100 text-[10px] text-mid hover:text-charcoal rounded p-0.5 flex-shrink-0 transition-opacity"
                                      >
                                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                          <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                                          <path d="M10 3l3 3" />
                                        </svg>
                                      </button>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={() => setSelectedId(s.id)}
                                  className="sm:col-span-1 text-sm text-charcoal font-bold text-left inline-flex items-center gap-1.5"
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
                                  className={`sm:col-span-2 inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-3 py-1 hover:ring-1 hover:ring-charcoal transition-all justify-start w-fit ${BAND_COLOURS[band as keyof typeof BAND_COLOURS] ?? ''}`}
                                >
                                  {BAND_LABELS[band as keyof typeof BAND_LABELS] ?? band}
                                  {s.override_band && <span className="text-[9px] opacity-70">edited</span>}
                                </button>
                                <button
                                  onClick={() => setOverrideTarget(s)}
                                  title="Click to override the AI's next step"
                                  className="sm:col-span-2 text-xs text-mid truncate text-left hover:text-charcoal hover:underline"
                                >
                                  {ACTION_LABELS[action as keyof typeof ACTION_LABELS] ?? action}
                                  {s.override_next_action && <span className="text-[9px] ml-1 opacity-70">edited</span>}
                                </button>
                                <button
                                  onClick={() => setOverrideTarget(s)}
                                  title={s.override_comment || 'Click to add a comment'}
                                  className={`sm:col-span-2 hidden sm:block text-xs truncate text-left ${hasOverride ? 'text-charcoal hover:underline' : 'text-muted hover:text-charcoal italic'}`}
                                >
                                  {s.override_comment ? s.override_comment : 'Add comment...'}
                                </button>
                                <button
                                  onClick={() => setSelectedId(s.id)}
                                  className="sm:col-span-1 text-xs text-muted text-left sm:text-right hover:text-charcoal"
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

                {/* How the agent works - shown only when the candidate list is empty
                    so it doesn't clutter the screen once candidates arrive. */}
                {filtered.length === 0 && <section className="bg-bg-elevated shadow-card rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-ink" />
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
                </section>}

              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 min-h-0 overflow-y-auto px-4 py-10">
            <div className="max-w-md w-full">
              <h2 className="font-display text-xl font-bold text-charcoal mb-2 uppercase tracking-wider text-center">
                Choose your scoring criteria
              </h2>
              <p className="text-sm text-mid mb-6 text-center">
                {prescreenSessionId
                  ? 'Pick the criteria for this role from the dropdown above, or create new criteria from a job ad. Then upload CVs to score against them.'
                  : customCount > 0
                    ? 'Select a saved set of criteria from the left, or create a new one. Then upload CVs to score against them.'
                    : 'Set up the scoring criteria first, then upload CVs to score against them.'}
              </p>

              {/* Numbered onboarding. Explicit "1 -> 2" so SMEs who
                  don't know the word "rubric" still see that criteria
                  come BEFORE uploads. Jess uploaded CVs first and
                  waited; this stops that. */}
              <ol className="space-y-3 mb-6">
                <li className="flex items-start gap-3 bg-bg-elevated shadow-card rounded-2xl px-4 py-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-ink-on-accent text-sm font-bold flex items-center justify-center">1</span>
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
          inRole={Boolean(prescreenSessionId)}
          onSendToPrescreen={prescreenSessionId ? sendCandidateToPrescreen : undefined}
          onRejectCandidate={prescreenSessionId ? rejectScreening : undefined}
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

      {/* Criteria confirmation modal - gates CV upload. Holds the
          "before you upload" note + the weighting visual that used to
          sit inline on the Score CVs surface. */}
      {criteriaModalOpen && (() => {
        const criteria = activeCustom?.rubric?.criteria ?? activeStandard?.criteria ?? []
        // Hard gates (location / work rights) are considerations, not
        // scored merit, so they're left out of the weighting maths.
        const totalWeight = criteria.filter(c => !c.hard_gate).reduce((s, c) => s + (Number(c.weight) || 0), 0) || 1
        return (
          <div
            className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4"
            onClick={() => setCriteriaModalOpen(false)}
          >
            <div
              className="bg-bg-elevated rounded-3xl border border-border ring-1 ring-ink/5 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 pt-5 pb-4 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Confirm scoring criteria
                </p>
                <h2 className="font-sans text-lg font-bold text-ink tracking-tight">
                  {activeRubricLabel}
                </h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="bg-warning/10 border border-warning/30 rounded-2xl px-4 py-3 text-xs text-charcoal leading-relaxed">
                  <strong className="text-warning">Before you upload:</strong> these criteria shape both the CV scores AND the prescreen questions, so editing them later means rescoring. Double-check they match your PD.
                </div>
                {criteria.length > 0 && (
                  <div className="bg-light/60 border border-border rounded-2xl px-4 py-4">
                    <div className="flex items-baseline justify-between mb-3">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                        How the score is weighted
                      </p>
                      <p className="text-[10px] text-muted">{criteria.length} criteria</p>
                    </div>
                    <ul className="space-y-2">
                      {criteria.map(c => {
                        if (c.hard_gate) {
                          return (
                            <li key={c.id} className="flex items-baseline justify-between gap-3">
                              <span className="text-xs text-charcoal font-medium truncate">{c.label}</span>
                              <span className="text-[10px] font-bold text-muted uppercase tracking-wider shrink-0">Consideration</span>
                            </li>
                          )
                        }
                        const pct = Math.round(((Number(c.weight) || 0) / totalWeight) * 100)
                        return (
                          <li key={c.id}>
                            <div className="flex items-baseline justify-between gap-3 mb-1">
                              <span className="text-xs text-charcoal font-medium truncate">{c.label}</span>
                              <span className="text-xs font-bold text-charcoal tabular-nums shrink-0">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    <p className="text-[10px] text-muted mt-3 leading-snug">
                      Percentages show how each criterion is weighted in the overall CV score. Considerations (location / work rights) are checked but do not affect the score.
                    </p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-border flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCriteriaModalOpen(false)
                    if (activeCustom) setEditingRubric(activeCustom)
                    else setShowNewRubric(true)
                  }}
                  className="text-xs font-bold px-4 py-2 rounded-full border border-border bg-bg-elevated text-mid hover:text-ink transition-colors"
                >
                  Change criteria
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedCriteria(prev => ({ ...prev, [rubricId]: true }))
                    setCriteriaModalOpen(false)
                  }}
                  className="text-xs font-bold px-4 py-2 rounded-full bg-accent text-ink-on-accent hover:bg-accent-hover transition-colors"
                >
                  Yes, use this criteria
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
          <div className="mx-auto w-fit max-w-[min(100%,_960px)] bg-ink text-ink-on-accent rounded-full shadow-card flex items-center gap-3 px-5 py-2.5 whitespace-nowrap pointer-events-auto">
            <span className="text-sm font-bold flex-shrink-0">{selectedCount} selected</span>
            <span className="text-xs opacity-60 hidden md:inline">
              {prescreenSessionId
                ? 'Send the selected candidates to prescreen, or download a CV report.'
                : 'Generate a client-ready summary or send to Shortlist Agent.'}
            </span>
            <button
              onClick={clearSelected}
              className="text-xs font-bold opacity-70 hover:opacity-100 px-2 py-1 flex-shrink-0"
            >
              Clear
            </button>
            <button
              onClick={batchSendToShortlist}
              disabled={batchHandoffBusy}
              className="bg-white/15 text-ink-on-accent text-sm font-bold rounded-full px-4 py-1.5 hover:bg-white/25 disabled:opacity-50 flex-shrink-0"
              title={prescreenSessionId
                ? 'Attach the selected CVs to this role and move them to Step 2 (Prescreen)'
                : 'Create one Shortlist Agent role with all selected CVs invited for video pre-screen'}
            >
              {batchHandoffBusy
                ? (prescreenSessionId ? 'Sending...' : 'Creating...')
                : (prescreenSessionId ? 'Send to Prescreen (Step 2)' : 'Send to Shortlist Agent')}
            </button>
            <button
              onClick={generateReport}
              disabled={reportBusy}
              className="bg-bg-elevated text-charcoal text-sm font-bold rounded-full px-4 py-1.5 hover:bg-light disabled:opacity-50 flex-shrink-0"
            >
              {reportBusy ? 'Generating...' : 'Download CV report'}
            </button>
            {reportError && (
              <span className="text-xs text-danger flex-shrink-0 max-w-[200px] truncate" title={reportError}>
                {reportError}
                <button type="button" onClick={() => setReportError(null)} className="ml-1 font-bold">x</button>
              </span>
            )}
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
        <span className={`w-1.5 h-1.5 rounded-full ${tone === 'active' ? 'bg-ink' : 'bg-mid'}`} />
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
      {selected && <span className="absolute left-0 top-0 bottom-0 w-1 bg-ink" />}
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
          className="w-full text-sm font-medium text-charcoal bg-bg-elevated border border-ink rounded-md px-2 py-1 outline-none"
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
    case 'queued': return 'In queue'
    case 'parsing': return 'Reading CV...'
    case 'scoring': return 'Scoring...'
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

function FilterChip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-bold rounded-full px-3 py-1.5 transition-colors ${
        active ? 'bg-accent text-ink-on-accent' : 'bg-light text-mid hover:bg-border hover:text-charcoal'
      }`}
    >
      {label}
    </button>
  )
}
