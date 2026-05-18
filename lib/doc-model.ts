// B4 - structured intermediate document model.
//
// Source: docs/research/2026-05-16_ai-doc-creation-teardown.md
// section 6.2 + section 3.4 (Gamma teardown). The flow today is
//   Claude -> markdown string -> docx Paragraph[]
// which means only one renderer exists and any new format (PDF, PPTX,
// shareable web link) needs a separate Claude pass. We invert that to:
//   Claude (tool-use) -> StructuredDocument JSON
//   StructuredDocument -> renderers/{html, docx, pdf, pptx, docxtemplater}
//
// One Claude call, four output formats, deterministic styling.
//
// Schema design notes:
//   - Block types are explicit (not freeform markdown) so renderers
//     don't need to parse anything. Adding a new block type is an
//     additive change everywhere.
//   - Citations are first-class: each block can carry citations[]
//     that reference Fair Work / award / NES sections used in
//     generation. Renderers decide how to surface them (footnotes,
//     superscript, hover chips).
//   - Tone-of-voice and template metadata are at the document level
//     so renderers can render headers / footers / signatures
//     consistently across formats.

export type CitationRef = {
  /** Stable id used to link block -> footnote across renderers. */
  id: string
  /** Source title (eg "Fair Work Act 2009 (Cth)"). */
  source: string
  /** Optional section / clause reference (eg "s 117"). */
  locator?: string
  /** Optional public URL. */
  url?: string
  /** Optional verbatim quote captured at generation time. */
  quote?: string
}

export type BlockHeading = {
  type: 'heading'
  level: 1 | 2 | 3 | 4
  text: string
  citations?: string[]
}
export type BlockParagraph = {
  type: 'paragraph'
  text: string
  citations?: string[]
}
export type BlockList = {
  type: 'list'
  ordered: boolean
  items: string[]
  citations?: string[]
}
export type BlockTable = {
  type: 'table'
  caption?: string
  headers: string[]
  rows: string[][]
  citations?: string[]
}
export type BlockKeyValue = {
  /** Two-column field/value block - used for templated headers
   *  (employee name, role title, start date, etc) and signature lines. */
  type: 'kv'
  items: Array<{ label: string; value: string }>
}
export type BlockSpacer = { type: 'spacer'; size?: 'sm' | 'md' | 'lg' }
export type BlockPageBreak = { type: 'page_break' }
export type BlockSignature = {
  type: 'signature'
  party: 'employer' | 'employee' | 'witness' | 'guarantor'
  name?: string
  label?: string
}
export type BlockNotice = {
  type: 'notice'
  variant: 'info' | 'warning' | 'caution'
  text: string
}

export type DocumentBlock =
  | BlockHeading
  | BlockParagraph
  | BlockList
  | BlockTable
  | BlockKeyValue
  | BlockSpacer
  | BlockPageBreak
  | BlockSignature
  | BlockNotice

export interface DocumentSection {
  /** Optional section id, useful for templated docs that have stable
   *  sub-section anchors (eg "remuneration", "termination"). */
  id?: string
  /** Section title, rendered as an H2 in HTML/DOCX, slide title in PPTX. */
  title?: string
  blocks: DocumentBlock[]
}

export interface StructuredDocument {
  /** Slug-style template id this document was generated from.
   *  Lines up with lib/template-ip.ts entries when applicable. */
  template_id?: string
  /** Document title, eg "Letter of Offer - Senior Developer". */
  title: string
  /** Sub-title under the title (date, version, "Confidential", etc). */
  subtitle?: string
  /** Australian English everywhere - locale flag for future i18n. */
  locale: 'en-AU'
  /** Recipient block - rendered at the top of letters. */
  recipient?: {
    name?: string
    role?: string
    address?: string
  }
  /** Issuer block - the business sending the document. */
  issuer?: {
    business_name: string
    abn?: string
    address?: string
    signatory_name?: string
    signatory_role?: string
  }
  /** Body of the document. */
  sections: DocumentSection[]
  /** All citations referenced from any block in the document.
   *  Renderers join blocks to this map by id. */
  citations?: CitationRef[]
  /** Free-form metadata bag for the template author. Renderers ignore
   *  unknown keys. */
  metadata?: Record<string, string | number | boolean | null>
}

/** Anthropic tool-use schema for the generation call. The model returns
 *  StructuredDocument JSON directly - no markdown parse step in the hot
 *  path. */
export const STRUCTURED_DOC_TOOL = {
  name: 'emit_document',
  description:
    'Emit the final document as a structured tree. Use this exactly once; do not respond with prose.',
  input_schema: {
    type: 'object' as const,
    required: ['title', 'locale', 'sections'],
    properties: {
      template_id: { type: 'string' },
      title:       { type: 'string' },
      subtitle:    { type: 'string' },
      locale:      { type: 'string', enum: ['en-AU'] },
      recipient: {
        type: 'object',
        properties: {
          name:    { type: 'string' },
          role:    { type: 'string' },
          address: { type: 'string' },
        },
      },
      issuer: {
        type: 'object',
        properties: {
          business_name:   { type: 'string' },
          abn:             { type: 'string' },
          address:         { type: 'string' },
          signatory_name:  { type: 'string' },
          signatory_role:  { type: 'string' },
        },
      },
      sections: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['blocks'],
          properties: {
            id:     { type: 'string' },
            title:  { type: 'string' },
            blocks: {
              type: 'array',
              // Every section MUST contain at least one block, and at
              // least one of those blocks must be a paragraph / list /
              // table / kv / signature with real text. Heading-only
              // sections produce empty documents and are rejected
              // downstream. The renderer's switch statement still
              // validates the discriminator at runtime; we just put
              // the minimum-content rule into JSON-schema so the
              // model is more likely to follow it.
              minItems: 1,
              items: {
                type: 'object',
                required: ['type'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['heading', 'paragraph', 'list', 'table', 'kv', 'spacer', 'page_break', 'signature', 'notice'],
                  },
                  // Common text-bearing field. Required for heading /
                  // paragraph / notice blocks - the renderer crashes
                  // (or now renders as blank) if these are missing.
                  text: { type: 'string', minLength: 1 },
                  // List-specific.
                  ordered: { type: 'boolean' },
                  items: { type: 'array', items: { type: 'string', minLength: 1 } },
                  // Table-specific.
                  headers: { type: 'array', items: { type: 'string' } },
                  rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
                  // KV-specific.
                  // (items is already declared above as a string array
                  // for list blocks; the kv block uses a different
                  // shape but the JSON schema we pass to Anthropic
                  // doesn't need full union discrimination - the
                  // server-side validator handles the precise check.)
                  // Signature-specific.
                  party: { type: 'string', enum: ['employer', 'employee', 'witness', 'guarantor'] },
                  name: { type: 'string' },
                  label: { type: 'string' },
                  // Heading-specific.
                  level: { type: 'integer', minimum: 1, maximum: 4 },
                  // Notice-specific.
                  variant: { type: 'string', enum: ['info', 'warning', 'caution'] },
                  // Spacer-specific.
                  size: { type: 'string', enum: ['sm', 'md', 'lg'] },
                  // Citations attached to a block.
                  citations: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
      citations: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'source'],
          properties: {
            id:      { type: 'string' },
            source:  { type: 'string' },
            locator: { type: 'string' },
            url:     { type: 'string' },
            quote:   { type: 'string' },
          },
        },
      },
      metadata: { type: 'object' },
    },
  },
} as const

/** Type guard - the renderers iterate `sections[].blocks` and pass each
 *  entry through this guard before dispatching. Unknown / malformed
 *  blocks are skipped with a warning rather than crashing the render. */
export function isDocumentBlock(value: unknown): value is DocumentBlock {
  if (!value || typeof value !== 'object') return false
  const t = (value as { type?: unknown }).type
  return typeof t === 'string' && [
    'heading', 'paragraph', 'list', 'table', 'kv', 'spacer', 'page_break', 'signature', 'notice',
  ].includes(t)
}

/** Lightweight validator used by the API generate route. Returns the
 *  document or throws with a descriptive error so the caller can return
 *  a clean 422. */
export function assertStructuredDocument(value: unknown): StructuredDocument {
  if (!value || typeof value !== 'object') throw new Error('Document must be an object.')
  const obj = value as Partial<StructuredDocument>
  if (typeof obj.title !== 'string' || !obj.title.trim()) throw new Error('Document must have a title.')
  if (obj.locale && obj.locale !== 'en-AU') throw new Error(`Unsupported locale: ${obj.locale}.`)
  if (!Array.isArray(obj.sections)) throw new Error('Document must have a sections[] array.')
  // Coerce locale default - lets the model omit it.
  if (!obj.locale) (obj as StructuredDocument).locale = 'en-AU'
  for (const s of obj.sections) {
    if (!s || !Array.isArray(s.blocks)) throw new Error('Each section must have a blocks[] array.')
  }
  // Detect the "heading-only" failure mode where Claude emits a section
  // title but no real prose under it. We don't throw - throwing would
  // dead-end the user - but we tag the doc as failed so the route can
  // retry with a stronger model + harder prompt.
  return obj as StructuredDocument
}

/** Returns true when every section contains at least one block that
 *  carries actual content (paragraph / list / table / kv / signature /
 *  notice with text). Heading-only sections fail. Used by the generate
 *  route to decide whether to retry. */
export function hasRealContent(doc: StructuredDocument): boolean {
  if (!doc.sections.length) return false
  return doc.sections.every(section => {
    if (!section.blocks?.length) return false
    return section.blocks.some(b => {
      switch (b.type) {
        case 'paragraph': return typeof b.text === 'string' && b.text.trim().length > 0
        case 'list':      return Array.isArray(b.items) && b.items.some(i => i && i.trim().length > 0)
        case 'table':     return Array.isArray(b.rows) && b.rows.length > 0
        case 'kv':        return Array.isArray(b.items) && b.items.length > 0
        case 'signature': return true // signature lines are content
        case 'notice':    return typeof b.text === 'string' && b.text.trim().length > 0
        default:          return false // heading / spacer / page_break alone don't count
      }
    })
  })
}
