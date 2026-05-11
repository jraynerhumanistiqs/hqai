'use client'
// Edit an existing custom rubric's criteria. Saving creates a NEW version
// (separate row in cv_custom_rubrics linked via parent_rubric_id) so any
// candidates already scored against the previous version stay bucketed
// under it - their cv_screenings rows continue to reference the old rubric
// row id.

import { useState } from 'react'
import type { Rubric, RubricCriterion } from '@/lib/cv-screening-types'

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
  rubric: CustomRubricRow
  onClose: () => void
  onSaved: (newVersion: CustomRubricRow) => void
}

type DraftCriterion = RubricCriterion & { _key: string }

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function toDraft(c: RubricCriterion): DraftCriterion {
  return { ...c, _key: uid() }
}

export default function EditRubricModal({ rubric, onClose, onSaved }: Props) {
  const [role, setRole] = useState(rubric.rubric.role)
  const [criteria, setCriteria] = useState<DraftCriterion[]>(
    rubric.rubric.criteria.map(toDraft),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weightTotal = criteria.reduce((acc, c) => acc + (Number(c.weight) || 0), 0)
  const weightOk = Math.abs(weightTotal - 1) <= 0.005

  function updateCriterion(key: string, patch: Partial<DraftCriterion>) {
    setCriteria(prev => prev.map(c => c._key === key ? { ...c, ...patch } : c))
  }

  function updateAnchor(key: string, level: '1' | '3' | '5', text: string) {
    setCriteria(prev => prev.map(c => {
      if (c._key !== key) return c
      return { ...c, anchors: { ...(c.anchors ?? {}), [level]: text } }
    }))
  }

  function addCriterion() {
    setCriteria(prev => [
      ...prev,
      {
        _key: uid(),
        id: `crit_${Date.now()}`,
        label: 'New criterion',
        weight: 0.1,
        type: 'ordinal_5',
        anchors: { '1': '', '3': '', '5': '' },
      },
    ])
  }

  function removeCriterion(key: string) {
    setCriteria(prev => prev.filter(c => c._key !== key))
  }

  function normaliseWeights() {
    const total = criteria.reduce((acc, c) => acc + (Number(c.weight) || 0), 0)
    if (total <= 0) return
    setCriteria(prev => prev.map(c => ({
      ...c,
      weight: Number(((Number(c.weight) || 0) / total).toFixed(3)),
    })))
  }

  async function save() {
    setError(null)
    if (criteria.length < 3) {
      setError('A rubric needs at least 3 criteria.')
      return
    }
    if (!weightOk) {
      setError(`Weights must sum to 1.00 (currently ${weightTotal.toFixed(3)}). Use "Normalise" to fix.`)
      return
    }
    // Sanity: every criterion needs an id and label.
    for (const c of criteria) {
      if (!c.id.trim() || !c.label.trim()) {
        setError('Every criterion needs an id and a label.')
        return
      }
    }

    setSaving(true)
    try {
      const hardGates = criteria.filter(c => c.hard_gate).map(c => c.id)
      const payload: Rubric = {
        ...rubric.rubric,
        role: role.trim() || rubric.rubric.role,
        criteria: criteria.map(({ _key, ...rest }) => rest),
        hard_gates: hardGates,
      }
      const res = await fetch(`/api/cv-screening/rubrics/${rubric.id}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubric: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      onSaved(data.rubric as CustomRubricRow)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-modal w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-charcoal uppercase tracking-wider">
              Edit rubric criteria
            </h2>
            <p className="text-xs text-muted mt-1">
              {rubric.label_family ?? rubric.label} - saving creates v{(rubric.version_number ?? 1) + 1}. Existing candidates stay on v{rubric.version_number ?? 1}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-mid hover:text-charcoal transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-bold text-mid uppercase tracking-wider mb-1.5">Role title</label>
            <input
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full text-sm text-charcoal bg-white border border-border rounded-lg px-3 py-2 outline-none focus:border-black"
              maxLength={80}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-mid uppercase tracking-wider">Criteria</p>
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-bold ${weightOk ? 'text-success' : 'text-warning'}`}>
                  Total weight: {weightTotal.toFixed(3)}
                </span>
                <button
                  onClick={normaliseWeights}
                  className="bg-light hover:bg-border text-charcoal text-xs font-bold rounded-full px-3 py-1"
                >
                  Normalise to 1.00
                </button>
              </div>
            </div>

            {criteria.map((c) => (
              <div key={c._key} className="border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Label</label>
                      <input
                        value={c.label}
                        onChange={e => updateCriterion(c._key, { label: e.target.value })}
                        className="w-full text-sm text-charcoal bg-white border border-border rounded-lg px-2 py-1.5 outline-none focus:border-black"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">ID (snake_case)</label>
                      <input
                        value={c.id}
                        onChange={e => updateCriterion(c._key, { id: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase() })}
                        className="w-full text-xs text-charcoal bg-white border border-border rounded-lg px-2 py-1.5 outline-none focus:border-black font-mono"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Weight</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={c.weight}
                        onChange={e => updateCriterion(c._key, { weight: Number(e.target.value) })}
                        className="w-full text-sm text-charcoal bg-white border border-border rounded-lg px-2 py-1.5 outline-none focus:border-black"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeCriterion(c._key)}
                    title="Remove criterion"
                    className="mt-5 w-7 h-7 rounded-full text-mid hover:bg-danger/10 hover:text-danger flex items-center justify-center flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Type</label>
                    <select
                      value={c.type}
                      onChange={e => updateCriterion(c._key, { type: e.target.value as 'ordinal_5' | 'binary' })}
                      className="w-full text-sm text-charcoal bg-white border border-border rounded-lg px-2 py-1.5 outline-none focus:border-black"
                    >
                      <option value="ordinal_5">Ordinal (1-5)</option>
                      <option value="binary">Binary</option>
                    </select>
                  </div>
                  <div className="sm:col-span-9 flex items-center gap-4 sm:pt-5">
                    <label className="inline-flex items-center gap-1.5 text-xs text-mid">
                      <input
                        type="checkbox"
                        checked={!!c.hard_gate}
                        onChange={e => updateCriterion(c._key, { hard_gate: e.target.checked })}
                        className="accent-black"
                      />
                      Hard gate (e.g. work rights)
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-mid">
                      <input
                        type="checkbox"
                        checked={!!c.evidence_required}
                        onChange={e => updateCriterion(c._key, { evidence_required: e.target.checked })}
                        className="accent-black"
                      />
                      Evidence required
                    </label>
                  </div>
                </div>

                {c.type === 'ordinal_5' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['1', '3', '5'] as const).map(level => (
                      <div key={level}>
                        <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Anchor {level}/5</label>
                        <input
                          value={c.anchors?.[level] ?? ''}
                          onChange={e => updateAnchor(c._key, level, e.target.value)}
                          placeholder={level === '1' ? 'Low - no evidence' : level === '3' ? 'Mid - some evidence' : 'High - strong evidence'}
                          className="w-full text-xs text-charcoal bg-white border border-border rounded-lg px-2 py-1.5 outline-none focus:border-black"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addCriterion}
              className="w-full border-2 border-dashed border-border hover:border-mid hover:bg-light rounded-2xl py-3 text-sm font-bold text-mid hover:text-charcoal transition-colors"
            >
              + Add criterion
            </button>
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted leading-tight">
            Saving creates a new version. Existing scored candidates stay under v{rubric.version_number ?? 1}.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm font-bold text-mid hover:text-charcoal px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="bg-black hover:bg-charcoal text-white text-sm font-bold rounded-full px-5 py-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : `Save as v${(rubric.version_number ?? 1) + 1}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
