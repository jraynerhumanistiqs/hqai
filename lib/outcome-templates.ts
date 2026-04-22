// HQ.ai Phase 4 - Candidate outcome email templates + helpers.
// Rejection copy is deliberately scorecard-free: no scores, AI output, notes or rubric.

export interface OutcomeTemplate {
  subject: string
  body: string
}

export const DEFAULT_SHORTLISTED_TEMPLATE: OutcomeTemplate = {
  subject: 'Next steps — {role_title} at {company}',
  body: `Hi {candidate_first_name},

Thanks again for your video interview for the {role_title} role at {company}.

We were impressed with your responses and would love to move you to the next stage.

{calendly_block}

Kind regards,
The {company} team`,
}

export const DEFAULT_REJECTED_TEMPLATE: OutcomeTemplate = {
  subject: 'Update on your application — {role_title} at {company}',
  body: `Hi {candidate_first_name},

Thank you for taking the time to complete the video interview for the {role_title} role at {company}.

After careful consideration we've decided to move forward with other candidates on this occasion.

We genuinely appreciate the effort you put in and wish you the very best in your search.

Kind regards,
The {company} team`,
}

export interface OutcomeVars {
  candidate_first_name?: string
  candidate_name?: string
  role_title?: string
  company?: string
  calendly_url?: string | null
}

export function extractCandidateFirstName(name: string | null | undefined): string {
  if (!name) return 'there'
  const trimmed = name.trim()
  if (!trimmed) return 'there'
  const first = trimmed.split(/\s+/)[0]
  return first || 'there'
}

/**
 * Substitute {variable} placeholders in a template string.
 * Missing vars collapse to empty strings - never leaks "undefined".
 * Also handles the {calendly_block} marker: present -> insert the Calendly line,
 * absent -> strip the placeholder (and any trailing blank line created by it).
 */
export function substituteVars(template: string, vars: OutcomeVars): string {
  const safe = (v: string | null | undefined) => (v == null ? '' : String(v))

  const calendlyBlock = vars.calendly_url
    ? `You can book a convenient time here: ${vars.calendly_url}`
    : ''

  let out = template

  // {calendly_block} - strip surrounding blank lines when empty
  if (calendlyBlock) {
    out = out.replace(/\{calendly_block\}/g, calendlyBlock)
  } else {
    // eat the placeholder plus one surrounding blank line to avoid double-gap
    out = out.replace(/\n\n\{calendly_block\}\n\n/g, '\n\n')
    out = out.replace(/\{calendly_block\}\n?/g, '')
  }

  const map: Record<string, string> = {
    candidate_first_name: safe(vars.candidate_first_name),
    candidate_name: safe(vars.candidate_name),
    role_title: safe(vars.role_title),
    company: safe(vars.company),
    calendly_url: safe(vars.calendly_url ?? ''),
  }

  out = out.replace(/\{(\w+)\}/g, (_m, key: string) =>
    Object.prototype.hasOwnProperty.call(map, key) ? map[key] : ''
  )

  return out
}

/**
 * Render a stored template (subject + body) for an outcome using the defaults
 * when the override is empty/null.
 */
export function renderOutcomeTemplate(
  outcome: 'shortlisted' | 'rejected',
  override: { subject?: string | null; body?: string | null } | null | undefined,
  vars: OutcomeVars,
): { subject: string; body: string } {
  const def = outcome === 'shortlisted' ? DEFAULT_SHORTLISTED_TEMPLATE : DEFAULT_REJECTED_TEMPLATE
  const subjectTpl = (override?.subject && override.subject.trim()) ? override.subject : def.subject
  const bodyTpl = (override?.body && override.body.trim()) ? override.body : def.body
  return {
    subject: substituteVars(subjectTpl, vars),
    body: substituteVars(bodyTpl, vars),
  }
}
