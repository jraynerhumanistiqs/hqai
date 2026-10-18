#!/usr/bin/env node
// Smoke test the RAG grounding path end to end: embed a real question, call
// match_knowledge, assert we get citable hits back.
//
// This exists because the corpus silently lost every embedding and nothing
// caught it. Row counts are not proof - the only proof is that a real
// question returns real passages. Run after any ingest, migration, or
// embedding-provider change.
//
//   node scripts/smoke-rag.mjs
//
// Exits non-zero if any probe question returns nothing.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

// Spread across the corpus: NES, award, dismissal, WHS, and a recent reform.
const PROBES = [
  'how much notice do I have to give someone I am letting go',
  'what are the rules for casual conversion',
  'do I have to pay redundancy if I employ fewer than 15 people',
  'can an employee refuse to answer calls after hours',
  'what records am I legally required to keep for my staff',
]

const TOP_K = 4
const MIN_SIMILARITY = 0.4

async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })
  if (!res.ok) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  return json.data[0].embedding
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

let failures = 0

console.log(`\nProbing match_knowledge with ${PROBES.length} real questions`)
console.log(`top_k=${TOP_K} min_similarity=${MIN_SIMILARITY}\n`)

for (const q of PROBES) {
  let hits = []
  try {
    const embedding = await embed(q)
    // Mirror lib/rag.ts exactly - match_knowledge is HYBRID (full-text rank
    // plus vector cosine), so query_text is required alongside the vector.
    const { data, error } = await sb.rpc('match_knowledge', {
      query_embedding: embedding,
      query_text: q,
      match_count: TOP_K,
      min_similarity: MIN_SIMILARITY,
      source_filter: null,
      jurisdiction_filter: null,
    })
    if (error) throw new Error(error.message)
    hits = data ?? []
  } catch (err) {
    console.log(`  FAIL  "${q}"`)
    console.log(`        ${err.message}\n`)
    failures++
    continue
  }

  if (hits.length === 0) {
    console.log(`  FAIL  "${q}"`)
    console.log(`        no passages above the similarity floor - ungrounded\n`)
    failures++
    continue
  }

  const top = hits[0]
  console.log(`  OK    "${q}"`)
  console.log(`        ${hits.length} hits, top similarity ${Number(top.similarity).toFixed(3)}`)
  for (const h of hits.slice(0, 2)) {
    const label = [h.source_title, h.section].filter(Boolean).join(' / ')
    console.log(`          - ${label.slice(0, 72)}`)
  }
  console.log()
}

if (failures) {
  console.error(`${failures}/${PROBES.length} probes returned nothing. RAG is not grounding.`)
  process.exit(1)
}
console.log(`All ${PROBES.length} probes grounded.\n`)
