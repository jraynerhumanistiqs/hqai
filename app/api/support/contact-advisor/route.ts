import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

interface Body {
  support_type: 'hr' | 'recruitment'
  summary: string
}

const ADVISOR_INBOX = 'jrayner@humanistiqs.com.au'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, businesses(id, name)')
      .eq('id', user.id)
      .single()

    const fullName = (profile?.full_name as string | null) ?? 'Unknown'
    const email = (profile?.email as string | null) ?? user.email ?? ''
    const business = (profile?.businesses as unknown as { id: string; name: string } | null)
    const bizName = business?.name ?? 'Unknown business'

    const body = await req.json() as Body
    if (!body.support_type || !body.summary?.trim()) {
      return NextResponse.json({ error: 'support_type and summary required' }, { status: 400 })
    }

    const subject = `[HQ.ai support request] ${body.support_type === 'hr' ? 'HR' : 'Recruitment'} - ${bizName}`
    const text = [
      `Support type: ${body.support_type === 'hr' ? 'HR Support' : 'Recruitment Support'}`,
      `Business: ${bizName}`,
      `Requester: ${fullName} <${email}>`,
      '',
      'Summary:',
      body.summary.trim(),
      '',
      'Sent from HQ.ai sidebar - Contact HQ Advisor flow.',
    ].join('\n')

    // Honest delivery: previously this route returned { ok: true } even
    // when RESEND_API_KEY was absent, so the sidebar reported "Sent to
    // advisor" while nothing actually went out (the exact dead pathway
    // the founder reported). Now a missing key or a failed send returns
    // an error so the UI can tell the user to email directly.
    if (!process.env.RESEND_API_KEY) {
      console.error('[support/contact-advisor] no RESEND_API_KEY - request NOT sent', { subject })
      return NextResponse.json({
        error: 'Advisor messaging is not configured yet. Please email your advisor directly while we switch this on.',
      }, { status: 503 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: sendErr } = await resend.emails.send({
      // Verified sending domain (matches lib/email.ts). The previous
      // hq.ai@humanistiqs.com.au sender was a different, unverified
      // domain which Resend would reject / spam-bin.
      from: 'HQ.ai <noreply@hq.humanistiqs.ai>',
      to: [ADVISOR_INBOX],
      replyTo: email || ADVISOR_INBOX,
      subject,
      text,
    })
    if (sendErr) {
      console.error('[support/contact-advisor] resend send failed', sendErr)
      return NextResponse.json({
        error: 'We could not send your request right now. Please email your advisor directly.',
        detail: sendErr.message,
      }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[support/contact-advisor]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Failed to send', detail }, { status: 500 })
  }
}
