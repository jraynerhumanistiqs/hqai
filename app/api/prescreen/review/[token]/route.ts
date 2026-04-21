// GET /api/prescreen/review/[token] — public endpoint for client review page
// Returns only safe public fields — no ratings, notes, or other candidates exposed

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const { data, error } = await supabaseAdmin
      .from('candidate_responses')
      .select(`
        id,
        candidate_name,
        share_expires_at,
        video_ids,
        prescreen_sessions (
          role_title,
          company,
          questions
        )
      `)
      .eq('share_token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Review link not found' }, { status: 404 })
    }

    if (data.share_expires_at && new Date(data.share_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This review link has expired' }, { status: 410 })
    }

    const session = data.prescreen_sessions as any
    return NextResponse.json({
      candidateName: data.candidate_name,
      role: session?.role_title,
      company: session?.company,
      questions: session?.questions ?? [],
      videoIds: data.video_ids ?? [],
    })
  } catch (err) {
    console.error('[GET /api/prescreen/review/:token]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
