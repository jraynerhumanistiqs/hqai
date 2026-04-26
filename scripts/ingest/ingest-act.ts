#!/usr/bin/env node
// Ingest Fair Work Act 2009 (and similar large statutes) into knowledge_chunks.
//
// Drop one or more .docx volumes into ./data/act/ — for example the official
// compilation downloads from https://www.legislation.gov.au/C2009A00028/latest/downloads
// (C2026C00141VOL01.docx, VOL02.docx, VOL03.docx). The script extracts raw
// text via mammoth, chunks via the shared chunker, and writes embeddings.
//
// Usage:
//   npx tsx scripts/ingest/ingest-act.ts [--dry]

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import mammoth from 'mammoth'
import { chunkAct } from './chunk'

const DATA_DIR = path.join(process.cwd(), 'data', 'act')
const DRY = process.argv.includes('--dry')
const SOURCE_URL = 'https://www.legislation.gov.au/C2009A00028/latest'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function embed(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not set')
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
    })
    if (res.ok) {
      const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
      return data.data.map(d => d.embedding)
    }
    if (res.status === 429 || res.status >= 500) {
      const body = await res.text()
      const match = body.match(/try again in ([\d.]+)s/i)
      const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 1000 : 20000 * (attempt + 1)
      console.warn(`  rate-limited, waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/6)`)
      await sleep(waitMs)
      continue
    }
    throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`)
  }
  throw new Error('OpenAI embeddings: exhausted retries')
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`No act directory at ${DATA_DIR}.`)
    process.exit(1)
  }

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.toLowerCase().endsWith('.docx'))
    .sort()

  if (files.length === 0) {
    console.error(`No .docx files found in ${DATA_DIR}. Drop the FWA volumes there.`)
    process.exit(1)
  }
  console.log(`Found ${files.length} docx file(s).`)

  const supabase = DRY ? null : createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file)
    console.log(`\n• ${file} — extracting text…`)
    const { value: rawText, messages } = await mammoth.extractRawText({ path: filePath })
    if (messages.length) {
      const warnings = messages.filter(m => m.type === 'warning').length
      const errors = messages.filter(m => m.type === 'error').length
      if (warnings || errors) console.log(`  mammoth: ${warnings} warnings, ${errors} errors`)
    }

    // Strip page headers/footers and excessive blank lines.
    const cleaned = rawText
      .replace(/Authorised Version[^\n]*\n?/g, '')
      .replace(/Compilation No\.[^\n]*\n?/g, '')
      .replace(/^\s*Fair Work Act 2009\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const volMatch = file.match(/VOL\s?(\d+)/i)
    const volume = volMatch ? `Volume ${volMatch[1]}` : file.replace(/\.docx$/i, '')
    const title = `Fair Work Act 2009 — ${volume}`

    const chunks = chunkAct(cleaned)
    console.log(`  ${title}: ${chunks.length} chunks (${Math.round(cleaned.length / 1000)}k chars)`)

    const BATCH = 16
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH)
      const vectors = await embed(batch.map(b => b.content))
      await sleep(1500)
      if (DRY) continue
      const rows = batch.map((b, j) => ({
        source: 'fair-work-act',
        source_url: SOURCE_URL,
        source_title: title,
        section: b.section ?? null,
        content: b.content,
        token_count: b.tokenCount,
        jurisdiction: 'AU',
        last_verified: new Date().toISOString().slice(0, 10),
        embedding: vectors[j] as unknown as string,
        metadata: { volume, file },
      }))
      const { error } = await supabase!.from('knowledge_chunks').insert(rows)
      if (error) console.error(`  insert error: ${error.message}`)
      const pct = Math.round(Math.min(100, ((i + batch.length) / chunks.length) * 100))
      process.stdout.write(`  ${pct}% (${i + batch.length}/${chunks.length})\r`)
    }
    process.stdout.write('\n')
  }
  console.log(`\n${DRY ? 'Dry run complete.' : 'Ingestion complete.'}`)
}

main().catch(err => { console.error(err); process.exit(1) })
