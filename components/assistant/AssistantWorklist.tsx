'use client'

// The AI Assistant's landing surface: a worklist, not a chat.
//
// Everything on this page is DERIVED from the user's own register and
// evidence trail by lib/worklist.ts. No model call is made anywhere in this
// component's path, which is why the surface is cheap, instant and cannot
// produce an uncited claim - it has no legal source to draw on at all.
//
// Two things worth not undoing:
//   - The zero-employee state is the FIRST WORK ITEM, not a "nothing to do"
//     message. An empty register is the most likely real state, and a tab
//     that renders a cheerful blank on first open reads as broken.
//   - There is no free-text task entry. Every row derives from data the user
//     already entered, so the list cannot rot into a to-do list they have to
//     maintain. If a row cannot be cleared it becomes wallpaper, so every
//     derived row can be marked done, dismissed or snoozed.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { RiListCheck2, RiRefreshLine, RiUserAddLine } from '@remixicon/react'
import PageHeader from '@/components/dashboard/PageHeader'
import WorkItemCard, { resolveAction } from './WorkItemCard'
import {
  GROUP_LABELS,
  WORKLIST_DISMISSED_EVENT,
  WORKLIST_DONE_EVENT,
  type WorkItem,
  type WorkItemGroup,
  type Worklist,
} from '@/lib/worklist'

const GROUPS: WorkItemGroup[] = ['overdue', 'fortnight', 'later']
/**
 * Rows shown per group before "show all". Capped PER GROUP rather than
 * across the whole list: a single flat cap of ten let an incomplete register
 * fill the Overdue panel and push "This fortnight" and "Coming up" out of
 * sight entirely, so the dates coming at the user were the part that got
 * hidden. An unbounded scroll is how a list stops being read at all, so the
 * cap stays - it just no longer loses a whole group.
 */
const VISIBLE_PER_GROUP = 5
const SNOOZE_DAYS = 14

function snoozeUntil(days = SNOOZE_DAYS): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AssistantWorklist() {
  const [data, setData] = useState<Worklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  // `loading` starts true for the mount fetch and is only cleared once the
  // response lands; the retry button (an event handler, not an effect) sets
  // it back itself. Nothing calls setState before the first await.
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/worklist')
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? 'Could not load your worklist')
      setData(body as Worklist)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your worklist')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount, per the spec: the server page stays cheap and the list
  // can refresh after an action without a route-level revalidate. The
  // react-hooks/set-state-in-effect rule flags any setState reachable from an
  // effect, including one that only runs after an await, so it fires on every
  // mount-fetch in the app (28 instances in the lint baseline). Suppressed
  // locally rather than adding a 29th warning to that baseline.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  /**
   * Clearing an item is an append-only trail event, not an edit: the table
   * has no UPDATE policy by design. A snooze date cannot go on occurred_at
   * (the POST route rejects anything more than 24h ahead), so it travels in
   * metadata.snooze_until and lib/worklist.ts suppresses the item until it
   * passes.
   */
  async function clearItem(item: WorkItem, mode: 'done' | 'dismissed' | 'snoozed') {
    setClearing(prev => new Set(prev).add(item.key))
    setError(null)
    try {
      const res = await fetch('/api/compliance-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: item.employeeId ?? null,
          event_type: mode === 'done' ? WORKLIST_DONE_EVENT : WORKLIST_DISMISSED_EVENT,
          detail: item.fact,
          metadata: {
            item_key: item.key,
            item_kind: item.kind,
            ...(mode === 'snoozed' ? { snooze_until: snoozeUntil() } : {}),
          },
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Could not update that item')
      // Drop it locally rather than refetching, so the list does not flash.
      setData(prev => {
        if (!prev) return prev
        const items = prev.items.filter(i => i.key !== item.key)
        const attention = items.filter(i => i.group !== 'later').length
        return {
          ...prev,
          items,
          counts: { attention, upcoming: items.length - attention, total: items.length },
        }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update that item')
    } finally {
      setClearing(prev => { const next = new Set(prev); next.delete(item.key); return next })
    }
  }

  const items = data?.items ?? []
  const rowsByGroup = new Map<WorkItemGroup, WorkItem[]>(
    GROUPS.map(g => {
      const all = items.filter(i => i.group === g)
      return [g, showAll ? all : all.slice(0, VISIBLE_PER_GROUP)]
    }),
  )
  const hidden = items.length - GROUPS.reduce((n, g) => n + (rowsByGroup.get(g)?.length ?? 0), 0)

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <PageHeader
          eyebrow="AI Assistant"
          title="What needs doing"
          subtitle="Your day-to-day helper for the admin around people management - keeping track of the dates and the paperwork, from what you have already told us."
        />

        {error && (
          <div
            role="alert"
            className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-bg-elevated p-4 text-sm text-ink-soft shadow-card"
          >
            <span className="flex-1 min-w-[12rem]">{error}</span>
            <button
              type="button"
              onClick={() => { setLoading(true); void load() }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <RiRefreshLine className="h-3.5 w-3.5" aria-hidden />
              Try again
            </button>
          </div>
        )}

        {/* Count strip. Derived from the rows actually returned to this
            caller, never from business_headcount() - a scoped admin who can
            see four people must not be told the business has thirty.
            Suppressed at zero. */}
        {!loading && data && !data.firstRun && data.counts.total > 0 && (
          <p
            aria-live="polite"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-xs text-ink-soft"
          >
            <RiListCheck2 className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
            {data.counts.attention > 0 && (
              <span>
                {data.counts.attention} {data.counts.attention === 1 ? 'thing needs' : 'things need'} attention
              </span>
            )}
            {data.counts.attention > 0 && data.counts.upcoming > 0 && <span aria-hidden>&middot;</span>}
            {data.counts.upcoming > 0 && <span>{data.counts.upcoming} coming up</span>}
          </p>
        )}

        {loading && (
          // Static placeholder text, not a shimmer: content must never depend
          // on an animation completing to be visible.
          <p className="text-sm text-ink-muted">Checking your register...</p>
        )}

        {!loading && data?.firstRun && <FirstRun item={items[0]} />}

        {!loading && data && !data.firstRun && items.length === 0 && <NothingDue />}

        {!loading && data && !data.firstRun && items.length > 0 && (
          <div className="space-y-6">
            {GROUPS.map(group => {
              const rows = rowsByGroup.get(group) ?? []
              if (rows.length === 0) return null
              return (
                <section key={group} aria-labelledby={`worklist-${group}`}>
                  <h2
                    id={`worklist-${group}`}
                    className="mb-2.5 font-display text-base font-bold tracking-tight text-ink sm:text-lg"
                  >
                    {GROUP_LABELS[group]}
                  </h2>
                  <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-card">
                    {rows.map(item => (
                      <WorkItemCard
                        key={item.key}
                        item={item}
                        // One filled accent CTA on the page: the single most
                        // urgent row. Everything else is outline.
                        primary={item.key === items[0].key}
                        busy={clearing.has(item.key)}
                        onClear={clearItem}
                      />
                    ))}
                  </div>
                </section>
              )
            })}

            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="rounded-full border border-border px-4 py-2 text-xs font-bold text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Show all {items.length} items
              </button>
            )}
          </div>
        )}

        <p className="mt-8 text-xs leading-relaxed text-ink-muted">
          Every line here is a date or a record from your own team register. If you want to talk
          through what to do about one,{' '}
          <Link
            href="/dashboard/people/advisor"
            className="underline decoration-border underline-offset-2 transition-colors hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            the AI Advisor
          </Link>{' '}
          is the place for the question.
        </p>
      </div>
    </div>
  )
}

/**
 * The zero-employee state. Deliberately a work item with a job to do rather
 * than an empty panel: HQ cannot track dates it has not been given, and
 * saying so is more use than an illustration.
 */
function FirstRun({ item }: { item?: WorkItem }) {
  if (!item) return null
  const { label, href } = resolveAction(item.action)
  return (
    <section aria-labelledby="worklist-first-run">
      <h2
        id="worklist-first-run"
        className="mb-2.5 font-display text-base font-bold tracking-tight text-ink sm:text-lg"
      >
        Start here
      </h2>
      <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card sm:p-8">
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-soft text-ink-muted"
        >
          <RiUserAddLine className="h-5 w-5" />
        </span>
        <p className="mt-4 text-sm font-medium text-ink">{item.fact}</p>
        <p className="mt-1.5 max-w-xl text-sm text-ink-soft">{item.because}</p>
        <Link
          href={href}
          className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {label}
        </Link>
        <p className="mt-4 text-xs text-ink-muted">
          Start date and employment type are enough. No date of birth, and the award can wait if you
          are not sure which one applies.
        </p>
      </div>
    </section>
  )
}

/** The register has people in it and nothing is currently due. */
function NothingDue() {
  return (
    <div className="rounded-3xl border border-border bg-bg-elevated p-6 shadow-card sm:p-8">
      <p className="text-sm font-medium text-ink">Nothing is due on your register right now.</p>
      <p className="mt-1.5 max-w-xl text-sm text-ink-soft">
        Probation dates, casual conversion timing, fixed-term end dates and the paperwork on each
        person&apos;s record are all being watched. Anything that falls due shows up here.
      </p>
      <Link
        href="/dashboard/people/team"
        className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-xs font-bold text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Open your team register
      </Link>
    </div>
  )
}
