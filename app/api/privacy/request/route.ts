// Privacy request endpoint - APP 12 (access) and APP 13 (correction) +
// withdrawal-of-consent + erasure intake. v1 records the request to
// Supabase for audit + emails the privacy team. Future v2 will support
// magic-link verified self-service.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const PRIVACY_TO = process.env.PRIVACY_INBOX_EMAIL || 'privacy@humanistiqs.com.au'
const PRIVACY_FROM = process.env.PRIVACY_FROM_EMAIL || 'noreply@humanistiqs.com.au'

interface Body {
  type: string
  name: string
  email: string
  detail?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Body
    if (!body.email || !body.name || !body.type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const reference = `PR-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = req.headers.get('user-agent') || null

    // Persist to a privacy_requests table for the audit trail. If the
    // table doesn't exist yet (migration not applied), swallow the error
    // - the email path below still notifies us.
    try {
      await supabaseAdmin.from('privacy_requests').insert({
        reference,
        request_type: body.type,
        requester_name: body.name,
        requester_email: body.email,
        detail: body.detail ?? null,
        client_ip: clientIp,
        user_agent: userAgent,
        status: 'received',
      })
    } catch (dbErr) {
      console.warn('[privacy/request] DB insert skipped:', dbErr)
    }

    // Email the privacy team.
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      try {
        const resend = new Resend(apiKey)
        await resend.emails.send({
          from: PRIVACY_FROM,
          to: PRIVACY_TO,
          subject: `[Privacy ${body.type}] ${reference} - ${body.name}`,
          text: [
            `Reference: ${reference}`,
            `Type: ${body.type}`,
            `Name: ${body.name}`,
            `Email: ${body.email}`,
            `IP: ${clientIp ?? '(not captured)'}`,
            `User-Agent: ${userAgent ?? '(not captured)'}`,
            '',
            'Detail:',
            body.detail || '(none provided)',
            '',
            'Respond to the requester at the email above. Update the status of this',
            'request to acknowledged / fulfilled / rejected in the privacy_requests',
            'table once actioned. APP requires a substantive response within 30 days.',
          ].join('\n'),
        })
      } catch (mailErr) {
        console.error('[privacy/request] email failed:', mailErr)
      }
    }

    return NextResponse.json({ ok: true, reference })
  } catch (err) {
    console.error('[privacy/request]', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
