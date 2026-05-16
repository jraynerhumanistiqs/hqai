// B7 - shareable web preview of a generated document.
//
// /doc/[id] reads the structured payload from Supabase via the admin
// client and renders it through lib/render/html.ts. Pages are public
// today (gated by an unguessable UUID); for true link-share auth we
// generate a share token row, but this baseline gives candidates +
// recruiters a clickable URL ahead of the export downloads.
//
// Renders the raw HTML inside a layout-less <iframe> srcDoc so the
// styles in the renderer stay self-contained and the marketing chrome
// doesn't leak into the document preview.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderHtml } from '@/lib/render/html'
import { assertStructuredDocument } from '@/lib/doc-model'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DocPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: row } = await supabaseAdmin
    .from('documents')
    .select('id, title, structured_payload, content')
    .eq('id', id)
    .single()

  if (!row) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg text-ink">
        <div className="text-center">
          <h1 className="text-h2 font-bold mb-2">Document not found</h1>
          <p className="text-sm text-ink-muted">The link may have expired or been revoked.</p>
        </div>
      </main>
    )
  }

  let html: string
  if (row.structured_payload) {
    try {
      const doc = assertStructuredDocument(row.structured_payload)
      html = renderHtml(doc)
    } catch {
      html = `<pre style="padding:24px;font-family:Inter,system-ui;">${(row.content ?? '').toString().replace(/[<&>]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[c] ?? c))}</pre>`
    }
  } else {
    // Legacy markdown documents - render the raw text so the link
    // still works for older rows.
    html = `<pre style="padding:24px;font-family:Inter,system-ui;white-space:pre-wrap;">${(row.content ?? '').toString().replace(/[<&>]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[c] ?? c))}</pre>`
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/people/administrator" className="text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-ink">
          HQ.ai - AI Administrator
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`/api/administrator/documents/${row.id}/render?format=pdf`}
            className="text-xs font-bold rounded-full px-4 py-2 bg-accent text-ink-on-accent hover:bg-accent-hover"
          >
            Download PDF
          </a>
          <a
            href={`/api/administrator/documents/${row.id}/render?format=docx`}
            className="text-xs font-bold rounded-full px-4 py-2 border border-border text-ink hover:bg-bg-soft"
          >
            Download DOCX
          </a>
          <a
            href={`/api/administrator/documents/${row.id}/render?format=pptx`}
            className="text-xs font-bold rounded-full px-4 py-2 border border-border text-ink hover:bg-bg-soft"
          >
            Download PPTX
          </a>
        </div>
      </header>
      <div className="px-2 sm:px-4 pb-6">
        <iframe
          title={row.title}
          srcDoc={html}
          className="w-full bg-bg-elevated"
          style={{ height: 'calc(100vh - 64px)', border: 0 }}
        />
      </div>
    </main>
  )
}
