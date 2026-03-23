import { test, expect, type Page } from '@playwright/test'

function mockMember(page: Page, amount?: number) {
  return page.route('**/members/api/member**', (route) => {
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

test.describe('Listen catalog tier access', () => {
  test('guest sees first two public tracks including Baby Mama rename', async ({ page }) => {
    await mockMember(page)
    await page.goto('/listen')

    await expect(page.getByText('Intro')).toBeVisible()
    await expect(page.getByText('Baby Mama')).toBeVisible()
    await expect(page.getByText('Baby Mama 2')).toHaveCount(0)

    await expect(page.getByText('coming Apr 10, 2026')).toBeVisible()
  })

  test('free member can see free-only tracks but not paid tracks', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/listen')

    await expect(page.getByText('Plank Song')).toBeVisible()
    await expect(page.getByText('Motherless Child')).toBeVisible()

    const sugarDaddyContainer = page.locator('div').filter({ hasText: /^Sugar Daddy.*coming May 8, 2026$/i }).first()
    await expect(sugarDaddyContainer).toBeVisible()
  })

  test('$5 member unlocks every paid demo in v1', async ({ page }) => {
    await mockMember(page, 500)
    await page.goto('/listen')

    const sugarDaddyLocked = page.locator('div').filter({ hasText: /^Sugar Daddy.*coming May 8, 2026$/i })
    await expect(sugarDaddyLocked).toHaveCount(0)

    await expect(page.getByText('Overpriced Airbnb')).toBeVisible()
    await expect(page.getByText('Nova')).toBeVisible()
    await expect(page.getByText('Vision')).toBeVisible()
  })


  test('hovering locked track shows listen early CTA', async ({ page }) => {
    await mockMember(page)
    await page.goto('/listen')

    const sugarDaddyCard = page.locator('div').filter({ hasText: /^Sugar Daddy.*coming May 8, 2026$/i }).first()
    await sugarDaddyCard.hover()

    await expect(page.getByText('listen early')).toBeVisible()
  })
  test('clicking locked paid track routes user to /connect', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/listen')

    await page.locator('div').filter({ hasText: /^Sugar Daddy.*coming May 8, 2026$/i }).first().click()
    await expect(page).toHaveURL(/\/connect$/)
  })
})
