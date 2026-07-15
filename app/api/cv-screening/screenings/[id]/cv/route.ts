// Download the ORIGINAL uploaded CV file for a screening.
//
// GET /api/cv-screening/screenings/[id]/cv
//
// The score route stores the exact file the recruiter uploaded in the
// private 'cvs' storage bucket (cv_screenings.cv_storage_path). This
// route streams it back with the original filename and content type so
// the recruiter can open exactly what the candidate sent.
//
// Contract (fixed - the UI builds against these responses):
//   200 -> binary body, Content-Disposition: attachment with the
//          original filename, original content type.
//   404 { error, fallback: 'formatted' } -> no original file stored
//          (historical candidates scored before storage landed, or the
//          upload failed). The UI offers the Formatted CV export
//          (GET screenings/[id]/export?mode=formatted) instead.
//   401 / 400 / 403 / 404 -> standard auth / tenant-scope errors.
//
// Works for any cv_screenings id, including ids reached from shortlist
// rows via prescreen_responses.cv_screening_id - the lookup is by
// screening id + business ownership only.

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const CV_BUCKET = 'cvs'

// Original content type from the stored filename's extension. The file
// is stored byte-for-byte as uploaded, so the extension is authoritative.
const EXT_CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain; charset=utf-8',
  rtf: 'application/rtf',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null
    if (!businessId) return NextResponse.json({ error: 'No business profile' }, { status: 400 })

    // Fetch without the business filter first, then verify ownership, so
    // "row doesn't exist" and "row exists but not yours" stay distinct.
    const { data: screening, error } = await supabaseAdmin
      .from('cv_screenings')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!screening) return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    if (screening.business_id !== businessId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Historical candidates were scored before original-file storage
    // landed - tell the UI to offer the Formatted CV export instead.
    const storagePath = (screening as { cv_storage_path?: string | null }).cv_storage_path ?? null
    if (!storagePath) {
      return NextResponse.json({
        error: 'The original CV file is not stored for this candidate.',
        fallback: 'formatted',
      }, { status: 404 })
    }

    const { data: blob, error: dlError } = await supabaseAdmin.storage
      .from(CV_BUCKET)
      .download(storagePath)
    if (dlError || !blob) {
      console.warn('[cv-screening/cv] storage download failed:', dlError?.message)
      return NextResponse.json({
        error: 'The original CV file could not be retrieved.',
        fallback: 'formatted',
      }, { status: 404 })
    }

    // Original filename: prefer the persisted upload name, then the
    // stored object's basename.
    const filename = (
      (screening as { cv_filename?: string | null }).cv_filename
      || storagePath.split('/').pop()
      || 'cv'
    ).replace(/[\\/:*?"<>|]+/g, '').trim() || 'cv'
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const contentType = EXT_CONTENT_TYPES[ext]
      || (blob.type && blob.type !== 'application/json' ? blob.type : 'application/octet-stream')

    const buffer = Buffer.from(await blob.arrayBuffer())
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        // filename* carries the exact UTF-8 name; plain filename is the
        // ASCII-safe fallback.
        'Content-Disposition': `attachment; filename="${filename.replace(/[^\x20-\x7E]+/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[cv-screening/cv]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'CV download failed', detail }, { status: 500 })
  }
}
