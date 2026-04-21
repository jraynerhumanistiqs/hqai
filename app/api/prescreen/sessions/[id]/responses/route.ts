// POST /api/prescreen/sessions/[id]/responses — candidate submits response
// GET  /api/prescreen/sessions/[id]/responses — staff loads all responses for a session

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
