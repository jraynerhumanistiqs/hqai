// B8 - docxtemplater renderer.
//
// Source: docs/research/2026-05-16_ai-doc-creation-teardown.md
// section 6.3. When a TemplateDefinition has a `docxTemplatePath` set
// (file relative to lib/templates/), docxtemplater fills its merge
// fields directly. This lets the HR/legal team author a .docx in Word
// with their letterhead, branding and formatting, then the AI
// Administrator just merges field values into it. No code change
// required to ship a new branded template.
//
// Falls back to the synthetic renderer in lib/render/docx.ts when the
// template doesn't have a .docx template on disk.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
// docxtemplater image module - injects raster/SVG bytes into a
// {%logo} merge tag inside the .docx. Used by the OPTION F renderer
// below so every branded template picks up the client's logo
// automatically.
import ImageModule from 'docxtemplater-image-module-free'
import type { StructuredDocument } from '@/lib/doc-model'

// ── OPTION F: branded templates with dynamic logo injection ───────
// The 21 founder-authored .docx templates live in lib/render/templates
// (NOT lib/templates - the legacy folder used by the
// `renderDocxTemplate(templatePathRelative, context)` helper below).
// Each template uses docxtemplater syntax: {{title}} for text fields
// and {%logo} for the business logo image.
//
// The renderer:
//   1. Reads the template file off disk.
//   2. Fetches the business's logo from Supabase Storage (if any).
//   3. Renders the merge fields + injects the logo bytes.
//   4. Returns the generated buffer.

export type BrandedTemplateId =
  | 'letter_of_offer'
  | 'termination_of_employment'
  | 'termination_in_probation'
  | 'first_and_final_warning'
  | 'letter_of_expectation'
  | 'refusal_of_flexible_work'
  | 'confirmation_of_employment'
  | 'non_contactable_post_offer'
  | 'expired_offer_letter'
  | 'unsuccessful_candidate_email'
  | 'request_for_medical_information'
  | 'temporarily_unable_to_accommodate'
  | 'contract_variation_letter'
  | 'performance_improvement_plan'
  | 'employment_contract_style_a'
  | 'employment_contract_style_b'
  | 'file_note'
  | 'staff_member_statement'
  | 'job_advertisement'
  | 'reference_check'
  | 'suitable_duties_plan'

export interface BrandedTemplateData {
  title?: string
  subtitle?: string
  recipient_name?: string
  recipient_address?: string
  recipient_role?: string
  delivery_method?: string
  issuer_name?: string
  issuer_abn?: string
  issuer_address?: string
  signatory_name?: string
  signatory_role?: string
  sections?: { title: string; body: string }[]
  schedule_items?: { item: string; value: string }[]
  definitions?: { term: string; meaning: string }[]
  pip_duration?: string
  pip_start_date?: string
  first_review_date?: string
  second_review_date?: string
  /** Raw image bytes. If omitted, the renderer attempts to fetch the
   *  business logo from Supabase via the URL stored on the
   *  `businesses.logo_url` column. */
  logo?: Buffer | string
  /** Pre-resolved logo URL. Overrides the Supabase fetch when set. */
  logo_url?: string
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const ab = await r.arrayBuffer()
    return Buffer.from(ab)
  } catch {
    return null
  }
}

const imageOptions = {
  centered: false,
  getImage: (tagValue: unknown): Uint8Array => {
    if (Buffer.isBuffer(tagValue)) return new Uint8Array(tagValue)
    if (typeof tagValue === 'string') {
      // Treat as base64 when the value doesn't look like a URL or path.
      return new Uint8Array(Buffer.from(tagValue, 'base64'))
    }
    return new Uint8Array()
  },
  getSize: (): [number, number] => [150, 50],
}

/**
 * Render a branded template by id, with optional dynamic logo. The
 * caller passes through whatever known field values they have; missing
 * fields are stamped as empty strings (no docxtemplater "undefined" leak).
 */
export async function renderBrandedTemplate(
  templateId: BrandedTemplateId,
  data: BrandedTemplateData,
  options?: { logoUrl?: string | null },
): Promise<Buffer> {
  const absPath = path.resolve(process.cwd(), 'lib', 'render', 'templates', `${templateId}.docx`)
  const raw = await readFile(absPath)

  // Resolve logo bytes. Caller-supplied wins; otherwise hit the URL.
  let logoBytes: Buffer | undefined
  if (Buffer.isBuffer(data.logo)) logoBytes = data.logo
  else if (typeof data.logo === 'string' && data.logo.length > 0) {
    logoBytes = Buffer.from(data.logo, 'base64')
  } else {
    const url = data.logo_url ?? options?.logoUrl ?? null
    if (url) {
      const buf = await fetchLogoBuffer(url)
      if (buf) logoBytes = buf
    }
  }

  const zip = new PizZip(raw)
  const imageModule = new ImageModule(imageOptions)
  const tpl = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks:    true,
    modules:       [imageModule],
    nullGetter:    () => '',
  })

  // Strip the logo_url helper field so docxtemplater doesn't try to
  // render it as text somewhere. The image module only consumes the
  // `logo` field (rendered via {%logo}).
  const { logo_url: _logoUrl, ...rest } = data
  tpl.render({ ...rest, logo: logoBytes ?? '' })

  return tpl.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}

// ── Legacy generic renderer ───────────────────────────────────────

export interface DocxTemplateContext {
  /** Flat key/value pairs that the .docx template's {{tags}} resolve
   *  against. We auto-derive these from the structured document plus
   *  any extra inputs the caller wants to merge. */
  [key: string]: string | number | boolean | null | undefined | string[] | DocxTemplateContext | DocxTemplateContext[]
}

/**
 * Resolve a .docx template by path (relative to lib/templates/) and
 * fill it from `context`. The context shape is template-specific; the
 * template author decides which keys exist.
 */
export async function renderDocxTemplate(
  templatePathRelative: string,
  context: DocxTemplateContext,
): Promise<Buffer> {
  const absPath = path.resolve(process.cwd(), 'lib', 'templates', templatePathRelative)
  const raw = await readFile(absPath)
  const zip = new PizZip(raw)
  const tpl = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks:    true,
  })
  tpl.render(context)
  const out = tpl.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
  return out
}

/**
 * Helper - build a "flat" context off a StructuredDocument so generic
 * templates (eg "branded letterhead with title + body") can just read
 * top-level fields without having to know the doc tree.
 */
export function flatContextFromDocument(doc: StructuredDocument): DocxTemplateContext {
  return {
    title:    doc.title,
    subtitle: doc.subtitle ?? '',
    recipient_name:    doc.recipient?.name ?? '',
    recipient_role:    doc.recipient?.role ?? '',
    recipient_address: doc.recipient?.address ?? '',
    issuer_name:    doc.issuer?.business_name ?? '',
    issuer_abn:     doc.issuer?.abn ?? '',
    issuer_address: doc.issuer?.address ?? '',
    signatory_name: doc.issuer?.signatory_name ?? '',
    signatory_role: doc.issuer?.signatory_role ?? '',
    // Sections rendered as a flat array the template can {{#sections}}
    // over. Each block is joined into a single text paragraph so the
    // template doesn't need to switch on block type; the synthetic
    // DOCX renderer in lib/render/docx.ts handles the richer cases.
    sections: doc.sections.map(s => ({
      title: s.title ?? '',
      body:  s.blocks.map(b => 'text' in b ? b.text : '').filter(Boolean).join('\n\n'),
    })),
  }
}
