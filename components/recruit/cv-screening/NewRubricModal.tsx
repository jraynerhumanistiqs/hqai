'use client'
import { useRef, useState } from 'react'
import type { Rubric } from '@/lib/cv-screening-types'

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
   *  explanatory banner at the top of the input stage so the
   *  recruiter knows the draft criteria came from their just-built
   *  brief and that they can edit anything before saving. */
  fromCampaignCoach?: boolean
}

export default function NewRubricModal({ onClose, onCreated, initialLabel, initialJd, fromCampaignCoach = false }: Props) {
  const [label, setLabel] = useState(initialLabel ?? '')
  const [jd, setJd] = useState(initialJd ?? '')
  const [stage, setStage] = useState<'input' | 'reviewing'>('input')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftRubric, setDraftRubric] = useState<Rubric | null>(null)
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
      setError('Add a label and the job description')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // Backend takes either source_jd or rubric. We send source_jd in the
      // first call, get the AI-suggested rubric back, let the user tweak,
      // then send the edited rubric in the save call.
      const res = await fetch('/api/cv-screening/suggest-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_jd: jd, label }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setDraftRubric(data.rubric as Rubric)
      setStage('reviewing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suggest rubric')
    }
    setBusy(false)
  }

  async function save() {
    if (!draftRubric) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/cv-screening/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, source_jd: jd, rubric: draftRubric }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      onCreated(data.rubric as SavedRubric)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save rubric')
    }
    setBusy(false)
  }

  function updateCriterionWeight(id: string, weight: number) {
    if (!draftRubric) return
    const next = {
      ...draftRubric,
      criteria: draftRubric.criteria.map(c => c.id === id ? { ...c, weight } : c),
    }
    setDraftRubric(next)
  }

  function removeCriterion(id: string) {
    if (!draftRubric) return
    setDraftRubric({ ...draftRubric, criteria: draftRubric.criteria.filter(c => c.id !== id) })
  }

  function updateCriterionLabel(id: string, label: string) {
    if (!draftRubric) return
    setDraftRubric({
      ...draftRubric,
      criteria: draftRubric.criteria.map(c => c.id === id ? { ...c, label } : c),
    })
  }

  function addCriterion() {
    if (!draftRubric) return
    const newId = `custom_${Date.now().toString(36)}`
    setDraftRubric({
      ...draftRubric,
      criteria: [
        ...draftRubric.criteria,
        {
          id: newId,
          label: 'New criterion',
          weight: 0.10,
          type: 'ordinal_5' as const,
        },
      ],
    })
  }

  const totalWeight = draftRubric?.criteria.reduce((acc, c) => acc + c.weight, 0) ?? 0
  const weightOff = Math.abs(totalWeight - 1) > 0.01

  return (
    <div
      className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="bg-bg-elevated w-full max-w-2xl rounded-3xl border border-border ring-1 ring-ink/5 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-bg-elevated z-10">
          <h3 className="font-display text-h3 font-bold text-charcoal">
            {stage === 'input' ? 'New rubric' : 'Review and adjust'}
          </h3>
          <button
            onClick={() => !busy && onClose()}
            className="min-h-touch min-w-touch rounded-full hover:bg-light flex items-center justify-center text-mid text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {stage === 'input' && fromCampaignCoach && (
            <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">
                From your Campaign Coach brief
              </p>
              <p className="text-sm text-charcoal leading-relaxed">
                We&apos;ve drafted your scoring criteria from the role and ad you just finalised. Review the label and job description below, then click <span className="font-bold">Suggest criteria</span> to generate the rubric. Edit anything that needs adjusting before you save - this is the source of truth for how each CV is judged.
              </p>
            </div>
          )}
          {stage === 'input' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Rubric label
                </label>
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Senior Project Manager (Construction, Brisbane)"
                  className="w-full bg-light text-sm text-charcoal rounded-full px-4 py-2 outline-none focus:bg-bg-elevated focus:ring-1 focus:ring-charcoal"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
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
                    pdDragOver ? 'border-charcoal bg-light' : 'border-border hover:border-mid hover:bg-light'
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
                  <p className="text-xs font-bold text-charcoal mb-0.5">
                    {pdParsing ? 'Reading document...' : 'Want to use a different reference source?'}
                  </p>
                  <p className="text-[11px] text-muted">
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
                  className="w-full bg-light text-sm text-charcoal rounded-2xl px-4 py-3 outline-none focus:bg-bg-elevated focus:ring-1 focus:ring-charcoal resize-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="bg-danger/10 text-danger text-sm rounded-2xl px-4 py-3">{error}</div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  disabled={busy}
                  className="flex-1 bg-bg-elevated border border-border text-charcoal text-sm font-bold rounded-full px-4 py-2.5 hover:bg-light disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={suggest}
                  disabled={busy || !jd.trim() || !label.trim()}
                  className="flex-1 bg-accent text-ink-on-accent text-sm font-bold rounded-full px-4 py-2.5 hover:bg-accent-hover disabled:opacity-50"
                >
                  {busy ? 'Generating...' : 'Suggest rubric'}
                </button>
              </div>
            </>
          )}

          {stage === 'reviewing' && draftRubric && (
            <>
              <div className="bg-light rounded-2xl px-4 py-3">
                <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                  Suggested for
                </p>
                <p className="text-sm font-bold text-charcoal">{draftRubric.role}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                  Criteria - tweak weights if you want
                </p>
                <ul className="space-y-3">
                  {draftRubric.criteria.map(c => (
                    <li key={c.id} className="bg-light rounded-2xl px-4 py-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <input
                            value={c.label}
                            onChange={e => updateCriterionLabel(c.id, e.target.value)}
                            className="text-sm font-bold text-charcoal bg-transparent border-b border-transparent focus:border-charcoal outline-none w-full"
                          />
                          {c.hard_gate && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning rounded-full px-2 py-0.5">
                              Consideration
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeCriterion(c.id)}
                          className="text-xs text-mid hover:text-danger flex-shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={0.4}
                          step={0.01}
                          value={c.weight}
                          onChange={e => updateCriterionWeight(c.id, Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs font-bold text-charcoal w-12 text-right">
                          {Math.round(c.weight * 100)}%
                        </span>
                      </div>
                      {c.anchors?.['3'] && (
                        <p className="text-xs text-mid mt-2 leading-relaxed">
                          Score 3: {c.anchors['3']}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={addCriterion}
                  className="mt-3 w-full bg-bg-elevated border border-dashed border-border text-charcoal text-sm font-bold rounded-2xl px-4 py-3 hover:bg-light hover:border-charcoal"
                >
                  + Add criterion
                </button>
              </div>

              <div className={`rounded-2xl px-4 py-3 text-sm ${weightOff ? 'bg-warning/10 text-warning' : 'bg-light text-mid'}`}>
                Total weight: <strong>{Math.round(totalWeight * 100)}%</strong>
                {weightOff && ' - the system normalises this to 100% automatically when scoring.'}
              </div>

              {error && (
                <div className="bg-danger/10 text-danger text-sm rounded-2xl px-4 py-3">{error}</div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStage('input')}
                  disabled={busy}
                  className="bg-bg-elevated border border-border text-charcoal text-sm font-bold rounded-full px-4 py-2.5 hover:bg-light disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={save}
                  disabled={busy || !draftRubric.criteria.length}
                  className="flex-1 bg-accent text-ink-on-accent text-sm font-bold rounded-full px-4 py-2.5 hover:bg-accent-hover disabled:opacity-50"
                >
                  {busy ? 'Saving...' : 'Save and use this rubric'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
