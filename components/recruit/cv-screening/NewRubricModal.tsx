'use client'
// Create new scoring criteria. Stage 1 ('input'): paste a job ad / upload
// a PD; the AI drafts a weighted criteria set. Stage 2 ('reviewing'): the
// user lands in the FULL criteria editor (CriteriaEditor.tsx - the same
// surface EditRubricModal uses) prefilled with the AI recommendation.
// The common path is "AI recommended set -> Save" with zero edits; the
// per-criterion power controls live behind each card's Advanced settings.

import { useRef, useState } from 'react'
import type { Rubric } from '@/lib/cv-screening-types'
import CriteriaEditor, {
  type DraftCriterion,
  toDraft,
  draftsToCriteria,
  validateCriteriaDraft,
} from './CriteriaEditor'

interface SavedRubric {
  id: string
  label: string
  rubric: Rubric
  created_at: string
}

interface Props {
  onClose: () => void
  onCreated: (saved: SavedRubric) => void
  /** Optional pre-fill - used by the Campaign Coach handoff flow so
   *  the recruiter only has to review / save instead of retyping the
   *  role title and JD they already entered in the wizard. */
  initialLabel?: string
  initialJd?: string
  /** True when the modal was opened from the Campaign Coach -> CV
   *  Scoring Agent handoff (Step 5 "Finalise Campaign"). Shows an
   *  explanatory banner so the recruiter knows the draft criteria came
   *  from their just-built brief and that they can edit anything
   *  before saving. */
  fromCampaignCoach?: boolean
}

export default function NewRubricModal({ onClose, onCreated, initialLabel, initialJd, fromCampaignCoach = false }: Props) {
  const [label, setLabel] = useState(initialLabel ?? '')
  const [jd, setJd] = useState(initialJd ?? '')
  const [stage, setStage] = useState<'input' | 'reviewing'>('input')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The AI draft, split into the full-editor state shape: the base rubric
  // (ids/version/etc), an editable role title and editable criteria.
  const [draftRubric, setDraftRubric] = useState<Rubric | null>(null)
  const [draftRole, setDraftRole] = useState('')
  const [draftCriteria, setDraftCriteria] = useState<DraftCriterion[]>([])
  // PD upload state - drag-and-drop populates the JD textarea so the
  // recruiter doesn't have to copy-paste from Word / Adobe / Notion.
  // The textarea stays the source of truth so they can still tweak
  // after the file is parsed.
  const [pdDragOver, setPdDragOver] = useState(false)
  const [pdParsing, setPdParsing] = useState(false)
  const [pdSourceName, setPdSourceName] = useState<string | null>(null)
  const pdFileInput = useRef<HTMLInputElement | null>(null)

  async function handlePdFile(file: File) {
    setError(null)
    setPdParsing(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/cv-screening/parse-pd', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setJd(prev => prev.trim() ? `${prev.trim()}\n\n${data.text}` : data.text)
      setPdSourceName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that PD')
    }
    setPdParsing(false)
  }

  async function suggest() {
    if (!jd.trim() || !label.trim()) {
      setError('Add a name and the job description')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // Backend takes either source_jd or rubric. We send source_jd in the
      // first call, get the AI-suggested rubric back, let the user review
      // it in the full editor, then send the (possibly edited) rubric in
      // the save call.
      const res = await fetch('/api/cv-screening/suggest-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_jd: jd, label }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const rubric = data.rubric as Rubric
      setDraftRubric(rubric)
      setDraftRole(rubric.role)
      setDraftCriteria(rubric.criteria.map(toDraft))
      setStage('reviewing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suggest criteria')
    }
    setBusy(false)
  }

  async function save() {
    if (!draftRubric) return
    setError(null)
    const invalid = validateCriteriaDraft(draftCriteria)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    try {
      const hardGates = draftCriteria.filter(c => c.hard_gate).map(c => c.id)
      const rubric: Rubric = {
        ...draftRubric,
        role: draftRole.trim() || draftRubric.role,
        criteria: draftsToCriteria(draftCriteria),
        hard_gates: hardGates,
      }
      const res = await fetch('/api/cv-screening/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, source_jd: jd, rubric }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      onCreated(data.rubric as SavedRubric)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the criteria')
    }
    setBusy(false)
  }

  return (
    <div
      className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className={`bg-bg-elevated w-full ${stage === 'reviewing' ? 'max-w-4xl' : 'max-w-2xl'} rounded-3xl border border-border ring-1 ring-ink/5 shadow-2xl max-h-[92vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 sm:px-8 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <h3 className="font-display text-h3 font-bold text-ink">
            {stage === 'input' ? 'New scoring criteria' : 'Review your scoring criteria'}
          </h3>
          <button
            onClick={() => !busy && onClose()}
            className="min-h-touch min-w-touch rounded-full hover:bg-bg-soft flex items-center justify-center text-ink-soft text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {stage === 'input' && (
          <div className="px-5 sm:px-8 py-5 space-y-4 overflow-y-auto">
            {fromCampaignCoach && (
              <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">
                  From your Campaign Coach brief
                </p>
                <p className="text-sm text-ink leading-relaxed">
                  We&apos;ve carried over the role and ad you just finalised. Review the name and job description below, then click <span className="font-bold">Suggest criteria</span> - the AI drafts the scoring criteria and you land in the full editor to check them before saving.
                </p>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                Criteria name
              </label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Senior Project Manager (Construction, Brisbane)"
                className="w-full bg-bg-soft text-sm text-ink rounded-full px-4 py-2 outline-none focus:bg-bg-elevated focus:ring-1 focus:ring-ink"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                Job description
              </label>

              {/* Drop zone for PD/JD file upload. Same visual idiom as
                  the CV dropzone on the main page so the experience is
                  consistent. After parse, text lands in the textarea
                  below and the user can edit before clicking Suggest. */}
              <label
                onDragOver={e => { e.preventDefault(); setPdDragOver(true) }}
                onDragLeave={() => setPdDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setPdDragOver(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) handlePdFile(f)
                }}
                className={`block border-2 border-dashed rounded-2xl px-4 py-5 text-center cursor-pointer transition-colors mb-2 ${
                  pdDragOver ? 'border-ink bg-bg-soft' : 'border-border hover:border-ink-soft hover:bg-bg-soft'
                } ${pdParsing ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <input
                  ref={pdFileInput}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handlePdFile(f)
                    e.target.value = ''
                  }}
                />
                <p className="text-xs font-bold text-ink mb-0.5">
                  {pdParsing ? 'Reading document...' : 'Want to use a different reference source?'}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {pdSourceName
                    ? `Loaded from ${pdSourceName}. Edit the text below if you need to.`
                    : 'Drag a document in, or click here to upload from a folder. PDF, DOCX or plain text - or just paste it into the box below.'}
                </p>
              </label>

              <textarea
                value={jd}
                onChange={e => setJd(e.target.value)}
                placeholder="Paste the job ad, position description, or your passive-search brief. The AI will pull out the criteria that matter most and weight them for you."
                rows={10}
                className="w-full bg-bg-soft text-sm text-ink rounded-2xl px-4 py-3 outline-none focus:bg-bg-elevated focus:ring-1 focus:ring-ink resize-none leading-relaxed"
              />
            </div>

            {error && (
              <div className="bg-danger/10 text-danger text-sm rounded-2xl px-4 py-3">{error}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 bg-bg-elevated border border-border text-ink text-sm font-bold rounded-full px-4 py-2.5 hover:bg-bg-soft disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={suggest}
                disabled={busy || !jd.trim() || !label.trim()}
                className="flex-1 bg-accent text-ink-on-accent text-sm font-bold rounded-full px-4 py-2.5 hover:bg-accent-hover disabled:opacity-50"
              >
                {busy ? 'Drafting your criteria...' : 'Suggest criteria'}
              </button>
            </div>
          </div>
        )}

        {stage === 'reviewing' && draftRubric && (
          <CriteriaEditor
            role={draftRole}
            onRoleChange={setDraftRole}
            criteria={draftCriteria}
            onCriteriaChange={setDraftCriteria}
            intro={
              <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">
                  {fromCampaignCoach ? 'Drafted from your Campaign Coach brief' : 'AI recommended criteria'}
                </p>
                <p className="text-sm text-ink leading-relaxed">
                  The AI has read your job description and drafted a weighted set of criteria. Most people save it as-is - if you want to fine-tune how a criterion is judged, open its <span className="font-bold">Advanced settings</span>.
                </p>
              </div>
            }
            error={error}
            saving={busy}
            saveLabel="Save and use these criteria"
            onSave={save}
            onCancel={() => { setError(null); setStage('input') }}
            cancelLabel="Back"
            footerNote="Saved to your criteria library so you can reuse it for future roles."
          />
        )}
      </div>
    </div>
  )
}
