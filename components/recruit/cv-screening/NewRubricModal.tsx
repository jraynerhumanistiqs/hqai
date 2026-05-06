'use client'
import { useState } from 'react'
import type { Rubric, RubricCriterion } from '@/lib/cv-screening-types'

interface SavedRubric {
  id: string
  label: string
  rubric: Rubric
  created_at: string
}

interface Props {
  onClose: () => void
  onCreated: (saved: SavedRubric) => void
}

export default function NewRubricModal({ onClose, onCreated }: Props) {
  const [label, setLabel] = useState('')
  const [jd, setJd] = useState('')
  const [stage, setStage] = useState<'input' | 'reviewing'>('input')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftRubric, setDraftRubric] = useState<Rubric | null>(null)

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

  const totalWeight = draftRubric?.criteria.reduce((acc, c) => acc + c.weight, 0) ?? 0
  const weightOff = Math.abs(totalWeight - 1) > 0.01

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-card max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-display text-h3 font-bold text-charcoal">
            {stage === 'input' ? 'New rubric' : 'Review and adjust'}
          </h3>
          <button
            onClick={() => !busy && onClose()}
            className="w-8 h-8 rounded-full hover:bg-light flex items-center justify-center text-mid text-lg"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
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
                  className="w-full bg-light text-sm text-charcoal rounded-full px-4 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Job description
                </label>
                <textarea
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                  placeholder="Paste the job ad, position description, or your passive-search brief. The AI will pull out the criteria that matter most and weight them for you."
                  rows={10}
                  className="w-full bg-light text-sm text-charcoal rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-1 focus:ring-charcoal resize-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="bg-danger/10 text-danger text-sm rounded-2xl px-4 py-3">{error}</div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  disabled={busy}
                  className="flex-1 bg-white border border-border text-charcoal text-sm font-bold rounded-full px-4 py-2.5 hover:bg-light disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={suggest}
                  disabled={busy || !jd.trim() || !label.trim()}
                  className="flex-1 bg-black text-white text-sm font-bold rounded-full px-4 py-2.5 hover:bg-charcoal disabled:opacity-50"
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
                          <p className="text-sm font-bold text-charcoal">{c.label}</p>
                          {c.hard_gate && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning rounded-full px-2 py-0.5">
                              Hard gate
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeCriterion(c.id)}
                          className="text-xs text-mid hover:text-danger"
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
                  className="bg-white border border-border text-charcoal text-sm font-bold rounded-full px-4 py-2.5 hover:bg-light disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={save}
                  disabled={busy || !draftRubric.criteria.length}
                  className="flex-1 bg-black text-white text-sm font-bold rounded-full px-4 py-2.5 hover:bg-charcoal disabled:opacity-50"
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
