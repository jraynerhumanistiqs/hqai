#!/usr/bin/env node
// Ingest Modern Awards into the knowledge_chunks table.
//
// Reads award source files from ./data/awards/*.txt (or .md) — each file
// should be the award text plus a front-matter line `# MA000003 — General
// Retail Industry Award 2020`. Chunks, embeds with OpenAI, inserts via the
// service-role client.
//
// Usage:
//   npx tsx scripts/ingest/ingest-awards.ts [--dry]
//
// Env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { chunkText } from './chunk'

const DATA_DIR = path.join(process.cwd(), 'data', 'awards')
const DRY = process.argv.includes('--dry')

async function embed(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not set')
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  })
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
  return data.data.map(d => d.embedding)
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`No awards directory at ${DATA_DIR}. Create it and add one file per award.`)
    process.exit(1)
  }
  const supabase = DRY ? null : createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.md'))
  console.log(`Found ${files.length} award files.`)

  for (const file of files) {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8')
    const header = raw.split('\n').find(l => l.startsWith('#')) ?? ''
    const match = header.match(/#\s*(MA\d{6})\s*[—\-]\s*(.+)/i)
    const awardCode = match?.[1] ?? file.replace(/\.(txt|md)$/, '')
    const awardName = (match?.[2] ?? awardCode).trim()

    const chunks = chunkText(raw)
    console.log(`• ${awardCode} — ${awardName}: ${chunks.length} chunks`)

    for (let i = 0; i < chunks.length; i += 32) {
      const batch = chunks.slice(i, i + 32)
      const vectors = await embed(batch.map(b => b.content))
      if (DRY) continue
      const rows = batch.map((b, j) => ({
        source: `modern-award:${awardCode}`,
        source_url: `https://www.fwc.gov.au/document-search?options=SearchType_2&mrn=${awardCode}`,
        source_title: awardName,
        section: b.section ?? null,
        content: b.content,
        token_count: b.tokenCount,
        jurisdiction: 'AU',
        last_verified: new Date().toISOString().slice(0, 10),
        embedding: vectors[j] as unknown as string,
        metadata: { award_code: awardCode },
      }))
      const { error } = await supabase!.from('knowledge_chunks').insert(rows)
      if (error) console.error(`  insert error: ${error.message}`)
    }
  }
  console.log(DRY ? 'Dry run complete.' : 'Ingestion complete.')
}

main().catch(err => { console.error(err); process.exit(1) })
