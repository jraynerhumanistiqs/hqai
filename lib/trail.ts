// Evidence trail - corrections without overwriting.
//
// compliance_events is append-only (no UPDATE policy). A mistake in an entry
// is fixed by writing a NEW event whose `supersedes` points at the original.
// Both rows stay on file; derived reads (the timing gate, the "What is on
// file" checklist, the AI Assistant worklist, the chat hint) use only the
// LIVE events, while the record itself still shows the full history.
//
// An event is superseded when any other event's `supersedes` names it.
// Chains are allowed (C corrects B, which corrected A: only C is live).
// A dangling reference (the original is not in the list, e.g. because of a
// row limit or RLS scope) simply supersedes nothing.
//
// Pure and dependency-free so it can be unit tested under plain node.

export interface Supersedable {
  id: string
  supersedes?: string | null
}

/** Ids of every event in the list that another event supersedes. */
export function supersededIds<T extends Supersedable>(events: T[]): Set<string> {
  const out = new Set<string>()
  for (const ev of events) {
    if (ev.supersedes && ev.supersedes !== ev.id) out.add(ev.supersedes)
  }
  return out
}

/** Only the live events - anything superseded is dropped. Order is kept. */
export function applySupersessions<T extends Supersedable>(events: T[]): T[] {
  const dead = supersededIds(events)
  if (dead.size === 0) return events
  return events.filter(ev => !dead.has(ev.id))
}

/**
 * For each superseded event id, the id of the event that corrected it.
 * Used by the UI and the record export to link an old entry to its
 * correction. If two events claim the same original, the later one wins.
 */
export function correctionsById<T extends Supersedable & { created_at?: string }>(
  events: T[],
): Map<string, T> {
  const out = new Map<string, T>()
  for (const ev of events) {
    if (!ev.supersedes || ev.supersedes === ev.id) continue
    const prev = out.get(ev.supersedes)
    if (!prev || Date.parse(ev.created_at ?? '') >= Date.parse(prev.created_at ?? '')) {
      out.set(ev.supersedes, ev)
    }
  }
  return out
}

/** The column a select list needs to carry for supersession to work. */
export const SUPERSEDES_COLUMN = 'supersedes'

type QueryResult<R> = { data: R[] | null; error: { message?: string; code?: string } | null }

/**
 * Runs a trail select with the `supersedes` column added, and retries
 * without it if the column does not exist yet (the migration is unapplied).
 * Before the migration nothing can be superseded, so dropping the column is
 * a faithful fallback rather than a silent error.
 */
export async function selectWithSupersedes<R>(
  columns: string,
  run: (cols: string) => PromiseLike<QueryResult<R>>,
): Promise<QueryResult<R>> {
  const first = await run(`${columns}, ${SUPERSEDES_COLUMN}`)
  if (first.error && isMissingSupersedes(first.error)) return run(columns)
  return first
}

export function isMissingSupersedes(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  return err.code === '42703' || err.code === 'PGRST204' || /supersedes/i.test(err.message ?? '')
}
