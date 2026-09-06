import { test, expect, type Page } from '@playwright/test'

/**
 * Engagement-triggered subscribe prompt.
 *
 * The prompt is driven by src/utils/engagement.ts, which persists to localStorage under
 * `catsky_engagement` as { activeMs, songs, videos, fired }. Seeding that state before
 * navigation is the only deterministic way to drive it — real playback is not viable here.
 * It only fires on a FRESH threshold crossing, never on replay of an already-`fired` trigger.
 */

const ENGAGEMENT_KEY = 'catsky_engagement'
const DISMISSED_KEY = 'catsky_email_capture_dismissed_at'
const DONE_KEY = 'catsky_email_capture_done'

async function mockLoggedOut(page: Page) {
  await page.route('**/members/api/member**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ member: null }) }),
  )
}

async function mockLoggedIn(page: Page) {
  await page.route('**/members/api/member**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ member: { uuid: 'm-1', email: 'ada@example.com', subscriptions: [] } }),
    }),
  )
}

/** Seeds two listened songs so a single further song crosses the 3-song threshold. */
async function seedTwoSongs(page: Page, extra: Record<string, string> = {}) {
  await page.addInitScript(
    ([key, extras]) => {
      localStorage.setItem(
        key as string,
        JSON.stringify({ activeMs: 0, songs: ['a', 'b'], videos: [], fired: [] }),
      )
      for (const [k, v] of Object.entries(extras as Record<string, string>)) {
        localStorage.setItem(k, v)
      }
    },
    [ENGAGEMENT_KEY, extra] as const,
  )
}

/** Crosses the third-song threshold from inside the page. */
async function crossSongThreshold(page: Page) {
  await page.evaluate(async () => {
    const mod = await import('/src/utils/engagement.ts')
    mod.recordSongProgress('c', 1)
  })
}

test.describe('Engagement subscribe prompt', () => {
  test('does not appear for a logged-out visitor with no engagement', async ({ page }) => {
    await mockLoggedOut(page)
    await page.goto('/listen')

    await expect(page.getByRole('heading', { name: /^listen$/i })).toBeVisible()
    await expect(page.getByTestId('subscribe-dialog')).toHaveCount(0)
  })

  test('opens once a fresh trigger crosses its threshold', async ({ page }) => {
    await mockLoggedOut(page)
    await seedTwoSongs(page)
    await page.goto('/listen')
    await expect(page.getByTestId('subscribe-dialog')).toHaveCount(0)

    await crossSongThreshold(page)

    await expect(page.getByTestId('subscribe-dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('closing it records a dismissal and it stays away on reload', async ({ page }) => {
    await mockLoggedOut(page)
    await seedTwoSongs(page)
    await page.goto('/listen')
    await crossSongThreshold(page)
    await expect(page.getByTestId('subscribe-dialog')).toBeVisible()

    await page.getByTestId('dialog-close').click()
    await expect(page.getByTestId('subscribe-dialog')).toHaveCount(0)

    const dismissedAt = await page.evaluate((k) => localStorage.getItem(k), DISMISSED_KEY)
    expect(Number(dismissedAt)).toBeGreaterThan(0)

    await page.reload()
    await expect(page.getByRole('heading', { name: /^listen$/i })).toBeVisible()
    await expect(page.getByTestId('subscribe-dialog')).toHaveCount(0)
  })

  test('never appears once the done flag is set', async ({ page }) => {
    await mockLoggedOut(page)
    await seedTwoSongs(page, { [DONE_KEY]: '1' })
    await page.goto('/listen')

    await crossSongThreshold(page)

    await expect(page.getByRole('heading', { name: /^listen$/i })).toBeVisible()
    await expect(page.getByTestId('subscribe-dialog')).toHaveCount(0)
  })

  test('never appears for a logged-in member', async ({ page }) => {
    await mockLoggedIn(page)
    await seedTwoSongs(page)
    await page.goto('/listen')

    await crossSongThreshold(page)
    await page.waitForResponse((r) => r.url().includes('/members/api/member'))

    await expect(page.getByTestId('subscribe-dialog')).toHaveCount(0)
  })

  test('is not mounted on the routes that already ask for an email', async ({ page }) => {
    await mockLoggedOut(page)
    await seedTwoSongs(page)

    await page.goto('/subscribe')
    await expect(page.getByRole('button', { name: /subscribe/i })).toBeVisible()
    await expect(page.getByTestId('subscribe-dialog')).toHaveCount(0)

    await page.goto('/welcome')
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByTestId('subscribe-dialog')).toHaveCount(0)
  })
})
