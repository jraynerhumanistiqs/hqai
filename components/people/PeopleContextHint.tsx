'use client'

// The reactive hook, rendered.
//
// Sits above the composer in the AI Advisor and surfaces facts from the user's
// own employee register when what they are typing about touches a dated
// process. Quiet by default, and silent when there is nothing to say.
//
// Tone rule: this states a FACT about their own record and never tells them
// what to do. "Sarah's minimum employment period ends on 14 March" is a date
// from their data. "You should dismiss her before then" would be advice, and is
// out of bounds.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { EmployeeSignal } from '@/lib/people-context'

export default function PeopleContextHint({ text }: { text: string }) {
  const [signals, setSignals] = useState<EmployeeSignal[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const lastQuery = useRef('')

  useEffect(() => {
    const trimmed = text.trim()
    // Only look once the user has typed something substantive, and debounce so
    // we are not querying on every keystroke.
    if (trimmed.length < 12 || trimmed === lastQuery.current) return
    const handle = setTimeout(async () => {
      lastQuery.current = trimmed
      try {
        const res = await fetch('/api/people-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        })
        if (!res.ok) return
        const data = await res.json()
        setSignals(Array.isArray(data.signals) ? data.signals : [])
      } catch {
        // A hint failing must never disturb the conversation.
      }
    }, 600)
    return () => clearTimeout(handle)
  }, [text])

  const visible = signals.filter(s => !dismissed.includes(s.employeeId))
  if (visible.length === 0) return null

  return (
    <div className="mb-3 space-y-2" aria-live="polite">
      {visible.map(s => (
        <div
          key={s.employeeId}
          className={
            'rounded-2xl border p-3 ' +
            (s.urgency === 'now'
              ? 'border-[color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)]'
              : 'border-border bg-bg-elevated')
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                From your team records
              </p>
              <p className="mt-1 text-sm text-ink">{s.fact}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{s.because}</p>
              <Link
                href="/dashboard/people/team"
                className="mt-2 inline-block text-xs font-bold text-ink underline underline-offset-2 hover:text-ink-soft"
              >
                Open your team
              </Link>
            </div>
            <button
              onClick={() => setDismissed(prev => [...prev, s.employeeId])}
              aria-label="Dismiss this note"
              className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-ink-muted transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Hide
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
