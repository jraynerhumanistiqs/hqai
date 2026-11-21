import { test as base, expect, type Page, type Route } from '@playwright/test'

/**
 * Drives HQ Performance in a real browser as any role, with no credentials.
 *
 * WHY STUB RATHER THAN SIGN IN. Signing in would mean real accounts and real
 * passwords in a test suite, against a Supabase project that holds live
 * customer data. The access model is already proved against the real
 * migrations in tests/ppad/access-matrix.mjs - 50 assertions, every rule, at
 * the database. What is NOT covered there is the UI: whether an employee is
 * actually shown a read-only plan, whether the nav disappears, whether the
 * export is refused. That is what these tests are for, and it needs a
 * browser, not a login.
 *
 * The session endpoint reports the Supabase origin, so pointing it at our own
 * origin sends every PostgREST call back through Playwright's router where it
 * can be answered from a fixture. The app cannot tell the difference.
 *
 * These tests therefore prove the UI honours the rules. They do not prove the
 * rules - that is the SQL suite's job, and neither stands in for the other.
 */

export type Role = 'employee' | 'manager' | 'reviewer' | 'admin'

/** The person each role IS, if any. An admin here is linked to nobody. */
const w_personFor = (role: Role): string[] =>
  role === 'employee' ? ['p_emp'] : role === 'manager' ? ['p_mgr'] : role === 'reviewer' ? ['p_rev'] : []

const CYCLE = 'c2027'
const FAKE_SUPABASE = 'http://localhost:3000/__supabase'

const ORG = {
  v: 1,
  brand: { orgName: 'Fixture Co', appName: 'HQ Performance', tagline: 'Plan ~ Perform ~ Assess ~ Develop', accent: '#E8B23A', logo: null, poweredBy: true },
  yearStart: 7,
  bands: { low: 'Under Review', mid: 'Positive Contributor', high: 'Exceptional Contributor' },
  cycles: [{ id: CYCLE, start: '2026-07', label: 'FY2027' }],
  activeCycle: CYCLE,
  framework: {
    clusters: ['Understanding Business Needs'],
    comps: [{ id: 'A', cluster: 'Understanding Business Needs', name: 'Direction Setting', def: 'd', levels: ['l1', 'l2', 'l3', 'l4'] }],
  },
  profiles: [{ id: 'r1', name: 'Team member', targets: { A: 2 } }],
  setup: true,
}

const record = (over: Record<string, unknown> = {}) => ({
  pdId: null,
  kpis: [{ id: 'k1', name: 'Deliver the report', target: 'Day 8', weight: 100, area: '', self: 6, mgr: null, result: '', ...(over.kpi as object || {}) }],
  comps: { A: { target: 2, self: 2, mgr: null } },
  useComps: true, stretch: [], planAgreed: '2026-07-20', checkins: [],
  achievements: 'What I did', achieveComment: '',
  overall: null, overallComment: '', notAssessed: false,
  edp: { career: 'Next role', items: [] },
  signoff: { employee: { name: '', date: '' }, manager: { name: '', date: '' }, mgrMgr: { name: '', date: '' } },
  ...over,
})

/** Who the stub says you are, and what it lets you see. */
function world(role: Role) {
  // userId must match ppad_people.user_id below: the adapter derives
  // S.me.personId by matching them, and without it employeeOnly() can never
  // be true because the user is linked to nobody.
  const me = {
    employee: { userId: 'u_emp', isAdmin: false, isHr: false, manages: [], reviews: [] },
    manager:  { userId: 'u_mgr', isAdmin: false, isHr: false, manages: ['p_emp'], reviews: [] },
    reviewer: { userId: 'u_rev', isAdmin: false, isHr: false, manages: [], reviews: ['p_emp'] },
    admin:    { userId: 'u_admin', isAdmin: true, isHr: false, manages: [], reviews: [] },
  }[role]

  // Only the rows this role's RLS would return.
  const all = [
    { person_id: 'p_emp', user_id: 'u_emp', profile: { first: 'Evie', last: 'Emp', position: 'Coordinator', dept: 'Ops', profileId: 'r1', pdId: '' }, active: true, updated_at: '2026-11-01T00:00:00Z' },
    { person_id: 'p_mgr', user_id: 'u_mgr', profile: { first: 'Mia', last: 'Mgr', position: 'Manager', dept: 'Ops', profileId: 'r1', pdId: '' }, active: true, updated_at: '2026-11-01T00:00:00Z' },
    { person_id: 'p_rev', user_id: 'u_rev', profile: { first: 'Remy', last: 'Rev', position: 'Director', dept: 'Ops', profileId: 'r1', pdId: '' }, active: true, updated_at: '2026-11-01T00:00:00Z' },
  ]
  // What RLS would return: yourself, plus anyone allocated to you.
  const mine = new Set<string>([...w_personFor(role), ...me.manages, ...me.reviews])
  const visible = role === 'admin' ? all : all.filter(p => mine.has(p.person_id))

  // An employee is handed the manager's half stripped, exactly as
  // ppad_redact_for does it, because the manager has not signed.
  const redacted = () => {
    const r = record()
    r.kpis[0].mgr = null; r.kpis[0].result = ''
    r.comps.A.mgr = null
    r.overall = null; r.overallComment = ''; r.achieveComment = ''
    return r
  }
  const records = role === 'admin' ? []
    : role === 'employee' ? [{ person_id: 'p_emp', cycle_id: CYCLE, data: redacted(), locked_at: null, updated_at: '2026-11-01T00:00:00Z' }]
    : [{ person_id: 'p_emp', cycle_id: CYCLE, data: record({ kpi: { id: 'k1', name: 'Deliver the report', target: 'Day 8', weight: 100, area: '', self: 6, mgr: 8, result: 'Done' } }), locked_at: null, updated_at: '2026-11-01T00:00:00Z' }]

  return { me, visible, records }
}

export const test = base.extend<{ asRole: (r: Role) => Promise<void> }>({
  asRole: async ({ page }, use) => {
    // Not a React hook. `use` is Playwright's fixture API - it hands the
    // fixture value to the test and resumes for teardown afterwards. The
    // rule matches on the name alone and cannot tell the difference, and the
    // parameter name is fixed by Playwright.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(async (role: Role) => {
      const w = world(role)
      const json = (route: Route, body: unknown) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

      await page.route('**/api/ppad/session', r => json(r, {
        url: FAKE_SUPABASE, anonKey: 'fixture-anon-key', accessToken: 'fixture-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        user: { id: w.me.userId, email: `${role}@fixture.test`, name: role, businessId: 'biz-1' },
      }))

      await page.route('**/__supabase/**', (r) => {
        const url = r.request().url()
        if (url.includes('ppad_org_config')) return json(r, [{ data: ORG }])
        if (url.includes('ppad_position_descriptions')) return json(r, [])
        if (url.includes('ppad_people')) return json(r, w.visible)
        if (url.includes('rpc/ppad_list_records')) return json(r, w.records)
        if (url.includes('ppad_members')) return json(r, [{ is_admin: w.me.isAdmin, is_hr_reporting: w.me.isHr }])
        if (url.includes('ppad_allocations')) {
          return json(r, [
            ...w.me.manages.map(p => ({ person_id: p, type: 'manager' })),
            ...w.me.reviews.map(p => ({ person_id: p, type: 'reviewer' })),
          ])
        }
        // Anything the fixture has not been taught yet should be loud, not
        // quietly empty - an empty array looks like "no access" and would
        // make a test pass for the wrong reason.
        return r.fulfill({ status: 500, contentType: 'application/json',
          body: JSON.stringify({ message: 'fixture has no stub for ' + url }) })
      })

      await page.goto('/tools/ppad/app.html')
      // Wait on the DOM, not on S.
      //
      // Two constraints meet here. S is declared with `const` at the top
      // level of app.js, so it lives in the global LEXICAL environment and
      // never appears on window - `window.S` is undefined however long you
      // wait. The obvious workaround, a string predicate, is evaluated as
      // JavaScript and the route's CSP refuses it: "Evaluating a string as
      // JavaScript violates the following Content Security Policy directive
      // ... 'unsafe-eval' is not an allowed source". The policy doing that
      // to the test harness is the policy working.
      //
      // A function predicate is passed to the page rather than eval'd, so it
      // is allowed - and the rendered header is a better readiness signal
      // than an internal flag anyway.
      await page.waitForFunction(
        () => !!document.querySelector('header.top') || !!document.querySelector('.empty'),
        undefined, { timeout: 20_000 })
    })
  },
})

export { expect }
export type { Page }
