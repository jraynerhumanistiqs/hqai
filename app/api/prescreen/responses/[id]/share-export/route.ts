// POST /api/prescreen/responses/[id]/share-export - generate shareable client review link
// GET  /api/prescreen/responses/[id]/share-export - get signed download URLs for all videos

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getSignedDownloadUrl } from '@/lib/cloudflare'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const shareToken = randomUUID()
    const expiresAt  = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabaseAdmin
      .from('candidate_responses')
      .update({ share_token: shareToken, share_expires_at: expiresAt, status: 'shared' })
      .eq('id', id)

    if (error) throw error

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hqai.vercel.app'
    return NextResponse.json({ shareUrl: `${baseUrl}/review/${shareToken}` })
  } catch (err) {
    console.error('[POST /api/prescreen/responses/:id/share-export]', err)
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 })
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const { data, error } = await supabaseAdmin
      .from('candidate_responses')
      .select('video_ids, candidate_name')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Response not found' }, { status: 404 })

    const videoIds: string[] = data.video_ids ?? []
    const videos = await Promise.all(
      videoIds.map((vid, i) =>
        getSignedDownloadUrl(vid).then(url => ({ question: i + 1, videoId: vid, downloadUrl: url }))
      )
    )

    return NextResponse.json({ candidate: data.candidate_name, videos })
  } catch (err) {
    console.error('[GET /api/prescreen/responses/:id/share-export]', err)
    return NextResponse.json({ error: 'Failed to generate download URLs' }, { status: 500 })
  }
}
