'use client'
// Shared full criteria editor - the ONE editing surface for scoring
// criteria. Used by BOTH EditRubricModal (edit -> saves a new version)
// and NewRubricModal's review stage (AI draft -> create), so creating
// and editing criteria always look and behave identically no matter
// where the user came from (CV Scoring Agent, Campaign Coach handoff).
//
// Hand-holding by default: the common path is "AI recommended set ->
// Save" with zero edits. Criterion name + importance share stay visible;
// the power controls (scoring style, eligibility check, evidence rule,
// level guides) sit behind a collapsed "Advanced settings" disclosure on
// each criterion so novices are never confronted with them.
//
// Layout contract: the parent modal is a `flex flex-col max-h-[90vh]`
// container with its own header; this component renders the scrollable
// body plus a footer that never scrolls away (weight total, Auto-balance
// and the Save CTA are always in reach).

import type { ReactNode } from 'react'
import type { RubricCriterion } from '@/lib/cv-screening-types'

export type DraftCriterion = RubricCriterion & { _key: string }

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function toDraft(c: RubricCriterion): DraftCriterion {
  return { ...c, _key: uid() }
}

export function newDraftCriterion(): DraftCriterion {
  return {
    _key: uid(),
    id: `crit_${Date.now()}`,
    label: 'New criterion',
    weight: 0.1,
    type: 'ordinal_5',
    anchors: { '1': '', '3': '', '5': '' },
  }
}

export function draftsToCriteria(drafts: DraftCriterion[]): RubricCriterion[] {
  return drafts.map(({ _key, ...rest }) => rest)
}

// Shared pre-save validation so both modals surface identical messages.
export function validateCriteriaDraft(criteria: DraftCriterion[]): string | null {
  if (criteria.length < 3) return 'You need at least 3 criteria.'
  const total = criteria.reduce((acc, c) => acc + (Number(c.weight) || 0), 0)
  if (Math.abs(total - 1) > 0.005) {
    return `The importance shares need to add up to 100% (currently ${Math.round(total * 100)}%). Use "Auto-balance" to fix.`
  }
  for (const c of criteria) {
    if (!c.label.trim()) return 'Every criterion needs a name.'
  }
  return null
}

export function normaliseDraftWeights(criteria: DraftCriterion[]): DraftCriterion[] {
  const total = criteria.reduce((acc, c) => acc + (Number(c.weight) || 0), 0)
  if (total <= 0) return criteria
  return criteria.map(c => ({
    ...c,
    weight: Number(((Number(c.weight) || 0) / total).toFixed(3)),
  }))
}

interface Props {
  role: string
  onRoleChange: (v: string) => void
  criteria: DraftCriterion[]
  onCriteriaChange: (next: DraftCriterion[]) => void
  /** Optional banner rendered above the form (e.g. "AI drafted these"). */
  intro?: ReactNode
  error: string | null
  saving: boolean
  saveLabel: string
  savingLabel?: string
  onSave: () => void
  onCancel: () => void
  cancelLabel?: string
  /** Small note beside the footer actions (e.g. versioning explainer). */
  footerNote?: string
}

export default function CriteriaEditor({
  role,
  onRoleChange,
  criteria,
  onCriteriaChange,
  intro,
  error,
  saving,
  saveLabel,
  savingLabel = 'Saving...',
  onSave,
  onCancel,
  cancelLabel = 'Cancel',
  footerNote,
}: Props) {
  const weightTotal = criteria.reduce((acc, c) => acc + (Number(c.weight) || 0), 0)
  const weightOk = Math.abs(weightTotal - 1) <= 0.005

  function update(key: string, patch: Partial<DraftCriterion>) {
    onCriteriaChange(criteria.map(c => c._key === key ? { ...c, ...patch } : c))
  }

  function updateAnchor(key: string, level: '1' | '3' | '5', text: string) {
    onCriteriaChange(criteria.map(c => {
      if (c._key !== key) return c
      return { ...c, anchors: { ...(c.anchors ?? {}), [level]: text } }
    }))
  }

  return (
    <>
      {/* Scrollable body - controls are never clipped; the footer below
          stays put so Save is always in reach. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-6 space-y-6">
        {intro}

        <div>
          <label htmlFor="criteria-editor-role" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">
            Role title
          </label>
          <input
            id="criteria-editor-role"
            value={role}
            onChange={e => onRoleChange(e.target.value)}
            className="w-full max-w-lg text-sm text-ink bg-bg-elevated border border-border rounded-full px-4 py-2.5 outline-none focus:border-ink"
            maxLength={80}
          />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink">What each CV is scored on</h3>
            <p className="text-xs text-ink-soft mt-0.5 leading-relaxed max-w-2xl">
              Every candidate gets a score for each item below, weighted by its importance share. Happy with the set? Just save it - you can fine-tune how any item is judged under its Advanced settings.
            </p>
          </div>

          {criteria.map(c => (
            <div key={c._key} className="bg-bg-soft/50 border border-border rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">Criterion name</label>
                    <input
                      value={c.label}
                      onChange={e => update(c._key, {
                        label: e.target.value,
                        // Auto-generate the internal id from the label so
                        // the user never thinks about snake_case ids.
                        id: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || c.id,
                      })}
                      placeholder="e.g. Customer service skills"
                      className="w-full text-sm text-ink bg-bg-elevated border border-border rounded-xl px-3 py-2 outline-none focus:border-ink"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">Importance share</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={Math.round((Number(c.weight) || 0) * 100)}
                        onChange={e => update(c._key, { weight: Math.max(0, Math.min(100, Number(e.target.value))) / 100 })}
                        className="w-full text-sm text-ink bg-bg-elevated border border-border rounded-xl px-3 py-2 outline-none focus:border-ink"
                      />
                      <span className="text-xs text-ink-muted">%</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onCriteriaChange(criteria.filter(x => x._key !== c._key))}
                  title="Remove this criterion"
                  aria-label={`Remove criterion - ${c.label || 'unnamed'}`}
                  className="mt-5 w-8 h-8 rounded-full text-ink-soft hover:bg-danger/10 hover:text-danger flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>

              {/* Collapsed-state hints so the card still tells the story
                  without opening Advanced settings. */}
              {(c.hard_gate || c.evidence_required) && (
                <div className="flex flex-wrap gap-1.5">
                  {c.hard_gate && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning rounded-full px-2 py-0.5">
                      Eligibility check - does not affect the score
                    </span>
                  )}
                  {c.evidence_required && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-bg-soft text-ink-soft rounded-full px-2 py-0.5">
                      Quotes a line from the CV
                    </span>
                  )}
                </div>
              )}

              <details className="group">
                <summary className="inline-flex items-center gap-1.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden text-xs font-bold text-ink-soft hover:text-ink transition-colors">
                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                  Advanced settings
                  <span className="font-normal text-ink-muted normal-case">- scoring style, eligibility, evidence, level guides</span>
                </summary>

                <div className="mt-3 pt-4 border-t border-border space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">How to score</label>
                      <select
                        value={c.type}
                        onChange={e => update(c._key, { type: e.target.value as 'ordinal_5' | 'binary' })}
                        className="w-full text-sm text-ink bg-bg-elevated border border-border rounded-xl px-3 py-2 outline-none focus:border-ink"
                      >
                        <option value="ordinal_5">Score from 1 (weakest) to 5 (strongest)</option>
                        <option value="binary">Yes / No only</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-3 sm:pt-5">
                      <label className="inline-flex items-start gap-2 text-xs text-ink-soft leading-snug">
                        <input
                          type="checkbox"
                          checked={!!c.hard_gate}
                          onChange={e => update(c._key, { hard_gate: e.target.checked })}
                          className="accent-accent mt-0.5"
                        />
                        <span>
                          <strong className="text-ink font-bold">Eligibility check</strong> - shown as a consideration after scoring (e.g. right to work, location). Does not change the score; you confirm it per candidate.
                        </span>
                      </label>
                      <label className="inline-flex items-start gap-2 text-xs text-ink-soft leading-snug">
                        <input
                          type="checkbox"
                          checked={!!c.evidence_required}
                          onChange={e => update(c._key, { evidence_required: e.target.checked })}
                          className="accent-accent mt-0.5"
                        />
                        <span>
                          <strong className="text-ink font-bold">Quote a line from the CV</strong> when scoring this
                        </span>
                      </label>
                    </div>
                  </div>

                  {c.type === 'ordinal_5' && (
                    <div>
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                        Tell the AI what each level looks like <span className="font-normal lowercase">(optional but improves accuracy)</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['1', '3', '5'] as const).map(level => {
                          const labelMap = { '1': 'A weak candidate looks like...', '3': 'An OK candidate looks like...', '5': 'A strong candidate looks like...' }
                          const placeholderMap = { '1': 'e.g. No relevant experience mentioned', '3': 'e.g. Some related experience', '5': 'e.g. Multiple years of direct experience with specific outcomes' }
                          return (
                            <div key={level}>
                              <label className="block text-[10px] text-ink-soft mb-1">{labelMap[level]}</label>
                              <input
                                value={c.anchors?.[level] ?? ''}
                                onChange={e => updateAnchor(c._key, level, e.target.value)}
                                placeholder={placeholderMap[level]}
                                className="w-full text-xs text-ink bg-bg-elevated border border-border rounded-xl px-3 py-2 outline-none focus:border-ink"
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>
          ))}

          <button
            type="button"
            onClick={() => onCriteriaChange([...criteria, newDraftCriterion()])}
            className="w-full border-2 border-dashed border-border hover:border-ink-soft hover:bg-bg-soft rounded-2xl py-3.5 text-sm font-bold text-ink-soft hover:text-ink transition-colors"
          >
            + Add another criterion
          </button>
        </div>

        {error && (
          <p className="text-xs text-danger bg-danger/10 rounded-xl px-3 py-2">{error}</p>
        )}
      </div>

      {/* Footer - always visible: weight total + Auto-balance + Save. */}
      <div className="flex-shrink-0 px-5 sm:px-8 py-4 border-t border-border bg-bg-elevated rounded-b-3xl flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${weightOk ? 'text-success' : 'text-warning'}`}>
            Total importance: {Math.round(weightTotal * 100)}%
          </span>
          {!weightOk && (
            <button
              type="button"
              onClick={() => onCriteriaChange(normaliseDraftWeights(criteria))}
              className="bg-bg-soft hover:bg-border text-ink text-xs font-bold rounded-full px-3 py-1.5 transition-colors"
              title="Re-balance the percentages so they add to 100"
            >
              Auto-balance to 100%
            </button>
          )}
        </div>
        {footerNote && (
          <p className="text-[11px] text-ink-muted leading-tight flex-1 min-w-[160px] hidden sm:block">{footerNote}</p>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="text-sm font-bold text-ink-soft hover:text-ink px-4 py-2 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="bg-accent hover:bg-accent-hover text-ink-on-accent text-sm font-bold rounded-full px-5 py-2.5 disabled:opacity-50"
          >
            {saving ? savingLabel : saveLabel}
          </button>
        </div>
      </div>
    </>
  )
}
