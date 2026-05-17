'use client'
import { useState } from 'react'
import type { PrescreenSession, RubricDimension, RubricMode } from '@/lib/recruit-types'
import { RubricEditor } from './RubricEditor'

interface Props {
  session: PrescreenSession
  onClose: () => void
  onSaved: (updated: PrescreenSession) => void
}

const inputCls = 'w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder-mid/60 focus:outline-none focus:border-accent/60 bg-white transition-colors'

function initialRubric(session: PrescreenSession): RubricDimension[] {
  const cur = Array.isArray(session.custom_rubric) ? session.custom_rubric : []
  const cleaned = cur.map(d => ({ name: d?.name ?? '', description: d?.description ?? '' }))
  if (cleaned.length >= 3) return cleaned
  const padded = [...cleaned]
  while (padded.length < 3) padded.push({ name: '', description: '' })
  return padded
}

export function EditRoleModal({ session, onClose, onSaved }: Props) {
  const [company, setCompany]       = useState(session.company)
  const [roleTitle, setRoleTitle]   = useState(session.role_title)
  const [questions, setQuestions]   = useState<string[]>(session.questions ?? [])
  const [minutes, setMinutes]       = useState(Math.floor((session.time_limit_seconds ?? 90) / 60))
  const [seconds, setSeconds]       = useState((session.time_limit_seconds ?? 90) % 60)
  const [rubricMode, setRubricMode] = useState<RubricMode>(session.rubric_mode ?? 'standard')
  const [customRubric, setCustomRubric] = useState<RubricDimension[]>(() => initialRubric(session))
  const [saving, setSaving]         = useState(false)
  const [rescoring, setRescoring]   = useState(false)
  const [statusMsg, setStatusMsg]   = useState('')
  const [error, setError]           = useState('')

  const timeLimit = Math.max(10, Math.min(600, minutes * 60 + seconds))

  function updateQ(i: number, val: string) {
    setQuestions(prev => { const next = [...prev]; next[i] = val; return next })
  }
  function removeQ(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i))
  }
  function addQ() {
    setQuestions(prev => [...prev, ''])
  }
  function updateMinutes(v: number) {
    if (!Number.isFinite(v)) v = 0
    setMinutes(Math.max(0, Math.min(10, Math.floor(v))))
  }
  function updateSeconds(v: number) {
    if (!Number.isFinite(v)) v = 0
    setSeconds(Math.max(0, Math.min(59, Math.floor(v))))
  }

  function rubricChanged(): boolean {
    const prevMode = session.rubric_mode ?? 'standard'
    if (prevMode !== rubricMode) return true
    if (rubricMode !== 'custom') return false
    const prev = Array.isArray(session.custom_rubric) ? session.custom_rubric : []
    const cleaned = customRubric.filter(d => d.name.trim() && d.description.trim())
    if (prev.length !== cleaned.length) return true
    for (let i = 0; i < cleaned.length; i++) {
      if ((prev[i]?.name ?? '') !== cleaned[i].name) return true
      if ((prev[i]?.description ?? '') !== cleaned[i].description) return true
    }
    return false
  }

  async function handleSave() {
    const filled = questions.filter(q => q.trim())
    if (!company.trim() || !roleTitle.trim()) { setError('Please enter company and role title.'); return }
    if (!filled.length) { setError('Please add at least one question.'); return }

    let customRubricPayload: RubricDimension[] | null = null
    if (rubricMode === 'custom') {
      const cleaned = customRubric
        .map(d => ({ name: d.name.trim(), description: d.description.trim() }))
        .filter(d => d.name && d.description)
      if (cleaned.length < 3 || cleaned.length > 6) {
        setError('Custom scoring criteria needs 3-6 dimensions, each with a name and description.')
        return
      }
      customRubricPayload = cleaned
    }

    setError('')
    setStatusMsg('')
    const willRescore = rubricChanged()
    setSaving(true)
    try {
      const res = await fetch(`/api/prescreen/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          role_title: roleTitle.trim(),
          questions: filled,
          time_limit_seconds: timeLimit,
          rubric_mode: rubricMode,
          custom_rubric: customRubricPayload,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Save failed')
      const updated = data.session as PrescreenSession
      onSaved(updated)

      if (willRescore) {
        setSaving(false)
        setRescoring(true)
        setStatusMsg('Saving - re-scoring candidates with the new criteria…')
        try {
          const rsRes = await fetch(`/api/prescreen/sessions/${session.id}/rescore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          const rsData = await rsRes.json().catch(() => ({}))
          if (!rsRes.ok) {
            setStatusMsg(`Rubric saved, but rescore failed: ${rsData?.error ?? `HTTP ${rsRes.status}`}`)
          } else if (rsData.queued === 0) {
            setStatusMsg('Done - no scored candidates to re-score yet.')
          } else if ((rsData.errors?.length ?? 0) > 0) {
            setStatusMsg(`Done - ${rsData.queued - rsData.errors.length}/${rsData.queued} candidates re-scored. ${rsData.errors.length} failed.`)
          } else {
            setStatusMsg(`Done - ${rsData.queued} candidate${rsData.queued === 1 ? '' : 's'} re-scored.`)
          }
        } catch (e) {
          setStatusMsg(`Rubric saved, but rescore failed: ${(e as Error).message}`)
        } finally {
          setRescoring(false)
        }
        setTimeout(() => onClose(), 1200)
      } else {
        onClose()
      }
    } catch {
      setError('Failed to save changes. Please try again.')
      setSaving(false)
      setRescoring(false)
    }
  }

  const busy = saving || rescoring

  return (
    <div
      className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-modal w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">Edit Role</h2>
            <p className="text-sm text-mid mt-0.5">Update role details, questions, scoring criteria, or time limit</p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-mid hover:text-ink disabled:opacity-40"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 max-h-[65vh] overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">Company</label>
              <input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">Role Title</label>
              <input className={inputCls} value={roleTitle} onChange={e => setRoleTitle(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">
              Time per Answer
              <span className="text-mid font-normal ml-1">
                ({timeLimit < 60 ? `${timeLimit}s` : `${Math.floor(timeLimit / 60)}m${timeLimit % 60 ? ` ${timeLimit % 60}s` : ''}`})
              </span>
            </label>
            <div className="flex items-center gap-2 max-w-xs">
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={10}
                  className={inputCls}
                  value={minutes}
                  onChange={e => updateMinutes(Number(e.target.value))}
                  aria-label="Minutes"
                />
                <span className="text-xs text-mid">min</span>
              </div>
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={59}
                  className={inputCls}
                  value={seconds}
                  onChange={e => updateSeconds(Number(e.target.value))}
                  aria-label="Seconds"
                />
                <span className="text-xs text-mid">sec</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">Questions</label>
            <div className="space-y-2.5">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2.5 group">
                  <span className="text-xs font-bold text-mid w-6 flex-shrink-0 text-right">Q{i + 1}</span>
                  <input
                    className={`${inputCls} flex-1`}
                    value={q}
                    onChange={e => updateQ(i, e.target.value)}
                    placeholder="Enter question…"
                  />
                  <button
                    onClick={() => removeQ(i)}
                    className="text-mid hover:text-danger transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Remove question"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={addQ}
                className="text-xs text-accent hover:text-accent2 font-bold transition-colors mt-1"
              >
                + Add question
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <RubricEditor
              mode={rubricMode}
              dimensions={customRubric}
              onModeChange={setRubricMode}
              onDimensionsChange={setCustomRubric}
              inputClassName={inputCls}
            />
            <p className="text-[10px] text-mid mt-2">
              Saving rubric changes re-scores every candidate with a transcript. Existing ratings, stages, and notes are preserved.
            </p>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
          {statusMsg && <p className="text-xs text-charcoal">{statusMsg}</p>}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-border flex items-center justify-end gap-3 bg-bg/50">
          <button
            onClick={onClose}
            disabled={busy}
            className="text-sm text-mid hover:text-ink font-bold transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="bg-accent hover:bg-accent2 disabled:opacity-40 text-white text-base font-bold px-6 py-3 rounded-full transition-colors flex items-center gap-2"
          >
            {rescoring ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Re-scoring…
              </>
            ) : saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}