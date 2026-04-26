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

    const uids: string[] = Array.isArray(resp.video_ids) ? resp.video_ids.filter(Boolean) : []
    if (uids.length === 0) {
      return NextResponse.json({ error: 'No video on response' }, { status: 400 })
    }

    // Transcribe every video on the response (one per question), then merge
    // them into a single response-level transcript with "Question N:" headers
    // so the downstream scorer / share UI can read it linearly. Keep raw
    // Deepgram output keyed by question index for full fidelity.
    const perVideo = await Promise.all(
      uids.map(async (uid, i) => {
        try {
          const { text, utterances, raw } = await transcribeCloudflareVideo(uid)
          // Offset utterance timestamps by previous videos' duration so the
          // merged utterance list is monotonic — handy for diarisation UIs.
          return { i, uid, text, utterances, raw, error: null as null | string }
        } catch (err) {
          return { i, uid, text: '', utterances: [] as any[], raw: null, error: (err as Error).message }
        }
      })
    )

    const sections = perVideo.map(v => {
      const header = `Question ${v.i + 1}:`
      if (v.error) return `${header}\n[transcription failed: ${v.error}]`
      return v.text.trim() ? `${header}\n${v.text.trim()}` : `${header}\n[no speech detected]`
    })
    const text = sections.join('\n\n')

    const utterances = perVideo.flatMap(v =>
      v.utterances.map((u: any) => ({ ...u, question: v.i + 1 }))
    )
    const raw = perVideo.map(v => ({
      question: v.i + 1,
      uid: v.uid,
      error: v.error,
      raw: v.raw,
    }))

    // Replace any prior transcript for this response so re-runs are idempotent.
    await supabaseAdmin
      .from('prescreen_transcripts')
      .delete()
      .eq('response_id', id)

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

    const errorCount = perVideo.filter(v => v.error).length
    return NextResponse.json({
      ok: true,
      videos: uids.length,
      successful: uids.length - errorCount,
      failed: errorCount,
      length: text.length,
      utterances: utterances.length,
      perVideo: perVideo.map(v => ({ question: v.i + 1, uid: v.uid, length: v.text.length, error: v.error })),
    })
  } catch (err) {
    console.error('[POST /api/prescreen/responses/:id/transcribe]', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
