'use client'

// SET-04 - persistent save affordance. The primary "Save changes" button
// used to sit stranded mid-page between Advisor and Billing; this sticky
// bar keeps it reachable, reflects saving / saved / error / dirty state
// honestly, and disables while there is nothing to save.

import { Button } from '@/components/ui/button'

export function SaveBar({
  saving,
  saved,
  dirty,
  saveError,
  onSave,
}: {
  saving: boolean
  saved: boolean
  dirty: boolean
  saveError: string
  onSave: () => void
}) {
  return (
    <div className="sticky bottom-4 z-20 mt-6 flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-4 py-3 shadow-float">
      <Button onClick={onSave} disabled={saving || !dirty} aria-busy={saving}>
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
      </Button>
      {saving ? null : saveError ? (
        <span className="text-xs text-danger">{saveError}</span>
      ) : saved ? (
        <span className="text-xs text-success">All changes saved</span>
      ) : dirty ? (
        <span className="text-xs text-ink-muted">Unsaved changes</span>
      ) : (
        <span className="text-xs text-ink-muted">Everything saved</span>
      )}
    </div>
  )
}
