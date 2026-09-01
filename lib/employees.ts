// HQ People - employee register + evidence trail domain types and helpers.
//
// The register is the source of truth the compliance clock derives dates from.
// Date of birth is deliberately not collected (see the migration header): the
// only v1 rule needing it is the over-45 extra week of notice, handled as a
// prompt at termination instead.

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'casual',
  'fixed_term',
  'contractor',
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full time',
  part_time: 'Part time',
  casual: 'Casual',
  fixed_term: 'Fixed term',
  contractor: 'Contractor',
}

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const
export type AuState = (typeof AU_STATES)[number]

export interface Employee {
  id: string
  business_id: string
  first_name: string
  last_name: string | null
  email: string | null
  job_title: string | null
  start_date: string
  end_date: string | null
  employment_type: EmploymentType
  fixed_term_end: string | null
  award: string | null
  classification: string | null
  award_confirmed: boolean
  state: AuState | null
  status: 'active' | 'ended'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ComplianceEvent {
  id: string
  business_id: string
  employee_id: string | null
  event_type: string
  title: string
  detail: string | null
  occurred_at: string
  recorded_by: string | null
  document_id: string | null
  bmp_code: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * Event types the trail records. Kept as a plain map (not a DB enum) so new
 * process types can be added without a migration - the column is free text by
 * design. `bmp_code` links back to the bare-minimum process register.
 */
export const EVENT_TYPES: Record<string, { label: string; bmp?: string }> = {
  employee_added:      { label: 'Employee added to register' },
  employee_updated:    { label: 'Employee details updated' },
  employee_ended:      { label: 'Employment ended' },
  contract_issued:     { label: 'Written contract issued', bmp: 'BMP-010' },
  fwis_provided:       { label: 'Fair Work Information Statement provided', bmp: 'BMP-013' },
  ceis_provided:       { label: 'Casual Employment Information Statement provided', bmp: 'BMP-013' },
  right_to_work_check: { label: 'Right-to-work / VEVO check completed', bmp: 'BMP-009' },
  super_choice:        { label: 'Super choice / stapled-fund check', bmp: 'BMP-014' },
  probation_review:    { label: 'Probation review held', bmp: 'BMP-001' },
  probation_decision:  { label: 'Probation outcome decided', bmp: 'BMP-001' },
  performance_note:    { label: 'Performance conversation recorded', bmp: 'BMP-005' },
  casual_conversion:   { label: 'Casual conversion notification / response', bmp: 'BMP-006' },
  flexible_request:    { label: 'Flexible work request response', bmp: 'BMP-016' },
  pay_review:          { label: 'Pay rate reviewed', bmp: 'BMP-003' },
  termination_notice:  { label: 'Termination notice given', bmp: 'BMP-019' },
  other:               { label: 'Other' },
}

export function employeeName(e: Pick<Employee, 'first_name' | 'last_name'>): string {
  return [e.first_name, e.last_name].filter(Boolean).join(' ')
}

/** Whole months of service at `asOf` (defaults to today). */
export function monthsOfService(startDate: string, asOf: Date = new Date()): number {
  const start = new Date(startDate + 'T00:00:00')
  if (Number.isNaN(start.getTime())) return 0
  let months =
    (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth())
  if (asOf.getDate() < start.getDate()) months -= 1
  return Math.max(0, months)
}

/**
 * The minimum employment period before unfair-dismissal access begins:
 * 12 months for a small business (fewer than 15 employees), otherwise 6.
 * Returned as months so callers can render the date themselves.
 *
 * Note: this is a date calculation, not advice. It is surfaced with a prompt to
 * check the position, never as a direction on whether to dismiss.
 */
export function minimumEmploymentPeriodMonths(headcount: number): 6 | 12 {
  return headcount < 15 ? 12 : 6
}

/** The date the minimum employment period ends for an employee. */
export function minimumPeriodEndsOn(startDate: string, headcount: number): Date | null {
  const start = new Date(startDate + 'T00:00:00')
  if (Number.isNaN(start.getTime())) return null
  const d = new Date(start)
  d.setMonth(d.getMonth() + minimumEmploymentPeriodMonths(headcount))
  return d
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  const ms = date.getTime() - new Date(from.toDateString()).getTime()
  return Math.ceil(ms / 86_400_000)
}
