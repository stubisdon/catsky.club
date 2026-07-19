import { test, expect, type Page } from '@playwright/test'

const TEST_VIDEO_EMBED_URL = 'https://video.example/embed/test-video'

function mockMember(page: Page, amount?: number) {
  page.route('**/api/video-embed', (route) => {
    if (amount && amount > 0) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ embedUrl: TEST_VIDEO_EMBED_URL }),
      })
      return
    }

    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Video access denied' }),
    })
  })

  return page.route('**/members/api/member/**', (route) => {
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

test.describe('Membership gating on video page', () => {
  test('logged-out users see connected-cats lock copy and no iframe', async ({ page }) => {
    await mockMember(page)
    await page.goto('/video')

    await expect(page.getByText('this page is only for connected cats, go to catsky.club/connect to get connected')).toBeVisible()
    await expect(page.getByRole('link', { name: 'connect' })).toHaveAttribute('href', '/connect')
    await expect(page.locator('iframe[title="Catsky unreleased music video"]')).toHaveCount(0)
  })

  test('free members see $5 upgrade lock copy, /connect link, and no iframe', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/video')

    await expect(page.getByText('upgrade to $5/month to unlock the music video')).toBeVisible()
    await expect(page.getByRole('link', { name: 'upgrade' })).toHaveAttribute('href', '/connect')
    await expect(page.locator('iframe[title="Catsky unreleased music video"]')).toHaveCount(0)
  })

  test('paid $5 members can see embedded unreleased video', async ({ page }) => {
    await mockMember(page, 500)
    await page.goto('/video')

    const iframe = page.locator('iframe[title="Catsky unreleased music video"]')
    await expect(iframe).toBeVisible()
    await expect(iframe).toHaveAttribute('src', TEST_VIDEO_EMBED_URL)
  })

  test('paid $20 members can see embedded unreleased video', async ({ page }) => {
    await mockMember(page, 2000)
    await page.goto('/video')

    const iframe = page.locator('iframe[title="Catsky unreleased music video"]')
    await expect(iframe).toBeVisible()
    await expect(iframe).toHaveAttribute('src', TEST_VIDEO_EMBED_URL)
  })

  test('paid $5 members see secrets on home and can navigate to /video', async ({ page }) => {
    await mockMember(page, 500)
    await page.goto('/')

    const secretsLink = page.getByRole('link', { name: 'secrets' })
    await expect(secretsLink).toBeVisible()
    await secretsLink.click()
    await expect(page).toHaveURL(/\/video$/)
  })

  test('free members do not see secrets on home', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'secrets' })).toHaveCount(0)
  })
})
