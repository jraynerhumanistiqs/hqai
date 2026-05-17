#!/usr/bin/env node
// Doc-engine smoke test.
//
// End-to-end check that the AI Administrator pipeline can:
//   1. generate a structured document via /api/administrator/documents/generate
//   2. render it back in all four formats (html, docx, pdf, pptx)
//   3. confirm each format returned a non-trivial body with the right MIME
//
// Designed to run against a deployed environment OR a local dev server.
// Usage:
//   BASE_URL=http://localhost:3000 AUTH_COOKIE="<sb-...>=<value>" node scripts/smoke-doc-engine.mjs
//   BASE_URL=https://hqai.vercel.app AUTH_COOKIE="..." node scripts/smoke-doc-engine.mjs
//
// The script uses a signed-in user's auth cookie to call the protected
// API. In CI we'd swap to a service-role / eval token, but for now a
// browser-copied cookie keeps the script simple.
//
// Exits non-zero on any failure so it can gate a Vercel preview check.

import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const COOKIE   = process.env.AUTH_COOKIE
if (!COOKIE) {
  console.error('Set AUTH_COOKIE to a logged-in Supabase session cookie.')
  console.error('In your browser DevTools -> Application -> Cookies, copy the sb-* row(s) into a single semicolon-joined string.')
  process.exit(2)
}

const fmtMime = {
  html: 'text/html',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf:  'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

function log(line)  { process.stdout.write(line + '\n') }
function fail(line) { process.stderr.write('FAIL: ' + line + '\n'); process.exit(1) }

async function main() {
  log(`[smoke] base url:  ${BASE_URL}`)
  log(`[smoke] step 1:    generating document...`)
  const genRes = await fetch(`${BASE_URL}/api/administrator/documents/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: COOKIE,
    },
    body: JSON.stringify({
      // Minimal payload - no template id, plain prompt. Exercises the
      // structured-doc tool path end to end without depending on any
      // specific template definition being present.
      prompt: 'Generate a short confirmation-of-employment letter for a single test candidate. Three sections max. Cite Fair Work Act s 117 and the NES. Australian English.',
      intent: 'administrator-template-fill',
    }),
  })
  if (!genRes.ok) {
    const body = await genRes.text()
    fail(`generate returned ${genRes.status}: ${body.slice(0, 400)}`)
  }
  const gen = await genRes.json()
  if (!gen.id || !gen.document) fail('generate returned no id / document')
  log(`[smoke] step 1 ok: id=${gen.id} title="${gen.document.title}" sections=${gen.document.sections?.length}`)

  const outDir = mkdtempSync(join(tmpdir(), 'hqai-smoke-'))
  log(`[smoke] step 2:    rendering each format (output: ${outDir})...`)

  for (const fmt of ['html', 'docx', 'pdf', 'pptx']) {
    const url = `${BASE_URL}/api/administrator/documents/${gen.id}/render?format=${fmt}`
    const t0 = Date.now()
    const r = await fetch(url, { headers: { Cookie: COOKIE } })
    const t = Date.now() - t0
    if (!r.ok) fail(`render ${fmt} returned ${r.status}`)
    const ct = (r.headers.get('content-type') || '').toLowerCase().split(';')[0].trim()
    if (!ct.startsWith(fmtMime[fmt])) {
      fail(`render ${fmt} returned wrong content-type: ${ct} (expected ${fmtMime[fmt]})`)
    }
    const buf = Buffer.from(await r.arrayBuffer())
    // Bytes thresholds: html >= 800 (full <html> wrapper + tokens),
    // docx >= 8 KiB (zip overhead + minimum word-ml), pdf >= 10 KiB,
    // pptx >= 8 KiB. Empty / corrupt outputs sit well below.
    const minBytes = ({ html: 800, docx: 8 * 1024, pdf: 10 * 1024, pptx: 8 * 1024 })[fmt]
    if (buf.length < minBytes) fail(`render ${fmt} too small: ${buf.length} bytes (threshold ${minBytes})`)
    const out = join(outDir, `smoke-${gen.id}.${fmt}`)
    writeFileSync(out, buf)
    log(`[smoke]   ${fmt.padEnd(4)}  ${buf.length.toLocaleString().padStart(10)} bytes  ${t}ms  ${out}`)
  }

  log(`[smoke] step 3:    /doc/${gen.id} preview page...`)
  const previewRes = await fetch(`${BASE_URL}/doc/${gen.id}`)
  if (!previewRes.ok) fail(`/doc preview returned ${previewRes.status}`)
  const html = await previewRes.text()
  if (!html.includes(gen.document.title)) fail('/doc preview did not include the document title')
  log(`[smoke] step 3 ok: title present in /doc preview html`)

  log(`\n[smoke] PASS - doc engine end to end is healthy.`)
}

main().catch(err => {
  console.error('[smoke] crashed:', err?.stack ?? err)
  process.exit(1)
})
