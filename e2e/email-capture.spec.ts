import { test, expect, type Page } from '@playwright/test'

/**
 * Email capture modal (src/components/EmailCaptureModal.tsx) coverage.
 *
 * The modal is driven by src/utils/engagement.ts, which persists progress to
 * localStorage under `catsky_engagement` as `{ activeMs, songs, videos, fired }` and only
 * ever fires a trigger once per *fresh* threshold crossing (never on replay of an
 * already-`fired` trigger). Real playback isn't viable to drive deterministically here, so
 * these tests seed `catsky_engagement` directly via `page.addInitScript` and use
 * `page.clock` to advance virtual time past the periodic checkpoint (every 5s) that
 * re-evaluates the active-time threshold. This avoids both real 3-minute waits and
 * `waitForTimeout`-as-a-wait-substitute.
 *
 * Constants below mirror src/utils/engagement.ts and src/components/EmailCaptureModal.tsx.
 * They're duplicated (not imported) because those modules touch browser-only APIs
 * (localStorage) at call time and this file runs in Node.
 */

const ENGAGEMENT_STORAGE_KEY = 'catsky_engagement'
const EMAIL_CAPTURE_DISMISSED_AT_KEY = 'catsky_email_capture_dismissed_at'
const EMAIL_CAPTURE_DONE_KEY = 'catsky_email_capture_done'
const ACTIVE_TIME_THRESHOLD_MS = 3 * 60_000 // src/utils/engagement.ts ACTIVE_TIME_THRESHOLD_MS
const CHECK_INTERVAL_MS = 5000 // src/utils/engagement.ts CHECK_INTERVAL_MS

async function mockLoggedOutMember(page: Page): Promise<void> {
  await page.route('**/members/api/member**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ member: null }),
    }),
  )
}

async function mockLoggedInMember(page: Page): Promise<void> {
  await page.route('**/members/api/member**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        member: { uuid: 'member-uuid-123', email: 'ada@example.com', subscriptions: [] },
      }),
    }),
  )
}

/** Seeds engagement state just short of the active-time threshold, with nothing fired yet. */
async function seedEngagementNearActiveThreshold(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, state }) => window.localStorage.setItem(key, JSON.stringify(state)),
    {
      key: ENGAGEMENT_STORAGE_KEY,
      state: { activeMs: ACTIVE_TIME_THRESHOLD_MS - 500, songs: [], videos: [], fired: [] },
    },
  )
}

async function seedCaptureDone(page: Page): Promise<void> {
  await page.addInitScript((key) => window.localStorage.setItem(key, '1'), EMAIL_CAPTURE_DONE_KEY)
}

/** Advances virtual time past one checkpoint tick, which re-evaluates the active-time threshold. */
async function crossActiveTimeThreshold(page: Page): Promise<void> {
  await page.clock.runFor(CHECK_INTERVAL_MS + 1000)
}

test.describe('Email capture modal', () => {
  test('a logged-out visitor with no engagement sees no modal on /listen', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.goto('/listen')

    await expect(page.getByRole('heading', { name: /^listen$/i })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.email-capture-overlay')).toHaveCount(0)
  })

  test('a fresh trigger crossing opens the modal with focus in the email input', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.clock.install({ time: 0 })
    await seedEngagementNearActiveThreshold(page)
    await page.goto('/listen')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await crossActiveTimeThreshold(page)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.locator('#email-capture-input')).toBeFocused()
  })

  test('Escape closes the modal, persists the dismissal, and it does not reappear on reload', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.clock.install({ time: 0 })
    await seedEngagementNearActiveThreshold(page)
    await page.goto('/listen')
    await crossActiveTimeThreshold(page)
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const dismissedAt = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      EMAIL_CAPTURE_DISMISSED_AT_KEY,
    )
    expect(dismissedAt).not.toBeNull()
    expect(Number(dismissedAt)).toBeGreaterThan(0)

    await page.reload()
    await expect(page.getByRole('heading', { name: /^listen$/i })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('a pre-set "done" flag suppresses the modal even when a trigger fires', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.clock.install({ time: 0 })
    await seedEngagementNearActiveThreshold(page)
    await seedCaptureDone(page)
    await page.goto('/listen')

    await crossActiveTimeThreshold(page)

    // The done-flag short-circuits synchronously before any network call, so there is no
    // async gap to race here.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.email-capture-overlay')).toHaveCount(0)
  })

  test('submitting the modal shows success copy and marks capture done', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.route('**/members/api/send-magic-link/', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      }),
    )
    await page.clock.install({ time: 0 })
    await seedEngagementNearActiveThreshold(page)
    await page.goto('/listen')
    await crossActiveTimeThreshold(page)
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.locator('#email-capture-input').fill('ada@example.com')
    await page.getByRole('button', { name: /notify me/i }).click()

    const success = page.locator('.email-capture-success')
    await expect(success).toBeVisible()
    await expect(success).toContainText(/click the link/i)

    const done = await page.evaluate((key) => window.localStorage.getItem(key), EMAIL_CAPTURE_DONE_KEY)
    expect(done).toBe('1')
  })

  test('the modal never mounts on /connect or /welcome', async ({ page }) => {
    await mockLoggedOutMember(page)

    await page.goto('/connect')
    await expect(page.getByRole('heading', { name: /connect/i })).toBeVisible()
    await expect(page.locator('.email-capture-overlay')).toHaveCount(0)

    await page.goto('/welcome')
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.locator('.email-capture-overlay')).toHaveCount(0)
  })

  test('a logged-in member never sees the modal even when a trigger fires', async ({ page }) => {
    await mockLoggedInMember(page)
    await page.clock.install({ time: 0 })
    await seedEngagementNearActiveThreshold(page)
    await page.goto('/listen')

    // Unlike the "done flag" case, this path does check membership over the network before
    // deciding not to show the modal — wait for that round trip to actually resolve before
    // asserting absence, so the assertion can't pass just because it ran too early.
    const memberResponse = page.waitForResponse((res) => res.url().includes('/members/api/member'))
    await crossActiveTimeThreshold(page)
    await memberResponse

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.email-capture-overlay')).toHaveCount(0)
  })
})
