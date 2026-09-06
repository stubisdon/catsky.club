import { test, expect, type Page } from '@playwright/test'

/**
 * Stub the Ghost member endpoint.
 *
 * Matched with a regex, not the glob `**\/members/api/member/`: the client appends a
 * cache-busting `?_=<timestamp>`, which the trailing-slash glob does not match. With the glob
 * the route silently never fired, the real request failed, and the tier fell back to 'none' —
 * so any assertion expecting a *locked* track passed regardless of the tier being mocked.
 */
function mockMember(page: Page, amount?: number) {
  return page.route(/\/members\/api\/member\//, (route) => {
    if (amount === undefined) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
      return
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        member: {
          id: 'test-member',
          email: 'test@example.com',
          subscriptions: amount > 0
            ? [{ id: 'sub-1', status: 'active', price: { amount, currency: 'USD' } }]
            : [],
        },
      }),
    })
  })
}

/**
 * The five released tracks are all `public` now that they are out on the streaming services,
 * so the still-gated fixtures are the unreleased paid_5 demos: Overpriced Airbnb, Nova and
 * Vision, which render with the default "in progress" label.
 *
 * The date-lock matrix (availableFrom / announcedReleaseDate against each membership tier)
 * is exercised in src/utils/trackAccess.test.ts with synthetic fixtures, which is the right
 * home for it: it does not break every time a real track is released.
 */
const RELEASED_TRACKS = ['Intro', 'Baby Mama', 'Plank Song', 'Motherless Child', 'Sugar Daddy']
const LOCKED_DEMO = 'Overpriced Airbnb'

test.describe('Listen catalog tier access', () => {
  test('guest sees every released track, including the Baby Mama rename', async ({ page }) => {
    await mockMember(page)
    await page.goto('/listen')

    for (const title of RELEASED_TRACKS) {
      await expect(page.getByText(title, { exact: true })).toBeVisible()
    }
    await expect(page.getByText('Baby Mama 2')).toHaveCount(0)
  })

  test('guest sees unreleased demos as locked', async ({ page }) => {
    await mockMember(page)
    await page.goto('/listen')

    await expect(
      page.locator('div').filter({ hasText: new RegExp(`^${LOCKED_DEMO}.*in progress$`, 'i') }).first()
    ).toBeVisible()
  })

  test('free member sees released tracks but still not in-progress demos', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/listen')

    await expect(page.getByText('Plank Song', { exact: true })).toBeVisible()
    await expect(page.getByText('Sugar Daddy', { exact: true })).toBeVisible()
    await expect(
      page.locator('div').filter({ hasText: new RegExp(`^${LOCKED_DEMO}.*in progress$`, 'i') }).first()
    ).toBeVisible()
  })

  test('paid $5 members unlock the demo tracks', async ({ page }) => {
    await mockMember(page, 500)
    await page.goto('/listen')

    await expect(page.getByText(LOCKED_DEMO, { exact: true })).toBeVisible()
    // Unlocked, so it no longer carries a locked status label.
    await expect(
      page.locator('div').filter({ hasText: new RegExp(`^${LOCKED_DEMO}.*in progress$`, 'i') })
    ).toHaveCount(0)
  })

  test('hovering a locked track shows the listen early CTA', async ({ page }) => {
    await mockMember(page)
    await page.goto('/listen')

    const lockedCard = page.getByText(LOCKED_DEMO, { exact: true }).locator('..').locator('..').first()
    await expect(lockedCard).toContainText('in progress')

    await lockedCard.hover()
    await expect(lockedCard).toContainText(/listen early/i)
    await expect(lockedCard).not.toContainText('in progress')

    await page.locator('h1').hover()
    await expect(lockedCard).toContainText('in progress')
    await expect(lockedCard).not.toContainText(/listen early/i)
  })

  test('clicking a locked paid track routes the user to /connect', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/listen')

    await page
      .locator('div')
      .filter({ hasText: new RegExp(`^${LOCKED_DEMO}.*in progress$`, 'i') })
      .first()
      .click()
    await expect(page).toHaveURL(/\/connect$/)
  })
})
