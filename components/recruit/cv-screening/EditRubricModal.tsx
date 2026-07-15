'use client'
// Edit an existing custom rubric's criteria. Saving creates a NEW version
// (separate row in cv_custom_rubrics linked via parent_rubric_id) so any
// candidates already scored against the previous version stay bucketed
// under it - their cv_screenings rows continue to reference the old rubric
// row id.
//
// The editor body itself lives in CriteriaEditor.tsx and is shared with
// NewRubricModal's review stage, so editing and creating criteria are the
// same surface.

import { useState } from 'react'
import type { Rubric } from '@/lib/cv-screening-types'
import { useBackdropClose } from '@/components/recruit/useBackdropClose'
import CriteriaEditor, {
  type DraftCriterion,
  toDraft,
  draftsToCriteria,
  validateCriteriaDraft,
} from './CriteriaEditor'

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

export default function EditRubricModal({ rubric, onClose, onSaved }: Props) {
  const backdrop = useBackdropClose(onClose)
  const [role, setRole] = useState(rubric.rubric.role)
  const [criteria, setCriteria] = useState<DraftCriterion[]>(
    rubric.rubric.criteria.map(toDraft),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextVersion = (rubric.version_number ?? 1) + 1

  async function save() {
    setError(null)
    const invalid = validateCriteriaDraft(criteria)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    try {
      const hardGates = criteria.filter(c => c.hard_gate).map(c => c.id)
      const payload: Rubric = {
        ...rubric.rubric,
        role: role.trim() || rubric.rubric.role,
        criteria: draftsToCriteria(criteria),
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
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-3 sm:p-4" {...backdrop}>
      <div className="bg-bg-elevated rounded-3xl border border-border ring-1 ring-ink/5 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between px-5 sm:px-8 py-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-ink">
              Edit scoring criteria
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              {`${rubric.label_family ?? rubric.label} - saving creates version ${nextVersion}. Candidates already scored stay on version ${rubric.version_number ?? 1} so their old scores don't change.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink transition-colors p-1 flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        <CriteriaEditor
          role={role}
          onRoleChange={setRole}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          error={error}
          saving={saving}
          saveLabel={`Save as version ${nextVersion}`}
          onSave={save}
          onCancel={onClose}
          footerNote={`Saving creates a new version. Candidates already scored stay on version ${rubric.version_number ?? 1}.`}
        />
      </div>
    </div>
  )
}
