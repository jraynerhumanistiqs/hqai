#!/usr/bin/env node
// Backfill knowledge_chunks.embedding for rows where it is NULL.
//
// WHY THIS EXISTS, AND WHY YOU MUST NOT "JUST RE-RUN THE INGEST SCRIPTS":
// ingest-{awards,fwo,act}.ts call .insert(). They have no upsert and no
// delete, so re-running them does not repair the corpus - it DUPLICATES it.
// Every row already holds its primary-source text in `content`. The only
// thing missing is the vector. This script reads that existing content,
// embeds it, and UPDATEs the row in place. Nothing is re-chunked and no
// source text is rewritten.
//
// SAFETY: the embedding provider's dimension must match the live column.
// The column is vector(1024) if knowledge_chunks_voyage_dim.sql has been
// applied, vector(1536) otherwise. This script probes ONE row first and
// aborts on a mismatch rather than half-filling the table.
//
// Usage:
//   npx tsx scripts/ingest/backfill-embeddings.ts --dry     # probe + count only
//   npx tsx scripts/ingest/backfill-embeddings.ts           # backfill
//   npx tsx scripts/ingest/backfill-embeddings.ts --verify  # report state, write nothing
//
// Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
//      and OPENAI_API_KEY, or VOYAGE_API_KEY to use voyage-law-2 instead.

import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// --- .env.local loader (these scripts run outside Next, so nothing loads it) --
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

const DRY = process.argv.includes('--dry')
const VERIFY_ONLY = process.argv.includes('--verify')
const EMBED_BATCH = 32          // texts per embedding API call
const WRITE_CONCURRENCY = 6     // parallel row updates
const MAX_INPUT_CHARS = 28000   // guard against a pathological chunk

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

type Provider = { name: string; model: string; dims: number }

function pickProvider(): Provider {
  if (process.env.VOYAGE_API_KEY) return { name: 'voyage', model: 'voyage-law-2', dims: 1024 }
  if (process.env.OPENAI_API_KEY) return { name: 'openai', model: 'text-embedding-3-small', dims: 1536 }
  throw new Error('Neither VOYAGE_API_KEY nor OPENAI_API_KEY is set - cannot embed.')
}

async function embedBatch(texts: string[], p: Provider): Promise<number[][]> {
  const input = texts.map(t => (t.length > MAX_INPUT_CHARS ? t.slice(0, MAX_INPUT_CHARS) : t))
  const url = p.name === 'voyage'
    ? 'https://api.voyageai.com/v1/embeddings'
    : 'https://api.openai.com/v1/embeddings'
  const key = p.name === 'voyage' ? process.env.VOYAGE_API_KEY! : process.env.OPENAI_API_KEY!
  const body = p.name === 'voyage'
    ? { model: p.model, input, input_type: 'document' }
    : { model: p.model, input }

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
      const out = data.data.map(d => d.embedding)
      for (const v of out) {
        if (v.length !== p.dims) {
          throw new Error(`${p.model} returned ${v.length} dims, expected ${p.dims}`)
        }
      }
      return out
    }
    if (res.status === 429 || res.status >= 500) {
      const text = await res.text()
      const m = text.match(/try again in ([\d.]+)s/i)
      const waitMs = m ? Math.ceil(parseFloat(m[1]) * 1000) + 1000 : 5000 * (attempt + 1)
      console.warn(`  rate-limited (${res.status}), waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/6)`)
      await sleep(waitMs)
      continue
    }
    throw new Error(`${p.name} embeddings ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  throw new Error(`${p.name} embeddings: exhausted retries`)
}

function isDimMismatch(msg: string): boolean {
  return /expected \d+ dimensions|different vector dimensions|has \d+ dimensions/i.test(msg)
}

async function countNull(sb: SupabaseClient, isNull: boolean): Promise<number> {
  const q = sb.from('knowledge_chunks').select('id', { count: 'exact', head: true })
  const { count, error } = isNull ? await q.is('embedding', null) : await q.not('embedding', 'is', null)
  if (error) throw new Error(`count failed: ${error.message}`)
  return count ?? 0
}

async function main() {
  const provider = pickProvider()
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const nullBefore = await countNull(sb, true)
  const filledBefore = await countNull(sb, false)
  console.log(`\nprovider : ${provider.name} / ${provider.model} (${provider.dims} dims)`)
  console.log(`corpus   : ${nullBefore + filledBefore} rows - ${filledBefore} embedded, ${nullBefore} NULL\n`)

  if (VERIFY_ONLY) {
    console.log(nullBefore === 0
      ? 'VERIFY: every row is embedded.'
      : `VERIFY: ${nullBefore} rows still have no embedding - retrieval will miss them.`)
    process.exit(nullBefore === 0 ? 0 : 1)
  }
  if (nullBefore === 0) { console.log('Nothing to do.'); return }

  // ---- Step 1: probe ONE row so a dim mismatch aborts before any bulk write.
  const { data: probeRows, error: probeErr } = await sb
    .from('knowledge_chunks').select('id, content').is('embedding', null).limit(1)
  if (probeErr) throw new Error(`probe select failed: ${probeErr.message}`)
  const probe = probeRows?.[0]
  if (!probe) { console.log('Nothing to do.'); return }

  console.log(`probing row ${probe.id} to confirm the column accepts ${provider.dims} dims...`)
  const [probeVec] = await embedBatch([probe.content], provider)

  if (DRY) {
    console.log(`DRY RUN: embedded 1 row successfully (${probeVec.length} dims). No writes made.`)
    console.log(`Would backfill ${nullBefore} rows.`)
    return
  }

  const { error: probeWriteErr } = await sb
    .from('knowledge_chunks')
    .update({ embedding: probeVec as unknown as string })
    .eq('id', probe.id)

  if (probeWriteErr) {
    if (isDimMismatch(probeWriteErr.message)) {
      console.error(`\nABORTED - dimension mismatch. Nothing was written.\n`)
      console.error(`  ${provider.model} produces ${provider.dims}-dim vectors.`)
      console.error(`  The live knowledge_chunks.embedding column does not accept that.`)
      console.error(`  Postgres said: ${probeWriteErr.message}\n`)
      console.error(`  Fix it one of two ways:`)
      console.error(`    a) Use voyage-law-2 (1024 dims, matches the current column):`)
      console.error(`       set VOYAGE_API_KEY, then re-run this script.`)
      console.error(`    b) Stay on OpenAI (1536 dims): apply`)
      console.error(`       supabase/migrations/knowledge_chunks_openai_dim.sql`)
      console.error(`       to move the column back to vector(1536), then re-run.\n`)
      process.exit(1)
    }
    throw new Error(`probe update failed: ${probeWriteErr.message}`)
  }
  console.log(`probe OK - the column accepts ${provider.dims} dims. Backfilling.\n`)

  // ---- Step 2: backfill the rest, page by page.
  let done = 0
  let failed = 0
  const started = Date.now()

  for (;;) {
    const { data: rows, error } = await sb
      .from('knowledge_chunks').select('id, content').is('embedding', null).limit(EMBED_BATCH)
    if (error) throw new Error(`select failed: ${error.message}`)
    if (!rows || rows.length === 0) break

    let vectors: number[][]
    try {
      vectors = await embedBatch(rows.map(r => r.content), provider)
    } catch (err) {
      console.error(`  batch embed failed, skipping ${rows.length} rows: ${(err as Error).message}`)
      failed += rows.length
      // Avoid an infinite loop on a permanently bad batch.
      if (failed > 200) throw new Error('too many embed failures - stopping')
      await sleep(2000)
      continue
    }

    // Write with bounded concurrency.
    for (let i = 0; i < rows.length; i += WRITE_CONCURRENCY) {
      const slice = rows.slice(i, i + WRITE_CONCURRENCY)
      const results = await Promise.all(slice.map((row, j) =>
        sb.from('knowledge_chunks')
          .update({ embedding: vectors[i + j] as unknown as string })
          .eq('id', row.id)
          .then(({ error: e }) => (e ? { id: row.id, msg: e.message } : null)),
      ))
      for (const r of results) {
        if (r) { console.error(`  row ${r.id} update failed: ${r.msg}`); failed++ }
        else done++
      }
    }

    const pct = Math.round((done / nullBefore) * 100)
    const rate = done / Math.max(1, (Date.now() - started) / 1000)
    const etaMin = Math.max(0, Math.round((nullBefore - done) / Math.max(rate, 0.01) / 60))
    process.stdout.write(`\r  ${done}/${nullBefore} (${pct}%)  ~${etaMin}m left  ${failed ? failed + ' failed' : ''}   `)
    await sleep(200)
  }

  // ---- Step 3: verify.
  const nullAfter = await countNull(sb, true)
  const filledAfter = await countNull(sb, false)
  console.log(`\n\nbackfilled ${done} rows${failed ? `, ${failed} failed` : ''}`)
  console.log(`corpus now: ${filledAfter} embedded, ${nullAfter} NULL`)

  if (nullAfter > 0) {
    console.error(`\nWARNING: ${nullAfter} rows still unembedded - retrieval will miss them.`)
    process.exit(1)
  }
  console.log(`\nDone. Re-run with --verify any time to confirm.`)
  console.log(`Next: run "vacuum analyze public.knowledge_chunks;" so the vector index is usable,`)
  console.log(`then make a real chat call and confirm citations is NOT empty.`)
}

main().catch(err => { console.error('\n' + err.message); process.exit(1) })
