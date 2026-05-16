// POST /api/prescreen/responses/[id]/invite
//
// Send a video-pre-screen invite email for a SPECIFIC placeholder
// response row. Used for CV-imported candidates who arrived in the
// Shortlist Agent via batch-handoff with an empty video_ids array.
//
// The endpoint also updates the row's candidate_email + candidate_name
// so when the candidate submits the prescreen flow we can match their
// submission back to the placeholder row by response_id and UPDATE
// it in place rather than creating a duplicate.
//
// Email link includes ?response=<id> so the prescreen page knows
// which row to upsert into on submit.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendCandidateInviteEmail } from '@/lib/email'

export const runtime = 'nodejs'

interface Body {
  candidate_email: string
  candidate_name?: string
  subject?: string
  body?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: response_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json() as Body
    if (!body.candidate_email) {
      return NextResponse.json({ error: 'candidate_email is required' }, { status: 400 })
    }
    const cleanedEmail = body.candidate_email.trim()
    const cleanedName = (body.candidate_name ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Load the placeholder row + its parent session.
    const { data: row, error: rowErr } = await supabaseAdmin
      .from('prescreen_responses')
      .select('id, session_id, candidate_email, candidate_name, video_ids')
      .eq('id', response_id)
      .single()
    if (rowErr || !row) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    // Update the row with the real email + name so submission can
    // match it later via response_id.
    const patch: Record<string, unknown> = { candidate_email: cleanedEmail }
    if (cleanedName) patch.candidate_name = cleanedName
    const { error: updErr } = await supabaseAdmin
      .from('prescreen_responses')
      .update(patch)
      .eq('id', response_id)
    if (updErr) {
      console.error('[responses/[id]/invite] update', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Load the session for the invite copy.
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('role_title, company, time_limit_seconds, questions, slug')
      .eq('id', row.session_id)
      .single()
    if (sessErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
    const slug = (session as any).slug || row.session_id
    // The ?response= query param lets the prescreen page pass it back
    // to the responses POST so we can UPDATE this specific placeholder
    // instead of inserting a duplicate row.
    const inviteUrl = `${baseUrl}/prescreen/${slug}?response=${response_id}`

    try {
      await sendCandidateInviteEmail({
        candidateEmail: cleanedEmail,
        candidateName: cleanedName,
        roleTitle: session.role_title,
        company: session.company,
        inviteUrl,
        timeLimitSeconds: session.time_limit_seconds,
        questionCount: (session.questions as unknown[]).length,
        customSubject: typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : undefined,
        customBody: typeof body.body === 'string' && body.body.trim() ? body.body.trim() : undefined,
      })
    } catch (mailErr) {
      console.error('[responses/[id]/invite] email send', mailErr)
      return NextResponse.json({
        error: 'Email could not be sent. The candidate email has been saved against the row.',
        detail: mailErr instanceof Error ? mailErr.message : String(mailErr),
      }, { status: 500 })
    }

    return NextResponse.json({ sent: true, invite_url: inviteUrl })
  } catch (err) {
    console.error('[POST /api/prescreen/responses/:id/invite]', err)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}
