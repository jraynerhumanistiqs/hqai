// Re-run transcription for existing prescreen_responses.
//
// Usage:
//   node scripts/backfill-transcripts.mjs                  # all responses
//   node scripts/backfill-transcripts.mjs --session <id>   # only one role
//   node scripts/backfill-transcripts.mjs --response <id>  # single response
//   node scripts/backfill-transcripts.mjs --force          # re-run even if a transcript exists
//
// Hits the deployed /api/prescreen/responses/:id/transcribe endpoint, which
// loops every video_ids[*] (the route was previously transcribing only the
// first video — fixed in the same commit as this script).
//
// Env: reads .env.local for HQAI_TRANSCRIBE_BASE_URL (defaults to prod).

import { readFileSync } from 'node:fs'

function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch {}
}
loadEnv()

const args = new Map()
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a.startsWith('--')) {
    const next = process.argv[i + 1]
    if (!next || next.startsWith('--')) args.set(a.slice(2), true)
    else { args.set(a.slice(2), next); i++ }
  }
}

const BASE = process.env.HQAI_TRANSCRIBE_BASE_URL ?? 'https://hqai.vercel.app'
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !SUPA_KEY) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.')
  process.exit(1)
}

const force = !!args.get('force')

async function fetchResponses() {
  if (args.get('response')) {
    const r = await fetch(`${SUPA_URL}/rest/v1/prescreen_responses?id=eq.${args.get('response')}&select=id,session_id,candidate_name,video_ids,status`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    })
    return r.json()
  }
  let url = `${SUPA_URL}/rest/v1/prescreen_responses?select=id,session_id,candidate_name,video_ids,status&order=submitted_at.desc`
  if (args.get('session')) url += `&session_id=eq.${args.get('session')}`
  const r = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } })
  return r.json()
}

async function existingTranscriptIds() {
  const r = await fetch(`${SUPA_URL}/rest/v1/prescreen_transcripts?select=response_id`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  })
  const rows = await r.json()
  return new Set((Array.isArray(rows) ? rows : []).map(r => r.response_id))
}

async function transcribe(id) {
  const r = await fetch(`${BASE}/api/prescreen/responses/${id}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const text = await r.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { ok: r.ok, status: r.status, body }
}

(async () => {
  const responses = await fetchResponses()
  if (!Array.isArray(responses)) {
    console.error('Could not load responses:', responses)
    process.exit(1)
  }
  const haveTranscripts = await existingTranscriptIds()

  console.log(`Base URL: ${BASE}`)
  console.log(`Found ${responses.length} response(s).`)
  console.log(`${haveTranscripts.size} already have a transcript row.\n`)

  const todo = responses.filter(r => {
    const videos = Array.isArray(r.video_ids) ? r.video_ids.filter(Boolean) : []
    if (!videos.length) return false
    if (haveTranscripts.has(r.id) && !force) return false
    return true
  })
  console.log(`Will transcribe ${todo.length} response(s)${force ? ' (force re-run)' : ' (skipping ones with existing transcripts; pass --force to re-do them)'}.\n`)

  let ok = 0, fail = 0
  for (const r of todo) {
    const videos = Array.isArray(r.video_ids) ? r.video_ids.filter(Boolean) : []
    process.stdout.write(`• ${r.id.slice(0, 8)} ${r.candidate_name || '(unknown)'} — ${videos.length} video(s) … `)
    try {
      const { ok: success, status, body } = await transcribe(r.id)
      if (success) {
        const summary = typeof body === 'object'
          ? `OK (${body.successful}/${body.videos} videos, ${body.length} chars)`
          : 'OK'
        console.log(summary)
        ok++
      } else {
        console.log(`FAIL [${status}]`, typeof body === 'object' ? body.error : String(body).slice(0, 200))
        fail++
      }
    } catch (err) {
      console.log('ERROR', err.message)
      fail++
    }
  }
  console.log(`\nDone. ${ok} succeeded, ${fail} failed.`)
})()
