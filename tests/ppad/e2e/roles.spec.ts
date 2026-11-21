import { test, expect } from './fixture'

// Declared, not reached through window. ACT is a top-level `const` in
// app.js, so like S it lives in the global LEXICAL environment and never
// appears as a window property - window.ACT is undefined. A bare reference
// inside a page function resolves to it.
declare const ACT: Record<string, (el?: unknown) => void>

/**
 * What the UI actually shows each role, in a real browser.
 *
 * The database rules are proved in tests/ppad/access-matrix.mjs. These prove
 * the interface honours them: a control whose save would be refused should
 * not be offered, and a field someone cannot see should not be an empty box
 * that looks like "not rated yet".
 */

test.describe('employee-only', () => {
  test('lands on their own record with no navigation out of it', async ({ page, asRole }) => {
    await asRole('employee')
    await expect(page.locator('nav.nav')).toHaveCount(0)
    await expect(page.locator('#cycsel')).toHaveCount(0)
    await expect(page.locator('a.back')).toHaveCount(0)
    await expect(page.locator('.ph h1')).toContainText('Evie Emp')
  })

  test('cannot be navigated away by changing the hash', async ({ page, asRole }) => {
    await asRole('employee')
    for (const h of ['#dashboard', '#people', '#settings', '#reports', '#access']) {
      await page.evaluate(h2 => { location.hash = h2 }, h)
      await expect(page.locator('.ph h1')).toContainText('Evie Emp')
    }
  })

  test('the plan is read-only', async ({ page, asRole }) => {
    await asRole('employee')
    await page.locator('[data-act="tab"][data-v="plan"]').click()
    const inputs = page.locator('[data-f^="rec.kpis"]')
    const n = await inputs.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) await expect(inputs.nth(i)).toHaveAttribute('readonly', '')
    await expect(page.locator('[data-act="add-kpi"]')).toHaveCount(0)
  })

  test('manager ratings are withheld and explained, not left looking unrated', async ({ page, asRole }) => {
    await asRole('employee')
    await page.locator('[data-act="tab"][data-v="assess"]').click()
    await expect(page.getByText('has not been released yet')).toBeVisible()
    // Their own rating is still theirs to set.
    const self = page.locator('[data-f="rec.kpis.0.self"]').first()
    await expect(self).toBeEnabled()
    // The manager's is not.
    const mgr = page.locator('[data-f="rec.kpis.0.mgr"]').first()
    await expect(mgr).toBeDisabled()
  })

  test('every export is refused, including their own appraisal', async ({ page, asRole }) => {
    await asRole('employee')

    // No export buttons offered anywhere on their record.
    await expect(page.locator('[data-act="export-appraisal"]')).toHaveCount(0)
    await page.locator('[data-act="tab"][data-v="develop"]').click()
    await expect(page.locator('[data-act="export-appraisal"]')).toHaveCount(0)

    // And the handlers refuse when reached directly. Hiding a button is not
    // a rule - data-act handlers are one console line away.
    const msgs = await page.evaluate(() => {
      const w = window as unknown as {
        toast: (m: string) => void
        csvSummary: () => void
        csvTna: () => void
        download: (f: string, d: string, t: string) => void
      }
      const out: string[] = []
      const realToast = w.toast
      const realDownload = w.download
      let downloaded = false
      // toast and download ARE function declarations, so they do land on
      // window and overriding them there takes effect for bare calls too.
      w.toast = (m: string) => { out.push(m) }
      w.download = () => { downloaded = true }
      w.csvSummary()
      w.csvTna()
      ACT['export-appraisal']()
      w.toast = realToast
      w.download = realDownload
      return { out, downloaded }
    })
    expect(msgs.out).toHaveLength(3)
    for (const m of msgs.out) expect(m).toContain('managers and admins')
    expect(msgs.downloaded, 'nothing was written to a file').toBe(false)
  })
})

test.describe('manager', () => {
  test('gets the full nav and their allocated staff', async ({ page, asRole }) => {
    await asRole('manager')
    await expect(page.locator('nav.nav')).toBeVisible()
    await page.evaluate(() => { location.hash = '#people' })
    await expect(page.locator('table.tbl')).toContainText('Evie Emp')
  })

  test('can edit the plan and see their own ratings', async ({ page, asRole }) => {
    await asRole('manager')
    await page.evaluate(() => { location.hash = '#person-p_emp' })
    await page.locator('[data-act="tab"][data-v="plan"]').click()
    await expect(page.locator('[data-f="rec.kpis.0.name"]')).not.toHaveAttribute('readonly', '')
    await expect(page.locator('[data-act="add-kpi"]')).toBeVisible()
    await page.locator('[data-act="tab"][data-v="assess"]').click()
    await expect(page.getByText('has not been released yet')).toHaveCount(0)
  })

  test('has no Users and access tab', async ({ page, asRole }) => {
    await asRole('manager')
    await expect(page.locator('nav.nav a[href="#access"]')).toHaveCount(0)
  })
})

test.describe('admin', () => {
  test('sees the directory and the Users and access tab', async ({ page, asRole }) => {
    await asRole('admin')
    await expect(page.locator('nav.nav a[href="#access"]')).toBeVisible()
    await page.evaluate(() => { location.hash = '#people' })
    await expect(page.locator('table.tbl')).toContainText('Evie Emp')
  })

  test('is told the plan cannot be started without an allocation', async ({ page, asRole }) => {
    await asRole('admin')
    await page.evaluate(() => { location.hash = '#person-p_emp' })
    await expect(page.getByText('Their manager starts the plan')).toBeVisible()
    await expect(page.locator('[data-act="start-record"]')).toHaveCount(0)
  })
})

test.describe('sign-out leaves nothing behind', () => {
  test('no employee data in localStorage, sessionStorage or IndexedDB', async ({ page, asRole }) => {
    await asRole('manager')
    // The record is on screen, so it is certainly in memory.
    await page.evaluate(() => { location.hash = '#person-p_emp' })
    await expect(page.locator('.ph h1')).toContainText('Evie Emp')

    const dump = await page.evaluate(async () => {
      const ls = JSON.stringify(Object.entries(localStorage))
      const ss = JSON.stringify(Object.entries(sessionStorage))
      let idb = ''
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases()
        idb = JSON.stringify(dbs.map(d => d.name))
      }
      return { ls, ss, idb }
    })

    // Nothing identifying anyone, in any of the three, even while signed in.
    for (const blob of [dump.ls, dump.ss, dump.idb]) {
      expect(blob).not.toContain('Evie')
      expect(blob).not.toContain('Deliver the report')
      expect(blob).not.toContain('pm-tool-v1')
    }
  })
})

test.describe('layout', () => {
  test('the record is usable and does not scroll sideways', async ({ page, asRole }, testInfo) => {
    await asRole('manager')
    await page.evaluate(() => { location.hash = '#person-p_emp' })
    await page.locator('[data-act="tab"][data-v="assess"]').click()
    await expect(page.locator('[data-f="rec.kpis.0.mgr"]').first()).toBeVisible()
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth)
    // A few pixels of rounding is not a horizontal scrollbar.
    expect(overflow, `horizontal overflow at ${testInfo.project.name}`).toBeLessThanOrEqual(2)
  })
})
