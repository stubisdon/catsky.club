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

test.describe('Membership gating on watch page', () => {
  test('free members see upgrade CTA', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/watch')

    await expect(page.getByText(/upgrade to \$5 \/ month/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'upgrade for $5 / month' })).toHaveAttribute('href', '/connect')
  })

  test('paid $5 members can open the unreleased video post', async ({ page }) => {
    await mockMember(page, 500)
    await page.goto('/watch')

    await expect(page.getByText(/your paid membership includes the unreleased video/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'open unreleased video post' })).toHaveAttribute('href', '/members/unreleased-video/')
  })
})
