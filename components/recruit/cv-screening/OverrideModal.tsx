'use client'
// Manual override modal - lets a reviewer change a candidate's band and
// next_action, with a free-text comment explaining the reason. The AI's
// original values stay on the row; the override_* columns hold the
// human-curated values. Effective band/action reads prefer the override.

import { useState } from 'react'
import {
  BAND_LABELS,
  ACTION_LABELS,
  type CandidateBand,
  type CandidateScreening,
  type NextAction,
  effectiveBand,
  effectiveNextAction,
} from '@/lib/cv-screening-types'
import { useBackdropClose } from '@/components/recruit/useBackdropClose'

interface Props {
  screening: CandidateScreening
  onClose: () => void
  onSaved: (updated: CandidateScreening) => void
}

const BAND_OPTIONS: CandidateBand[] = ['strong_yes', 'yes', 'maybe', 'likely_no', 'reject']
const ACTION_OPTIONS: NextAction[] = [
  'schedule_panel',
  'schedule_phone_screen',
  'schedule_video_interview',
  'send_technical_task',
  'reference_check',
  'request_more_info',
  'hold_for_review',
  'reject',
]

// Internal -> API enum mapping (API uses different action vocabulary).
const ACTION_TO_API: Record<NextAction, string> = {
  schedule_panel: 'schedule_panel',
  schedule_phone_screen: 'phone_screen',
  schedule_video_interview: 'video_interview',
  send_technical_task: 'request_more_info',
  reference_check: 'reference_check',
  request_more_info: 'request_more_info',
  hold_for_review: 'hold',
  reject: 'reject',
}

export default function OverrideModal({ screening, onClose, onSaved }: Props) {
  const backdrop = useBackdropClose(onClose)
  const currentBand = effectiveBand(screening)
  const currentAction = effectiveNextAction(screening)
  const [band, setBand] = useState<CandidateBand>(currentBand)
  const [action, setAction] = useState<NextAction>(currentAction)
  const [comment, setComment] = useState(screening.override_comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bandChanged = band !== screening.band
  const actionChanged = action !== screening.next_action
  const commentChanged = (comment.trim() || null) !== (screening.override_comment ?? null)
  const dirty = bandChanged || actionChanged || commentChanged

  async function save() {
    if (!dirty) return
    if ((bandChanged || actionChanged) && !comment.trim()) {
      setError('Please add a short comment explaining the change.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {}
      payload.override_band = bandChanged ? band : (screening.override_band ?? null)
      payload.override_next_action = actionChanged ? ACTION_TO_API[action] : (screening.override_next_action ?? null)
      payload.override_comment = comment.trim() || null
      const res = await fetch(`/api/cv-screening/screenings/${screening.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      onSaved({ ...screening, ...(data.screening as Partial<CandidateScreening>) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  async function clearOverride() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/cv-screening/screenings/${screening.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ override_band: null, override_next_action: null, override_comment: null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      onSaved({ ...screening, ...(data.screening as Partial<CandidateScreening>) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" {...backdrop}>
      <div className="bg-bg-elevated rounded-3xl shadow-modal w-full max-w-lg">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-charcoal uppercase tracking-wider">
              Override AI recommendation
            </h2>
            <p className="text-xs text-muted mt-1 truncate">
              {screening.candidate_label}
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

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1.5">Score band</label>
            <div className="flex flex-wrap gap-2">
              {BAND_OPTIONS.map(b => (
                <button
                  key={b}
                  onClick={() => setBand(b)}
                  className={`text-xs font-bold rounded-full px-3 py-1.5 transition-colors ${
                    band === b ? 'bg-black text-white' : 'bg-light text-mid hover:bg-border hover:text-charcoal'
                  }`}
                >
                  {BAND_LABELS[b]}
                </button>
              ))}
            </div>
            {bandChanged && (
              <p className="text-[10px] text-mid mt-1.5 italic">
                AI originally said {BAND_LABELS[screening.band]}.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1.5">Next step</label>
            <select
              value={action}
              onChange={e => setAction(e.target.value as NextAction)}
              className="w-full text-sm text-charcoal bg-bg-elevated border border-border rounded-lg px-3 py-2 outline-none focus:border-ink"
            >
              {ACTION_OPTIONS.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </select>
            {actionChanged && (
              <p className="text-[10px] text-mid mt-1.5 italic">
                AI originally said {ACTION_LABELS[screening.next_action]}.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1.5">
              Comment {(bandChanged || actionChanged) && <span className="text-danger">*</span>}
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Why are you changing the AI's call? e.g. Strong domain match they didn't pick up on, prefer video over phone, etc."
              rows={4}
              maxLength={1000}
              className="w-full text-sm text-charcoal bg-bg-elevated border border-border rounded-lg px-3 py-2 outline-none focus:border-ink resize-none"
            />
            <p className="text-[10px] text-muted mt-1">{comment.length}/1000</p>
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          {(screening.override_band || screening.override_next_action || screening.override_comment) ? (
            <button
              onClick={clearOverride}
              disabled={saving}
              className="text-xs font-bold text-mid hover:text-danger"
            >
              Clear override
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm font-bold text-mid hover:text-charcoal px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="bg-black hover:bg-charcoal text-white text-sm font-bold rounded-full px-5 py-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save change'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
