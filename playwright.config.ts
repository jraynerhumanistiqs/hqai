import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright, scoped to HQ Performance.
 *
 * `channel: 'chrome'` uses the Chrome already installed on the machine
 * instead of downloading Playwright's own browser bundle. One fewer large
 * download in CI and on a new laptop, and the tool is only ever used in a
 * normal desktop browser.
 *
 * testDir is deliberately narrow. This config exists for the PPAD work and
 * should not start quietly running against the rest of the site.
 */
export default defineConfig({
  testDir: './tests/ppad/e2e',
  testIgnore: '**/global-setup.ts',
  // Compile the route once before any test, so the first few do not race
  // the dev server's on-demand build. See the file for what that looked like.
  globalSetup: './tests/ppad/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list']],
  use: {
    baseURL: process.env.PPAD_E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    // 375px is in the brief. The tool was built for a desk, so this is about
    // catching anything that becomes unreachable rather than making it pretty.
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 375, height: 812 } } },
  ],
  webServer: process.env.PPAD_E2E_NO_SERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000/tools/ppad/app.html',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
