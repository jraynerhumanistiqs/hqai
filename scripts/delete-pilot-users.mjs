#!/usr/bin/env node
// Delete one or more pilot test accounts so they sign up fresh.
//
// Usage:
//   1. DRY RUN (default - lists matches, deletes nothing):
//        node scripts/delete-pilot-users.mjs bianca jessica rav steve
//   2. ACTUALLY DELETE (after reviewing the dry run):
//        node scripts/delete-pilot-users.mjs --confirm bianca jessica rav steve
//
// You can also pass exact emails:
//        node scripts/delete-pilot-users.mjs bianca@humanistiqs.com.au
//
// What it does (in order, per matched user):
//   1. Look the user up in auth.users by email containing the name
//      OR by raw_user_meta_data.full_name containing the name.
//   2. Show full name + email + signup date so you can verify.
//   3. If --confirm: cascade-delete the matching business (only if
//      that user is its owner AND no other profiles share it), the
//      profile row, then the auth user itself. Supabase Auth's
//      delete cascades via the foreign keys on profiles + businesses
//      where they exist; we do the explicit cleanup defensively.
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (.env.local
// is auto-loaded). Service-role key is needed for auth.admin.
//
// Run from the repo root: cd hqai && node scripts/delete-pilot-users.mjs ...

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// ── env loading ──────────────────────────────────────────────────
async function loadEnvLocal() {
  const candidates = ['.env.local', '.env']
  for (const f of candidates) {
    try {
      const raw = await readFile(resolve(process.cwd(), f), 'utf-8')
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i)
        if (!m) continue
        const [, k, vRaw] = m
        const v = vRaw.replace(/^['"]|['"]$/g, '')
        if (!process.env[k]) process.env[k] = v
      }
      return
    } catch { /* try next */ }
  }
}

await loadEnvLocal()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env. Add them to .env.local and rerun.')
  process.exit(1)
}

const args = process.argv.slice(2)
const confirm = args.includes('--confirm')
const needles = args.filter(a => a !== '--confirm').map(a => a.toLowerCase().trim()).filter(Boolean)
if (needles.length === 0) {
  console.error('Usage: node scripts/delete-pilot-users.mjs [--confirm] name1 name2 ...')
  process.exit(1)
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

// ── locate users ─────────────────────────────────────────────────
// auth.admin.listUsers paginates; pull all (small tenant for now).
async function listAllAuthUsers() {
  const all = []
  let page = 1
  // 1000 per page is the max for the admin API; stops when an empty
  // page comes back.
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    if (!data?.users?.length) break
    all.push(...data.users)
    if (data.users.length < 200) break
    page += 1
  }
  return all
}

function matchUser(user, needle) {
  const email   = (user.email ?? '').toLowerCase()
  const meta    = user.user_metadata ?? {}
  const name    = String(meta.full_name ?? meta.name ?? '').toLowerCase()
  return email.includes(needle) || name.includes(needle)
}

const users = await listAllAuthUsers()
const found = []
for (const needle of needles) {
  const hits = users.filter(u => matchUser(u, needle))
  if (!hits.length) {
    console.warn(`! no match for "${needle}"`)
    continue
  }
  if (hits.length > 1) {
    console.warn(`! "${needle}" matched ${hits.length} users - all listed below for review:`)
  }
  for (const u of hits) found.push({ needle, user: u })
}

if (!found.length) {
  console.error('No users matched. Nothing to do.')
  process.exit(1)
}

console.log('\nMatched users:')
console.log('─'.repeat(80))
for (const { needle, user } of found) {
  const meta = user.user_metadata ?? {}
  console.log(`  [${needle}] ${user.email}`)
  console.log(`    id:        ${user.id}`)
  console.log(`    full_name: ${meta.full_name ?? meta.name ?? '(unset)'}`)
  console.log(`    created:   ${user.created_at}`)
  console.log()
}
console.log('─'.repeat(80))

if (!confirm) {
  console.log('\nDRY RUN. Nothing deleted.')
  console.log('Review the matches above. To actually delete, rerun with --confirm:')
  console.log(`  node scripts/delete-pilot-users.mjs --confirm ${needles.join(' ')}`)
  process.exit(0)
}

// ── delete ───────────────────────────────────────────────────────
console.log('\nDeleting...')
for (const { needle, user } of found) {
  console.log(`\n[${needle}] ${user.email}`)
  try {
    // Look up the profile + business so we can cascade properly.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.business_id) {
      // Is this user the only owner of the business? If yes, drop the
      // business + everything that hangs off it. If no, leave the
      // business alone - other directors may share it.
      const { data: peers, count: peerCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('business_id', profile.business_id)

      void peers
      const otherOwners = (peerCount ?? 0) - 1
      if (otherOwners <= 0) {
        // Wipe rows that FK back to the business so the business
        // delete doesn't trip a FK violation. Tables here are the
        // ones the AI Administrator / Recruit surfaces actually
        // write to; the schema may have more - this list covers the
        // common path.
        const tables = [
          'cv_screenings',
          'cv_custom_rubrics',
          'candidate_responses',
          'prescreen_sessions',
          'documents',
          'conversations',
          'messages',
          'credit_ledger',
          'campaigns',
        ]
        for (const t of tables) {
          const { error } = await supabase.from(t).delete().eq('business_id', profile.business_id)
          if (error && !/does not exist|column.*business_id/i.test(error.message)) {
            console.warn(`    warn: ${t} delete: ${error.message}`)
          }
        }
        const { error: bizErr } = await supabase.from('businesses').delete().eq('id', profile.business_id)
        if (bizErr) console.warn(`    warn: businesses delete: ${bizErr.message}`)
        else console.log(`    deleted business ${profile.business_id}`)
      } else {
        console.log(`    keeping business ${profile.business_id} (${otherOwners} other profile(s) attached)`)
      }
    }

    const { error: profErr } = await supabase.from('profiles').delete().eq('id', user.id)
    if (profErr) console.warn(`    warn: profile delete: ${profErr.message}`)

    const { error: authErr } = await supabase.auth.admin.deleteUser(user.id)
    if (authErr) {
      console.error(`    FAILED auth.admin.deleteUser: ${authErr.message}`)
      continue
    }
    console.log('    deleted auth user')
  } catch (err) {
    console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}`)
  }
}

console.log('\nDone.')
