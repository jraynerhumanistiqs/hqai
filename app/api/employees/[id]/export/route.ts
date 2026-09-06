import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderPdf } from '@/lib/render/pdf'
import { renderDocx } from '@/lib/render/docx'
import { assertStructuredDocument } from '@/lib/doc-model'
import { buildRecordDocument, type LinkedDocument } from '@/lib/record-export'
import type { ComplianceEvent, Employee } from '@/lib/employees'

// Download one person's record as PDF, DOCX, or both (zipped).
//
// Same branded renderers as every other HQ.ai document. The PDF path uses
// headless Chromium, hence the nodejs runtime and the longer duration.

export const runtime = 'nodejs'
export const maxDuration = 60

type Format = 'pdf' | 'docx' | 'both'

function slug(s: string): string {
  return (s || 'record').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'record'
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const format = (req.nextUrl.searchParams.get('format') || 'pdf').toLowerCase() as Format
  if (!['pdf', 'docx', 'both'].includes(format)) {
    return NextResponse.json({ error: 'format must be pdf, docx or both' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('business_id').eq('id', user.id).single()
  const businessId = profile?.business_id as string | undefined
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const [{ data: employee }, { data: business }, { data: events }, { data: headcount }] =
    await Promise.all([
      supabase.from('employees').select('*').eq('id', id).eq('business_id', businessId).single(),
      supabase.from('businesses').select('name').eq('id', businessId).single(),
      supabase.from('compliance_events').select('*')
        .eq('employee_id', id).eq('business_id', businessId)
        .order('occurred_at', { ascending: true }),
      // Whole-business headcount via the security-definer helper - a scoped
      // admin only sees part of the register, but the legal threshold does
      // not depend on what they can see.
      supabase.rpc('business_headcount'),
    ])

  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const evs = (events ?? []) as ComplianceEvent[]

  // Linked documents are recorded on the trail at the moment of linking, with
  // the document's title/type captured in metadata - so the record reflects
  // what was linked at the time, and needs no join.
  const documents: LinkedDocument[] = evs
    .filter(ev => ev.event_type === 'document_linked')
    .map(ev => {
      const m = (ev.metadata ?? {}) as Record<string, unknown>
      return {
        id: String(ev.document_id ?? m.document_id ?? ''),
        title: String(m.doc_title ?? ev.title ?? 'Document'),
        type: typeof m.doc_type === 'string' ? m.doc_type : null,
        created_at: typeof m.doc_created_at === 'string' ? m.doc_created_at : ev.occurred_at,
        context: ev.detail ?? null,
        linked_at: ev.occurred_at,
      }
    })

  const doc = buildRecordDocument({
    employee: employee as Employee,
    events: evs,
    documents,
    business: { name: business?.name ?? 'Business' },
    headcount: Number(headcount) || 1,
  })
  assertStructuredDocument(doc)

  const base = `${slug(`${employee.first_name}-${employee.last_name ?? ''}`)}-record`

  if (format === 'pdf') {
    const buf = await renderPdf(doc)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${base}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  if (format === 'docx') {
    const buf = await renderDocx(doc)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${base}.docx"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // both -> one zip
  const JSZip = (await import('jszip')).default
  const [pdf, docx] = await Promise.all([renderPdf(doc), renderDocx(doc)])
  const zip = new JSZip()
  zip.file(`${base}.pdf`, pdf)
  zip.file(`${base}.docx`, docx)
  // ArrayBuffer is a valid BodyInit; jszip's uint8array output is not typed as one.
  const out = await zip.generateAsync({ type: 'arraybuffer' })
  return new NextResponse(out, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${base}.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}
