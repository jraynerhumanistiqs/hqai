// POST /api/enterprise-inquiry
//
// Captures a discovery-call inquiry from the /enterprise page. Backs
// the Enterprise tier funnel described in docs/research/enterprise-tier-strategy.md §5.
//
// Inserts into public.enterprise_inquiries via supabaseAdmin (the table
// has RLS enabled with no policies; service-role bypasses), then sends
// two transactional emails via Resend:
//   1. Founder notification to jrayner@humanistiqs.com.au for triage.
//   2. Inquirer confirmation signed by the founder.
//
// Uses the service-role admin client for the write + email side-effect,
// with no auth required (same pattern as the public prescreen routes).

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  sendEnterpriseInquiryEmail,
  sendEnterpriseInquiryConfirmation,
} from '@/lib/email'

export const runtime = 'nodejs'

const FOUNDER_EMAIL = 'jrayner@humanistiqs.com.au'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VARIANT_VALUES = ['people', 'recruit', 'full', 'unsure'] as const
type VariantInterest = (typeof VARIANT_VALUES)[number]

const URGENCY_VALUES = ['this-month', 'next-month', 'this-quarter', 'exploring'] as const
type Urgency = (typeof URGENCY_VALUES)[number]

const STAFF_BUCKETS = ['Under 30', '30-50', '50-150', '150+'] as const

// Multiplier-relevant optional fields (added May 2026 with the
// enterprise sliding-scale schedule). Captured here so the founder can
// quote the effective price before the discovery call. Empty submissions
// stay valid - the legacy form never sent these.
const ENTITY_COUNT_VALUES = ['1', '2-3', '4-5', '6+'] as const
const ANNUAL_HIRING_VOLUME_VALUES = ['under-30', '30-60', '60-100', '100-plus'] as const

interface InquiryBody {
  full_name?: unknown
  work_email?: unknown
  business_name?: unknown
  staff_headcount?: unknown
  variant_interest?: unknown
  current_spend?: unknown
  urgency?: unknown
  notes?: unknown
  consent?: unknown
  entity_count?: unknown
  annual_hiring_volume?: unknown
}

function asTrimmed(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(req: Request) {
  let body: InquiryBody
  try {
    body = (await req.json()) as InquiryBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const fullName = asTrimmed(body.full_name, 120)
  const workEmail = asTrimmed(body.work_email, 320).toLowerCase()
  const businessName = asTrimmed(body.business_name, 200)
  const staffHeadcount = asTrimmed(body.staff_headcount, 40)
  const variantInterestRaw = asTrimmed(body.variant_interest, 20)
  const urgencyRaw = asTrimmed(body.urgency, 30)
  const currentSpend = asTrimmed(body.current_spend, 500) || null
  const notes = asTrimmed(body.notes, 2000) || null
  const consent = body.consent === true

  // Optional multiplier-relevant fields. Empty = not provided; treat as
  // null. Unknown values are dropped silently rather than rejected so a
  // legacy form post never 400s on these.
  const entityCountRaw = asTrimmed(body.entity_count, 10)
  const entityCount =
    entityCountRaw && (ENTITY_COUNT_VALUES as readonly string[]).includes(entityCountRaw)
      ? entityCountRaw
      : null
  const annualHiringVolumeRaw = asTrimmed(body.annual_hiring_volume, 20)
  const annualHiringVolume =
    annualHiringVolumeRaw &&
    (ANNUAL_HIRING_VOLUME_VALUES as readonly string[]).includes(annualHiringVolumeRaw)
      ? annualHiringVolumeRaw
      : null

  if (!fullName) {
    return NextResponse.json({ error: 'Your name is required.' }, { status: 400 })
  }
  if (!workEmail || !EMAIL_RE.test(workEmail)) {
    return NextResponse.json({ error: 'A valid work email is required.' }, { status: 400 })
  }
  if (!businessName) {
    return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
  }
  if (!staffHeadcount || !STAFF_BUCKETS.includes(staffHeadcount as (typeof STAFF_BUCKETS)[number])) {
    return NextResponse.json({ error: 'Please select a staff headcount band.' }, { status: 400 })
  }
  if (!VARIANT_VALUES.includes(variantInterestRaw as VariantInterest)) {
    return NextResponse.json({ error: 'Please select which Enterprise variant interests you.' }, { status: 400 })
  }
  if (!URGENCY_VALUES.includes(urgencyRaw as Urgency)) {
    return NextResponse.json({ error: 'Please tell us when you need this in place.' }, { status: 400 })
  }
  if (!consent) {
    return NextResponse.json({ error: 'Please confirm you agree to be contacted.' }, { status: 400 })
  }

  const variantInterest = variantInterestRaw as VariantInterest
  const urgency = urgencyRaw as Urgency

  // Founder still wants to see below-threshold submissions but flagged
  // for triage - don't auto-decline. The founder makes the call.
  const belowThreshold = staffHeadcount === 'Under 30'

  // Capture the first hop only of x-forwarded-for to avoid storing a
  // proxy chain; useful when a single business spams the form.
  const xff = req.headers.get('x-forwarded-for') || ''
  const inquirerIp = xff.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent') || null

  try {
    const { data: inserted, error } = await supabaseAdmin
      .from('enterprise_inquiries')
      .insert({
        full_name: fullName,
        work_email: workEmail,
        business_name: businessName,
        staff_headcount: staffHeadcount,
        variant_interest: variantInterest,
        current_spend: currentSpend,
        urgency,
        notes,
        entity_count: entityCount,
        annual_hiring_volume: annualHiringVolume,
        inquirer_ip: inquirerIp,
        inquirer_user_agent: userAgent,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      console.error('[enterprise-inquiry] insert error:', error)
      return NextResponse.json({
        error: 'Could not record your inquiry. Try again in a moment.',
        detail: error?.message ?? 'unknown',
      }, { status: 500 })
    }

    // Fire-and-don't-wait emails. We've already persisted the inquiry;
    // an email send failure must not block the success response.
    await Promise.allSettled([
      sendEnterpriseInquiryEmail({
        toEmail: FOUNDER_EMAIL,
        inquiryId: inserted.id,
        fullName,
        workEmail,
        businessName,
        staffHeadcount,
        variantInterest,
        urgency,
        currentSpend,
        notes,
        entityCount,
        annualHiringVolume,
        belowThreshold,
        inquirerIp,
      }),
      sendEnterpriseInquiryConfirmation({
        toEmail: workEmail,
        fullName,
        businessName,
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[enterprise-inquiry] unexpected:', e)
    return NextResponse.json({ error: 'Server error.', detail: message }, { status: 500 })
  }
}
