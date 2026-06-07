// POST /api/contact - general (non-Enterprise) enquiry from the public
// /contact page. Emails the founder inbox via Resend. Returns an honest
// error if the key is missing or the send fails, so the form never
// claims success when nothing was sent.

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const FROM = 'HQ.ai <noreply@hq.humanistiqs.ai>'
const TO = 'jrayner@humanistiqs.com.au'

interface Body {
  name?: string
  email?: string
  company?: string
  message?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const name = (body.name || '').trim().slice(0, 200)
  const email = (body.email || '').trim().slice(0, 200)
  const company = (body.company || '').trim().slice(0, 200)
  const message = (body.message || '').trim().slice(0, 5000)

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[contact] no RESEND_API_KEY - enquiry NOT sent', { name, email })
    return NextResponse.json(
      { error: 'Messaging is not configured yet. Please email us directly while we switch this on.' },
      { status: 503 },
    )
  }

  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const subject = `[HQ.ai enquiry] ${name}${company ? ` - ${company}` : ''}`
  const text = [
    'NEW WEBSITE ENQUIRY',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || 'not stated'}`,
    '',
    'Message:',
    message,
  ].join('\n')

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM,
      to: [TO],
      replyTo: email,
      subject,
      text,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111111;max-width:560px;">
          <p style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#737373;">New website enquiry</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.55;">
            <tr><td style="padding:6px 0;color:#404040;width:120px;">Name</td><td style="padding:6px 0;"><strong>${escape(name)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#404040;">Email</td><td style="padding:6px 0;"><a href="mailto:${escape(email)}" style="color:#D97757;">${escape(email)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#404040;">Company</td><td style="padding:6px 0;">${escape(company || 'not stated')}</td></tr>
          </table>
          <p style="margin-top:16px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escape(message)}</p>
        </div>
      `,
    })
    if (error) {
      console.error('[contact] resend send failed', error)
      return NextResponse.json({ error: 'Could not send your message right now. Please email us directly.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact]', err)
    return NextResponse.json({ error: 'Could not send your message right now. Please email us directly.' }, { status: 502 })
  }
}
