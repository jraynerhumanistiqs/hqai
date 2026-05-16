// B5 - PDF renderer.
//
// Source: docs/research/2026-05-16_ai-doc-creation-teardown.md
// section 6.2. Uses puppeteer-core + @sparticuz/chromium so the same
// code runs both locally (with whatever Chromium is on the dev box)
// and on Vercel serverless (which gets Chromium from the npm package).
//
// HTML is the source of truth - we render the structured doc via
// lib/render/html.ts and let Chromium produce the PDF from that. This
// keeps PDF + web preview pixel-identical without two code paths.
//
// Cold-start cost: ~1-2s in serverless. The route that wraps this
// already has `maxDuration: 60` in the existing /api/documents/generate
// handler, which is plenty.
//
// Failure mode: throws on Puppeteer launch failures so the API route
// can return a 502 with a descriptive message rather than hanging.

import type { StructuredDocument } from '@/lib/doc-model'
import { renderHtml } from '@/lib/render/html'

let _chromium: typeof import('@sparticuz/chromium').default | null = null
async function getChromium() {
  if (_chromium) return _chromium
  const mod = await import('@sparticuz/chromium')
  _chromium = mod.default
  return _chromium
}

export interface PdfRenderOptions {
  format?: 'A4' | 'Letter'
  /** Margins as a string Chromium accepts: '24mm', '1in', etc. */
  margin?: { top?: string; right?: string; bottom?: string; left?: string }
  /** Header / footer templates (HTML). Optional. */
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
}

export async function renderPdf(
  doc: StructuredDocument,
  options: PdfRenderOptions = {},
): Promise<Buffer> {
  const html = renderHtml(doc)
  const puppeteer = await import('puppeteer-core')
  const chromium = await getChromium()

  const browser = await puppeteer.default.launch({
    args:            chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath:  await chromium.executablePath(),
    headless:        chromium.headless,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: options.format ?? 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: options.displayHeaderFooter ?? false,
      headerTemplate: options.headerTemplate,
      footerTemplate: options.footerTemplate,
      margin: options.margin ?? { top: '24mm', right: '22mm', bottom: '24mm', left: '22mm' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
