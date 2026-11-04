// The AI Assistant worklist - "show me what needs doing".
//
// A pure derivation over the user's OWN register: employees + compliance
// events + the legal headcount in, WorkItem[] out. No model call, no network,
// no new tables. Everything it reads is already written by the register, the
// evidence trail and the file-note composer.
//
// Boundary note, inherited verbatim from lib/people-context.ts: everything
// surfaced here is a FACT ABOUT THE USER'S OWN DATA (a start date, months of
// service, a date computed from one). It is never a direction on what to do.
// "Sarah's minimum employment period ends on 14 March" is a date from their
// data. "You should dismiss her before then" would be advice, and is out of
// bounds. The fact / because split below is structural so the distinction
// does not depend on writing care.
//
// Headcount note: `headcount` is the whole-business count from the
// business_headcount() RPC, which is SECURITY DEFINER and so returns people a
// scoped admin cannot see. It is an INPUT TO DATE MATHS ONLY (the minimum
// employment period is 12 months under 15 staff, otherwise 6). It is never
// rendered and no visible count is derived from it - every count in the
// returned payload comes from the rows the caller was actually allowed to
// read. See the spec's s6.6 and the test that guards this.

import {
  employeeName,
  minimumPeriodEndsOn,
  monthsOfService,
  type ComplianceEvent,
  type Employee,
} from './employees'
import { computeGaps } from './record-gaps'

// --- contract ---------------------------------------------------------------

export type WorkItemKind =
  | 'follow_up_due'        // compliance_events.metadata.follow_up_date has passed or is near
  | 'record_gap'           // lib/record-gaps.ts missing item
  | 'minimum_period'       // minimumPeriodEndsOn inside 120 days
  | 'casual_tenure'        // casual past 6 or 12 months
  | 'fixed_term_ending'    // fixed_term_end inside 60 days
  | 'award_unconfirmed'    // award_confirmed = false
  | 'register_empty'       // the first-run item

export type WorkItemAction =
  | { type: 'write_file_note'; employeeId: string }
  | { type: 'open_record'; employeeId: string }
  | { type: 'summarise_record'; employeeId: string }
  | { type: 'ask_advisor'; prompt: string }
  | { type: 'contact_advisor'; summary: string }
  | { type: 'add_people' }

/** Which panel the row sits in. Derived here so the UI stays dumb. */
export type WorkItemGroup = 'overdue' | 'fortnight' | 'later'

export interface WorkItem {
  /** Stable across recomputation - this is what done/dismiss keys on. */
  key: string
  kind: WorkItemKind
  employeeId?: string
  name?: string
  /** A fact from their own data. Never a direction. */
  fact: string
  /** Why it is surfaced now. Never a consequence or an obligation. */
  because: string
  /** ISO date (YYYY-MM-DD) the item turns on, where it has one. */
  dueOn?: string
  urgency: 'now' | 'soon' | 'info'
  group: WorkItemGroup
  action: WorkItemAction
  /** The first-run item cannot be cleared - clearing it would blank the tab. */
  dismissible: boolean
}

export interface WorklistCounts {
  /** Overdue + this fortnight. Derived from visible rows only. */
  attention: number
  /** Coming up. */
  upcoming: number
  total: number
}

export interface Worklist {
  items: WorkItem[]
  counts: WorklistCounts
  /** True when the only item is the zero-employee first-run item. */
  firstRun: boolean
}

/** The slice of a trail row the worklist reads. */
export type WorklistEvent = Pick<
  ComplianceEvent,
  'id' | 'employee_id' | 'event_type' | 'occurred_at' | 'metadata'
>

export interface WorklistInput {
  /** The employees the caller is allowed to see. Scoped admins get fewer. */
  employees: Employee[]
  events: WorklistEvent[]
  /**
   * Whole-business active headcount from business_headcount(). DATE MATHS
   * ONLY - never rendered, never counted from. See the header note.
   */
  headcount: number
  /** businesses.headcount, a free-text band ("1-14"). First-run copy only. */
  statedHeadcount?: string | null
  now?: Date
}

// --- event types the Assistant writes back ---------------------------------

/** Trail event types that clear a worklist item. See the spec s3.3. */
export const WORKLIST_DONE_EVENT = 'worklist_done'
export const WORKLIST_DISMISSED_EVENT = 'worklist_dismissed'

// --- windows ---------------------------------------------------------------

/** A follow-up is surfaced from this many days before it falls due. */
export const FOLLOW_UP_LEAD_DAYS = 14
/**
 * ...and ages out this many days after. An item that cannot be cleared
 * becomes wallpaper, so each source caps its own window rather than letting
 * the list grow forever (mirrors signalsFor's 120-day caps).
 */
export const FOLLOW_UP_STALE_DAYS = 120
/** Minimum employment period dates are surfaced this far ahead. */
export const MINIMUM_PERIOD_LEAD_DAYS = 120
/** Fixed-term end dates are surfaced this far ahead... */
export const FIXED_TERM_LEAD_DAYS = 60
/** ...and age out this long after the date has passed. */
export const FIXED_TERM_STALE_DAYS = 30
/**
 * A commencement record item is not a gap on day one. Below this many days of
 * service it is not surfaced at all; below a month it is surfaced quietly.
 */
export const GAP_GRACE_DAYS = 7
/**
 * At most this many record gaps per person. One, deliberately: a brand new
 * register is usually incomplete for everybody, and at two per person four
 * people produced eight of the first ten rows, which is exactly how a list
 * turns into wallpaper. The full checklist stays on their record in the team
 * register, where it already renders as a tick-list.
 */
export const MAX_GAPS_PER_PERSON = 1

// --- date helpers ----------------------------------------------------------

const DAY_MS = 86_400_000

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * en-AU long date, formatted by hand rather than through
 * toLocaleDateString so the output is identical under every runtime and
 * locale the tests and the server might run in.
 */
export function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Validate a date-only string out of a jsonb blob with no constraint on it.
 * metadata.follow_up_date is written by FileNoteComposer into free-form
 * metadata, so it can be absent, null, a number, or a bad string. Anything
 * that is not exactly YYYY-MM-DD and parseable returns null, and the item is
 * simply not produced - the list degrades to fewer rows, never to a throw.
 */
export function asDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  if (Number.isNaN(Date.parse(value))) return null
  const d = new Date(value + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  // Reject calendar-invalid dates that Date.parse rolls over (2026-02-31).
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return iso === value ? value : null
}

function dateOnly(value: string): Date {
  return new Date(value + 'T00:00:00')
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Whole days from `now` (midnight) to `d`. Negative = in the past. */
function daysFrom(d: Date, now: Date): number {
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((a - b) / DAY_MS)
}

function groupFor(days: number | null, urgency: WorkItem['urgency']): WorkItemGroup {
  if (days === null) {
    return urgency === 'now' ? 'overdue' : urgency === 'soon' ? 'fortnight' : 'later'
  }
  if (days <= 0) return 'overdue'
  if (days <= 14) return 'fortnight'
  return 'later'
}

function metaOf(ev: WorklistEvent): Record<string, unknown> {
  return (ev.metadata ?? {}) as Record<string, unknown>
}

// --- suppression (spec s3.3) ------------------------------------------------

/**
 * The trail has no UPDATE policy, so "done" is an append-only event rather
 * than a mutable row. The most recent worklist_done / worklist_dismissed
 * event per item_key wins; undo is a newer reversing event.
 *
 * A snooze is the same event carrying metadata.snooze_until - the POST route
 * rejects an occurred_at more than 24h in the future, so the future date
 * cannot live on occurred_at. While snooze_until is in the future the item is
 * suppressed; once it passes, the item comes back even though the event is
 * still on the trail.
 */
export function suppressedKeys(events: WorklistEvent[], now: Date): Set<string> {
  type Latest = { at: number; type: string; snoozeUntil: string | null }
  const latest = new Map<string, Latest>()

  for (const ev of events) {
    if (ev.event_type !== WORKLIST_DONE_EVENT && ev.event_type !== WORKLIST_DISMISSED_EVENT) continue
    const meta = metaOf(ev)
    const key = typeof meta.item_key === 'string' ? meta.item_key : null
    if (!key) continue
    const at = Date.parse(ev.occurred_at)
    if (Number.isNaN(at)) continue
    const prev = latest.get(key)
    if (prev && prev.at >= at) continue
    latest.set(key, { at, type: ev.event_type, snoozeUntil: asDateOnly(meta.snooze_until) })
  }

  const out = new Set<string>()
  for (const [key, row] of latest) {
    if (row.snoozeUntil) {
      // Snoozed: suppressed only while the date is still ahead of us.
      if (daysFrom(dateOnly(row.snoozeUntil), now) > 0) out.add(key)
      continue
    }
    out.add(key)
  }
  return out
}

// --- the derivation --------------------------------------------------------

const GROUP_ORDER: Record<WorkItemGroup, number> = { overdue: 0, fortnight: 1, later: 2 }
const URGENCY_ORDER: Record<WorkItem['urgency'], number> = { now: 0, soon: 1, info: 2 }
/**
 * Tie-break inside a group. A follow-up the user set themselves outranks
 * anything HQ derived for them - it is their own commitment with their own
 * date on it, and it is what the spec's definition of done expects at the top
 * of the list.
 */
const KIND_ORDER: Record<WorkItemKind, number> = {
  register_empty: 0,
  follow_up_due: 1,
  fixed_term_ending: 2,
  minimum_period: 3,
  record_gap: 4,
  casual_tenure: 5,
  award_unconfirmed: 6,
}

export function buildWorklist(input: WorklistInput): Worklist {
  const now = input.now ?? new Date()
  const events = input.events ?? []
  const active = (input.employees ?? []).filter(e => e.status === 'active')

  // --- the first-run item (spec s6.1) --------------------------------------
  // An empty register is the most likely real state, so it is the FIRST work
  // item rather than a "nothing to do" pat on the head. It is not
  // dismissible: clearing it would leave a blank tab.
  if (active.length === 0) {
    const band = (input.statedHeadcount ?? '').trim()
    const asNumber = /^\d+$/.test(band) ? Number(band) : null
    const fact = band
      ? asNumber !== null
        ? `You told us you have around ${asNumber} ${asNumber === 1 ? 'person' : 'people'}. None of them are on the register yet.`
        : `You told us your team is ${band} people. None of them are on the register yet.`
      : 'No one is on your employee register yet.'
    const item: WorkItem = {
      key: 'register:empty',
      kind: 'register_empty',
      fact,
      because:
        'HQ cannot keep track of dates it does not have. Add the people you employ and the Assistant starts watching the dates that matter.',
      urgency: 'now',
      group: 'overdue',
      action: { type: 'add_people' },
      dismissible: false,
    }
    return { items: [item], counts: { attention: 1, upcoming: 0, total: 1 }, firstRun: true }
  }

  const byId = new Map(active.map(e => [e.id, e]))
  const eventsFor = new Map<string, WorklistEvent[]>()
  for (const ev of events) {
    if (!ev.employee_id) continue
    // An event can reference someone outside what this caller may see (the
    // trail and the register are filtered by the same RLS, but belt and
    // braces - a name must never arrive through the event path).
    if (!byId.has(ev.employee_id)) continue
    const list = eventsFor.get(ev.employee_id) ?? []
    list.push(ev)
    eventsFor.set(ev.employee_id, list)
  }

  const out: WorkItem[] = []
  const push = (item: Omit<WorkItem, 'group' | 'dismissible'>, days: number | null) => {
    out.push({ ...item, group: groupFor(days, item.urgency), dismissible: true })
  }

  // --- 1. file-note follow-ups ---------------------------------------------
  // Written by FileNoteComposer into metadata.follow_up_date and read by
  // nothing else today. Validated per the spec s6.4: bad or missing values
  // produce no item rather than an error.
  for (const ev of events) {
    const iso = asDateOnly(metaOf(ev).follow_up_date)
    if (!iso) continue
    if (!ev.employee_id) continue
    const emp = byId.get(ev.employee_id)
    if (!emp) continue
    const due = dateOnly(iso)
    const days = daysFrom(due, now)
    if (days > FOLLOW_UP_LEAD_DAYS) continue
    if (days < -FOLLOW_UP_STALE_DAYS) continue

    const name = employeeName(emp)
    const topic = typeof metaOf(ev).topic === 'string' ? String(metaOf(ev).topic).trim() : ''
    push({
      key: `follow_up:${ev.id}`,
      kind: 'follow_up_due',
      employeeId: emp.id,
      name,
      fact: topic
        ? `You set a follow-up for ${formatDate(due)} on ${name}'s file note about ${topic}.`
        : `You set a follow-up for ${formatDate(due)} on a file note about ${name}.`,
      because:
        days < 0
          ? `That date passed ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago.`
          : days === 0
            ? 'That is today.'
            : `That is ${days} ${days === 1 ? 'day' : 'days'} away.`,
      dueOn: iso,
      urgency: days <= 0 ? 'now' : 'soon',
      action: { type: 'write_file_note', employeeId: emp.id },
    }, days)
  }

  // --- 2. record gaps -------------------------------------------------------
  for (const emp of active) {
    const list = eventsFor.get(emp.id) ?? []
    const serviceDays = daysFrom(dateOnly(emp.start_date), now) * -1
    if (!Number.isFinite(serviceDays) || serviceDays < GAP_GRACE_DAYS) continue

    const docTypes = list
      .filter(e => e.event_type === 'document_linked')
      .map(e => String(metaOf(e).doc_type ?? ''))
    const gaps = computeGaps(emp, list, docTypes, input.headcount, now)
    const name = employeeName(emp)
    const months = monthsOfService(emp.start_date, now)

    for (const miss of gaps.missing.slice(0, MAX_GAPS_PER_PERSON)) {
      // Commencement items were due the day they started; a probation review
      // is due before the minimum employment period runs out.
      const minEnds = miss.key === 'probation_review'
        ? minimumPeriodEndsOn(emp.start_date, input.headcount)
        : null
      const dueDate = minEnds ?? dateOnly(emp.start_date)
      const days = daysFrom(dueDate, now)
      push({
        key: `gap:${emp.id}:${miss.key}`,
        kind: 'record_gap',
        employeeId: emp.id,
        name,
        // `noun`, not `label`: the labels are phrased as completed states
        // ("Fair Work Information Statement given"), which reads as a double
        // negative inside a sentence about something missing.
        fact: `${name} started on ${formatDate(dateOnly(emp.start_date))}. Their record does not show ${miss.noun}.`,
        because: miss.why,
        dueOn: toIso(dueDate),
        urgency: months >= 1 ? 'now' : 'soon',
        action: { type: 'open_record', employeeId: emp.id },
      }, days)
    }
  }

  // --- 3. minimum employment period ----------------------------------------
  for (const emp of active) {
    if (emp.employment_type === 'contractor') continue
    const ends = minimumPeriodEndsOn(emp.start_date, input.headcount)
    if (!ends) continue
    const days = daysFrom(ends, now)
    if (days <= 0 || days > MINIMUM_PERIOD_LEAD_DAYS) continue
    const name = employeeName(emp)
    push({
      key: `min_period:${emp.id}`,
      kind: 'minimum_period',
      employeeId: emp.id,
      name,
      fact: `${name} has been with you ${monthsOfService(emp.start_date, now)} months. Their minimum employment period ends on ${formatDate(ends)}.`,
      because: days <= 30 ? 'That is under a month away.' : 'Worth knowing before that date passes.',
      dueOn: toIso(ends),
      urgency: days <= 30 ? 'now' : 'soon',
      action: { type: 'open_record', employeeId: emp.id },
    }, days)
  }

  // --- 4. casual tenure -----------------------------------------------------
  for (const emp of active) {
    if (emp.employment_type !== 'casual') continue
    const months = monthsOfService(emp.start_date, now)
    if (months < 6) continue
    const band = months >= 12 ? '12' : '6'
    const name = employeeName(emp)
    push({
      // Keyed on the band, so passing 12 months raises a fresh item even if
      // the 6-month one was cleared.
      key: `casual:${emp.id}:${band}`,
      kind: 'casual_tenure',
      employeeId: emp.id,
      name,
      fact: `${name} has been casual with you for ${months} months.`,
      because: 'Casual conversion has timing rules once someone passes 6 or 12 months.',
      urgency: months >= 12 ? 'now' : 'soon',
      action: { type: 'ask_advisor', prompt: 'How does casual conversion work?' },
    }, null)
  }

  // --- 5. fixed-term contracts ending --------------------------------------
  for (const emp of active) {
    const iso = asDateOnly(emp.fixed_term_end)
    if (!iso) continue
    const end = dateOnly(iso)
    const days = daysFrom(end, now)
    if (days > FIXED_TERM_LEAD_DAYS || days < -FIXED_TERM_STALE_DAYS) continue
    const name = employeeName(emp)
    push({
      key: `fixed_term:${emp.id}`,
      kind: 'fixed_term_ending',
      employeeId: emp.id,
      name,
      fact: `${name}'s fixed-term contract is recorded as ending on ${formatDate(end)}.`,
      because:
        days < 0
          ? `That date passed ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago.`
          : days === 0
            ? 'That is today.'
            : `That is ${days} ${days === 1 ? 'day' : 'days'} away.`,
      dueOn: iso,
      urgency: days <= 14 ? 'now' : 'soon',
      action: { type: 'open_record', employeeId: emp.id },
    }, days)
  }

  // --- 6. award not confirmed ----------------------------------------------
  // One aggregate row rather than one per person: it is the same question
  // once, and a per-person row would crowd out everything else on a new
  // register. The count comes from the VISIBLE rows (s6.6), never headcount.
  const unconfirmed = active.filter(e => !e.award_confirmed && e.employment_type !== 'contractor')
  if (unconfirmed.length > 0) {
    push({
      key: 'award_unconfirmed:all',
      kind: 'award_unconfirmed',
      fact: `${unconfirmed.length} of your team ${unconfirmed.length === 1 ? 'does' : 'do'} not have a confirmed award on file.`,
      because: 'Pay questions depend on the award, so this is worth pinning down.',
      urgency: 'info',
      action: { type: 'ask_advisor', prompt: 'Which award covers my business?' },
    }, null)
  }

  // --- suppression + ordering ----------------------------------------------
  const suppressed = suppressedKeys(events, now)
  const items = out
    .filter(i => !suppressed.has(i.key))
    .sort((a, b) =>
      GROUP_ORDER[a.group] - GROUP_ORDER[b.group] ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
      (a.dueOn ?? '9999-12-31').localeCompare(b.dueOn ?? '9999-12-31') ||
      a.key.localeCompare(b.key),
    )

  const attention = items.filter(i => i.group !== 'later').length
  return {
    items,
    counts: { attention, upcoming: items.length - attention, total: items.length },
    firstRun: false,
  }
}

/** Group labels for the panel headings. */
export const GROUP_LABELS: Record<WorkItemGroup, string> = {
  overdue: 'Overdue',
  fortnight: 'This fortnight',
  later: 'Coming up',
}
