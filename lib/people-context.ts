// Reactive hooks - surfacing the employee register inside the flows people
// actually arrive in.
//
// Why this exists: the research showed SME demand is overwhelmingly REACTIVE
// ("I need to sack someone"), while the compliance value is PROACTIVE (dates
// nobody is tracking). Rather than betting on users visiting a standalone
// compliance page, we attach the record to the moment they already came for.
//
// Boundary note: everything surfaced here is a FACT ABOUT THE USER'S OWN DATA
// (a start date, months of service, a date computed from it). It is never a
// direction on what to do. That keeps it the right side of the line - HQ.ai
// does not advise on employment law.

import { minimumPeriodEndsOn, monthsOfService, type Employee } from './employees'

export type ContextTopic =
  | 'termination'
  | 'probation'
  | 'casual_conversion'
  | 'underpayment'
  | 'performance'
  | 'leave'
  | null

/**
 * Detect what the user is dealing with from their own words. Deliberately
 * conservative - a miss costs nothing (no card shown), a false positive costs
 * attention and trust, so the patterns are specific rather than greedy.
 */
export function detectTopic(text: string): ContextTopic {
  const t = text.toLowerCase()
  if (/\b(sack|fire|fired|firing|terminat|dismiss|let (him|her|them) go|end (his|her|their) employment|redundan)/.test(t)) {
    return 'termination'
  }
  if (/\b(probation|trial period|minimum employment period|first six months|first 6 months)/.test(t)) {
    return 'probation'
  }
  if (/\bcasual\b.*(convert|permanent|conversion)|convert.*casual|employee choice/.test(t)) {
    return 'casual_conversion'
  }
  if (/\b(underpaid|underpaying|underpayment|back ?pay|wrong (rate|award|classification)|wage theft)/.test(t)) {
    return 'underpayment'
  }
  if (/\b(performance|pip|improvement plan|written warning|underperform)/.test(t)) {
    return 'performance'
  }
  if (/\b(annual leave|sick leave|personal leave|carer|parental leave|long service)/.test(t)) {
    return 'leave'
  }
  return null
}

export interface EmployeeSignal {
  employeeId: string
  name: string
  /** Plain-language fact about this person, derived from their own record. */
  fact: string
  /** Why it is being surfaced now. */
  because: string
  urgency: 'info' | 'soon' | 'now'
  daysRemaining?: number
}

function fmt(d: Date) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Given the topic and the business's register, return the facts worth showing.
 * Returns at most `limit` signals, most urgent first.
 *
 * headcount drives the minimum employment period (12 months under 15 staff,
 * otherwise 6) - which is why the register has to know how many people there are.
 */
export function signalsFor(
  topic: ContextTopic,
  employees: Employee[],
  headcount: number,
  now: Date = new Date(),
  limit = 3,
): EmployeeSignal[] {
  if (!topic) return []
  const active = employees.filter(e => e.status === 'active')
  const out: EmployeeSignal[] = []

  const dayMs = 86_400_000
  const daysBetween = (a: Date, b: Date) =>
    Math.ceil((a.getTime() - new Date(b.toDateString()).getTime()) / dayMs)

  if (topic === 'termination' || topic === 'probation' || topic === 'performance') {
    for (const e of active) {
      const ends = minimumPeriodEndsOn(e.start_date, headcount)
      if (!ends) continue
      const days = daysBetween(ends, now)
      const name = [e.first_name, e.last_name].filter(Boolean).join(' ')
      if (days > 0 && days <= 120) {
        out.push({
          employeeId: e.id,
          name,
          fact: `${name} has been with you ${monthsOfService(e.start_date, now)} months. Their minimum employment period ends on ${fmt(ends)}.`,
          because: days <= 30
            ? 'That is under a month away - worth deciding before it passes.'
            : 'Worth knowing before that date passes.',
          urgency: days <= 30 ? 'now' : 'soon',
          daysRemaining: days,
        })
      } else if (days <= 0 && days > -120) {
        out.push({
          employeeId: e.id,
          name,
          fact: `${name} passed their minimum employment period on ${fmt(ends)}.`,
          because: 'The position is different once that date has passed.',
          urgency: 'info',
          daysRemaining: days,
        })
      }
    }
  }

  if (topic === 'casual_conversion') {
    for (const e of active.filter(x => x.employment_type === 'casual')) {
      const months = monthsOfService(e.start_date, now)
      if (months >= 6) {
        const name = [e.first_name, e.last_name].filter(Boolean).join(' ')
        out.push({
          employeeId: e.id,
          name,
          fact: `${name} has been casual with you for ${months} months.`,
          because: 'Casual conversion has timing rules once someone passes 6 or 12 months.',
          urgency: months >= 12 ? 'now' : 'soon',
        })
      }
    }
  }

  if (topic === 'underpayment' || topic === 'leave') {
    const unconfirmed = active.filter(e => !e.award_confirmed)
    if (unconfirmed.length > 0) {
      out.push({
        employeeId: unconfirmed[0].id,
        name: `${unconfirmed.length} ${unconfirmed.length === 1 ? 'person' : 'people'}`,
        fact: `${unconfirmed.length} of your team ${unconfirmed.length === 1 ? 'does' : 'do'} not have a confirmed award on file.`,
        because: 'Pay questions depend on the award, so this is worth pinning down.',
        urgency: 'info',
      })
    }
  }

  const rank = { now: 0, soon: 1, info: 2 } as const
  return out
    .sort((a, b) => rank[a.urgency] - rank[b.urgency] || (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
    .slice(0, limit)
}
