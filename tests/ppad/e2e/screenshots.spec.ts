import { test } from './fixture'

/**
 * Captures one screenshot per role for the pull request.
 *
 * Not an assertion suite - it exists so a reviewer can see what each role is
 * actually shown without standing up a database and four accounts. Tagged
 * @screenshots so the normal run skips it:
 *
 *   npx playwright test --project=desktop -g @screenshots
 */
const DIR = 'docs/ppad/screenshots'

test.describe('@screenshots', () => {
  test('employee - own record, manager half withheld', async ({ page, asRole }) => {
    await asRole('employee')
    await page.locator('[data-act="tab"][data-v="assess"]').click()
    await page.screenshot({ path: `${DIR}/1-employee-assess.png`, fullPage: true })
  })

  test('employee - read-only plan', async ({ page, asRole }) => {
    await asRole('employee')
    await page.locator('[data-act="tab"][data-v="plan"]').click()
    await page.screenshot({ path: `${DIR}/2-employee-plan-readonly.png`, fullPage: true })
  })

  test('manager - allocated staff only', async ({ page, asRole }) => {
    await asRole('manager')
    await page.evaluate(() => { location.hash = '#people' })
    await page.screenshot({ path: `${DIR}/3-manager-people.png`, fullPage: true })
  })

  test('manager - assessing, nothing withheld', async ({ page, asRole }) => {
    await asRole('manager')
    await page.evaluate(() => { location.hash = '#person-p_emp' })
    await page.locator('[data-act="tab"][data-v="assess"]').click()
    await page.screenshot({ path: `${DIR}/4-manager-assess.png`, fullPage: true })
  })

  test('admin - directory, and no plan to start without an allocation', async ({ page, asRole }) => {
    await asRole('admin')
    await page.evaluate(() => { location.hash = '#person-p_emp' })
    await page.screenshot({ path: `${DIR}/5-admin-no-allocation.png`, fullPage: true })
  })

  test('reviewer - reads the record, signs only', async ({ page, asRole }) => {
    await asRole('reviewer')
    await page.evaluate(() => { location.hash = '#person-p_emp' })
    await page.locator('[data-act="tab"][data-v="develop"]').click()
    await page.screenshot({ path: `${DIR}/6-reviewer-signoff.png`, fullPage: true })
  })
})
