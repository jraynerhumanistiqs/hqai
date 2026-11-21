#!/usr/bin/env node
/**
 * Seeds a DEV Supabase project with the PPAD access-matrix fixture.
 *
 *   node scripts/ppad/dev-seed.mjs
 *
 * Creates the same cast the automated test uses, so what you click through
 * in the browser is the same shape as what tests/ppad/access-matrix.mjs
 * proves in SQL:
 *
 *   Org A   admin (allocated to nobody), M1 (manages E1, E2),
 *           M2 (manages E3 and M1), R1 (reviewer for E1), E1, E2, E3
 *   Org B   one admin, one employee - the isolation check
 *
 * REFUSES TO RUN AGAINST PRODUCTION. It creates users and writes rows, and
 * the one thing worse than no dev project is seeding test staff into the
 * live one. Guarded three ways: the project ref must not be the production
 * one, PPAD_DEV_SEED=yes must be set, and it reads PPAD_DEV_* variables
 * rather than the app's own NEXT_PUBLIC_SUPABASE_* so a stray .env.local
 * cannot aim it at prod by accident.
 *
 * Needs, in .env.ppad-dev or the environment:
 *   PPAD_DEV_SUPABASE_URL
 *   PPAD_DEV_SERVICE_ROLE_KEY     (dev project only - never commit it)
 *   PPAD_DEV_SEED=yes
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const PROD_REF = 'rbuxsuuvbeojxcxwxcjf'
const ENV_FILE = '.env.ppad-dev'
const PASSWORD = 'ppad-dev-password-2026'   // dev fixture only, never a real account

// ── config, with the guards up front ────────────────────────────────────────
const env = { ...process.env }
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
}

const URL_ = env.PPAD_DEV_SUPABASE_URL
const KEY = env.PPAD_DEV_SERVICE_ROLE_KEY

function die(msg) { console.error('\n  ' + msg + '\n'); process.exit(1) }

if (!URL_ || !KEY) die(`Set PPAD_DEV_SUPABASE_URL and PPAD_DEV_SERVICE_ROLE_KEY (in ${ENV_FILE} or the environment).`)
if (env.PPAD_DEV_SEED !== 'yes') die('Refusing to run without PPAD_DEV_SEED=yes. This creates users and writes rows.')
if (URL_.includes(PROD_REF)) die(`That is the PRODUCTION project (${PROD_REF}). Refusing.`)

const db = createClient(URL_, KEY, { auth: { persistSession: false } })
const ref = new URL(URL_).host.split('.')[0]
console.log(`Seeding project ${ref}\n`)

// ── helpers ─────────────────────────────────────────────────────────────────
const U = {}, B = {}
const CYCLE = 'c2027'

async function user(handle, email) {
  // Idempotent: reuse the account if a previous run made it.
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const found = list?.users?.find(u => u.email === email)
  if (found) { U[handle] = found.id; return }
  const { data, error } = await db.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
  })
  if (error) die(`creating ${email}: ${error.message}`)
  U[handle] = data.user.id
}

async function upsert(table, row, onConflict) {
  const { error } = await db.from(table).upsert(row, { onConflict })
  if (error) die(`${table}: ${error.message}`)
}

// ── businesses ──────────────────────────────────────────────────────────────
for (const [key, name] of [['A', 'Dev Org A'], ['B', 'Dev Org B']]) {
  const { data: existing } = await db.from('businesses').select('id').eq('name', name).maybeSingle()
  if (existing) { B[key] = existing.id; continue }
  const { data, error } = await db.from('businesses').insert({
    name,
    // The dashboard layout bounces any business with no subscription to
    // /onboarding before the tool is reachable, so the fixture is "paid".
    subscription_status: 'active',
    stripe_subscription_id: 'sub_dev_fixture',
    ppad_enabled: true,
  }).select('id').single()
  if (error) die(`business ${name}: ${error.message}`)
  B[key] = data.id
}
console.log('  businesses      A and B, both ppad_enabled')

// ── users and profiles ──────────────────────────────────────────────────────
const CAST_A = ['admin', 'M1', 'M2', 'R1', 'E1', 'E2', 'E3']
for (const h of CAST_A) await user(h, `ppad-${h.toLowerCase()}@dev.local`)
await user('bAdmin', 'ppad-badmin@dev.local')
await user('bEmp', 'ppad-bemp@dev.local')

for (const h of CAST_A) {
  await upsert('profiles', { id: U[h], business_id: B.A, full_name: h, email: `ppad-${h.toLowerCase()}@dev.local` }, 'id')
}
await upsert('profiles', { id: U.bAdmin, business_id: B.B, full_name: 'B Admin', email: 'ppad-badmin@dev.local' }, 'id')
await upsert('profiles', { id: U.bEmp, business_id: B.B, full_name: 'B Employee', email: 'ppad-bemp@dev.local' }, 'id')
console.log('  users           9 accounts, all email-confirmed')

// ── PPAD membership ─────────────────────────────────────────────────────────
// The admin is an admin and NOTHING else - no allocation. That is the case
// the whole model turns on, so the fixture has to preserve it.
await upsert('ppad_members', { business_id: B.A, user_id: U.admin, is_admin: true }, 'business_id,user_id')
for (const h of ['M1', 'M2', 'R1', 'E1', 'E2', 'E3']) {
  await upsert('ppad_members', { business_id: B.A, user_id: U[h] }, 'business_id,user_id')
}
await upsert('ppad_members', { business_id: B.B, user_id: U.bAdmin, is_admin: true }, 'business_id,user_id')
await upsert('ppad_members', { business_id: B.B, user_id: U.bEmp }, 'business_id,user_id')
console.log('  members         admin is admin-only, deliberately unallocated')

// ── org config ──────────────────────────────────────────────────────────────
const ORG = {
  v: 1,
  brand: { orgName: 'Dev Org A', appName: 'HQ Performance', tagline: 'Plan ~ Perform ~ Assess ~ Develop', accent: '#E8B23A', logo: null, poweredBy: true },
  yearStart: 7,
  bands: { low: 'Under Review', mid: 'Positive Contributor', high: 'Exceptional Contributor' },
  cycles: [{ id: CYCLE, start: '2026-07', label: 'FY2027' }],
  activeCycle: CYCLE,
  framework: {
    clusters: ['Understanding Business Needs', 'Dealing With Others'],
    comps: [
      { id: 'A', cluster: 'Understanding Business Needs', name: 'Direction Setting', def: 'Aligns work with the plan.', levels: ['Level 1: follows', 'Level 2: plans', 'Level 3: sets', 'Level 4: shapes'] },
      { id: 'B', cluster: 'Dealing With Others', name: 'Communication', def: 'Gets the message across.', levels: ['Level 1: clear', 'Level 2: persuades', 'Level 3: influences', 'Level 4: leads'] },
    ],
  },
  profiles: [
    { id: 'r_mgr', name: 'Manager', targets: { A: 3, B: 3 } },
    { id: 'r_team', name: 'Team member', targets: { A: 1, B: 2 } },
  ],
  setup: true,
}
await upsert('ppad_org_config', { business_id: B.A, data: ORG }, 'business_id')
await upsert('ppad_org_config', { business_id: B.B, data: { ...ORG, brand: { ...ORG.brand, orgName: 'Dev Org B' } } }, 'business_id')
console.log('  org config      one cycle FY2027, 2 competencies, 2 role profiles')

// ── people ──────────────────────────────────────────────────────────────────
const person = (biz, pid, handle, first, position, profileId) =>
  upsert('ppad_people', {
    business_id: B[biz], person_id: pid, user_id: U[handle],
    profile: { first, last: 'Dev', position, dept: 'Operations', location: 'Sydney', profileId, pdId: '' },
    active: true,
  }, 'business_id,person_id')

await person('A', 'p_M1', 'M1', 'Mia', 'Operations Manager', 'r_mgr')
await person('A', 'p_M2', 'M2', 'Marcus', 'General Manager', 'r_mgr')
await person('A', 'p_R1', 'R1', 'Rita', 'Director', 'r_mgr')
await person('A', 'p_E1', 'E1', 'Eli', 'Coordinator', 'r_team')
await person('A', 'p_E2', 'E2', 'Erin', 'Coordinator', 'r_team')
await person('A', 'p_E3', 'E3', 'Evan', 'Technician', 'r_team')
await person('B', 'p_bEmp', 'bEmp', 'Bea', 'Coordinator', 'r_team')
console.log('  people          6 in org A, 1 in org B')

// ── allocations ─────────────────────────────────────────────────────────────
// Written directly rather than through ppad_set_allocation: the RPC derives
// the business from the CALLER's profile, and this script runs as service
// role with no caller. The audit entries it would have written are not
// meaningful for a fixture.
async function alloc(biz, pid, handle, type) {
  const { data } = await db.from('ppad_allocations').select('id')
    .eq('business_id', B[biz]).eq('person_id', pid)
    .eq('allocated_user_id', U[handle]).eq('type', type).is('ended_at', null).maybeSingle()
  if (data) return
  const { error } = await db.from('ppad_allocations')
    .insert({ business_id: B[biz], person_id: pid, allocated_user_id: U[handle], type, created_by: U.admin })
  if (error) die(`allocation ${pid}/${handle}: ${error.message}`)
}
await alloc('A', 'p_E1', 'M1', 'manager')
await alloc('A', 'p_E2', 'M1', 'manager')
await alloc('A', 'p_E3', 'M2', 'manager')
await alloc('A', 'p_M1', 'M2', 'manager')   // M2 manages M1 - the transitive check
await alloc('A', 'p_E1', 'R1', 'reviewer')
console.log('  allocations     M1 -> E1,E2 | M2 -> E3,M1 | R1 reviews E1')

// ── one record each, so there is something to look at ───────────────────────
const blank = () => ({
  pdId: null,
  kpis: [
    { id: 'k1', name: 'Deliver the monthly report', target: 'By working day 8', weight: 60, area: '', self: null, mgr: null, result: '' },
    { id: 'k2', name: 'Close tickets within SLA', target: '95% within 2 days', weight: 40, area: '', self: null, mgr: null, result: '' },
  ],
  comps: { A: { target: 2, self: null, mgr: null }, B: { target: 2, self: null, mgr: null } },
  useComps: true, stretch: [], planAgreed: null, checkins: [],
  achievements: '', achieveComment: '',
  overall: null, overallComment: '', notAssessed: false,
  edp: { career: '', items: [] },
  signoff: { employee: { name: '', date: '' }, manager: { name: '', date: '' }, mgrMgr: { name: '', date: '' } },
})
for (const pid of ['p_E1', 'p_E2', 'p_E3', 'p_M1']) {
  await upsert('ppad_records', { business_id: B.A, person_id: pid, cycle_id: CYCLE, data: blank() },
    'business_id,person_id,cycle_id')
}
console.log('  records         4 draft plans in FY2027\n')

console.log('Sign in at /login with any of these. Password for all:', PASSWORD)
console.log(`
  ppad-admin@dev.local   admin, NOT allocated - should see the directory and zero records
  ppad-m1@dev.local      manager of Eli and Erin, plus their own record
  ppad-m2@dev.local      manager of Evan and of Mia - must NOT see Eli or Erin
  ppad-r1@dev.local      reviewer for Eli - sign-off only
  ppad-e1@dev.local      employee - their own record and nothing else
  ppad-badmin@dev.local  other org - must see nothing of org A
`)
