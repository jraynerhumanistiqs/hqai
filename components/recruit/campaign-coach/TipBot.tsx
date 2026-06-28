'use client'

// TipBot - the Campaign Coach recruitment "Tip Bot".
//
// A floating pop-up card (bottom-right) that surfaces curated recruitment
// tips routed to the wizard step the user is on. Data + ordering come from
// GET /api/campaign/tips (the queue is already sorted - confidence then a
// random tie-break - so we render it in order and just cycle).
//
// Self-contained: owns open/closed, fetching, cycling, the per-stage
// localStorage resume, per-session auto-surface, and fire-and-forget
// telemetry. Tips are rendered verbatim (already written in plain English).
// A small "Australian law" flag appears only on tips tied to a legal
// requirement; there is no general region badge.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecruitmentTip, TipStage } from '@/lib/campaign-tips'

interface TipBotProps {
  stage: TipStage
}

const IDX_KEY = (stage: string) => `hqai:tip-idx:${stage}`
const AUTOSHOWN_KEY = (stage: string) => `hqai:tip-autoshown:${stage}`
const DISMISSED_KEY = 'hqai:tip-dismissed-session'

function readSavedIdx(stage: string): number | null {
  try {
    const v = localStorage.getItem(IDX_KEY(stage))
    const n = v ? parseInt(v, 10) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}
function writeSavedIdx(stage: string, idx: number) {
  try { localStorage.setItem(IDX_KEY(stage), String(idx)) } catch { /* no-op */ }
}

function track(payload: { event: string; tip_id?: string; stage: string; category?: string }) {
  try {
    fetch('/api/telemetry/tip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch { /* no-op */ }
}

function LightbulbIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
    </svg>
  )
}
function ScalesIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0L5 7zm14 0l-3 6a3 3 0 0 0 6 0l-3-6zM12 3l-7 4M12 3l7 4" />
    </svg>
  )
}
function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      {dir === 'left' ? (
        <path fillRule="evenodd" d="M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd" />
      ) : (
        <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      )}
    </svg>
  )
}

export default function TipBot({ stage }: TipBotProps) {
  const [queue, setQueue] = useState<RecruitmentTip[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const lastViewedId = useRef<string | null>(null)

  // Reset the topic filter whenever the stage changes, and auto-surface the
  // card the first time this stage is seen in the session (unless the user
  // has already dismissed a tip this session).
  useEffect(() => {
    setCategory(null)
    if (typeof window === 'undefined') return
    try {
      const dismissed = sessionStorage.getItem(DISMISSED_KEY) === '1'
      const shown = sessionStorage.getItem(AUTOSHOWN_KEY(stage)) === '1'
      if (!dismissed && !shown) {
        setOpen(true)
        sessionStorage.setItem(AUTOSHOWN_KEY(stage), '1')
      }
    } catch { /* no-op */ }
  }, [stage])

  // Fetch the ordered queue for the current stage / category.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ stage })
    if (category) params.set('category', category)
    fetch(`/api/campaign/tips?${params.toString()}`)
      .then(r => r.json())
      .then((d) => {
        if (cancelled) return
        const tips: RecruitmentTip[] = Array.isArray(d?.tips) ? d.tips : []
        setQueue(tips)
        if (Array.isArray(d?.categories)) setCategories(d.categories)
        // Resume past the last-seen opener for the DEFAULT (unfiltered) queue;
        // a filtered queue just starts at 0.
        let start = 0
        if (!category && tips.length > 0) {
          const saved = readSavedIdx(stage)
          if (saved != null) start = (saved + 1) % tips.length
        }
        setIndex(start)
        lastViewedId.current = null
      })
      .catch(() => { if (!cancelled) setQueue([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stage, category])

  // Persist the last-seen index for the default queue (so the opener varies).
  useEffect(() => {
    if (category || queue.length === 0) return
    writeSavedIdx(stage, index)
  }, [index, stage, category, queue.length])

  // Log a view when a tip becomes visible (de-duped on tip id).
  useEffect(() => {
    if (!open) return
    const tip = queue[index]
    if (!tip || lastViewedId.current === tip.id) return
    lastViewedId.current = tip.id
    track({ event: 'tip_viewed', tip_id: tip.id, stage, category: category ?? undefined })
  }, [open, index, queue, stage, category])

  const cycle = useCallback((dir: 1 | -1) => {
    if (queue.length === 0) return
    const next = (index + dir + queue.length) % queue.length
    setIndex(next)
    const tip = queue[next]
    track({ event: 'tip_cycled', tip_id: tip?.id, stage, category: category ?? undefined })
  }, [queue, index, stage, category])

  function onKeyDown(e: React.KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return
    if (e.key === 'ArrowLeft') { e.preventDefault(); cycle(-1) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); cycle(1) }
  }

  function dismiss() {
    setOpen(false)
    lastViewedId.current = null
    try { sessionStorage.setItem(DISMISSED_KEY, '1') } catch { /* no-op */ }
    const tip = queue[index]
    track({ event: 'tip_dismissed', tip_id: tip?.id, stage, category: category ?? undefined })
  }

  // ── Closed: the persistent reopen lightbulb ──
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show recruitment tips"
        className="fixed bottom-24 right-4 sm:right-6 z-30 inline-flex items-center gap-2 rounded-full bg-accent text-ink-on-accent text-xs font-bold px-4 min-h-touch shadow-float hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <LightbulbIcon />
        Tips
      </button>
    )
  }

  const tip = queue[index]

  return (
    <div
      role="dialog"
      aria-label="Recruitment tips"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="fixed bottom-24 right-4 sm:right-6 z-30 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-bg-elevated shadow-modal overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <span className="w-7 h-7 rounded-full bg-accent text-ink-on-accent flex items-center justify-center flex-shrink-0">
          <LightbulbIcon />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-clay-ink dark:text-clay">Recruitment tips</p>
          <p className="text-[11px] text-ink-muted leading-none mt-0.5">
            {loading ? 'Loading...' : queue.length > 0 ? `${index + 1} of ${queue.length}` : 'No tips'}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss tips"
          className="w-7 h-7 rounded-full hover:bg-bg-soft flex items-center justify-center text-ink-soft hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3" aria-live="polite">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <span className="w-5 h-5 rounded-full border-2 border-border border-t-accent animate-spin" aria-label="Loading tips" />
          </div>
        ) : !tip ? (
          <div className="py-4 text-center">
            <p className="text-sm text-ink-soft">No tips here yet.</p>
            {category && (
              <button
                type="button"
                onClick={() => setCategory(null)}
                className="mt-2 text-xs font-bold text-clay-ink dark:text-clay hover:underline min-h-touch px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-full"
              >
                Clear topic
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Legal flag - only on tips tied to an Australian legal requirement. */}
            {tip.legislative && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-2 rounded-full bg-accent-soft text-clay-ink dark:text-clay border border-accent/30">
                <ScalesIcon />
                Australian law
              </span>
            )}
            <p className="text-sm font-bold text-ink leading-snug">{tip.tip}</p>
            {tip.why_it_works && (
              <p className="text-xs text-ink-soft leading-relaxed mt-1.5">{tip.why_it_works}</p>
            )}
            {(tip.source || tip.source_date) && (
              <p className="mt-2 text-[11px] text-ink-muted">
                {tip.source_url ? (
                  <a
                    href={tip.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track({ event: 'tip_source_clicked', tip_id: tip.id, stage, category: category ?? undefined })}
                    className="font-bold text-clay-ink dark:text-clay hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded"
                  >
                    {tip.source}{tip.source_date ? ` - ${tip.source_date}` : ''}
                  </a>
                ) : (
                  <span>{tip.source}{tip.source_date ? ` - ${tip.source_date}` : ''}</span>
                )}
              </p>
            )}
          </>
        )}
      </div>

      {/* Narrow-to-topic chips */}
      {categories.length > 0 && (
        <div className="px-4 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-current={category === null ? 'true' : undefined}
            className={`flex-shrink-0 text-[11px] font-bold rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
              category === null ? 'bg-accent text-ink-on-accent' : 'bg-bg-soft text-ink-soft hover:text-ink'
            }`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-current={category === c ? 'true' : undefined}
              className={`flex-shrink-0 text-[11px] font-bold rounded-full px-2.5 py-1 capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                category === c ? 'bg-accent text-ink-on-accent' : 'bg-bg-soft text-ink-soft hover:text-ink'
              }`}
            >
              {c.replace(/[_-]+/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Cycle controls */}
      {queue.length > 1 && (
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={() => cycle(-1)}
            aria-label="Previous tip"
            className="w-9 h-9 min-h-touch min-w-touch flex items-center justify-center rounded-full text-ink-soft hover:text-ink hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <Chevron dir="left" />
          </button>
          <span className="text-xs font-bold text-ink-muted tabular-nums" aria-hidden="true">
            {index + 1} / {queue.length}
          </span>
          <button
            type="button"
            onClick={() => cycle(1)}
            aria-label="Next tip"
            className="w-9 h-9 min-h-touch min-w-touch flex items-center justify-center rounded-full text-ink-soft hover:text-ink hover:bg-bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <Chevron dir="right" />
          </button>
        </div>
      )}
    </div>
  )
}
