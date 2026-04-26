#!/usr/bin/env node
// Ingest Fair Work Ombudsman (FWO) + NES + internal playbook pages into the
// knowledge_chunks table.
//
// Expects a JSON manifest at ./data/fwo/manifest.json with entries like:
// [
//   { "source": "fair-work-ombudsman", "url": "https://www.fairwork.gov.au/.../redundancy-pay",
//     "title": "Fair Work Ombudsman — Redundancy pay", "file": "redundancy-pay.md" },
//   { "source": "nes", "title": "NES — Annual leave", "file": "nes-annual-leave.md" }
// ]
//
// Usage:
//   npx tsx scripts/ingest/ingest-fwo.ts [--dry]

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { chunkText } from './chunk'

const DATA_DIR = path.join(process.cwd(), 'data', 'fwo')
const MANIFEST = path.join(DATA_DIR, 'manifest.json')
const DRY = process.argv.includes('--dry')

interface ManifestEntry {
  source: string              // e.g. 'fair-work-ombudsman', 'nes', 'internal'
  url?: string
  title: string
  file: string                // relative to DATA_DIR
  jurisdiction?: string       // default 'AU'
  section?: string
}

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
  if (!fs.existsSync(MANIFEST)) {
    console.error(`No manifest at ${MANIFEST}.`)
    process.exit(1)
  }
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  const supabase = DRY ? null : createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  for (const entry of manifest) {
    const filePath = path.join(DATA_DIR, entry.file)
    if (!fs.existsSync(filePath)) {
      console.warn(`  missing file ${entry.file} — skipping`)
      continue
    }
    const raw = fs.readFileSync(filePath, 'utf8')
    const chunks = chunkText(raw, { section: entry.section })
    console.log(`• ${entry.title}: ${chunks.length} chunks`)

    const BATCH = 16
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH)
      const vectors = await embed(batch.map(b => b.content))
      await sleep(1500)
      if (DRY) continue
      const rows = batch.map((b, j) => ({
        source: entry.source,
        source_url: entry.url ?? null,
        source_title: entry.title,
        section: b.section ?? entry.section ?? null,
        content: b.content,
        token_count: b.tokenCount,
        jurisdiction: entry.jurisdiction ?? 'AU',
        last_verified: new Date().toISOString().slice(0, 10),
        embedding: vectors[j] as unknown as string,
        metadata: {},
      }))
      const { error } = await supabase!.from('knowledge_chunks').insert(rows)
      if (error) console.error(`  insert error: ${error.message}`)
    }
  }
  console.log(DRY ? 'Dry run complete.' : 'Ingestion complete.')
}

main().catch(err => { console.error(err); process.exit(1) })
