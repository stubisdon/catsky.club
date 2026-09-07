const { defineConfig, devices } = require('@playwright/test')

// Port is overridable so parallel git worktrees (Conductor workspaces) can run e2e at the same
// time. Without this, `reuseExistingServer` silently latches onto another workspace's dev server
// on :3000 and the whole suite tests the wrong branch.
const WEB_HOST = process.env.PLAYWRIGHT_WEB_HOST || '127.0.0.1'
const WEB_PORT = Number(process.env.PLAYWRIGHT_WEB_PORT || 3000)
const WEB_URL = `http://${WEB_HOST}:${WEB_PORT}`

/**
 * See https://playwright.dev/docs/test-configuration.
 */
module.exports = defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_URL || WEB_URL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'node scripts/playwright-webserver.mjs',
    url: WEB_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
})
