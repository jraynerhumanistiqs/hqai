// B4/B7 - HTML renderer for the structured document model.
//
// Produces a self-contained, print-safe HTML string. Used in three
// places:
//   1. /doc/[id] web preview (B7)
//   2. PDF rendering via Puppeteer (B5)
//   3. Email body / inline preview when surfacing a generated doc
//      to a candidate (eg "see your offer letter before signing")
//
// The output deliberately does NOT depend on the runtime theme - the
// brief locks generated DOCX / PDF / PPTX output to a stable light
// presentation regardless of UI theme. We inline the styles inside a
// <style> block so the output renders identically in email clients,
// print previews, Puppeteer and the browser.

import type {
  StructuredDocument,
  DocumentBlock,
  CitationRef,
} from '@/lib/doc-model'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&#39;')

function citationFootnoteHtml(c: CitationRef): string {
  const parts: string[] = []
  parts.push(`<strong>${escapeHtml(c.source)}</strong>`)
  if (c.locator) parts.push(escapeHtml(c.locator))
  if (c.url)     parts.push(`<a href="${escapeHtml(c.url)}">${escapeHtml(c.url)}</a>`)
  return parts.join(' &middot; ')
}

function blockHtml(block: DocumentBlock, citationsMap: Map<string, number>): string {
  // Translate a citations[] array of citation ids on a block into the
  // superscript-numbered refs that appear at the end of the prose.
  const refSpan = (ids?: string[]) => {
    if (!ids?.length) return ''
    const nums = ids.map(id => citationsMap.get(id)).filter((n): n is number => typeof n === 'number')
    if (!nums.length) return ''
    return ' <sup class="cite-ref">[' + nums.join(',') + ']</sup>'
  }

  switch (block.type) {
    case 'heading': {
      const tag = `h${Math.max(1, Math.min(4, block.level))}` as 'h1' | 'h2' | 'h3' | 'h4'
      return `<${tag} class="doc-${tag}">${escapeHtml(block.text)}${refSpan(block.citations)}</${tag}>`
    }
    case 'paragraph':
      return `<p class="doc-p">${escapeHtml(block.text)}${refSpan(block.citations)}</p>`
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul'
      const items = block.items.map(it => `<li>${escapeHtml(it)}</li>`).join('')
      return `<${tag} class="doc-list">${items}</${tag}>${refSpan(block.citations) ? `<p class="doc-cite-tail">${refSpan(block.citations)}</p>` : ''}`
    }
    case 'table': {
      const head = `<thead><tr>${block.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
      const body = `<tbody>${block.rows.map(row =>
        `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`,
      ).join('')}</tbody>`
      const caption = block.caption ? `<caption>${escapeHtml(block.caption)}</caption>` : ''
      return `<table class="doc-table">${caption}${head}${body}</table>`
    }
    case 'kv':
      return '<dl class="doc-kv">' + block.items.map(({ label, value }) =>
        `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`,
      ).join('') + '</dl>'
    case 'spacer':
      return `<div class="doc-spacer doc-spacer-${block.size ?? 'md'}"></div>`
    case 'page_break':
      return '<div class="doc-page-break" style="break-after:page; page-break-after:always;"></div>'
    case 'signature':
      return `
        <div class="doc-signature">
          <div class="doc-signature-line"></div>
          <div class="doc-signature-meta">
            <span class="doc-signature-name">${escapeHtml(block.name ?? '__________________________')}</span>
            <span class="doc-signature-label">${escapeHtml(block.label ?? labelForParty(block.party))}</span>
          </div>
        </div>`
    case 'notice':
      return `<div class="doc-notice doc-notice-${block.variant}">${escapeHtml(block.text)}</div>`
    default:
      // Exhaustiveness guard - unreachable at runtime when types align.
      return ''
  }
}

function labelForParty(party: 'employer' | 'employee' | 'witness' | 'guarantor'): string {
  return ({
    employer:  'Signed for and on behalf of the Employer',
    employee:  'Signed by the Employee',
    witness:   'Signed by Witness',
    guarantor: 'Signed by Guarantor',
  })[party]
}

const BASE_CSS = `
:root {
  color-scheme: light;
  --doc-bg: #ffffff;
  --doc-ink: #0a0a0b;
  --doc-soft: #4a4a47;
  --doc-muted: #6b6b66;
  --doc-border: #e4e4e0;
  --doc-accent: #0a0a0b;
}
* { box-sizing: border-box; }
html, body {
  background: var(--doc-bg);
  color: var(--doc-ink);
  font: 16px/1.55 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
}
.doc-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 56px 64px;
}
.doc-meta {
  border-bottom: 1px solid var(--doc-border);
  padding-bottom: 16px;
  margin-bottom: 32px;
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}
.doc-meta-issuer { font-size: 13px; color: var(--doc-soft); }
.doc-title { font-size: 28px; line-height: 1.2; margin: 0 0 4px; font-weight: 700; }
.doc-subtitle { font-size: 13px; color: var(--doc-muted); margin: 0; }
.doc-recipient { margin: 0 0 28px; font-size: 14px; color: var(--doc-soft); }
.doc-recipient strong { color: var(--doc-ink); font-weight: 600; }
.doc-section { margin: 0 0 24px; }
.doc-section-title { font-size: 18px; font-weight: 700; margin: 28px 0 12px; }
.doc-h1 { font-size: 22px; font-weight: 700; margin: 24px 0 12px; }
.doc-h2 { font-size: 18px; font-weight: 700; margin: 20px 0 10px; }
.doc-h3 { font-size: 16px; font-weight: 700; margin: 16px 0 8px; }
.doc-h4 { font-size: 15px; font-weight: 700; margin: 14px 0 6px; }
.doc-p { margin: 0 0 12px; }
.doc-list { margin: 0 0 16px; padding-left: 22px; }
.doc-list li { margin-bottom: 4px; }
.doc-cite-tail { margin: -8px 0 12px; font-size: 12px; color: var(--doc-muted); }
.doc-table { border-collapse: collapse; width: 100%; margin: 0 0 16px; font-size: 14px; }
.doc-table th, .doc-table td { border: 1px solid var(--doc-border); padding: 8px 10px; text-align: left; }
.doc-table caption { font-size: 12px; color: var(--doc-muted); text-align: left; margin-bottom: 4px; }
.doc-kv { display: grid; grid-template-columns: 220px 1fr; row-gap: 6px; column-gap: 16px; margin: 0 0 16px; font-size: 14px; }
.doc-kv dt { font-weight: 600; color: var(--doc-soft); }
.doc-kv dd { margin: 0; }
.doc-spacer-sm { height: 8px; }
.doc-spacer-md { height: 16px; }
.doc-spacer-lg { height: 32px; }
.doc-signature { margin: 28px 0 16px; max-width: 360px; }
.doc-signature-line { border-bottom: 1px solid var(--doc-ink); height: 1px; margin-bottom: 6px; }
.doc-signature-meta { font-size: 12px; color: var(--doc-muted); display: flex; justify-content: space-between; gap: 16px; }
.doc-signature-name { color: var(--doc-ink); font-weight: 600; }
.doc-notice { border-radius: 8px; padding: 10px 14px; margin: 0 0 14px; font-size: 13px; }
.doc-notice-info { background: #eef4ff; color: #1e3a8a; }
.doc-notice-warning { background: #fff7ed; color: #9a3412; }
.doc-notice-caution { background: #fef2f2; color: #991b1b; }
.cite-ref { font-size: 0.7em; color: var(--doc-soft); }
.doc-citations { margin: 36px 0 0; border-top: 1px solid var(--doc-border); padding-top: 16px; font-size: 12px; color: var(--doc-soft); }
.doc-citations h2 { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--doc-muted); margin: 0 0 8px; }
.doc-citations ol { padding-left: 22px; margin: 0; }
.doc-citations li { margin-bottom: 4px; }
/* Logo footer - the uploaded business logo is rendered at the bottom
   of the document. object-fit: contain keeps the aspect ratio so any
   shape of logo fits the slot without distortion. Max height caps the
   visual footprint so big logos do not dominate the footer. */
.doc-footer-logo {
  margin: 48px 0 0;
  padding-top: 24px;
  border-top: 1px solid var(--doc-border);
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.doc-footer-logo img {
  max-height: 48px;
  max-width: 220px;
  width: auto;
  height: auto;
  object-fit: contain;
}
@media print {
  .doc-page { max-width: none; padding: 24mm 22mm 24mm; }
  .doc-footer-logo {
    position: running(footer);
  }
}
`

export function renderHtml(doc: StructuredDocument): string {
  // Build a stable id -> footnote-number map so blocks can reference
  // citations by their author-supplied id and the renderer hands back
  // [1], [2], [3] superscripts in order of first appearance.
  const citationOrder: string[] = []
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      const ids = (block as { citations?: string[] }).citations
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (!citationOrder.includes(id)) citationOrder.push(id)
        }
      }
    }
  }
  const citationsMap = new Map<string, number>()
  citationOrder.forEach((id, i) => citationsMap.set(id, i + 1))

  const recipient = doc.recipient
    ? `<div class="doc-recipient">${[
        doc.recipient.name ? `<strong>${escapeHtml(doc.recipient.name)}</strong>` : null,
        doc.recipient.role ? escapeHtml(doc.recipient.role) : null,
        doc.recipient.address ? escapeHtml(doc.recipient.address) : null,
      ].filter(Boolean).join('<br/>')}</div>`
    : ''

  const issuerLine = doc.issuer
    ? `<div class="doc-meta-issuer">${[
        doc.issuer.business_name ? escapeHtml(doc.issuer.business_name) : null,
        doc.issuer.abn ? `ABN ${escapeHtml(doc.issuer.abn)}` : null,
        doc.issuer.address ? escapeHtml(doc.issuer.address) : null,
      ].filter(Boolean).join(' &middot; ')}</div>`
    : ''

  const sectionsHtml = doc.sections.map(s => {
    const blocks = s.blocks.map(b => blockHtml(b, citationsMap)).join('\n')
    const title = s.title ? `<h2 class="doc-section-title">${escapeHtml(s.title)}</h2>` : ''
    return `<section class="doc-section">${title}${blocks}</section>`
  }).join('\n')

  // Footnote-style citations panel - only emitted if there are any.
  const citationsPanel = citationOrder.length
    ? `<footer class="doc-citations">
         <h2>Citations</h2>
         <ol>${citationOrder.map(id => {
           const c = doc.citations?.find(cc => cc.id === id)
           return c ? `<li>${citationFootnoteHtml(c)}</li>` : ''
         }).join('')}</ol>
       </footer>`
    : ''

  // Best-practice formatting: when the issuing business has uploaded a
  // logo (stored on profiles.businesses.logo_url, forwarded by the
  // generate route via doc.metadata.issuer_logo_url) we fit it into a
  // discreet footer slot. object-fit:contain in the CSS prevents
  // distortion for any logo aspect ratio.
  const logoUrl = (doc.metadata?.issuer_logo_url ?? '') as string
  const logoFooter = logoUrl
    ? `<footer class="doc-footer-logo">
         <img src="${escapeHtml(String(logoUrl))}" alt="${escapeHtml(doc.issuer?.business_name ?? 'Issuer logo')}" />
       </footer>`
    : ''

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(doc.title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<main class="doc-page">
  <header class="doc-meta">
    <div>
      <h1 class="doc-title">${escapeHtml(doc.title)}</h1>
      ${doc.subtitle ? `<p class="doc-subtitle">${escapeHtml(doc.subtitle)}</p>` : ''}
    </div>
    ${issuerLine}
  </header>
  ${recipient}
  ${sectionsHtml}
  ${citationsPanel}
  ${logoFooter}
</main>
</body>
</html>`
}
