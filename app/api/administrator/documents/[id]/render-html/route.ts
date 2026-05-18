// Live-edit PDF endpoint.
//
// The AI Administrator preview pane is contenteditable. When the user
// clicks "Download PDF", the client POSTs the current innerHTML of the
// editable region here; we wrap it in the standard print stylesheet
// and run it through Puppeteer just like /render?format=pdf does for
// the StructuredDocument path. This lets the user tweak the document
// inline before downloading, without leaving the page.
//
// We deliberately do NOT round-trip the edits back to structured_payload
// - parsing arbitrary contenteditable HTML into the block schema is a
// can of worms. Instead, the structured_payload stays as the
// "as-generated" snapshot and the edited HTML is treated as a one-shot
// PDF render.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

function slugify(s: string): string {
  return (s || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'document'
}

// Mirror of lib/render/html.ts's BASE_CSS so the editor pane and the
// downloaded PDF are visually identical. Kept inline here so a one-off
// edit doesn't have to round-trip through the structured doc.
const PRINT_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body {
  background: #fff;
  color: #0a0a0b;
  font: 16px/1.55 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
}
.doc-page { max-width: none; padding: 24mm 22mm 24mm; margin: 0 auto; }
h1 { font-size: 26px; font-weight: 700; margin: 24px 0 12px; }
h2 { font-size: 18px; font-weight: 700; margin: 20px 0 10px; }
h3 { font-size: 16px; font-weight: 700; margin: 16px 0 8px; }
h4 { font-size: 15px; font-weight: 700; margin: 14px 0 6px; }
p { margin: 0 0 12px; }
ul, ol { margin: 0 0 16px; padding-left: 22px; }
li { margin-bottom: 4px; }
table { border-collapse: collapse; width: 100%; margin: 0 0 16px; font-size: 14px; }
th, td { border: 1px solid #e4e4e0; padding: 8px 10px; text-align: left; }
.doc-meta { border-bottom: 1px solid #e4e4e0; padding-bottom: 16px; margin-bottom: 24px; }
.doc-meta-issuer { font-size: 13px; color: #4a4a47; }
.doc-recipient { margin: 0 0 24px; font-size: 14px; color: #4a4a47; }
.doc-citations { margin: 36px 0 0; border-top: 1px solid #e4e4e0; padding-top: 16px; font-size: 12px; color: #4a4a47; }
.doc-footer-logo { margin: 36px 0 0; padding-top: 18px; border-top: 1px solid #e4e4e0; }
.doc-footer-logo img { max-height: 48px; max-width: 220px; object-fit: contain; }
@page { size: A4; margin: 24mm 22mm; }
`

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { html?: string; title?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.html || typeof body.html !== 'string') {
    return NextResponse.json({ error: 'html required' }, { status: 400 })
  }

  // Look up the document to confirm the caller actually owns it - the
  // edited HTML is a side-channel input, not a persisted state, so we
  // gate it on read access to the row.
  const { data: row, error } = await supabaseAdmin
    .from('documents')
    .select('id, title')
    .eq('id', id)
    .single()
  if (error || !row) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const title = (body.title || row.title || 'document').toString()

  const fullHtml = `<!DOCTYPE html><html lang="en-AU"><head><meta charset="utf-8" /><title>${title}</title><style>${PRINT_CSS}</style></head><body><main class="doc-page">${body.html}</main></body></html>`

  try {
    const puppeteer = await import('puppeteer-core')
    const chromiumMod = await import('@sparticuz/chromium')
    const chromium = chromiumMod.default
    const browser = await puppeteer.default.launch({
      args:            chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath:  await chromium.executablePath(),
      headless:        chromium.headless,
    })
    try {
      const page = await browser.newPage()
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '24mm', right: '22mm', bottom: '24mm', left: '22mm' },
      })
      return new Response(Buffer.from(pdf) as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${slugify(title)}.pdf"`,
          'Cache-Control': 'private, no-store',
        },
      })
    } finally {
      await browser.close()
    }
  } catch (err) {
    console.error('[administrator/render-html]', err)
    return NextResponse.json({ error: 'PDF render failed', detail: (err as Error).message }, { status: 502 })
  }
}
