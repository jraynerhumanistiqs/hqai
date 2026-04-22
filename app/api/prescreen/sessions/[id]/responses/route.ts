// POST /api/prescreen/sessions/[id]/responses - candidate submits response
// GET  /api/prescreen/sessions/[id]/responses - staff loads all responses for a session

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendCandidateSubmittedEmail } from '@/lib/email'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: session_id } = await params
  try {
    const body = await req.json()

    const { data, error } = await supabaseAdmin
      .from('candidate_responses')
      .insert({
        session_id,
        candidate_name: body.candidate_name,
        candidate_email: body.candidate_email,
        consent: body.consent,
        video_ids: body.video_ids,
        status: 'new',
      })
      .select()
      .single()

    if (error) throw error

    // Fire-and-forget: notify staff that a candidate submitted
    try {
      const { data: session } = await supabaseAdmin
        .from('prescreen_sessions')
        .select('role_title, company, created_by')
        .eq('id', session_id)
        .single()

      if (session?.created_by) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', session.created_by)
          .single()

        if (profile?.email) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hqai.vercel.app'
          void sendCandidateSubmittedEmail({
            staffEmail: profile.email,
            staffName: profile.full_name || '',
            candidateName: body.candidate_name,
            roleTitle: session.role_title,
            company: session.company,
            reviewUrl: `${baseUrl}/dashboard/recruit`,
          })
        }
      }
    } catch (notifyErr) {
      // Notification failure must never block the response
      console.error('[responses/POST] notification error:', notifyErr)
    }

    return NextResponse.json({ response: data })
  } catch (err) {
    console.error('[POST /api/prescreen/sessions/:id/responses]', err)
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: session_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const { data, error } = await supabaseAdmin
      .from('candidate_responses')
      .select('*')
      .eq('session_id', session_id)
      .order('submitted_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ responses: data })
  } catch (err) {
    console.error('[GET /api/prescreen/sessions/:id/responses]', err)
    return NextResponse.json({ error: 'Failed to load responses' }, { status: 500 })
  }
}
