// POST /api/prescreen/audio/upload-url
//
// Returns a short-lived Supabase Storage signed URL the client can upload
// a phone-screen recording to. Mirrors the Cloudflare flow used by the
// video pre-screen, but for audio-only files in the private
// 'prescreen-audio' bucket.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const BUCKET = 'prescreen-audio'

interface Body {
  session_id: string
  response_id?: string | null
  // optional content-type hint for filename suffix (webm / mp4 / wav)
  mime?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json() as Body
    if (!body.session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

    // Confirm the caller's profile owns this session's business. Service-role
    // client used for the actual upload URL signing.
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single()
    if (!profile?.business_id) {
      return NextResponse.json({ error: 'No business profile' }, { status: 400 })
    }

    const ext = pickExt(body.mime)
    const key = `${profile.business_id}/${body.session_id}/${body.response_id ?? 'pending'}-${Date.now()}.${ext}`

    const { data: signed, error } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(key)

    if (error || !signed) {
      console.error('[audio upload-url] sign failed:', error)
      return NextResponse.json(
        { error: 'Could not create upload URL', detail: error?.message ?? null },
        { status: 500 },
      )
    }

    return NextResponse.json({
      uploadUrl: signed.signedUrl,
      token: signed.token,
      path: signed.path,
      bucket: BUCKET,
    })
  } catch (err: any) {
    console.error('[POST /api/prescreen/audio/upload-url]', err)
    return NextResponse.json(
      { error: 'Failed to get audio upload URL', detail: err?.message ?? String(err) },
      { status: 500 },
    )
  }
}

function pickExt(mime?: string): string {
  if (!mime) return 'webm'
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}
