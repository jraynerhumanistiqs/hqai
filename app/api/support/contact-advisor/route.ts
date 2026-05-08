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

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'HQ.ai <hq.ai@humanistiqs.com.au>',
        to: [ADVISOR_INBOX],
        replyTo: email || ADVISOR_INBOX,
        subject,
        text,
      })
    } else {
      console.warn('[support/contact-advisor] no RESEND_API_KEY - request not sent', { subject, text })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[support/contact-advisor]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Failed to send', detail }, { status: 500 })
  }
}
