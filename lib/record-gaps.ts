// Evidence-gap indicator - what is MISSING from a person's record before it
// matters.
//
// The checklist is derived from the bare-minimum process register (the 21
// "get it right early or pay later" processes, BMP-001..021), restricted to the
// per-hire items that produce a record. Each requirement can be satisfied two
// ways: an explicit event on the trail, or a linked document of the right type
// (a generated employment contract is evidence a contract was issued).
//
// This is a completeness read on the user's own data - a list of what is on
// file and what is not. It does not tell them what to do about it.

import type { ComplianceEvent, Employee, EmploymentType } from './employees'
import { monthsOfService, minimumEmploymentPeriodMonths } from './employees'

export interface Requirement {
  key: string
  label: string
  /** The bare-minimum process this requirement comes from. */
  bmp: string
  /** Event types on the trail that satisfy it. */
  events: string[]
  /** documents.type slugs (as written by the generators) that satisfy it. */
  docTypes: string[]
  /** Short plain reason it matters - shown when it is missing. */
  why: string
}

const CONTRACT: Requirement = {
  key: 'contract',
  label: 'Written contract on file',
  bmp: 'BMP-010',
  events: ['contract_issued'],
  docTypes: ['employment-contract', 'contract', 'letter-of-offer', 'confirmation-of-employment-letter'],
  why: 'Without one, the terms fall back to the bare minimums and you have nothing to point to.',
}
const FWIS: Requirement = {
  key: 'fwis',
  label: 'Fair Work Information Statement given',
  bmp: 'BMP-013',
  events: ['fwis_provided'],
  docTypes: [],
  why: 'Has to be given to every new employee on commencement.',
}
const CEIS: Requirement = {
  key: 'ceis',
  label: 'Casual Employment Information Statement given',
  bmp: 'BMP-013',
  events: ['ceis_provided'],
  docTypes: [],
  why: 'Casuals get this one as well, on commencement and again at intervals.',
}
const FTCIS: Requirement = {
  key: 'ftcis',
  label: 'Fixed Term Contract Information Statement given',
  bmp: 'BMP-011',
  events: ['ftcis_provided'],
  docTypes: [],
  why: 'Required each time a fixed-term contract is entered into.',
}
const RIGHT_TO_WORK: Requirement = {
  key: 'right_to_work',
  label: 'Right-to-work check recorded',
  bmp: 'BMP-009',
  events: ['right_to_work_check'],
  docTypes: [],
  why: 'A dated check is your record that you looked before they started.',
}
const SUPER_CHOICE: Requirement = {
  key: 'super_choice',
  label: 'Super choice / stapled fund sorted',
  bmp: 'BMP-014',
  events: ['super_choice'],
  docTypes: [],
  why: 'Paying a default fund without the stapled-fund check creates a shortfall.',
}
const CONTRACTOR_AGREEMENT: Requirement = {
  key: 'contractor_agreement',
  label: 'Contractor agreement on file',
  bmp: 'BMP-012',
  events: ['contractor_agreement'],
  docTypes: ['contractor-agreement', 'services-agreement'],
  why: 'The written terms are the starting point if the arrangement is ever questioned.',
}
const PROBATION_REVIEW: Requirement = {
  key: 'probation_review',
  label: 'Probation review recorded',
  bmp: 'BMP-001',
  events: ['probation_review', 'probation_decision'],
  docTypes: ['probationary-period-review-form'],
  why: 'A documented review inside the minimum employment period is what keeps the decision simple.',
}

/** Requirements by employment type. Order = display order. */
export function requirementsFor(type: EmploymentType): Requirement[] {
  switch (type) {
    case 'casual':      return [CONTRACT, FWIS, CEIS, RIGHT_TO_WORK, SUPER_CHOICE]
    case 'fixed_term':  return [CONTRACT, FWIS, FTCIS, RIGHT_TO_WORK, SUPER_CHOICE]
    case 'contractor':  return [CONTRACTOR_AGREEMENT, RIGHT_TO_WORK]
    case 'full_time':
    case 'part_time':
    default:            return [CONTRACT, FWIS, RIGHT_TO_WORK, SUPER_CHOICE, PROBATION_REVIEW]
  }
}

export interface GapItem extends Requirement {
  satisfied: boolean
  /** How it was satisfied, when it was. */
  via?: 'event' | 'document'
  /** For probation: not yet due, so not a gap. */
  notYetDue?: boolean
}

export interface GapSummary {
  items: GapItem[]
  satisfied: number
  total: number
  missing: GapItem[]
}

/**
 * Compute the completeness of one person's record.
 * `documentTypes` = the `type` slugs of documents linked to this person.
 */
export function computeGaps(
  employee: Employee,
  // Only event_type is read, so callers can pass slim rows (the list endpoint
  // fetches just employee_id + event_type + metadata for the whole business).
  events: Array<Pick<ComplianceEvent, 'event_type'>>,
  documentTypes: string[],
  headcount: number,
  now: Date = new Date(),
): GapSummary {
  const eventTypes = new Set(events.map(e => e.event_type))
  const docs = new Set(documentTypes.map(d => d.toLowerCase()))

  const items: GapItem[] = requirementsFor(employee.employment_type).map(r => {
    let via: GapItem['via']
    if (r.events.some(t => eventTypes.has(t))) via = 'event'
    else if (r.docTypes.some(t => docs.has(t))) via = 'document'

    const item: GapItem = { ...r, satisfied: Boolean(via), via }

    // Probation review is only "missing" once the person is far enough in
    // for a review to be due (past the first month), and only while the
    // minimum employment period is still running.
    if (r.key === 'probation_review' && !item.satisfied) {
      const months = monthsOfService(employee.start_date, now)
      const period = minimumEmploymentPeriodMonths(headcount)
      if (months < 1 || months >= period) item.notYetDue = true
    }
    return item
  })

  const counted = items.filter(i => !i.notYetDue)
  const satisfied = counted.filter(i => i.satisfied).length
  return {
    items,
    satisfied,
    total: counted.length,
    missing: counted.filter(i => !i.satisfied),
  }
}
