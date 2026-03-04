import { test, expect } from '@playwright/test'

function mockMember(page: any, amount?: number) {
  return page.route('**/members/api/member/', (route) => {
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

    const signUpText = page.getByText('sign up')
    await expect(signUpText.first()).toBeVisible()
  })

  test('free member can see free-only tracks but not paid tracks', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/listen')

    await expect(page.getByText('Plank Song')).toBeVisible()
    await expect(page.getByText('Motherless Child')).toBeVisible()

    const sugarDaddyContainer = page.locator('div').filter({ hasText: /^Sugar Daddy.*sign up$/i }).first()
    await expect(sugarDaddyContainer).toBeVisible()
  })

  test('$5 member unlocks Sugar Daddy but $20 tracks stay locked', async ({ page }) => {
    await mockMember(page, 500)
    await page.goto('/listen')

    const sugarDaddyLocked = page.locator('div').filter({ hasText: /^Sugar Daddy.*sign up$/i })
    await expect(sugarDaddyLocked).toHaveCount(0)

    const overpricedLocked = page.locator('div').filter({ hasText: /^Overpriced Airbnb.*sign up$/i }).first()
    await expect(overpricedLocked).toBeVisible()
  })

  test('clicking locked paid track routes user to /connect', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/listen')

    await page.locator('div').filter({ hasText: /^Sugar Daddy.*sign up$/i }).first().click()
    await expect(page).toHaveURL(/\/connect$/)
  })
})
