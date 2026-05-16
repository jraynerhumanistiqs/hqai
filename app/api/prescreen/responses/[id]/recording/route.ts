// POST /api/prescreen/responses/[id]/recording
//
// Called by the staff-side PhoneRecorder once the audio file has been
// uploaded to Supabase Storage. Marks the response as 'submitted' with
// response_type='phone', records audio_path + duration, then kicks off
// the transcribe + score pipeline (same downstream as the video flow).

import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 300

interface Body {
  session_id: string
  candidate_name: string
  candidate_email?: string | null
  audio_path: string
  audio_duration_sec?: number | null
}

async function triggerScoringPipeline(responseId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
  try {
    const tx = await fetch(`${baseUrl}/api/prescreen/responses/${responseId}/transcribe`, { method: 'POST' })
    if (!tx.ok) {
      console.error('[recording/POST] transcribe failed', tx.status, await tx.text().catch(() => ''))
      return
    }
    const sc = await fetch(`${baseUrl}/api/prescreen/responses/${responseId}/score`, { method: 'POST' })
    if (!sc.ok) {
      console.error('[recording/POST] score failed', sc.status, await sc.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[recording/POST] scoring pipeline error:', err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: response_id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json() as Body
    if (!body.session_id || !body.candidate_name || !body.audio_path) {
      return NextResponse.json({ error: 'session_id, candidate_name, audio_path required' }, { status: 400 })
    }

    let row: { id: string } | null = null

    if (response_id === 'new') {
      // Recruiter is recording a new candidate's phone screen straight from
      // the role detail (no prior invite/response row).
      const { data, error } = await supabaseAdmin
        .from('prescreen_responses')
        .insert({
          session_id: body.session_id,
          candidate_name: body.candidate_name,
          candidate_email: body.candidate_email ?? null,
          consent: true,
          video_ids: [],
          status: 'submitted' as const,
          response_type: 'phone',
          audio_path: body.audio_path,
          audio_duration_sec: body.audio_duration_sec ?? null,
          recorded_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (error) {
        console.error('[recording/POST] insert failed', error)
        return NextResponse.json({ error: 'Insert failed', detail: error.message }, { status: 500 })
      }
      row = data
    } else {
      // Existing response (e.g. CV-imported candidate) - convert to a phone
      // submission.
      const { data, error } = await supabaseAdmin
        .from('prescreen_responses')
        .update({
          status: 'submitted',
          response_type: 'phone',
          audio_path: body.audio_path,
          audio_duration_sec: body.audio_duration_sec ?? null,
          recorded_at: new Date().toISOString(),
        })
        .eq('id', response_id)
        .select('id')
        .single()
      if (error || !data) {
        console.error('[recording/POST] update failed', error)
        return NextResponse.json({ error: 'Update failed', detail: error?.message ?? 'not found' }, { status: 500 })
      }
      row = data
    }

    after(triggerScoringPipeline(row.id))

    return NextResponse.json({ response_id: row.id })
  } catch (err) {
    console.error('[POST /api/prescreen/responses/[id]/recording]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Recording submit failed', detail }, { status: 500 })
  }
}
