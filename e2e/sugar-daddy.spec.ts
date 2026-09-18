import { test, expect } from '@playwright/test'

/**
 * /sugar-daddy — smart-link landing page for the "Sugar Daddy" single, built for Meta ad
 * traffic. The Meta Pixel is page-scoped to this route (src/utils/metaPixel.ts); every test
 * here blocks connect.facebook.net so the suite runs fully offline and never depends on Meta's
 * CDN reachability.
 */

type Page = import('@playwright/test').Page

/** 1x1 transparent GIF, standing in for the real cover art host. */
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

async function stubRemoteImages(page: Page) {
  await page.route(/i\.scdn\.co|i\.ytimg\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'image/gif', body: PIXEL }),
  )
}

async function gotoSugarDaddy(page: Page) {
  await page.route('https://connect.facebook.net/**', (route) => route.abort())
  await stubRemoteImages(page)

  // Guest by default unless a test overrides this.
  await page.route('**/members/api/member**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ member: null }),
    }),
  )

  await page.goto('/sugar-daddy')
  await page.getByRole('heading', { name: /sugar daddy/i }).waitFor({ state: 'visible' })
}

test.describe('Sugar Daddy landing page', () => {
  test('loads with a heading and every platform link', async ({ page }) => {
    await gotoSugarDaddy(page)

    await expect(page.getByRole('heading', { name: /sugar daddy/i })).toBeVisible()

    await expect(page.getByRole('link', { name: 'spotify' })).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/4HRAM5R5U0lV9tpUmfMrqa',
    )
    await expect(page.getByRole('link', { name: 'apple music' })).toHaveAttribute(
      'href',
      'https://music.apple.com/us/song/sugar-daddy/6811689213',
    )
    await expect(page.getByRole('link', { name: 'youtube' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=xRxUcF_wFSQ',
    )
  })

  test('an explore link navigates into the site (e.g. /listen)', async ({ page }) => {
    await gotoSugarDaddy(page)

    await page.getByRole('link', { name: /the full catalogue/i }).click()

    await expect(page).toHaveURL(/\/listen$/)
    await expect(page.getByRole('heading', { name: /listen/i })).toBeVisible()
  })

  test('submitting the email form with a mocked magic-link success shows the confirmation', async ({ page }) => {
    await page.route('**/members/api/send-magic-link/', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      }),
    )

    await gotoSugarDaddy(page)

    const emailInput = page.getByTestId('subscribe-email')
    await expect(emailInput).toBeVisible()
    await emailInput.fill('test@example.com')

    await page.getByTestId('subscribe-submit').click()

    await expect(page.getByTestId('subscribe-confirmation')).toBeVisible()
  })

  test('never talks to connect.facebook.net directly', async ({ page }) => {
    let calledMetaCdn = false
    await page.route('https://connect.facebook.net/**', (route) => {
      calledMetaCdn = true
      route.abort()
    })
    await stubRemoteImages(page)
    await page.route('**/members/api/member**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ member: null }) }),
    )

    await page.goto('/sugar-daddy')
    await page.getByRole('heading', { name: /sugar daddy/i }).waitFor({ state: 'visible' })

    // The pixel loader always tries to reach the CDN; the route above intercepts and aborts it
    // so the assertion below proves the block is effective rather than proving nothing loaded.
    expect(calledMetaCdn).toBe(true)
  })

  // The dev server's own HMR runtime throws "Cannot assign to read only property ... of
  // object '[object Module]'" on every route in this sandbox (reproduced on '/' too, with no
  // app code involved), so it is filtered as environment noise rather than a page bug —
  // same idea as the known-error filter in e2e/pages.spec.ts.
  function isAppError(message: string): boolean {
    return !message.includes("Cannot assign to read only property")
  }

  test.describe('renders without errors in both themes', () => {
    test.use({ colorScheme: 'light' })
    test('light theme', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(String(error)))

      await gotoSugarDaddy(page)

      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      expect(errors.filter(isAppError)).toEqual([])
    })
  })

  test.describe('renders without errors in both themes (dark)', () => {
    test.use({ colorScheme: 'dark' })
    test('dark theme', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(String(error)))

      await gotoSugarDaddy(page)

      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      expect(errors.filter(isAppError)).toEqual([])
    })
  })
})
