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
import type { StructuredDocument } from '@/lib/doc-model'

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
