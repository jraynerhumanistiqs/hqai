// POST /api/prescreen/responses/[id]/transcribe
// Server-to-server: sets status=transcribing, pulls Cloudflare mp4, runs
// Deepgram Nova-3, writes prescreen_transcripts row. Leaves status as
// 'transcribing' (the score route flips to 'evaluating' -> 'scored').

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { transcribeCloudflareVideo } from '@/lib/deepgram'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { data: resp, error: respErr } = await supabaseAdmin
      .from('prescreen_responses')
      .select('id, video_ids, status')
      .eq('id', id)
      .single()

    if (respErr || !resp) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    await supabaseAdmin
      .from('prescreen_responses')
      .update({ status: 'transcribing' })
      .eq('id', id)

    const uid = Array.isArray(resp.video_ids) ? resp.video_ids[0] : null
    if (!uid) {
      return NextResponse.json({ error: 'No video on response' }, { status: 400 })
    }

    const { text, utterances, raw } = await transcribeCloudflareVideo(uid)

    const { error: insErr } = await supabaseAdmin
      .from('prescreen_transcripts')
      .insert({
        response_id: id,
        provider: 'deepgram',
        raw,
        text,
        utterances,
      })

    if (insErr) throw insErr

    return NextResponse.json({ ok: true, length: text.length, utterances: utterances.length })
  } catch (err) {
    console.error('[POST /api/prescreen/responses/:id/transcribe]', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
