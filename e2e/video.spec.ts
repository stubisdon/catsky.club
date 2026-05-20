import { test, expect, type Page } from '@playwright/test'

function mockMember(page: Page, amount?: number) {
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
    await expect(page.locator('iframe[src*="youtube.com/embed/xRxUcF_wFSQ"]')).toHaveCount(0)
  })

  test('free members see $5 upgrade lock copy, /connect link, and no iframe', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/video')

    await expect(page.getByText('upgrade to $5/month to unlock the music video')).toBeVisible()
    await expect(page.getByRole('link', { name: 'upgrade' })).toHaveAttribute('href', '/connect')
    await expect(page.locator('iframe[src*="youtube.com/embed/xRxUcF_wFSQ"]')).toHaveCount(0)
  })

  test('paid $5 members can see embedded unreleased video', async ({ page }) => {
    await mockMember(page, 500)
    await page.goto('/video')

    await expect(page.locator('iframe[src*="youtube.com/embed/xRxUcF_wFSQ"]')).toBeVisible()
  })

  test('paid $20 members can see embedded unreleased video', async ({ page }) => {
    await mockMember(page, 2000)
    await page.goto('/video')

    await expect(page.locator('iframe[src*="youtube.com/embed/xRxUcF_wFSQ"]')).toBeVisible()
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
