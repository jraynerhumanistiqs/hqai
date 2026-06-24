'use client'

// Shared status pill. Maps a status string to a semantic token tint so
// status chips stop mixing bg-blue-50 / bg-amber-50 / bg-green-100 with
// the real semantic tokens. Unknown statuses fall back to a neutral ink
// tint. Pass `tone` to override the mapping explicitly.

import * as React from 'react'
import { twMerge } from 'tailwind-merge'

export type PillTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'gold'

const toneMap: Record<PillTone, string> = {
  neutral: 'bg-bg-soft text-ink-soft border-border',
  info:    'bg-info/10 text-info border-info/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  success: 'bg-success/10 text-success border-success/20',
  danger:  'bg-danger/10 text-danger border-danger/20',
  gold:    'bg-clay-soft text-clay-ink border-clay/30',
}

// Heuristic status -> tone mapping for common recruit/HR statuses.
const statusTone: Record<string, PillTone> = {
  // success-ish
  offer: 'success', offered: 'success', hired: 'success', shortlisted: 'success',
  complete: 'success', completed: 'success', passed: 'success', approved: 'success',
  active: 'success', sent: 'success',
  // warning-ish
  prescreen: 'warning', pending: 'warning', review: 'warning', reviewing: 'warning',
  in_progress: 'warning', interview_1: 'warning', interview_2: 'warning', draft: 'warning',
  // info-ish
  new: 'info', invited: 'info', scoring: 'info', interview: 'info',
  // danger-ish
  rejected: 'danger', declined: 'danger', failed: 'danger', expired: 'danger',
}

function labelFor(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface StatusPillProps {
  status?: string
  /** Explicit tone override. */
  tone?: PillTone
  /** Display label override (defaults to a humanised status). */
  label?: React.ReactNode
  className?: string
}

export function StatusPill({ status, tone, label, className }: StatusPillProps) {
  const resolved: PillTone =
    tone ?? (status ? statusTone[status.toLowerCase()] ?? 'neutral' : 'neutral')
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneMap[resolved],
        className,
      )}
    >
      {label ?? (status ? labelFor(status) : null)}
    </span>
  )
}

export default StatusPill
