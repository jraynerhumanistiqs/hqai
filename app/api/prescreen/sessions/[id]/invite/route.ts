// POST /api/prescreen/sessions/[id]/invite
// Emails the candidate invite link to a specified email address.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendCandidateInviteEmail } from '@/lib/email'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: session_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const { candidate_email, candidate_name } = await req.json()
    if (!candidate_email) return NextResponse.json({ error: 'candidate_email is required' }, { status: 400 })

    const { data: session, error } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('role_title, company, time_limit_seconds, questions, slug')
      .eq('id', session_id)
      .single()

    if (error || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hqai.vercel.app'
    const inviteUrl = `${baseUrl}/prescreen/${(session as any).slug || session_id}`

    await sendCandidateInviteEmail({
      candidateEmail: candidate_email,
      candidateName: candidate_name,
      roleTitle: session.role_title,
      company: session.company,
      inviteUrl,
      timeLimitSeconds: session.time_limit_seconds,
      questionCount: session.questions.length,
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[POST /api/prescreen/sessions/:id/invite]', err)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}
