/**
 * PPAD access-control matrix.
 *
 * Runs the real migrations against an in-process Postgres (PGlite) and drives
 * every assertion as the user themselves, through `set role authenticated` +
 * the JWT claim GUC that Supabase's auth.uid() reads. Nothing here goes
 * through the UI, so a passing run says the DATABASE enforces the model, not
 * that the UI hides things.
 *
 *   node --test tests/ppad/access-matrix.mjs
 *
 * Requires @electric-sql/pglite. It is not a repo dependency yet (adding one
 * is an owner decision), so the suite skips with a clear message rather than
 * failing a build that never asked for it.
 */
import { test, before, after, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MIGRATIONS = [
  'ppad_businesses_entitlement.sql',
  'ppad_01_schema.sql',
  'ppad_02_rls.sql',
  'ppad_03_rpcs.sql',
  'ppad_04_admin_rpcs.sql',
]

let PGlite
try {
  ({ PGlite } = await import('@electric-sql/pglite'))
} catch {
  console.log('SKIP: @electric-sql/pglite is not installed. npm i -D @electric-sql/pglite')
  process.exit(0)
}

// Supabase pieces that plain Postgres does not have, implemented the way
// Supabase implements them so `set local request.jwt.claim.sub` is a faithful
// stand-in for presenting that user's JWT.
const STUBS = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
grant usage on schema public, auth to anon, authenticated;
create table if not exists businesses (id uuid primary key default gen_random_uuid(), name text not null);
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references businesses(id), full_name text, email text, role text default 'owner');
grant select on businesses, profiles to anon, authenticated;
`

let db
const U = {}   // handle -> user uuid
const B = {}   // handle -> business uuid
const CYCLE = 'c2026'

/**
 * Run a statement as a given signed-in user.
 *
 * Session-level set_config, not `set local`: PGlite auto-commits each exec, so
 * a `set local` is discarded the moment the implicit transaction ends and
 * auth.uid() comes back null - which reads as "not a member" and makes every
 * test pass for the wrong reason.
 */
async function as(userKey, sql, params = []) {
  const uid = U[userKey]
  await db.exec(`set role authenticated;`)
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid])
  try {
    return await db.query(sql, params)
  } finally {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
    await db.exec(`reset role;`)
  }
}

/** Run as the anonymous (signed-out) role. */
async function asAnon(sql, params = []) {
  await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`)
  try {
    return await db.query(sql, params)
  } finally {
    await db.exec(`reset role;`)
  }
}

/** Assert a statement is refused for this user. Returns the message. */
async function denied(userKey, sql, params = []) {
  try {
    await as(userKey, sql, params)
  } catch (e) {
    return e.message
  }
  assert.fail(`expected a refusal for ${userKey}, but the statement succeeded`)
}

/** The set of person_ids whose records this user can actually read. */
async function readableRecords(userKey) {
  const { rows } = await as(userKey, `select person_id from ppad_records order by 1`)
  return rows.map(r => r.person_id)
}

/** The set of person_ids in the directory this user can read. */
async function readablePeople(userKey) {
  const { rows } = await as(userKey, `select person_id from ppad_people order by 1`)
  return rows.map(r => r.person_id)
}

async function seedUser(handle, bizKey, email) {
  const { rows } = await db.query(
    `insert into auth.users (email) values ($1) returning id`, [email])
  U[handle] = rows[0].id
  await db.query(
    `insert into profiles (id, business_id, full_name, email) values ($1,$2,$3,$4)`,
    [U[handle], B[bizKey], handle, email])
}

before(async () => {
  db = new PGlite()
  await db.exec(STUBS)
  for (const f of MIGRATIONS) {
    await db.exec(readFileSync(join(ROOT, 'supabase', 'migrations', f), 'utf8'))
  }

  // ---- two businesses -----------------------------------------------------
  for (const [key, name] of [['A', 'Org A'], ['B', 'Org B']]) {
    const { rows } = await db.query(
      `insert into businesses (name) values ($1) returning id`, [name])
    B[key] = rows[0].id
  }

  // ---- org A: admin, two managers, one reviewer, three employees ----------
  for (const h of ['admin', 'M1', 'M2', 'R1', 'E1', 'E2', 'E3']) {
    await seedUser(h, 'A', `${h.toLowerCase()}@a.test`)
  }
  await seedUser('bAdmin', 'B', 'admin@b.test')
  await seedUser('bEmp', 'B', 'emp@b.test')

  // Memberships. The admin is an admin and nothing else - deliberately NOT
  // allocated to anyone, which is the case the model is built around.
  const mem = async (biz, h, isAdmin = false, isHr = false) =>
    db.query(`insert into ppad_members (business_id, user_id, is_admin, is_hr_reporting)
              values ($1,$2,$3,$4)`, [B[biz], U[h], isAdmin, isHr])
  await mem('A', 'admin', true)
  for (const h of ['M1', 'M2', 'R1', 'E1', 'E2', 'E3']) await mem('A', h)
  await mem('B', 'bAdmin', true)
  await mem('B', 'bEmp')

  // Directory. Managers and the reviewer are people too - a manager has their
  // own record, visible to THEIR manager.
  const person = async (biz, pid, handle, name) =>
    db.query(`insert into ppad_people (business_id, person_id, user_id, profile)
              values ($1,$2,$3,$4)`,
      [B[biz], pid, U[handle], JSON.stringify({ first: name, last: 'Test', position: name, dept: 'Ops' })])
  for (const h of ['M1', 'M2', 'R1', 'E1', 'E2', 'E3']) await person('A', `p_${h}`, h, h)
  await person('B', 'p_bEmp', 'bEmp', 'B Employee')

  // Org config, so members can read the framework.
  await db.query(`insert into ppad_org_config (business_id, data) values ($1,$2)`,
    [B.A, JSON.stringify({ activeCycle: CYCLE, cycles: [{ id: CYCLE, start: '2026-07', label: 'FY2027' }],
      framework: { comps: [{ id: 'A', name: 'Direction Setting', levels: ['l1','l2','l3','l4'] }] },
      profiles: [{ id: 'r1', name: 'Manager', targets: { A: 3 } }] })])
  await db.query(`insert into ppad_org_config (business_id, data) values ($1,$2)`,
    [B.B, JSON.stringify({ activeCycle: CYCLE, cycles: [], framework: { comps: [] }, profiles: [] })])

  // Allocations, created through the audited RPC as the admin would.
  // M2 manages M1 - that is what makes "a manager must not see their own
  // manager's record" testable in both directions.
  const alloc = async (pid, h, type) =>
    as('admin', `select ppad_set_allocation($1,$2,$3)`, [pid, U[h], type])
  await alloc('p_E1', 'M1', 'manager')
  await alloc('p_E2', 'M1', 'manager')
  await alloc('p_E3', 'M2', 'manager')
  await alloc('p_M1', 'M2', 'manager')
  await alloc('p_E1', 'R1', 'reviewer')

  // A record for each of E1, E2, E3 and M1, written by their manager.
  const blank = () => ({
    pdId: null, kpis: [{ id: 'k1', name: 'Deliver', target: '100%', weight: null, area: '',
                         self: null, mgr: null, result: '' }],
    comps: { A: { target: 3, self: null, mgr: null } }, useComps: true, stretch: [],
    planAgreed: null, checkins: [], achievements: '', achieveComment: '',
    overall: null, overallComment: '', notAssessed: false,
    edp: { career: '', items: [] },
    signoff: { employee: { name: '', date: '' }, manager: { name: '', date: '' }, mgrMgr: { name: '', date: '' } },
  })
  for (const [pid, mgr] of [['p_E1','M1'], ['p_E2','M1'], ['p_E3','M2'], ['p_M1','M2']]) {
    await as(mgr, `select * from ppad_save_record($1,$2,$3,null)`,
      [pid, CYCLE, JSON.stringify(blank())])
  }
})

after(async () => { await db?.close?.() })

// ---------------------------------------------------------------------------

describe('reads are allocation-scoped', () => {
  test('E1 sees only their own record', async () => {
    assert.deepEqual(await readableRecords('E1'), ['p_E1'])
  })

  test('M1 sees their two allocated staff and their own record, and nothing else', async () => {
    // p_M1 is M1's own record (self), p_E1 and p_E2 are allocated.
    assert.deepEqual(await readableRecords('M1'), ['p_E1', 'p_E2', 'p_M1'])
  })

  test('M2 sees E3 and M1, and NOT M1\'s staff', async () => {
    // The transitive case: M2 manages M1, but that does not reach through to
    // E1 and E2. Access is per allocation, never inherited down a chain.
    assert.deepEqual(await readableRecords('M2'), ['p_E3', 'p_M1'])
  })

  test('a manager cannot see their own manager\'s record', async () => {
    assert.ok(!(await readableRecords('M1')).includes('p_M2'))
  })

  test('R1 reads E1 as reviewer and nothing else', async () => {
    assert.deepEqual(await readableRecords('R1'), ['p_E1'])
  })

  test('the admin sees the directory but NOT one record', async () => {
    const people = await readablePeople('admin')
    assert.equal(people.length, 6, 'admin should see the whole org A directory')
    assert.deepEqual(await readableRecords('admin'), [], 'admin must read no records')
  })
})

describe('tenant isolation', () => {
  test('org B users see nothing in org A', async () => {
    assert.deepEqual(await readableRecords('bAdmin'), [])
    assert.deepEqual(await readableRecords('bEmp'), [])
    assert.deepEqual(await readablePeople('bAdmin'), ['p_bEmp'])
  })

  test('org A admin sees nothing in org B', async () => {
    const people = await readablePeople('admin')
    assert.ok(!people.includes('p_bEmp'))
  })

  test('anon reads nothing at all', async () => {
    for (const t of ['ppad_records', 'ppad_people', 'ppad_org_config', 'ppad_allocations', 'ppad_audit_log']) {
      await assert.rejects(() => asAnon(`select * from ${t}`), new RegExp('permission denied|policy'),
        `anon should not read ${t}`)
    }
  })
})

describe('the field matrix is enforced by the RPC, not the UI', () => {
  // Helper: read a record as a user and hand back the row for editing.
  const load = async (who, pid) => {
    const { rows } = await as(who, `select data, updated_at from ppad_records
      where person_id=$1 and cycle_id=$2`, [pid, CYCLE])
    return rows[0]
  }

  test('an employee can write their own self-rating', async () => {
    const r = await load('E1', 'p_E1')
    const d = r.data
    d.kpis[0].self = 7
    d.achievements = 'Shipped the thing'
    const { rows } = await as('E1', `select * from ppad_save_record($1,$2,$3,$4)`,
      [ 'p_E1', CYCLE, JSON.stringify(d), r.updated_at ])
    assert.equal(rows[0].data.kpis[0].self, 7)
    assert.equal(rows[0].data.achievements, 'Shipped the thing')
  })

  test('an employee CANNOT write the manager rating', async () => {
    const r = await load('E1', 'p_E1')
    const d = r.data
    d.kpis[0].mgr = 9
    const msg = await denied('E1', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E1', CYCLE, JSON.stringify(d), r.updated_at])
    assert.match(msg, /outside your permissions/)
  })

  test('an employee CANNOT write the overall rating or the manager sign-off', async () => {
    for (const mutate of [
      d => { d.overall = 9 },
      d => { d.signoff.manager = { name: 'Not me', date: '2026-11-21' } },
      d => { d.overallComment = 'I am great' },
    ]) {
      const r = await load('E1', 'p_E1')
      const d = r.data
      mutate(d)
      const msg = await denied('E1', `select * from ppad_save_record($1,$2,$3,$4)`,
        ['p_E1', CYCLE, JSON.stringify(d), r.updated_at])
      assert.match(msg, /outside your permissions/)
    }
  })

  test('a manager CANNOT overwrite the employee self-rating', async () => {
    const r = await load('M1', 'p_E1')
    const d = r.data
    d.kpis[0].self = 1          // employee said 7
    const msg = await denied('M1', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E1', CYCLE, JSON.stringify(d), r.updated_at])
    assert.match(msg, /outside your permissions/)
  })

  test('a manager CANNOT write the employee sign-off or the reviewer sign-off', async () => {
    for (const key of ['employee', 'mgrMgr']) {
      const r = await load('M1', 'p_E1')
      const d = r.data
      d.signoff[key] = { name: 'Forged', date: '2026-11-21' }
      const msg = await denied('M1', `select * from ppad_save_record($1,$2,$3,$4)`,
        ['p_E1', CYCLE, JSON.stringify(d), r.updated_at])
      assert.match(msg, /outside your permissions/)
    }
  })

  test('a manager CAN write ratings, comments and their own sign-off', async () => {
    const r = await load('M1', 'p_E1')
    const d = r.data
    d.kpis[0].mgr = 8
    d.comps.A.mgr = 3
    d.overall = 7
    d.overallComment = 'Strong year'
    d.signoff.manager = { name: 'M1 Test', date: '2026-11-21' }
    const { rows } = await as('M1', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E1', CYCLE, JSON.stringify(d), r.updated_at])
    assert.equal(rows[0].data.kpis[0].mgr, 8)
    assert.equal(rows[0].data.kpis[0].self, 7, 'the employee self-rating must survive a manager save')
  })

  test('a reviewer can write ONLY the reviewer sign-off', async () => {
    const ok = await load('R1', 'p_E1')
    const d1 = ok.data
    d1.signoff.mgrMgr = { name: 'R1 Test', date: '2026-11-21' }
    const { rows } = await as('R1', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E1', CYCLE, JSON.stringify(d1), ok.updated_at])
    assert.equal(rows[0].data.signoff.mgrMgr.name, 'R1 Test')

    const r2 = await load('R1', 'p_E1')
    const d2 = r2.data
    d2.overall = 2
    const msg = await denied('R1', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E1', CYCLE, JSON.stringify(d2), r2.updated_at])
    assert.match(msg, /outside your permissions/)
  })

  test('a user with no relationship cannot write at all', async () => {
    const { rows } = await as('M1', `select data, updated_at from ppad_records
      where person_id='p_E1' and cycle_id=$1`, [CYCLE])
    const msg = await denied('M2', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E1', CYCLE, JSON.stringify(rows[0].data), rows[0].updated_at])
    assert.match(msg, /no access to this record/)
  })

  test('no one can write ppad_records directly, whatever the role', async () => {
    for (const who of ['admin', 'M1', 'E1']) {
      const msg = await denied(who,
        `update ppad_records set data = '{}'::jsonb where person_id = 'p_E1'`)
      assert.match(msg, /permission denied|policy/)
    }
  })
})

describe('sign-off locks the record', () => {
  test('all three sign-offs lock it, and further writes are refused', async () => {
    // E1's record now has manager + reviewer sign-off from the tests above.
    const { rows: before } = await as('E1', `select data, updated_at, locked_at
      from ppad_records where person_id='p_E1' and cycle_id=$1`, [CYCLE])
    assert.equal(before[0].locked_at, null, 'not locked until all three')

    const d = before[0].data
    d.signoff.employee = { name: 'E1 Test', date: '2026-11-21' }
    const { rows: after } = await as('E1', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E1', CYCLE, JSON.stringify(d), before[0].updated_at])
    assert.ok(after[0].locked_at, 'third sign-off should lock the record')

    const d2 = after[0].data
    d2.achievements = 'sneaking an edit in'
    const msg = await denied('E1', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E1', CYCLE, JSON.stringify(d2), after[0].updated_at])
    assert.match(msg, /locked/)
  })

  test('only an admin unlocks, and the unlock is audited', async () => {
    const msg = await denied('M1', `select ppad_unlock_record('p_E1',$1)`, [CYCLE])
    assert.match(msg, /admin only/)

    await as('admin', `select ppad_unlock_record('p_E1',$1)`, [CYCLE])
    const { rows } = await as('admin', `select count(*)::int n from ppad_audit_log
      where action='record.unlock'`)
    assert.equal(rows[0].n, 1)
  })
})

describe('optimistic locking', () => {
  test('a second session with a stale timestamp is refused, not silently merged', async () => {
    const { rows: s1 } = await as('M1', `select data, updated_at from ppad_records
      where person_id='p_E2' and cycle_id=$1`, [CYCLE])
    const stale = s1[0].updated_at

    const a = s1[0].data; a.overallComment = 'first writer'
    await as('M1', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E2', CYCLE, JSON.stringify(a), stale])

    const b = s1[0].data; b.overallComment = 'second writer, stale read'
    const msg = await denied('M1', `select * from ppad_save_record($1,$2,$3,$4)`,
      ['p_E2', CYCLE, JSON.stringify(b), stale])
    assert.match(msg, /changed since you loaded it/)

    const { rows } = await as('M1', `select data->>'overallComment' c from ppad_records
      where person_id='p_E2' and cycle_id=$1`, [CYCLE])
    assert.equal(rows[0].c, 'first writer', 'the first write must not be clobbered')
  })
})

describe('allocations control access over time', () => {
  test('ending an allocation removes access immediately, including past cycles', async () => {
    // A second, older cycle for E2 so "past cycles" is actually exercised.
    await db.query(`insert into ppad_records (business_id, person_id, cycle_id, data)
      values ($1,'p_E2','c2025','{"overall":5}'::jsonb)`, [B.A])
    assert.ok((await readableRecords('M1')).includes('p_E2'))

    const { rows } = await as('admin', `select id from ppad_allocations
      where person_id='p_E2' and allocated_user_id=$1 and ended_at is null`, [U.M1])
    await as('admin', `select ppad_end_allocation($1)`, [rows[0].id])

    const after = await readableRecords('M1')
    assert.ok(!after.includes('p_E2'), 'access must end with the allocation')
    const { rows: past } = await as('M1',
      `select count(*)::int n from ppad_records where person_id='p_E2' and cycle_id='c2025'`)
    assert.equal(past[0].n, 0, 'past cycles must go too')
  })

  test('the allocation row survives, so history is still answerable', async () => {
    const { rows } = await as('admin', `select count(*)::int n from ppad_allocations
      where person_id='p_E2' and allocated_user_id=$1 and ended_at is not null`, [U.M1])
    assert.equal(rows[0].n, 1)
  })
})

describe('admin self-allocation is possible but recorded', () => {
  test('an admin granting themselves access is audited distinctly', async () => {
    assert.deepEqual(await readableRecords('admin'), [])
    await as('admin', `select ppad_set_allocation('p_E3',$1,'manager')`, [U.admin])
    assert.deepEqual(await readableRecords('admin'), ['p_E3'])

    const { rows } = await as('admin', `select action, target_type from ppad_audit_log
      where action='allocation.self_grant'`)
    assert.equal(rows.length, 1, 'self-grant must be its own audit action')
  })

  test('a non-admin cannot allocate anything', async () => {
    const msg = await denied('M1', `select ppad_set_allocation('p_E3',$1,'manager')`, [U.M1])
    assert.match(msg, /admin only/)
  })
})

describe('HR reporting is ratings-only and separate from admin', () => {
  test('an admin without the flag cannot call the report', async () => {
    const msg = await denied('admin', `select * from ppad_report_summary($1)`, [CYCLE])
    assert.match(msg, /HR reporting role is required/)
  })

  test('the HR reporting role reads ratings org-wide but still no record rows', async () => {
    await as('admin', `select ppad_set_member($1, false, true)`, [U.R1])
    const { rows } = await as('R1', `select * from ppad_report_summary($1)`, [CYCLE])
    assert.equal(rows.length, 6, 'should cover the whole directory')
    const e2 = rows.find(r => r.person_id === 'p_E2')
    assert.ok(e2, 'reporting reaches people the caller has no allocation to')
    // and the columns it returns carry no free text
    assert.deepEqual(Object.keys(rows[0]).filter(k => /comment|note|achiev|career|edp/i.test(k)), [])
  })
})

describe('admin screen support (ppad_04)', () => {
  test('the roster is admin-only and carries names, not just ids', async () => {
    const msg = await denied('M1', `select * from ppad_list_members()`)
    assert.match(msg, /admin only/)

    const { rows } = await as('admin', `select * from ppad_list_members()`)
    assert.equal(rows.length, 7, 'every member of org A')
    const m1 = rows.find(r => r.email === 'm1@a.test')
    assert.equal(m1.person_id, 'p_M1', 'linked people resolve')
    assert.equal(m1.person_name, 'M1 Test')
    assert.ok(!rows.some(r => r.email.endsWith('@b.test')), 'org B must not appear')
  })

  test('allocation history includes ended ones, with names', async () => {
    const { rows } = await as('admin', `select * from ppad_list_allocations(true)`)
    const ended = rows.filter(r => r.ended_at !== null)
    assert.ok(ended.length >= 1, 'the allocation ended earlier is still here')
    assert.ok(ended[0].allocated_name || ended[0].allocated_email, 'resolved to a human')

    const { rows: live } = await as('admin', `select * from ppad_list_allocations(false)`)
    assert.ok(live.every(r => r.ended_at === null))
  })

  test('linking a person is admin-only, exclusive and audited', async () => {
    const msg = await denied('M1', `select ppad_link_person($1,'p_E3')`, [U.M1])
    assert.match(msg, /admin only/)

    // E3 currently has no login linked in this fixture path; link then move it.
    await as('admin', `select ppad_link_person($1,$2)`, [U.E3, 'p_E3'])
    const { rows: a } = await as('admin',
      `select person_id from ppad_people where user_id = $1`, [U.E3])
    assert.deepEqual(a.map(r => r.person_id), ['p_E3'])

    // Re-linking the same user elsewhere must clear the old link, not collide
    // with the one-login-per-person unique constraint.
    await as('admin', `select ppad_link_person($1,$2)`, [U.E3, 'p_E2'])
    const { rows: b } = await as('admin',
      `select person_id from ppad_people where user_id = $1`, [U.E3])
    assert.deepEqual(b.map(r => r.person_id), ['p_E2'], 'moved, not duplicated')

    const { rows: aud } = await as('admin',
      `select count(*)::int n from ppad_audit_log where action = 'person.link'`)
    assert.equal(aud[0].n, 2)
  })
})

describe('a directory save must not disturb the login link', () => {
  // Regression. The adapter used to send `user_id: person.userId || null` in
  // its ppad_people upsert. After an admin linked a login through the access
  // screen, the client still held the pre-link copy, so the next save of that
  // person wrote null straight back over the link - and because the audit
  // entry is written by ppad_link_person, the log said "linked" while the
  // column said null. The person quietly stopped being "self" on their own
  // record.
  //
  // This reproduces the sequence in SQL: link, then the exact upsert the
  // adapter issues, then check the link survived.
  test('upserting the profile leaves user_id alone', async () => {
    await as('admin', `select ppad_link_person($1,'p_E1')`, [U.E1])
    const { rows: before } = await as('admin',
      `select user_id from ppad_people where person_id = 'p_E1'`)
    assert.equal(before[0].user_id, U.E1, 'link made')

    // What PostgREST sends for the adapter's upsert: only the columns in the
    // payload reach the ON CONFLICT SET clause. user_id is not among them.
    await as('admin', `
      insert into ppad_people (business_id, person_id, profile, active, updated_at)
      values ($1, 'p_E1', $2, true, now())
      on conflict (business_id, person_id) do update
        set profile = excluded.profile, active = excluded.active, updated_at = excluded.updated_at`,
      [B.A, JSON.stringify({ first: 'E1', last: 'Test', position: 'Renamed' })])

    const { rows: after } = await as('admin',
      `select user_id, profile->>'position' pos from ppad_people where person_id = 'p_E1'`)
    assert.equal(after[0].pos, 'Renamed', 'the edit landed')
    assert.equal(after[0].user_id, U.E1, 'and the link survived it')
  })

  test('linking to a person that does not exist is refused, not audited', async () => {
    const before = await as('admin', `select count(*)::int n from ppad_audit_log where action='person.link'`)
    const msg = await denied('admin', `select ppad_link_person($1,'p_nope')`, [U.E1])
    assert.match(msg, /no such person/)
    const after = await as('admin', `select count(*)::int n from ppad_audit_log where action='person.link'`)
    assert.equal(after.rows[0].n, before.rows[0].n, 'no audit entry for a link that did not happen')
  })
})

describe('one caller holding all three relationships', () => {
  // The owner's own situation while testing: linked to a person AND
  // allocated as their own manager AND reviewer. No other test covers it,
  // and the merge takes a different path for each role, so this is where a
  // clamp could silently eat a rating.
  let pid = 'p_E3'
  before(async () => {
    await as('admin', `select ppad_link_person($1,$2)`, [U.M2, pid])      // self
    await as('admin', `select ppad_set_allocation($1,$2,'reviewer')`, [pid, U.M2])
    // M2 already manages p_E3 from the main fixture.
  })

  test('self, manager and reviewer fields all land in ONE save', async () => {
    const { rows } = await as('M2', `select data, updated_at from ppad_records
      where person_id = $1 and cycle_id = $2`, [pid, CYCLE])
    const d = rows[0].data
    d.kpis[0].self = 6          // employee-owned
    d.kpis[0].mgr = 8           // manager-owned
    d.comps.A.self = 2
    d.comps.A.mgr = 3
    d.achievements = 'self text'        // employee-owned
    d.overallComment = 'manager text'   // manager-owned
    d.signoff.employee = { name: 'Me', date: '2026-11-21' }
    d.signoff.manager = { name: 'Me', date: '2026-11-21' }
    d.signoff.mgrMgr = { name: 'Me', date: '2026-11-21' }

    const { rows: out } = await as('M2', `select * from ppad_save_record($1,$2,$3,$4)`,
      [pid, CYCLE, JSON.stringify(d), rows[0].updated_at])
    const saved = out[0].data

    assert.equal(saved.kpis[0].self, 6, 'self rating survived the manager branch')
    assert.equal(saved.kpis[0].mgr, 8, 'manager rating survived the self branch')
    assert.equal(saved.comps.A.self, 2)
    assert.equal(saved.comps.A.mgr, 3)
    assert.equal(saved.achievements, 'self text')
    assert.equal(saved.overallComment, 'manager text')
    assert.equal(saved.signoff.employee.date, '2026-11-21')
    assert.equal(saved.signoff.mgrMgr.date, '2026-11-21', 'reviewer branch applied too')
    assert.ok(out[0].locked_at, 'three sign-offs in one save still locks it')
  })

  test('a rating set on a KPI the manager added in the same save is kept', async () => {
    await as('admin', `select ppad_unlock_record($1,$2)`, [pid, CYCLE])
    const { rows } = await as('M2', `select data, updated_at from ppad_records
      where person_id = $1 and cycle_id = $2`, [pid, CYCLE])
    const d = rows[0].data
    // A brand new KPI has no stored counterpart, so the merge has to take
    // its self value from the payload rather than clamping it to null.
    d.kpis.push({ id: 'knew', name: 'Added now', target: 'x', weight: null,
                  area: '', self: 4, mgr: 5, result: '' })
    const { rows: out } = await as('M2', `select * from ppad_save_record($1,$2,$3,$4)`,
      [pid, CYCLE, JSON.stringify(d), rows[0].updated_at])
    const k = out[0].data.kpis.find(x => x.id === 'knew')
    assert.equal(k.self, 4, 'self on a newly added KPI is not clamped away')
    assert.equal(k.mgr, 5)
  })
})
