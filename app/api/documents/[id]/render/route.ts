// B4 / B5 / B6 / B7 - render-by-format endpoint.
// GET /api/administrator/documents/[id]/render?format=docx|pdf|pptx|html
//
// Loads the structured_payload jsonb off the documents row and streams
// the requested format. Renderers all read the same canonical doc tree
// so a single source of truth backs every download surface.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderHtml } from '@/lib/render/html'
import { renderDocx } from '@/lib/render/docx'
import { renderPptx } from '@/lib/render/pptx'
import { renderPdf } from '@/lib/render/pdf'
import { assertStructuredDocument } from '@/lib/doc-model'

export const runtime = 'nodejs'
export const maxDuration = 60

type Format = 'docx' | 'pdf' | 'pptx' | 'html'
const FORMATS = new Set<Format>(['docx', 'pdf', 'pptx', 'html'])

function contentType(format: Format): string {
  switch (format) {
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'pdf':  return 'application/pdf'
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    case 'html': return 'text/html; charset=utf-8'
  }
}

function slugify(s: string): string {
  return (s || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'document'
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(req.url)
  const formatParam = (url.searchParams.get('format') || 'pdf').toLowerCase() as Format
  if (!FORMATS.has(formatParam)) {
    return NextResponse.json({ error: `Unknown format ${formatParam}` }, { status: 400 })
  }

  const { data: row, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, structured_payload, business_id')
    .eq('id', id)
    .single()
  if (error || !row) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  if (!row.structured_payload) {
    return NextResponse.json({
      error: 'This document does not have a structured payload (legacy markdown render).',
    }, { status: 409 })
  }

  let doc
  try {
    doc = assertStructuredDocument(row.structured_payload)
  } catch (err) {
    return NextResponse.json({ error: 'Stored payload is malformed', detail: (err as Error).message }, { status: 422 })
  }

  let body: Buffer | string
  try {
    switch (formatParam) {
      case 'html': body = renderHtml(doc); break
      case 'docx': body = await renderDocx(doc); break
      case 'pptx': body = await renderPptx(doc); break
      case 'pdf':  body = await renderPdf(doc); break
    }
  } catch (err) {
    console.error('[administrator/render]', formatParam, err)
    return NextResponse.json({ error: 'Render failed', detail: (err as Error).message }, { status: 502 })
  }

  const filename = `${slugify(row.title)}.${formatParam}`
  const headers = new Headers({
    'Content-Type': contentType(formatParam),
    'Content-Disposition': formatParam === 'html'
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store',
  })
  return new Response(body as BodyInit, { headers })
}
