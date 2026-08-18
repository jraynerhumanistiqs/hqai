// Shared option lists for the settings form. Kept in one place so the
// multi-selects, the awards editor and the AI Advisor prefs stay in sync.

export const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const

// Headcount bands. The first boundary is deliberately 1-14 / 15-30: a business
// with 15+ employees is no longer a "small business" under the Fair Work Act
// (which changes obligations - e.g. unfair dismissal, small-business codes), so
// the band edge sits on that legal threshold.
export const HEADCOUNTS = ['1-14', '15-30', '31-80', '81-150', '151-250', '251+'] as const

export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Casual',
  'Fixed-term contract',
  'Apprentice or Trainee',
  'Independent contractor',
  'Labour hire',
] as const

export const INDUSTRIES = [
  'Retail', 'Hospitality & Food Service', 'Healthcare & Aged Care', 'Pharmacy',
  'Construction & Trades', 'Professional Services', 'Education & Childcare',
  'Community Services & NFP', 'Technology', 'Other',
] as const

// Expanded Modern Award list (common AU awards). Multi-select, so the old
// meta-options ("Multiple awards apply") are dropped - you just pick each one.
export const AWARDS = [
  'General Retail Industry Award',
  'Fast Food Industry Award',
  'Hospitality Industry (General) Award',
  'Restaurant Industry Award',
  'Pharmacy Industry Award',
  'Aged Care Award',
  'Nurses Award',
  'Health Professionals and Support Services Award',
  'Social, Community, Home Care and Disability Services (SCHADS) Award',
  "Children's Services Award",
  'Educational Services (Schools) General Staff Award',
  'Educational Services (Teachers) Award',
  'Building and Construction General On-site Award',
  'Manufacturing and Associated Industries and Occupations Award',
  'Clerks - Private Sector Award',
  'Professional Employees Award',
  'Cleaning Services Award',
  'Road Transport and Distribution Award',
  'Vehicle Repair, Services and Retail Award',
  'Hair and Beauty Industry Award',
  'Fitness Industry Award',
  'Real Estate Industry Award',
  'Security Services Industry Award',
  'Electrical, Electronic and Communications Contracting Award',
  'Plumbing and Fire Sprinklers Award',
  'Miscellaneous Award',
  'Award-free / Enterprise Agreement',
  'Not sure',
] as const

export const ADVISOR_TONES = ['Formal', 'Balanced', 'Friendly'] as const
export const ADVISOR_DETAILS = ['Concise', 'Standard', 'Detailed'] as const

export interface AwardEntry {
  name: string
  tier: 'primary' | 'secondary'
  roles: string
}

// Split / join helpers for the comma-joined multi-select columns.
export const splitCsv = (s: string | null | undefined): string[] =>
  (s || '').split(',').map(x => x.trim()).filter(Boolean)
export const joinCsv = (a: string[]): string => a.join(', ')
