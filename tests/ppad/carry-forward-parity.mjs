/**
 * ppad_start_cycle ports carryForward() from the client into SQL. Starting a
 * cycle writes a record for EVERY active person, so a divergence between the
 * two is not a cosmetic difference - it is everyone's plan being built wrong,
 * once a year, with no obvious symptom until someone notices their KPIs did
 * not come across.
 *
 * This runs both against the same input and compares the output.
 *
 *   node --test tests/ppad/carry-forward-parity.mjs
 *
 * Generated ids are normalised away: both sides mint fresh ones on purpose,
 * so that ratings cannot follow an id into the next cycle. Everything else
 * must match exactly.
 */
import { test, before, after, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

let PGlite
try { ({ PGlite } = await import('@electric-sql/pglite')) }
catch { console.log('SKIP: npm i -D @electric-sql/pglite'); process.exit(0) }

// ── the client's own implementation, lifted out of the shipped source ─────
//
// Read from public/tools/ppad/app.js rather than copied here. A copy would
// drift, and a parity test against a stale copy of one side is worse than no
// test at all: it would keep passing while the real pair diverged.
//
// It read app.html until the Phase 3 CSP work moved the script into its own
// file, at which point this suite reported "0 pass, 0 fail" - it stopped
// testing anything and said so only in a line that is easy to miss. Hence
// the explicit "the client source was found" test below: a parity suite
// that quietly tests nothing is the worst of the three outcomes.
function loadClientFns() {
  const html = readFileSync(join(ROOT, 'public', 'tools', 'ppad', 'app.js'), 'utf8')
  const grab = (name, kind = 'function') => {
    const re = kind === 'function'
      ? new RegExp(`\\nfunction ${name}\\s*\\([\\s\\S]*?\\n\\}`, 'm')
      : new RegExp(`\\nconst ${name} = [^\\n]*`, 'm')
    const m = html.match(re)
    if (!m) throw new Error(`could not find ${name} in app.html`)
    return m[0]
  }
  const src = [
    grab('uid', 'const'),
    grab('clone', 'const'),
    grab('newRecord'),
    grab('carryForward'),
    'this.newRecord = newRecord; this.carryForward = carryForward;',
  ].join('\n')

  const ctx = { S: null, activeCycle: null, console, newRecord: null, carryForward: null }
  vm.createContext(ctx)
  vm.runInContext(src, ctx)
  return ctx
}

// Ids differ by design on both sides. Null them so the comparison is about
// the content that carried, not the identifiers that did not.
function normalise(rec) {
  const r = JSON.parse(JSON.stringify(rec))
  for (const k of r.kpis || []) k.id = '<id>'
  for (const s of r.stretch || []) s.id = '<id>'
  for (const i of (r.edp && r.edp.items) || []) i.id = '<id>'
  return r
}

const ORG = {
  yearStart: 7,
  cycles: [{ id: 'c1', start: '2025-07', label: 'FY2026' }, { id: 'c2', start: '2026-07', label: 'FY2027' }],
  activeCycle: 'c2',
  framework: {
    comps: [
      { id: 'A', cluster: 'x', name: 'Direction', levels: ['l1', 'l2', 'l3', 'l4'] },
      { id: 'B', cluster: 'x', name: 'Comms', levels: ['l1', 'l2', 'l3'] },
      { id: 'C', cluster: 'x', name: 'Unused', levels: ['l1', 'l2'] },
    ],
  },
  profiles: [{ id: 'r_mgr', name: 'Manager', targets: { A: 3, B: 2 } }],
}

const PD = {
  id: 'd_fin', title: 'Finance Manager', targets: { A: 4, B: 3, C: 0 },
  kpis: [
    { id: 'pk1', name: 'Monthly accounts', target: 'Day 8', weight: 60, area: 'Reporting' },
    { id: 'pk2', name: '', target: 'ignored - no name', weight: 10, area: '' },
  ],
}

const PREV = {
  pdId: 'd_fin',
  kpis: [
    { id: 'old1', name: 'Carried KPI', target: '95%', weight: 40, area: 'Ops', self: 7, mgr: 8, result: 'done' },
    { id: 'old2', name: 'Second KPI', target: 'x', weight: null, area: '', self: 3, mgr: 4, result: 'partly' },
  ],
  comps: { A: { target: 2, self: 2, mgr: 3 }, B: { target: 1, self: 1, mgr: 1 } },
  useComps: false,
  stretch: [{ id: 's1', objective: 'o', measure: 'm', rating: 5, result: 'r' }],
  planAgreed: '2025-08-01', checkins: [{ id: 'ci1', type: 'Check-in', date: '2025-10-01' }],
  achievements: 'last year', achieveComment: 'mgr said',
  overall: 7, overallComment: 'good', notAssessed: false,
  edp: {
    career: 'Head of Finance',
    items: [
      { id: 'e1', need: 'Carried over', approach: 1, action: 'coach', by: '2026-03', status: 'In progress' },
      { id: 'e2', need: 'Finished', approach: 2, action: 'done', by: '2025-12', status: 'Done' },
    ],
  },
  signoff: { employee: { name: 'E', date: '2026-06-01' }, manager: { name: 'M', date: '2026-06-02' }, mgrMgr: { name: 'R', date: '2026-06-03' } },
}

let db, client

before(async () => {
  client = loadClientFns()
  db = new PGlite()
  await db.exec(`
    create schema if not exists auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid; $$;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
    end $$;
    grant usage on schema public, auth to anon, authenticated;
    create table businesses (id uuid primary key default gen_random_uuid(), name text not null);
    create table profiles (id uuid primary key references auth.users(id), business_id uuid references businesses(id), full_name text, email text);
  `)
  for (const f of ['ppad_businesses_entitlement.sql', 'ppad_01_schema.sql', 'ppad_02_rls.sql',
                   'ppad_03_rpcs.sql', 'ppad_04_admin_rpcs.sql', 'ppad_05_release_gate.sql']) {
    await db.exec(readFileSync(join(ROOT, 'supabase', 'migrations', f), 'utf8'))
  }
})

after(async () => { await db?.close?.() })

/**
 * Run the client's carryForward for a person, with S wired to the fixture.
 *
 * Note the `|| newRecord(p)`. The two sides are deliberately asymmetric:
 * the client's carryForward RETURNS NULL when there is no previous record
 * and every caller writes `carryForward(...) || newRecord(p)`, while the SQL
 * port folds that fallback inside. What has to match is the contract as
 * callers actually use it, so the fallback belongs here rather than being
 * treated as a divergence.
 */
function js(person, prev, opts) {
  client.S = { org: ORG, pds: { d_fin: PD }, people: {} }
  client.activeCycle = () => ORG.cycles[1]
  const p = { ...person, records: prev ? { c1: prev } : {} }
  client.S.people[p.id] = p
  return client.carryForward(p, prev ? 'c1' : undefined, opts) || client.newRecord(p)
}

/** Run the SQL port for the same input. */
async function sql(person, prev, opts) {
  const { rows } = await db.query(
    `select ppad_carry_forward($1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb) r`,
    [JSON.stringify(ORG), JSON.stringify(person), person.pdId ? JSON.stringify(PD) : null,
     prev ? JSON.stringify(prev) : null, JSON.stringify(opts)])
  return rows[0].r
}

const ALL = { kpis: true, comps: true, edp: true }

describe('ppad_carry_forward matches the client carryForward()', () => {
  const person = { id: 'p1', first: 'A', last: 'B', pdId: 'd_fin', profileId: 'r_mgr' }

  test('the client source was found and is runnable', () => {
    // Guards against this whole suite silently becoming a no-op if the
    // client source moves again. Without it, a failed extraction shows up
    // as "0 pass, 0 fail" and reads like the suite was skipped.
    assert.equal(typeof client.carryForward, 'function', 'carryForward not extracted')
    assert.equal(typeof client.newRecord, 'function', 'newRecord not extracted')
    const probe = js({ id: 'px', pdId: '', profileId: 'r_mgr' }, null, ALL)
    assert.ok(probe && Array.isArray(probe.kpis), 'extracted functions do not run')
  })

  test('a full carry-forward from a previous cycle', async () => {
    const a = normalise(js(person, PREV, ALL))
    const b = normalise(await sql(person, PREV, ALL))
    assert.deepEqual(b, a)
  })

  test('ratings are cleared and the plan starts fresh', async () => {
    const b = await sql(person, PREV, ALL)
    assert.deepEqual(b.kpis.map(k => [k.self, k.mgr, k.result]), [[null, null, ''], [null, null, '']])
    assert.equal(b.overall, null)
    assert.equal(b.planAgreed, null)
    assert.deepEqual(b.checkins, [])
    assert.equal(b.achievements, '')
    assert.deepEqual(b.signoff.manager, { name: '', date: '' }, 'last cycle\'s sign-off must not carry')
  })

  test('each option off, one at a time', async () => {
    for (const off of ['kpis', 'comps', 'edp']) {
      const opts = { ...ALL, [off]: false }
      const a = normalise(js(person, PREV, opts))
      const b = normalise(await sql(person, PREV, opts))
      assert.deepEqual(b, a, `diverged with ${off}:false`)
    }
  })

  test('career goals carry regardless of the edp option', async () => {
    // The client sets edp.career from the previous record OUTSIDE the
    // `if (opts.edp)` branch. Easy to miss when porting, and it is the one
    // field in the EDP that is the employee's own words.
    const b = await sql(person, PREV, { ...ALL, edp: false })
    assert.equal(b.edp.career, 'Head of Finance')
    assert.deepEqual(b.edp.items, [], 'but the actions did not')
  })

  test('only unfinished development actions come across', async () => {
    const b = await sql(person, PREV, ALL)
    assert.deepEqual(b.edp.items.map(i => i.need), ['Carried over'])
  })

  test('no previous record falls back to newRecord()', async () => {
    const a = normalise(js(person, null, ALL))
    const b = normalise(await sql(person, null, ALL))
    assert.deepEqual(b, a)
    assert.deepEqual(b.kpis.map(k => k.name), ['Monthly accounts'],
      'from the PD, and the unnamed PD row is skipped')
    assert.equal(b.comps.A.target, 4, 'PD targets beat the role profile')
  })

  test('with no PD, targets come from the role profile', async () => {
    const noPd = { id: 'p2', first: 'C', last: 'D', pdId: '', profileId: 'r_mgr' }
    const a = normalise(js(noPd, null, ALL))
    const b = normalise(await sql(noPd, null, ALL))
    assert.deepEqual(b, a)
    assert.equal(b.comps.A.target, 3)
    assert.equal(b.comps.C.target, 0, 'a competency the profile does not mention is 0, not missing')
    assert.deepEqual(b.kpis, [])
  })

  test('useComps carries, including when it is false', async () => {
    // Easy to port as a truthiness check and silently flip someone back on.
    const b = await sql(person, PREV, ALL)
    assert.equal(b.useComps, false)
    const onPrev = { ...PREV, useComps: true }
    assert.equal((await sql(person, onPrev, ALL)).useComps, true)
  })
})
