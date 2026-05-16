#!/usr/bin/env node
// One-shot diagnostic: probe production Supabase to determine which
// migrations have actually landed by introspecting columns / tables /
// policies. Read-only; safe to run any time.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false } })

async function columnExists(table, column) {
  // PostgREST returns 400 with "column ... does not exist" on missing columns.
  // Use a head:true select with a 1-row limit so we don't transfer data.
  const { error } = await admin.from(table).select(column, { head: true, count: 'exact' }).limit(1)
  if (!error) return { exists: true }
  return { exists: false, reason: error.message }
}

async function tableExists(table) {
  const { error } = await admin.from(table).select('*', { head: true, count: 'exact' }).limit(1)
  if (!error) return { exists: true }
  return { exists: false, reason: error.message }
}

const checks = [
  // Migration -> probe
  ['prescreen_responses_cv_link.sql', 'prescreen_responses', 'cv_screening_id'],
  ['cv_screenings_link_prescreen.sql', 'cv_screenings', 'prescreen_session_id'],
  ['cv_screenings_manual_override.sql', 'cv_screenings', 'override_band'],
  ['cv_custom_rubrics_versioning.sql', 'cv_custom_rubrics', 'parent_rubric_id'],
  ['phone_screen_support.sql', 'prescreen_responses', 'response_type'],
  ['phone_screen_support.sql (audio_path)', 'prescreen_responses', 'audio_path'],
  ['prescreen_responses_consent_meta.sql', 'prescreen_responses', 'consent_text'],
  ['visual_diagnostics_column.sql', 'prescreen_responses', 'visual_diagnostics'],
  ['roles_and_telemetry.sql (chat_audit_log)', 'chat_audit_log', '*'],
  ['roles_and_telemetry.sql (chat_telemetry)', 'chat_telemetry', '*'],
  ['privacy_requests_table.sql', 'privacy_requests', '*'],
  ['fix_prescreen_responses_fk.sql / prescreen_evaluations', 'prescreen_evaluations', '*'],
  ['prescreen_interview_bookings (Phase 4)', 'prescreen_interview_bookings', '*'],
]

const results = []
for (const [label, table, col] of checks) {
  if (col === '*') {
    const r = await tableExists(table)
    results.push({ label, table, col, ...r })
  } else {
    const r = await columnExists(table, col)
    results.push({ label, table, col, ...r })
  }
}

const width = Math.max(...results.map(r => r.label.length))
for (const r of results) {
  const mark = r.exists ? 'OK    ' : 'MISSING'
  console.log(`${mark}  ${r.label.padEnd(width)}  ${r.table}.${r.col}${r.exists ? '' : `   -- ${r.reason ?? ''}`}`)
}

// RLS check: a quick way to test rls_all_tables / rls_extend is whether
// SELECTing from a tenant table without a JWT returns 0 rows. We use the
// anon client for this.
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
console.log('\nRLS spot check (anon key, no JWT):')
for (const t of ['businesses', 'profiles', 'cv_screenings', 'prescreen_sessions', 'prescreen_responses']) {
  const { data, error, count } = await anon.from(t).select('*', { head: false, count: 'exact' }).limit(1)
  if (error) {
    console.log(`  ${t.padEnd(22)}  blocked (${error.code ?? ''} ${error.message})`)
  } else {
    console.log(`  ${t.padEnd(22)}  rows visible: ${data?.length ?? 0}  count: ${count ?? '?'}`)
  }
}
