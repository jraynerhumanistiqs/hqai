#!/usr/bin/env node
// Compare match_knowledge against match_knowledge_fast on real questions:
// do they return the SAME passages, and how much faster is the new one?
//
// Run after applying supabase/migrations/match_knowledge_fast.sql. The new
// function is additive, so this is safe to run against production - it only
// reads.
//
//   node scripts/compare-rag.mjs
//
// Swapping lib/rag.ts to the fast function is only justified if this reports
// identical top-K ids. Faster but different is a retrieval change, not an
// optimisation, and has to be judged on its own.

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

const QUESTIONS = [
  'how much notice do I have to give someone I am letting go',
  'what are the rules for casual conversion',
  'do I have to pay redundancy if I employ fewer than 15 people',
  'can an employee refuse to answer calls after hours',
  'what records am I legally required to keep for my staff',
  'what is the minimum wage for a casual in retail',
  'how do I work out which award applies to my business',
]

const TOP_K = 4
const MIN_SIM = 0.4
const REPS = 3

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })
  if (!res.ok) throw new Error(`embed ${res.status}`)
  return (await res.json()).data[0].embedding
}

async function timed(fn, embedding, q) {
  const t0 = performance.now()
  const { data, error } = await sb.rpc(fn, {
    query_embedding: embedding,
    query_text: q,
    match_count: TOP_K,
    min_similarity: MIN_SIM,
    source_filter: null,
    jurisdiction_filter: null,
  })
  const ms = performance.now() - t0
  if (error) return { ms, ids: null, err: error.message }
  return { ms, ids: (data ?? []).map(r => r.id), err: null }
}

const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]

console.log(`\nComparing match_knowledge vs match_knowledge_fast`)
console.log(`${QUESTIONS.length} questions, top_k=${TOP_K}, ${REPS} reps each\n`)

let identical = 0
let missingFast = false
const oldAll = []
const newAll = []

for (const q of QUESTIONS) {
  const e = await embed(q)
  const o = []
  const n = []
  let oIds = null
  let nIds = null
  for (let i = 0; i < REPS; i++) {
    const a = await timed('match_knowledge', e, q)
    const b = await timed('match_knowledge_fast', e, q)
    if (a.err) { console.log(`  ERROR old: ${a.err}`); break }
    if (b.err) {
      if (/Could not find the function/i.test(b.err)) missingFast = true
      else console.log(`  ERROR fast: ${b.err}`)
      break
    }
    o.push(a.ms); n.push(b.ms); oIds = a.ids; nIds = b.ids
  }
  if (missingFast) break
  if (!o.length || !n.length) continue
  oldAll.push(...o); newAll.push(...n)

  const same = JSON.stringify(oIds) === JSON.stringify(nIds)
  const sameSet = JSON.stringify([...(oIds ?? [])].sort()) === JSON.stringify([...(nIds ?? [])].sort())
  if (same) identical++
  const tag = same ? 'IDENTICAL' : sameSet ? 'same set, diff order' : 'DIFFERENT'
  console.log(`  ${median(o).toFixed(0).padStart(6)} -> ${median(n).toFixed(0).padStart(5)} ms   ${tag.padEnd(21)} ${q.slice(0, 44)}`)
  if (!sameSet) {
    console.log(`        old ids: ${JSON.stringify(oIds)}`)
    console.log(`        new ids: ${JSON.stringify(nIds)}`)
  }
}

if (missingFast) {
  console.error('\nmatch_knowledge_fast does not exist yet.')
  console.error('Apply supabase/migrations/match_knowledge_fast.sql in the Supabase SQL Editor first.\n')
  process.exit(1)
}

console.log(`\n  median latency : ${median(oldAll).toFixed(0)} ms -> ${median(newAll).toFixed(0)} ms`)
console.log(`  identical top-${TOP_K} : ${identical}/${QUESTIONS.length} questions`)
if (identical === QUESTIONS.length) {
  console.log(`\n  Safe to swap: change the rpc name in lib/rag.ts to match_knowledge_fast.\n`)
} else {
  console.log(`\n  DO NOT swap yet - retrieval differs on ${QUESTIONS.length - identical} question(s).`)
  console.log(`  Faster but different is a retrieval change, not an optimisation. Raise`)
  console.log(`  the candidates argument (default 200) and re-run before deciding.\n`)
}
