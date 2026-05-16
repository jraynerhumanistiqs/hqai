// B4 - DOCX renderer for the structured document model.
//
// Uses the existing docx@9 library that already ships in the codebase
// (so the bundle size hit is zero). Emits a single-section Word
// document keeping the same fonts + spacing the existing
// app/api/documents/generate route produces today, but driven from
// the structured model rather than from a markdown string the LLM
// hand-rolled.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
} from 'docx'
import type {
  StructuredDocument,
  DocumentBlock,
  DocumentSection,
  CitationRef,
  BlockHeading,
  BlockList,
  BlockTable,
  BlockKeyValue,
  BlockSignature,
  BlockNotice,
} from '@/lib/doc-model'

const FONT = 'Calibri'

function p(text: string, opts: { bold?: boolean; size?: number; italics?: boolean; spacing?: { before?: number; after?: number } } = {}): Paragraph {
  return new Paragraph({
    spacing: opts.spacing ?? { before: 60, after: 80 },
    children: [
      new TextRun({
        text,
        bold:    opts.bold,
        italics: opts.italics,
        size:    opts.size ?? 22, // 22 half-points = 11pt
        font:    FONT,
      }),
    ],
  })
}

function headingParagraph(b: BlockHeading): Paragraph {
  const headingLevel = ([HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4] as const)[Math.max(0, Math.min(3, b.level - 1))]
  const size = [32, 26, 22, 20][Math.max(0, Math.min(3, b.level - 1))]
  return new Paragraph({
    heading: headingLevel,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: b.text, bold: true, size, font: FONT })],
  })
}

function listParagraphs(b: BlockList): Paragraph[] {
  return b.items.map(item =>
    new Paragraph({
      numbering: b.ordered
        ? { reference: 'doc-ol', level: 0 }
        : undefined,
      bullet: b.ordered ? undefined : { level: 0 },
      spacing: { before: 20, after: 40 },
      children: [new TextRun({ text: item, size: 22, font: FONT })],
    }),
  )
}

function tableElement(b: BlockTable): Table {
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'D1CFC5' }
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder }
  const headerRow = new TableRow({
    children: b.headers.map(h =>
      new TableCell({
        width: { size: 100 / Math.max(1, b.headers.length), type: WidthType.PERCENTAGE },
        children: [p(h, { bold: true, spacing: { before: 40, after: 40 } })],
        borders,
      }),
    ),
  })
  const bodyRows = b.rows.map(row =>
    new TableRow({
      children: row.map(c =>
        new TableCell({
          children: [p(c, { spacing: { before: 40, after: 40 } })],
          borders,
        }),
      ),
    }),
  )
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  })
}

function kvParagraphs(b: BlockKeyValue): Paragraph[] {
  return b.items.map(({ label, value }) =>
    new Paragraph({
      spacing: { before: 30, after: 30 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22, font: FONT }),
        new TextRun({ text: value, size: 22, font: FONT }),
      ],
    }),
  )
}

function signatureParagraphs(b: BlockSignature): Paragraph[] {
  const partyLabel = b.label ?? ({
    employer:  'Signed for and on behalf of the Employer',
    employee:  'Signed by the Employee',
    witness:   'Signed by Witness',
    guarantor: 'Signed by Guarantor',
  })[b.party]
  return [
    new Paragraph({ spacing: { before: 360, after: 0 }, children: [new TextRun({ text: '_______________________________________', size: 22, font: FONT })] }),
    new Paragraph({
      spacing: { before: 0, after: 240 },
      children: [
        new TextRun({ text: partyLabel, italics: true, size: 20, font: FONT, color: '666666' }),
        new TextRun({ text: b.name ? `   ${b.name}` : '', size: 20, font: FONT, color: '666666' }),
      ],
    }),
  ]
}

function noticeParagraph(b: BlockNotice): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: {
      type: 'clear',
      fill:
        b.variant === 'info'    ? 'EEF4FF'
      : b.variant === 'warning' ? 'FFF7ED'
      : 'FEF2F2',
    },
    children: [
      new TextRun({ text: b.text, size: 22, font: FONT, color: '1F1F1F' }),
    ],
  })
}

function blockToElements(block: DocumentBlock): Array<Paragraph | Table> {
  switch (block.type) {
    case 'heading':    return [headingParagraph(block)]
    case 'paragraph':  return [p(block.text)]
    case 'list':       return listParagraphs(block)
    case 'table':      return [tableElement(block)]
    case 'kv':         return kvParagraphs(block)
    case 'spacer':     return [new Paragraph({ spacing: { before: ({ sm: 120, md: 240, lg: 480 })[block.size ?? 'md'], after: 0 }, children: [] })]
    case 'page_break': return [new Paragraph({ children: [new PageBreak()] })]
    case 'signature':  return signatureParagraphs(block)
    case 'notice':     return [noticeParagraph(block)]
    default:           return []
  }
}

function sectionParagraphs(section: DocumentSection): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = []
  if (section.title) {
    out.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      children: [new TextRun({ text: section.title, bold: true, size: 26, font: FONT })],
    }))
  }
  for (const b of section.blocks) {
    out.push(...blockToElements(b))
  }
  return out
}

function citationsBlock(citations?: CitationRef[]): Array<Paragraph | Table> {
  if (!citations?.length) return []
  return [
    new Paragraph({ spacing: { before: 480, after: 60 }, children: [new TextRun({ text: 'Citations', bold: true, size: 20, color: '6B6B66', font: FONT })] }),
    ...citations.map((c, i) => new Paragraph({
      spacing: { before: 20, after: 20 },
      children: [
        new TextRun({ text: `${i + 1}. `, size: 20, font: FONT, color: '4a4a47' }),
        new TextRun({ text: c.source, size: 20, font: FONT, color: '4a4a47', bold: true }),
        c.locator ? new TextRun({ text: ` - ${c.locator}`, size: 20, font: FONT, color: '4a4a47' }) : new TextRun({ text: '', size: 20 }),
        c.url     ? new TextRun({ text: ` (${c.url})`, size: 20, font: FONT, color: '4a4a47' }) : new TextRun({ text: '', size: 20 }),
      ],
    })),
  ]
}

/**
 * Build a DOCX Document for the given structured doc, returning the
 * Buffer that the API route streams back as application/octet-stream.
 */
export async function renderDocx(doc: StructuredDocument): Promise<Buffer> {
  const titleEls: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: doc.title, bold: true, size: 36, font: FONT })],
    }),
  ]
  if (doc.subtitle) {
    titleEls.push(new Paragraph({
      spacing: { before: 0, after: 240 },
      children: [new TextRun({ text: doc.subtitle, italics: true, size: 22, color: '6B6B66', font: FONT })],
    }))
  }

  const issuerEls: Paragraph[] = []
  if (doc.issuer) {
    const issuerLine = [doc.issuer.business_name, doc.issuer.abn ? `ABN ${doc.issuer.abn}` : null, doc.issuer.address]
      .filter(Boolean).join(' · ')
    if (issuerLine) {
      issuerEls.push(new Paragraph({
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: issuerLine, size: 20, color: '6B6B66', font: FONT })],
      }))
    }
  }

  const recipientEls: Paragraph[] = []
  if (doc.recipient) {
    const r = doc.recipient
    const lines = [r.name, r.role, r.address].filter(Boolean) as string[]
    for (const l of lines) {
      recipientEls.push(new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: l, size: 22, font: FONT })],
      }))
    }
    if (lines.length) recipientEls.push(new Paragraph({ spacing: { before: 0, after: 200 }, children: [] }))
  }

  const sectionsEls = doc.sections.flatMap(sectionParagraphs)
  const citationsEls = citationsBlock(doc.citations)

  const document = new Document({
    creator: 'HQ.ai AI Administrator',
    title:   doc.title,
    description: doc.subtitle ?? '',
    numbering: {
      config: [{
        reference: 'doc-ol',
        levels: [{
          level: 0,
          format: 'decimal',
          text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{
      properties: {},
      children: [
        ...titleEls,
        ...issuerEls,
        ...recipientEls,
        ...sectionsEls,
        ...citationsEls,
      ],
    }],
  })
  return await Packer.toBuffer(document)
}
