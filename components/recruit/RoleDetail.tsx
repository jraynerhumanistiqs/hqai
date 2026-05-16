
'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  PrescreenSession,
  CandidateResponse,
  PrescreenEvaluation,
  PrescreenResponseStatus,
} from '@/lib/recruit-types'
import { TranscriptViewer, type Utterance } from './TranscriptViewer'
import { TranscriptModal } from './TranscriptModal'
import { VideoPlayer } from './VideoPlayer'
import { ResponsesKanban, type KanbanStage } from './ResponsesKanban'
import {
  useRecruitKeyboardShortcuts,
  RECRUIT_SHORTCUTS,
} from '@/hooks/useRecruitKeyboardShortcuts'
import { AiSuggestionCard, BiasDisclaimer } from './RoleDetailParts'
import { buildAnonMap } from '@/lib/recruit-anon'
import { NotesPanel } from './NotesPanel'
import { ShareDialog } from './ShareDialog'
import { CompareView } from './CompareView'
import { BulkActionFooter } from './BulkActionFooter'
import { ProcessFlowTracker } from './ProcessFlowTracker'
import { PhoneRecorder } from './PhoneRecorder'
import { analyseSpeech, analyseSpeechForQuestion } from '@/lib/confidence'
import { SpeechAnalysisPanel } from './SpeechAnalysisPanel'
import Link from 'next/link'

interface Booking {
  id: string
  response_id: string
  invitee_email: string
  event_start: string
  event_end: string
  calendly_event_uri: string
}

interface Props {
  session: PrescreenSession
  responses: CandidateResponse[]
  loadingResponses: boolean
  initialCandidateUrl: string
  onPatchResponse: (id: string, patch: Partial<CandidateResponse>) => Promise<void>
  onShareResponse: (id: string) => Promise<string>
  onSessionUpdated?: (updated: PrescreenSession) => void
}

const SLUG_REGEX = /^[a-z0-9-]{3,60}$/

type Filter = 'all' | 'submitted' | 'scored' | 'staff_reviewed' | 'shared'
type ViewMode = 'list' | 'kanban'

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  transcribing: 'Transcribing',
  transcribed: 'Transcribed',
  evaluating: 'Evaluating',
  scored: 'Scored',
  staff_reviewed: 'Reviewed',
  shared: 'Shared',
  new: 'Submitted',
  reviewed: 'Reviewed',
}

const STATUS_PILL: Record<string, string> = {
  submitted:      'bg-light text-mid border-border',
  transcribing:   'bg-blue-50 text-blue-600 border-blue-200',
  transcribed:    'bg-light text-mid border-border',
  evaluating:     'bg-blue-50 text-blue-600 border-blue-200',
  scored:         'bg-amber-50 text-amber-700 border-amber-200',
  staff_reviewed: 'bg-green-50 text-green-600 border-green-200',
  shared:         'bg-purple-50 text-purple-600 border-purple-200',
  new:            'bg-light text-mid border-border',
  reviewed:       'bg-green-50 text-green-600 border-green-200',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function RoleDetail({ session, responses, loadingResponses, initialCandidateUrl, onPatchResponse, onShareResponse, onSessionUpdated }: Props) {
  const [copied, setCopied]               = useState(false)
  const [phoneRecorderOpen, setPhoneRecorderOpen] = useState(false)
  const [filter, setFilter]               = useState<Filter>('all')
  const [expanded, setExpanded]           = useState<string | null>(null)
  const [shareUrls, setShareUrls]         = useState<Record<string, string>>({})
  const [copying, setCopying]             = useState<string | null>(null)
  const [questionsOpen, setQuestionsOpen] = useState(false)
  const [showInvite, setShowInvite]       = useState(false)
  const [inviteEmail, setInviteEmail]     = useState('')
  const [inviteName, setInviteName]       = useState('')
  const [showEmailEditor, setShowEmailEditor] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteSent, setInviteSent]       = useState(false)

  const [editingSlug, setEditingSlug]   = useState(false)
  const [slugDraft, setSlugDraft]       = useState('')
  const [slugSaving, setSlugSaving]     = useState(false)
  const [slugError, setSlugError]       = useState('')

  const [viewMode, setViewMode]         = useState<ViewMode>('list')
  const [anonymise, setAnonymise]       = useState(false)
  const [legendOpen, setLegendOpen]     = useState(false)
  const [biasBannerDismissed, setBiasBannerDismissed] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState<Record<string, boolean>>({})
  const [transcriptByResponse, setTranscriptByResponse] = useState<Record<string, Utterance[] | null>>({})
  const [transcriptTextByResponse, setTranscriptTextByResponse] = useState<Record<string, string | null>>({})
  const [transcriptModal, setTranscriptModal] = useState<
    | { responseId: string; question: number | 'all' }
    | null
  >(null)
  const [videoTimeByResponse, setVideoTimeByResponse] = useState<Record<string, number>>({})
  const [videoSeekByResponse, setVideoSeekByResponse] = useState<Record<string, number | undefined>>({})

  const [rtOverride, setRtOverride] = useState<Record<string, Partial<CandidateResponse>>>({})
  const [evalByResponse, setEvalByResponse] = useState<Record<string, PrescreenEvaluation | null>>({})
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bookingsByResponse, setBookingsByResponse] = useState<Record<string, Booking>>({})
  const [reloadCounter, setReloadCounter] = useState(0)
  const [compareOpen, setCompareOpen] = useState(false)
  const [shareDialogFor, setShareDialogFor] = useState<string | null>(null)

  const pathSegment = session.slug || session.id
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.humanistiqs.ai'
  const candidateUrl = initialCandidateUrl || `${origin}/prescreen/${pathSegment}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const a = window.localStorage.getItem(`hqrecruit:anon:${session.id}`)
      if (a === '1') queueMicrotask(() => setAnonymise(true))
    } catch { /* no-op */ }
    try {
      const b = window.localStorage.getItem(`hqrecruit:bias-banner:${session.id}`)
      if (b === '1') queueMicrotask(() => setBiasBannerDismissed(true))
    } catch { /* no-op */ }
  }, [session.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(`hqrecruit:anon:${session.id}`, anonymise ? '1' : '0') } catch { /* no-op */ }
  }, [anonymise, session.id])

  const [prevSessionId, setPrevSessionId] = useState(session.id)
  if (prevSessionId !== session.id) {
    setPrevSessionId(session.id)
    if (selectedIds.size > 0) setSelectedIds(new Set())
  }

  function dismissBiasBanner() {
    setBiasBannerDismissed(true)
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(`hqrecruit:bias-banner:${session.id}`, '1') } catch { /* no-op */ }
    }
  }

  useEffect(() => {
    const supa = createClient()
    const channel = supa
      .channel(`prescreen_responses:${session.id}`)
      .on(
        // @ts-expect-error - ssr client types don't include postgres_changes payload generics
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prescreen_responses', filter: `session_id=eq.${session.id}` },
        (payload: any) => {
          const row = payload.new ?? payload.old
          if (!row?.id) return
          setRtOverride(prev => ({ ...prev, [row.id]: { ...(prev[row.id] ?? {}), ...payload.new } }))
        },
      )
      .subscribe()
    return () => { supa.removeChannel(channel) }
  }, [session.id])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/prescreen/sessions/${session.id}/responses`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        const map: Record<string, Booking> = {}
        for (const b of (d.bookings ?? []) as Booking[]) map[b.response_id] = b
        setBookingsByResponse(map)
      })
      .catch(() => { /* no-op */ })
    return () => { cancelled = true }
  }, [session.id, reloadCounter])

  const mergedResponses: CandidateResponse[] = useMemo(() => {
    return responses.map(r => rtOverride[r.id] ? { ...r, ...rtOverride[r.id] } as CandidateResponse : r)
  }, [responses, rtOverride])

  const anonNameById = useMemo(() => {
    return buildAnonMap(mergedResponses.map(r => ({ id: r.id, created_at: r.submitted_at })))
  }, [mergedResponses])

  const displayNameFor = useCallback((r: CandidateResponse) => {
    return anonymise ? (anonNameById[r.id] ?? 'Candidate') : r.candidate_name
  }, [anonymise, anonNameById])

  useEffect(() => {
    if (!expanded) return
    const current = mergedResponses.find(r => r.id === expanded)
    if (!current) return
    const status = current.status as string
    // Statuses that may have evaluations: scored, staff_reviewed, shared
    // (post-review terminal states). Also fetch on 'transcribed' so users
    // can see scoring data for re-run responses.
    const evaluatedStatuses = new Set(['scored', 'staff_reviewed', 'shared', 'reviewed', 'transcribed'])
    if (!evaluatedStatuses.has(status)) return
    if (evalByResponse[expanded] !== undefined) return

    // Fetch via server route - browser anon-key client can't read
    // prescreen_evaluations (RLS enabled). The route uses service-role
    // and gates on user auth.
    fetch(`/api/prescreen/responses/${expanded}/evaluation`)
      .then(r => r.ok ? r.json() : { evaluation: null })
      .then((data: { evaluation: PrescreenEvaluation | null }) => {
        setEvalByResponse(prev => ({ ...prev, [expanded]: data.evaluation ?? null }))
      })
      .catch(() => {
        setEvalByResponse(prev => ({ ...prev, [expanded]: null }))
      })
  }, [expanded, mergedResponses, evalByResponse])

  // Shared transcript loader - hits the server route and writes both
  // utterances + full text into local state. Browser anon-key client
  // can't read prescreen_transcripts (RLS enabled), so we go through
  // the API route which uses service-role and gates on user auth.
  const ensureTranscript = useCallback((responseId: string) => {
    if (transcriptByResponse[responseId] !== undefined) return
    fetch(`/api/prescreen/responses/${responseId}/transcript`)
      .then(r => r.ok ? r.json() : { transcript: null })
      .then((data: { transcript: { utterances?: unknown; text?: string } | null }) => {
        const us = data.transcript?.utterances
        const txt = data.transcript?.text
        setTranscriptByResponse(prev => ({ ...prev, [responseId]: Array.isArray(us) ? us as Utterance[] : null }))
        setTranscriptTextByResponse(prev => ({ ...prev, [responseId]: typeof txt === 'string' ? txt : null }))
      })
      .catch(() => {
        setTranscriptByResponse(prev => ({ ...prev, [responseId]: null }))
        setTranscriptTextByResponse(prev => ({ ...prev, [responseId]: null }))
      })
  }, [transcriptByResponse])

  useEffect(() => {
    const openId = Object.entries(transcriptOpen).find(([, v]) => v)?.[0]
    if (!openId) return
    ensureTranscript(openId)
  }, [transcriptOpen, ensureTranscript])

  // Pre-fetch the transcript as soon as a candidate is expanded - the
  // confidence indicator in the per-question grid keys off it, so we
  // want it ready by the time the reviewer scrolls down. Triggered by
  // expansion rather than by the explicit "Show transcript" toggle.
  useEffect(() => {
    if (!expanded) return
    ensureTranscript(expanded)
  }, [expanded, ensureTranscript])

  // Build the body text for a transcript modal: full text or just one
  // question section split out of the merged "Question N:" transcript.
  function transcriptBody(responseId: string, questionNumber: number | 'all'): string {
    const fullText = transcriptTextByResponse[responseId] ?? ''
    if (questionNumber === 'all') return fullText
    const sections = fullText.split(/\n\n(?=Question \d+:)/)
    return sections.find(s => s.trim().startsWith(`Question ${questionNumber}:`))
      || `Question ${questionNumber} not found in transcript.`
  }

  async function saveSlug() {
    const next = slugDraft.trim().toLowerCase()
    if (next && !SLUG_REGEX.test(next)) {
      setSlugError('3-60 chars: lowercase, numbers, hyphens only')
      return
    }
    setSlugSaving(true)
    setSlugError('')
    try {
      const res = await fetch(`/api/prescreen/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: next }),
      })
      const data = await res.json()
      if (res.status === 409) { setSlugError('That slug is already in use'); return }
      if (!res.ok) { setSlugError(data.error || 'Could not save slug'); return }
      onSessionUpdated?.(data.session)
      setEditingSlug(false)
    } catch {
      setSlugError('Network error - please try again')
    } finally {
      setSlugSaving(false)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(candidateUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function prepareEmailDraft() {
    // Pre-fill the email editor with a templated subject + body for the
    // recruiter to tweak before sending. Uses the candidate name field if
    // typed, otherwise leaves the salutation generic.
    const timeMin = Math.max(1, Math.round(session.time_limit_seconds / 60))
    const totalMin = session.questions.length * timeMin
    const greeting = inviteName.trim() ? `Hi ${inviteName.trim()},` : 'Hi,'
    setEmailSubject(`Your video pre-screen for ${session.role_title} at ${session.company}`)
    setEmailBody(
      `${greeting}\n\nYou've been invited to complete a short video pre-screen for the ${session.role_title} role at ${session.company}.\n\nIt takes about ${totalMin} minute${totalMin === 1 ? '' : 's'} total - ${session.questions.length} question${session.questions.length === 1 ? '' : 's'}, ${timeMin} minute per answer. You can re-record each answer until you're happy with it.\n\nStart your pre-screen here:\n${candidateUrl}\n\nIf you have any questions, reply to this email. Good luck.\n\nThe ${session.company} hiring team`,
    )
    setShowEmailEditor(true)
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setSendingInvite(true)
    try {
      const payload: Record<string, string> = {
        candidate_email: inviteEmail.trim(),
        candidate_name: inviteName.trim(),
      }
      if (showEmailEditor && emailSubject.trim() && emailBody.trim()) {
        payload.subject = emailSubject.trim()
        payload.body = emailBody.trim()
      }
      await fetch(`/api/prescreen/sessions/${session.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setInviteSent(true)
      setInviteEmail('')
      setInviteName('')
      setShowEmailEditor(false)
      setEmailSubject('')
      setEmailBody('')
      setTimeout(() => { setInviteSent(false); setShowInvite(false) }, 2500)
    } finally {
      setSendingInvite(false)
    }
  }

  const filtered = filter === 'all'
    ? mergedResponses
    : mergedResponses.filter(r => String(r.status) === filter)

  async function handleShare(id: string) {
    const url = await onShareResponse(id)
    setShareUrls(prev => ({ ...prev, [id]: url }))
  }

  async function copyShareUrl(id: string) {
    await navigator.clipboard.writeText(shareUrls[id])
    setCopying(id)
    setTimeout(() => setCopying(null), 2000)
  }

  async function submitDecision(evaluationId: string, decision: 'accept' | 'adjust' | 'reject') {
    setDecisionBusy(evaluationId)
    try {
      await fetch(`/api/prescreen/evaluations/${evaluationId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const ev = Object.values(evalByResponse).find(e => e?.id === evaluationId)
      if (ev?.response_id) {
        setRtOverride(prev => ({
          ...prev,
          [ev.response_id]: { ...(prev[ev.response_id] ?? {}), status: 'staff_reviewed' as PrescreenResponseStatus },
        }))
      }
    } finally {
      setDecisionBusy(null)
    }
  }

  async function updateStage(id: string, stage: KanbanStage) {
    setRtOverride(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), stage } as Partial<CandidateResponse> }))
    try {
      await fetch(`/api/prescreen/responses/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
    } catch (e) {
      console.error('[updateStage]', e)
    }
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 4) next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const timeLimitLabel = session.time_limit_seconds < 60
    ? `${session.time_limit_seconds}s`
    : session.time_limit_seconds < 120
    ? '1 min'
    : `${session.time_limit_seconds / 60} min`

  const filteredIdRef = useRef(filtered)
  useEffect(() => { filteredIdRef.current = filtered }, [filtered])

  const moveCandidate = useCallback((dir: 1 | -1) => {
    const list = filteredIdRef.current
    if (list.length === 0) return
    if (!expanded) { setExpanded(list[0].id); return }
    const idx = list.findIndex(r => r.id === expanded)
    const next = list[(idx + dir + list.length) % list.length]
    if (next) setExpanded(next.id)
  }, [expanded])

  const togglePlayPause = useCallback(() => {
    if (!expanded) return
    try {
      const container = document.querySelector(`[data-candidate-videos="${expanded}"]`)
      const iframe = container?.querySelector('iframe')
      if (!iframe) return
      const w = iframe.contentWindow as any
      if (w?.postMessage) w.postMessage({ event: 'command', func: 'togglePlay' }, '*')
    } catch { /* no-op */ }
  }, [expanded])

  const rateActive = useCallback((n: 1 | 2 | 3 | 4 | 5) => {
    if (!expanded) return
    void onPatchResponse(expanded, { rating: n, status: 'staff_reviewed' as any })
  }, [expanded, onPatchResponse])

  const shareActive = useCallback(() => {
    if (!expanded) return
    void handleShare(expanded)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const decideActive = useCallback((decision: 'accept' | 'reject') => {
    if (!expanded) return
    const ev = evalByResponse[expanded]
    if (!ev) return
    void submitDecision(ev.id, decision)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, evalByResponse])

  useRecruitKeyboardShortcuts(!!expanded, {
    onNextCandidate: () => moveCandidate(1),
    onPrevCandidate: () => moveCandidate(-1),
    onPlayPause: togglePlayPause,
    onRate: rateActive,
    onShare: shareActive,
    onAccept: () => decideActive('accept'),
    onReject: () => decideActive('reject'),
    onToggleLegend: () => setLegendOpen(v => !v),
  })

  useEffect(() => {
    if (!legendOpen) return
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setLegendOpen(false) }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [legendOpen])

  const hasScoredRow = filtered.some(r => (r.status as string) === 'scored' || (r.status as string) === 'staff_reviewed')
  const showBiasBanner = hasScoredRow && !biasBannerDismissed
  const expandedResponse = expanded ? mergedResponses.find(r => r.id === expanded) ?? null : null

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-white px-6 py-5 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl font-bold text-black leading-tight">{session.role_title}</h2>
            <p className="text-sm text-mid mt-1">{session.company}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <Link
              href={`/dashboard/recruit/${session.id}/analytics`}
              className="text-xs font-bold px-3 py-1 rounded-full border border-border bg-white text-mid hover:text-black transition-colors"
            >Analytics</Link>
            <div className="flex items-center gap-1 bg-bg border border-border rounded-full p-0.5">              <button
                onClick={() => setViewMode('list')}
                className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                  viewMode === 'list' ? 'bg-black text-white' : 'text-mid hover:text-black'
                }`}
              >List</button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                  viewMode === 'kanban' ? 'bg-black text-white' : 'text-mid hover:text-black'
                }`}
              >Kanban</button>
            </div>
            <button
              onClick={() => setAnonymise(v => !v)}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
                anonymise
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-mid border-border hover:text-black'
              }`}
              title="Hide candidate names + emails. Quotes from transcript are not anonymised."
            >
              {anonymise ? 'Anonymised' : 'Anonymise'}
            </button>
            <button
              onClick={() => setLegendOpen(true)}
              className="text-xs font-bold px-3 py-1 rounded-full border border-border bg-white text-mid hover:text-black transition-colors"
              title="Keyboard shortcuts (?)"
            >?</button>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              session.status === 'active'
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-light text-mid border-border'
            }`}>
              {session.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-mid">
          <span>{session.questions.length} questions</span>
          <span>&middot;</span>
          <span>{timeLimitLabel} per answer</span>
          <span>&middot;</span>
          <span>{mergedResponses.length} {mergedResponses.length === 1 ? 'candidate' : 'candidates'}</span>
          <span>&middot;</span>
          <span>Created {new Date(session.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-bg">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

          {/* Process flow tracker - visible state of the role's funnel */}
          <ProcessFlowTracker session={session} responses={mergedResponses} />

          {/* Phone screen recorder - shown when session permits phone OR
              if no interview_types are set (legacy session, default
              behaviour). The button to open is below the candidate
              invite card. */}
          {(session.interview_types?.includes('phone') ?? false) && phoneRecorderOpen && (
            <PhoneRecorder
              sessionId={session.id}
              onSubmitted={() => { setPhoneRecorderOpen(false) }}
              onCancel={() => setPhoneRecorderOpen(false)}
            />
          )}

          <div className="bg-white rounded-2xl border border-border shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-black uppercase tracking-widest">Candidate Invite Link</p>
              {(session.interview_types?.includes('phone') ?? false) && !phoneRecorderOpen && (
                <button
                  onClick={() => setPhoneRecorderOpen(true)}
                  className="text-xs font-bold text-black hover:underline"
                  title="Record a phone screen instead of sending the video invite link"
                >
                  + Record phone screen
                </button>
              )}
            </div>
            {editingSlug ? (
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <code className="text-xs text-mid bg-bg border border-border rounded-lg px-3 py-2 font-mono whitespace-nowrap">
                  {origin}/prescreen/
                </code>
                <input
                  autoFocus
                  className="flex-1 min-w-[140px] border border-border rounded-lg px-3 py-2 text-xs font-mono text-black placeholder-mid/60 focus:outline-none focus:border-accent/60 bg-white"
                  value={slugDraft}
                  onChange={e => setSlugDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveSlug(); if (e.key === 'Escape') { setEditingSlug(false); setSlugError('') } }}
                  placeholder="e.g. acme-senior-accountant"
                  maxLength={60}
                />
                <button onClick={saveSlug} disabled={slugSaving} className="text-xs font-bold px-3 py-2 rounded-full bg-accent hover:bg-accent2 text-white transition-colors disabled:opacity-50">
                  {slugSaving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditingSlug(false); setSlugError('') }} className="text-xs font-bold px-3 py-2 rounded-full text-mid hover:text-black transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-mid bg-bg border border-border rounded-lg px-3 py-2 truncate font-mono">
                  {candidateUrl}
                </code>
                <button
                  onClick={() => { setSlugDraft(session.slug || ''); setEditingSlug(true); setSlugError('') }}
                  className="text-mid hover:text-black transition-colors flex-shrink-0 p-2 rounded-lg hover:bg-light"
                  title="Customise the link"
                  aria-label="Edit invite link"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                  </svg>
                </button>
                <button
                  onClick={copyLink}
                  className={`text-sm font-bold px-4 py-2 rounded-full transition-colors flex-shrink-0 ${
                    copied
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-accent hover:bg-accent2 text-white'
                  }`}
                >
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            )}
            {slugError && <p className="text-xs text-danger mt-1">{slugError}</p>}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="text-xs font-bold text-accent hover:text-accent2 transition-colors"
              >
                Email invite to candidate
              </button>
              <span className="text-mid text-xs">&middot;</span>
              <p className="text-xs text-mid">Or copy and share the link above</p>
            </div>

            {showInvite && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Candidate name</label>
                    <input className="w-full border border-border rounded-lg px-3 py-2 text-sm text-black placeholder-mid/60 focus:outline-none focus:border-accent/60 bg-bg" placeholder="e.g. Jane Smith" value={inviteName} onChange={e => setInviteName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Email address</label>
                    <input type="email" className="w-full border border-border rounded-lg px-3 py-2 text-sm text-black placeholder-mid/60 focus:outline-none focus:border-accent/60 bg-bg" placeholder="jane@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                  </div>
                </div>

                {!showEmailEditor ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-mid leading-relaxed">
                      A pre-written email goes out under HQ.ai branding. Want to tweak the wording?
                    </p>
                    <button
                      onClick={() => prepareEmailDraft()}
                      className="text-xs font-bold text-charcoal hover:underline whitespace-nowrap"
                    >
                      Preview &amp; edit email
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 bg-light rounded-2xl p-3">
                    <div>
                      <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1">Subject</label>
                      <input
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1">Body</label>
                      <textarea
                        value={emailBody}
                        onChange={e => setEmailBody(e.target.value)}
                        rows={9}
                        className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-charcoal leading-relaxed font-mono"
                      />
                      <p className="text-[10px] text-muted mt-1">
                        The candidate's video link will appear in the email automatically.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowEmailEditor(false)}
                        className="text-xs font-bold text-mid hover:text-charcoal"
                      >
                        Use the default template
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowInvite(false)}
                    className="text-xs font-bold text-mid hover:text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendInvite}
                    disabled={sendingInvite || !inviteEmail.trim()}
                    className={`text-sm font-bold px-4 py-2 rounded-full transition-colors ${
                      inviteSent
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-black hover:bg-charcoal disabled:opacity-40 text-white'
                    }`}
                  >
                    {inviteSent ? 'Sent' : sendingInvite ? 'Sending...' : showEmailEditor ? 'Send custom email' : 'Send default email'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-bg/50 transition-colors"
              onClick={() => setQuestionsOpen(!questionsOpen)}
            >
              <p className="text-xs font-bold text-black uppercase tracking-widest">
                Pre-Screen Questions
                <span className="ml-2 text-mid normal-case font-normal">{session.questions.length}</span>
              </p>
              <svg className={`w-4 h-4 text-mid transition-transform ${questionsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
            {questionsOpen && (
              <div className="border-t border-border divide-y divide-border">
                {session.questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <span className="text-xs font-bold text-accent mt-0.5 w-6 flex-shrink-0">Q{i + 1}</span>
                    <p className="text-sm text-black">{q}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-3 flex-wrap">
              <p className="text-xs font-bold text-black uppercase tracking-widest">
                Candidates
                {mergedResponses.length > 0 && (
                  <span className="ml-2 text-mid normal-case font-normal">{mergedResponses.length}</span>
                )}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <CandidateSummaryButton responses={mergedResponses} />
                {mergedResponses.length > 0 && viewMode === 'list' && (
                  <div className="flex items-center gap-1">
                    {(['all', 'submitted', 'scored', 'staff_reviewed', 'shared'] as Filter[]).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize transition-colors ${
                          filter === f ? 'bg-accent text-white' : 'text-mid hover:text-black'
                        }`}
                      >
                        {f === 'staff_reviewed' ? 'reviewed' : f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {loadingResponses && (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
              </div>
            )}

            {!loadingResponses && filtered.length === 0 && (
              <div className="py-12 text-center px-6">
                <p className="text-sm text-mid mb-1">
                  {filter === 'all' ? 'No candidates yet' : `No ${STATUS_LABEL[filter] ?? filter} candidates`}
                </p>
                {filter === 'all' && (
                  <p className="text-xs text-mid/70">Share the invite link above to start receiving video responses</p>
                )}
              </div>
            )}

            {!loadingResponses && filtered.length > 0 && viewMode === 'kanban' && (
              <div className="p-4">
                {showBiasBanner && (
                  <div className="mb-3">
                    <BiasDisclaimer onDismiss={dismissBiasBanner} />
                  </div>
                )}
                <ResponsesKanban
                  responses={mergedResponses}
                  anonymise={anonymise}
                  displayNameFor={displayNameFor}
                  evaluations={evalByResponse}
                  onStageChange={updateStage}
                  onSelect={setExpanded}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              </div>
            )}

            {!loadingResponses && filtered.length > 0 && viewMode === 'list' && (
              <div className="divide-y divide-border">
                {showBiasBanner && (
                  <div className="px-5 pt-4">
                    <BiasDisclaimer onDismiss={dismissBiasBanner} />
                  </div>
                )}
                {filtered.map(r => {
                  const evaluation = evalByResponse[r.id] ?? null
                  const statusLabel = STATUS_LABEL[r.status as string] ?? String(r.status)
                  const pillCls = STATUS_PILL[r.status as string] ?? 'bg-light text-mid border-border'
                  const name = displayNameFor(r)
                  const checked = selectedIds.has(r.id)
                  const disabled = !checked && selectedIds.size >= 4

                  return (
                    <div key={r.id}>
                      <div className="w-full flex items-center gap-3 px-5 py-4 hover:bg-bg/50 transition-colors">
                        <label
                          onClick={e => e.stopPropagation()}
                          className="flex items-center cursor-pointer flex-shrink-0"
                          title={disabled ? 'Maximum 4 candidates' : checked ? 'Deselect' : 'Select for compare'}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-black cursor-pointer"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleSelect(r.id)}
                          />
                        </label>
                        <button
                          className="flex-1 flex items-center gap-3 text-left"
                          onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        >
                          {!anonymise && (
                            <div className="w-8 h-8 rounded-full bg-light flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                              {initials(name)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-black truncate">{name}</p>
                            <p className="text-xs text-mid truncate">
                              {anonymise ? '' : `${r.candidate_email} - `}{new Date(r.submitted_at).toLocaleDateString('en-AU')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {r.rating !== null && r.rating !== undefined && (
                              <span className="text-xs font-bold text-warning">{r.rating}/5</span>
                            )}
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${pillCls}`}>
                              {statusLabel}
                            </span>
                            <svg className={`w-4 h-4 text-mid transition-transform ${expanded === r.id ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </button>
                      </div>

                      {expanded === r.id && (
                        <div className="border-t border-border bg-bg px-5 py-5 space-y-5">
                          {bookingsByResponse[r.id] && (
                            <a
                              href={bookingsByResponse[r.id].calendly_event_uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-white border border-border rounded-full px-3 py-1.5 text-xs font-bold text-black hover:bg-light transition-colors"
                            >
                              <span>&#128197;</span>
                              <span>Interview booked &mdash; {new Date(bookingsByResponse[r.id].event_start).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' })}</span>
                            </a>
                          )}
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setShareDialogFor(r.id)}
                              className="text-xs font-bold px-4 py-2 rounded-full border border-border bg-white text-black hover:bg-bg transition-colors"
                            >Share with hiring manager</button>
                          </div>
                          <div data-candidate-videos={r.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {session.questions.map((q, i) => (
                              <div key={i} className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
                                <div className="px-3 py-2 border-b border-border">
                                  <p className="text-xs text-mid font-bold truncate">
                                    <span className="text-accent mr-1.5">Q{i + 1}</span>
                                    {q}
                                  </p>
                                </div>
                                {r.video_ids[i] ? (
                                  anonymise ? (
                                    <div className="aspect-video bg-light flex flex-col items-center justify-center text-center px-4">
                                      <div className="text-2xl mb-1.5">🔒</div>
                                      <p className="text-xs text-mid font-bold">Video hidden</p>
                                      <p className="text-[11px] text-muted mt-0.5">
                                        Anonymise mode is on. Review the AI summary and scores below first, then turn anonymise off to watch.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="p-2">
                                      <VideoPlayer
                                        cloudflareUid={r.video_ids[i]}
                                        onTimeUpdate={(sec) =>
                                          setVideoTimeByResponse(prev => ({ ...prev, [r.id]: sec }))
                                        }
                                        seekToSec={videoSeekByResponse[r.id]}
                                        title={`${name} Q${i + 1}`}
                                      />
                                    </div>
                                  )
                                ) : (
                                  <div className="aspect-video bg-light flex items-center justify-center">
                                    <p className="text-xs text-mid">No response recorded</p>
                                  </div>
                                )}
                                {/* Per-question speech analysis - the
                                    Tier-1 multidimensional reading
                                    (pace, fillers, completion, vocab,
                                    pauses) computed from the Deepgram
                                    transcript filtered to this question.
                                    Hidden until at least one signal
                                    measures. */}
                                {(() => {
                                  const analysis = analyseSpeechForQuestion(transcriptByResponse[r.id] as any, i)
                                  return <SpeechAnalysisPanel analysis={analysis} density="tight" title={`Q${i + 1} speech analysis`} />
                                })()}
                              </div>
                            ))}
                          </div>

                          {/* Overall speech analysis for this response -
                              computed across the full transcript. Useful
                              for phone screens (single audio file) and
                              as a summary view alongside the AI
                              suggestion. */}
                          {(() => {
                            const fullText = transcriptTextByResponse[r.id] ?? ''
                            const utterances = (transcriptByResponse[r.id] ?? []) as any[]
                            const totalSec = utterances.reduce(
                              (acc: number, u: any) => acc + Math.max(0, (u.end ?? 0) - (u.start ?? 0)),
                              0,
                            )
                            if (!fullText || totalSec < 5) return null
                            const analysis = analyseSpeech({ transcript: fullText, seconds: totalSec, utterances })
                            return (
                              <SpeechAnalysisPanel
                                analysis={analysis}
                                density="roomy"
                                title="Overall speech analysis"
                                caption="Speech-only signals from the full transcript. Use as supporting evidence, not as a hiring score."
                              />
                            )
                          })()}

                          {evaluation ? (
                            <AiSuggestionCard
                              evaluation={evaluation}
                              alreadyReviewed={(r.status as string) === 'staff_reviewed'}
                              busy={decisionBusy}
                              onDecision={submitDecision}
                              anonymise={anonymise}
                              onQuoteClick={(sec) => setVideoSeekByResponse(prev => ({ ...prev, [r.id]: sec }))}
                            />
                          ) : ((r.status as string) === 'transcribing' || (r.status as string) === 'evaluating') ? (
                            <div className="bg-white rounded-2xl border border-border shadow-card px-5 py-4 flex items-center gap-3">
                              <span className="w-4 h-4 border-2 border-border border-t-black rounded-full animate-spin" />
                              <p className="text-sm text-mid">
                                {(r.status as string) === 'transcribing' ? 'Transcribing video...' : 'Generating AI suggestion...'}
                              </p>
                            </div>
                          ) : null}

                          <div>
                            <button
                              onClick={() => setTranscriptOpen(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                              className="text-xs font-bold text-accent hover:text-accent2 transition-colors"
                            >
                              {transcriptOpen[r.id] ? 'Hide transcript' : 'Show transcript'}
                            </button>
                            {transcriptOpen[r.id] && (
                              <div className="mt-2 space-y-3">
                                <TranscriptViewer
                                  utterances={transcriptByResponse[r.id] ?? []}
                                  currentTimeSec={videoTimeByResponse[r.id] ?? 0}
                                  onSeek={(sec) => setVideoSeekByResponse(prev => ({ ...prev, [r.id]: sec }))}
                                  highlightTimestampSec={videoSeekByResponse[r.id]}
                                />
                                {transcriptTextByResponse[r.id] && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => setTranscriptModal({ responseId: r.id, question: 'all' })}
                                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-black text-white hover:bg-charcoal transition-colors"
                                    >
                                      View full transcript
                                    </button>
                                    {Array.isArray(r.video_ids) && r.video_ids.length > 1 && r.video_ids.map((_uid: string, qi: number) => (
                                      <button
                                        key={qi}
                                        onClick={() => setTranscriptModal({ responseId: r.id, question: qi + 1 })}
                                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-light text-mid hover:bg-border transition-colors"
                                      >
                                        View Q{qi + 1}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <NotesPanel responseId={r.id} />

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-black">Rate candidate:</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(n => (
                                <button
                                  key={n}
                                  onClick={() => onPatchResponse(r.id, { rating: n, status: 'staff_reviewed' as any })}
                                  className={`text-2xl leading-none transition-colors ${(r.rating ?? 0) >= n ? 'text-warning' : 'text-light hover:text-warning/60'}`}
                                >
                                  *
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleShare(r.id)}
                              className="bg-accent hover:bg-accent2 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
                            >
                              Share with Client
                            </button>
                            <button
                              onClick={() => onPatchResponse(r.id, { status: 'staff_reviewed' as any })}
                              className="bg-white hover:bg-bg text-black text-xs font-bold px-4 py-2 rounded-full border border-border transition-colors"
                            >
                              Mark Reviewed
                            </button>
                          </div>

                          {shareUrls[r.id] && (
                            <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
                              <span className="text-xs text-mid flex-shrink-0 font-bold">Client link:</span>
                              <code className="flex-1 text-xs text-accent2 truncate font-mono">{shareUrls[r.id]}</code>
                              <button onClick={() => copyShareUrl(r.id)} className="text-xs text-mid hover:text-black font-bold flex-shrink-0 transition-colors">
                                {copying === r.id ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedIds.size >= 1 && (
        <BulkActionFooter
          selectedCount={selectedIds.size}
          selectedIds={Array.from(selectedIds)}
          onCompare={() => setCompareOpen(true)}
          onClear={clearSelection}
          onAfterBulk={() => { clearSelection(); setReloadCounter(c => c + 1) }}
        />
      )}

      {compareOpen && (
        <CompareView
          ids={Array.from(selectedIds)}
          anonymise={anonymise}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {shareDialogFor && expandedResponse && shareDialogFor === expandedResponse.id && (
        <ShareDialog
          responseId={expandedResponse.id}
          candidateName={expandedResponse.candidate_name}
          roleTitle={session.role_title}
          company={session.company}
          onClose={() => setShareDialogFor(null)}
        />
      )}

      {legendOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setLegendOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-card max-w-md w-full mx-4 p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-black uppercase tracking-widest">Keyboard Shortcuts</p>
              <button onClick={() => setLegendOpen(false)} className="text-mid hover:text-black text-lg leading-none">&times;</button>
            </div>
            <div className="divide-y divide-border">
              {RECRUIT_SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between py-2">
                  <span className="text-sm text-charcoal">{s.label}</span>
                  <kbd className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-light border border-border text-black">{s.key}</kbd>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-mid mt-3">Shortcuts are ignored while typing in a field.</p>
          </div>
        </div>
      )}

      {/* Transcript modal - branded preview + DOCX download */}
      {transcriptModal && (() => {
        const r = mergedResponses.find(x => x.id === transcriptModal.responseId)
        if (!r) return null
        const body = transcriptBody(transcriptModal.responseId, transcriptModal.question)
        const title = transcriptModal.question === 'all'
          ? 'Full transcript'
          : `Question ${transcriptModal.question}`
        return (
          <TranscriptModal
            open
            onClose={() => setTranscriptModal(null)}
            title={title}
            candidateName={r.candidate_name || 'Candidate'}
            roleTitle={session.role_title}
            text={body}
          />
        )
      })()}
    </div>
  )
}

// Generates the combined CV + Video Candidate Summary report for all
// responses that have at least an overall video score. Joins back to the
// CV scoring via the prescreen_session_id link set during batch-handoff.
function CandidateSummaryButton({ responses }: { responses: CandidateResponse[] }) {
  const [busy, setBusy] = useState(false)
  const eligible = responses.filter(r => typeof r.overall_score === 'number' || (r.rubric_scores && (r.rubric_scores as unknown[]).length > 0))
  if (eligible.length === 0) return null

  async function download() {
    setBusy(true)
    try {
      const res = await fetch('/api/recruit/candidate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_ids: eligible.map(r => r.id) }),
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
      a.download = m?.[1] ?? 'Candidate_Summary.docx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Summary failed: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
    setBusy(false)
  }

  return (
    <button
      onClick={download}
      disabled={busy}
      title="Download combined CV + Video Candidate Summary report"
      className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-charcoal disabled:opacity-50"
    >
      {busy ? 'Generating...' : `Candidate Summary (${eligible.length})`}
    </button>
  )
}
