// B6 - PPTX renderer.
//
// Source: docs/research/2026-05-16_ai-doc-creation-teardown.md
// section 6.2. Targets recruit pitches, board reports, and candidate
// one-pagers. pptxgenjs is the lightest cross-platform library;
// keeps everything pure-JS so no native build step is needed for
// Vercel serverless.
//
// Mapping rules:
//   - Each StructuredDocument section becomes ONE slide (title +
//     body bullets). Long sections that exceed ~6 lines spill into a
//     continuation slide.
//   - Heading blocks within a section become a sub-title (h2) at the
//     top of the slide above the body bullets.
//   - Paragraphs become single bullets; lists become bulleted lines.
//   - Tables get rendered using pptxgenjs's native table API.
//   - Notices become a coloured callout box at the bottom of the slide.

import PptxGenJS from 'pptxgenjs'
import type {
  StructuredDocument,
  DocumentSection,
  DocumentBlock,
} from '@/lib/doc-model'

type Bullet = { text: string; options?: PptxGenJS.TextPropsOptions }

const PAGE_TITLE_HEIGHT = 0.9
const PAGE_BODY_TOP = 1.2
const PAGE_BODY_HEIGHT = 5.0
const MAX_BULLETS_PER_SLIDE = 6

function blockToBullets(block: DocumentBlock): Bullet[] {
  switch (block.type) {
    case 'heading':
      return [{ text: block.text, options: { bold: true, fontSize: 18, color: '0A0A0B' } }]
    case 'paragraph':
      return [{ text: block.text, options: { fontSize: 16, color: '1F1F1F' } }]
    case 'list':
      return block.items.map(t => ({
        text: t,
        options: { bullet: { code: block.ordered ? '25CF' : '2022' }, fontSize: 15, color: '1F1F1F' },
      }))
    case 'kv':
      return block.items.map(({ label, value }) => ({
        text: `${label}: ${value}`,
        options: { fontSize: 14, color: '1F1F1F' },
      }))
    case 'notice':
      return [{ text: block.text, options: { fontSize: 13, color: '991B1B', italic: true } }]
    case 'signature':
      // Signatures are awkward in slides; render as a flat label only.
      return [{ text: block.name ? `Signed: ${block.name}` : 'Signature', options: { fontSize: 14, color: '6B6B66', italic: true } }]
    default:
      return []
  }
}

function emitSlidesForSection(
  pptx: PptxGenJS,
  section: DocumentSection,
  fallbackTitle: string,
): void {
  const bullets: Bullet[] = []
  let pendingTable: { headers: string[]; rows: string[][] } | null = null

  for (const block of section.blocks) {
    if (block.type === 'page_break') break // hard stop, next section
    if (block.type === 'spacer')     continue
    if (block.type === 'table') {
      // Tables can't share space with bullets; flush bullets, then
      // emit a table-only slide.
      if (bullets.length) flushBullets()
      pendingTable = { headers: block.headers, rows: block.rows }
      flushTable(block.caption ?? section.title ?? fallbackTitle)
      continue
    }
    bullets.push(...blockToBullets(block))
  }
  if (bullets.length) flushBullets()

  function flushBullets() {
    // Chunk bullets into slides so we don't overflow.
    for (let i = 0; i < bullets.length; i += MAX_BULLETS_PER_SLIDE) {
      const chunk = bullets.slice(i, i + MAX_BULLETS_PER_SLIDE)
      const slide = pptx.addSlide()
      addTitle(slide, section.title ?? fallbackTitle)
      slide.addText(chunk as PptxGenJS.TextProps[], {
        x: 0.6, y: PAGE_BODY_TOP, w: 8.8, h: PAGE_BODY_HEIGHT,
        valign: 'top',
        paraSpaceAfter: 6,
      })
    }
    bullets.length = 0
  }

  function flushTable(caption: string) {
    if (!pendingTable) return
    const slide = pptx.addSlide()
    addTitle(slide, caption)
    const rows = [
      pendingTable.headers.map(h => ({ text: h, options: { bold: true, fill: { color: 'F0EEE6' } } })),
      ...pendingTable.rows.map(r => r.map(c => ({ text: c }))),
    ]
    slide.addTable(rows as any, {
      x: 0.6, y: PAGE_BODY_TOP, w: 8.8,
      colW: pendingTable.headers.map(() => 8.8 / pendingTable!.headers.length),
      fontSize: 13,
      border: { type: 'solid', pt: 0.5, color: 'D1CFC5' },
    })
    pendingTable = null
  }
}

function addTitle(slide: PptxGenJS.Slide, title: string) {
  slide.addText(title, {
    x: 0.6, y: 0.3, w: 8.8, h: PAGE_TITLE_HEIGHT,
    fontSize: 24, bold: true, color: '0A0A0B',
  })
}

export async function renderPptx(doc: StructuredDocument): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 inches
  pptx.author = 'HQ.ai AI Administrator'
  pptx.title  = doc.title

  // Title slide
  const titleSlide = pptx.addSlide()
  titleSlide.background = { color: 'FFFFFF' }
  titleSlide.addText(doc.title, { x: 0.7, y: 2.6, w: 12, h: 1.2, fontSize: 40, bold: true, color: '0A0A0B' })
  if (doc.subtitle) {
    titleSlide.addText(doc.subtitle, { x: 0.7, y: 3.8, w: 12, h: 0.6, fontSize: 18, italic: true, color: '6B6B66' })
  }
  if (doc.issuer?.business_name) {
    titleSlide.addText(doc.issuer.business_name, { x: 0.7, y: 6.6, w: 12, h: 0.4, fontSize: 13, color: '6B6B66' })
  }

  for (const section of doc.sections) {
    emitSlidesForSection(pptx, section, doc.title)
  }

  // Citations slide
  if (doc.citations?.length) {
    const slide = pptx.addSlide()
    addTitle(slide, 'Citations')
    const bullets: Bullet[] = doc.citations.map((c, i) => ({
      text: `${i + 1}. ${c.source}${c.locator ? ' - ' + c.locator : ''}${c.url ? ' (' + c.url + ')' : ''}`,
      options: { fontSize: 13, color: '52524C' },
    }))
    slide.addText(bullets as PptxGenJS.TextProps[], {
      x: 0.6, y: PAGE_BODY_TOP, w: 12, h: PAGE_BODY_HEIGHT, valign: 'top', paraSpaceAfter: 4,
    })
  }

  // pptxgenjs returns a Promise<string | ArrayBuffer | Blob | Uint8Array>
  // depending on options. Force a node Buffer for the API route.
  const raw = await pptx.write({ outputType: 'nodebuffer' })
  return raw as Buffer
}
