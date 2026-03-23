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

async function freezeClientDate(page: any, isoDate: string) {
  await page.addInitScript(({ nowIso }) => {
    const fixedNow = new Date(nowIso).valueOf()
    const RealDate = Date

    class MockDate extends RealDate {
      constructor(...args: ConstructorParameters<DateConstructor>) {
        if (args.length === 0) {
          super(fixedNow)
          return
        }

        super(...args)
      }

      static now() {
        return fixedNow
      }
    }

    Object.defineProperty(MockDate, 'parse', { value: RealDate.parse })
    Object.defineProperty(MockDate, 'UTC', { value: RealDate.UTC })
    // @ts-expect-error test-only window override
    window.Date = MockDate
  }, { nowIso: isoDate })
}

test.describe('Listen catalog tier access', () => {
  test('guest sees first two public tracks including Baby Mama rename', async ({ page }) => {
    await freezeClientDate(page, '2026-03-19T12:00:00.000Z')
    await mockMember(page)
    await page.goto('/listen')

    await expect(page.getByText('Intro')).toBeVisible()
    await expect(page.getByText('Baby Mama')).toBeVisible()
    await expect(page.getByText('Baby Mama 2')).toHaveCount(0)

    await expect(page.getByText('coming Apr 10, 2026')).toBeVisible()
  })

  test('free member can see free-only tracks but not paid tracks', async ({ page }) => {
    await freezeClientDate(page, '2026-03-19T12:00:00.000Z')
    await mockMember(page, 0)
    await page.goto('/listen')

    await expect(page.getByText('Plank Song')).toBeVisible()
    const motherlessChildLocked = page.locator('div').filter({ hasText: /^Motherless Child.*coming Apr 10, 2026$/i }).first()
    await expect(motherlessChildLocked).toBeVisible()

    const sugarDaddyContainer = page.locator('div').filter({ hasText: /^Sugar Daddy.*coming May 8, 2026$/i }).first()
    await expect(sugarDaddyContainer).toBeVisible()
  })

  test('paid members still see Motherless Child locked before Apr 10, 2026', async ({ page }) => {
    await freezeClientDate(page, '2026-03-19T12:00:00.000Z')
    await mockMember(page, 500)
    await page.goto('/listen')

    const motherlessChildLocked = page.locator('div').filter({ hasText: /^Motherless Child.*coming Apr 10, 2026$/i }).first()
    await expect(motherlessChildLocked).toBeVisible()

    const overpricedLocked = page.locator('div').filter({ hasText: /^Overpriced Airbnb.*in progress$/i }).first()
    await expect(overpricedLocked).toBeVisible()
  })


  test('hovering locked track shows listen early CTA', async ({ page }) => {
    await mockMember(page)
    await page.goto('/listen')

    const sugarDaddyCard = page.getByText('Sugar Daddy').locator('..').locator('..').first()
    await expect(sugarDaddyCard).toContainText('coming May 8, 2026')

    await sugarDaddyCard.hover()
    await expect(sugarDaddyCard).toContainText(/listen early/i)
    await expect(sugarDaddyCard).not.toContainText('coming May 8, 2026')

    await page.locator('h1').hover()
    await expect(sugarDaddyCard).toContainText('coming May 8, 2026')
    await expect(sugarDaddyCard).not.toContainText(/listen early/i)
  })

  test('clicking locked paid track routes user to /connect', async ({ page }) => {
    await mockMember(page, 0)
    await page.goto('/listen')

    await page.locator('div').filter({ hasText: /^Sugar Daddy.*coming May 8, 2026$/i }).first().click()
    await expect(page).toHaveURL(/\/connect$/)
  })
})
