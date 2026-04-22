// Shared helpers for Phase 4 candidate outcome emails.
// Triggered from PATCH stage, bulk stage, and manual send endpoints.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendCandidateOutcomeEmail } from '@/lib/email'
import {
  renderOutcomeTemplate,
  extractCandidateFirstName,
} from '@/lib/outcome-templates'

type Outcome = 'shortlisted' | 'rejected'

interface ProcessArgs {
  responseId: string
  outcome: Outcome
  triggeredBy: string
  staffEmail?: string | null
  subjectOverride?: string | null
  bodyOverride?: string | null
  force?: boolean
}

interface ProcessResult {
  skipped: 'already_sent' | 'missing_data' | null
  emailSent: boolean
  pendingOnly: boolean
  event?: { id: string; email_sent: boolean } | null
  error?: string
}

/**
 * Process an outcome transition. Returns info the caller can use for a toast.
 *   - If a prior event exists with email_sent=true for (response_id, outcome),
 *     do nothing (idempotent).
 *   - Else if auto_send_outcomes AND not forced-pending: render + send + insert event.
 *   - Else: insert a pending event with email_sent=false.
 * Errors from send do not throw - they are recorded on the event row.
 */
export async function processOutcomeForResponse(args: ProcessArgs): Promise<ProcessResult> {
  const { responseId, outcome, triggeredBy, staffEmail, subjectOverride, bodyOverride, force } = args

  const { data: existing } = await supabaseAdmin
    .from('prescreen_outcome_events')
    .select('id, email_sent')
    .eq('response_id', responseId)
    .eq('outcome', outcome)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.email_sent) {
    return { skipped: 'already_sent', emailSent: false, pendingOnly: false, event: existing }
  }

  // Fetch response + session + business details
  const { data: response } = await supabaseAdmin
    .from('prescreen_responses')
    .select('id, session_id, candidate_name, candidate_email')
    .eq('id', responseId)
    .single()

  if (!response) return { skipped: 'missing_data', emailSent: false, pendingOnly: false, error: 'response not found' }

  const { data: session } = await supabaseAdmin
    .from('prescreen_sessions')
    .select('id, company, role_title, auto_send_outcomes, outcome_email_shortlisted, outcome_email_rejected, calendly_url_override, created_by')
    .eq('id', response.session_id)
    .single()

  if (!session) return { skipped: 'missing_data', emailSent: false, pendingOnly: false, error: 'session not found' }

  // Resolve calendly_url: session override, then business default
  let calendlyUrl: string | null = session.calendly_url_override ?? null
  if (!calendlyUrl) {
    const { data: creator } = await supabaseAdmin
      .from('profiles')
      .select('business_id')
      .eq('id', session.created_by)
      .single()
    if (creator?.business_id) {
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('calendly_url')
        .eq('id', creator.business_id)
        .single()
      if (biz?.calendly_url) calendlyUrl = biz.calendly_url
    }
  }

  // Pick the per-outcome stored body (subject+body lumped in one TEXT per column).
  // Convention: stored text is either a JSON blob { subject, body } or plain body.
  const raw = outcome === 'shortlisted' ? session.outcome_email_shortlisted : session.outcome_email_rejected
  let override: { subject?: string | null; body?: string | null } | null = null
  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        override = { subject: parsed.subject ?? null, body: parsed.body ?? null }
      } else {
        override = { body: raw }
      }
    } catch {
      override = { body: raw }
    }
  }
  if (subjectOverride !== undefined || bodyOverride !== undefined) {
    override = { subject: subjectOverride ?? override?.subject ?? null, body: bodyOverride ?? override?.body ?? null }
  }

  const vars = {
    candidate_first_name: extractCandidateFirstName(response.candidate_name),
    candidate_name: response.candidate_name,
    role_title: session.role_title,
    company: session.company,
    calendly_url: calendlyUrl,
  }
  const rendered = renderOutcomeTemplate(outcome, override, vars)

  const shouldSend = !!session.auto_send_outcomes || !!force

  if (!shouldSend) {
    // Insert pending event so UI can show "Send now"
    const { data: pending } = await supabaseAdmin
      .from('prescreen_outcome_events')
      .insert({
        response_id: responseId,
        outcome,
        email_sent: false,
        email_to: response.candidate_email,
        email_subject: rendered.subject,
        email_body: rendered.body,
        triggered_by: triggeredBy,
      })
      .select('id, email_sent')
      .single()

    return { skipped: null, emailSent: false, pendingOnly: true, event: pending }
  }

  // Send
  let sent = false
  try {
    const result = await sendCandidateOutcomeEmail({
      toEmail: response.candidate_email,
      toName: response.candidate_name,
      subject: rendered.subject,
      body: rendered.body,
      company: session.company,
      replyTo: staffEmail || undefined,
    })
    sent = !!result?.ok
  } catch (err) {
    console.error('[outcome-service] send failed', err)
    sent = false
  }

  const { data: ev } = await supabaseAdmin
    .from('prescreen_outcome_events')
    .insert({
      response_id: responseId,
      outcome,
      email_sent: sent,
      email_to: response.candidate_email,
      email_subject: rendered.subject,
      email_body: rendered.body,
      triggered_by: triggeredBy,
    })
    .select('id, email_sent')
    .single()

  return { skipped: null, emailSent: sent, pendingOnly: !sent, event: ev }
}
