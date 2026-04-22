// POST /api/prescreen/videos/upload-url
// Returns a Cloudflare Stream direct upload URL.
// The browser uploads video directly to Cloudflare - no video data passes through this server.

import { NextResponse } from 'next/server'
import { getDirectUploadUrl } from '@/lib/cloudflare'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const { uploadUrl, uid } = await getDirectUploadUrl()
    return NextResponse.json({ uploadUrl, videoId: uid })
  } catch (err: any) {
    console.error('[POST /api/prescreen/videos/upload-url]', err)
    return NextResponse.json(
      { error: 'Failed to get upload URL', detail: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}
