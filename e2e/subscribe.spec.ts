import { test, expect, type Page } from '@playwright/test'

/**
 * Subscribe page (/subscribe) coverage.
 *
 * Follows the route-mocking style used in e2e/auth.spec.ts and
 * e2e/magic-link-callback.spec.ts: `/members/api/member` is always mocked so the test
 * doesn't depend on a real Ghost backend being reachable, and `networkidle` is avoided
 * (Ghost Portal's jsDelivr CDN is slow locally) in favor of waiting on specific locators.
 */

async function mockLoggedOutMember(page: Page): Promise<void> {
  await page.route('**/members/api/member**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ member: null }),
    }),
  )
}

async function mockMagicLinkSuccess(page: Page): Promise<void> {
  await page.route('**/members/api/send-magic-link/', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  )
}

test.describe('Subscribe page', () => {
  test('loads with heading, email input and submit button', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.goto('/subscribe')

    await expect(page.getByRole('heading', { name: /^subscribe$/i })).toBeVisible()
    await expect(page.locator('#subscribe-email')).toBeVisible()
    await expect(page.getByRole('button', { name: /subscribe/i })).toBeVisible()
  })

  test('submit is disabled for an invalid email and enabled for a valid one', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.goto('/subscribe')

    const emailInput = page.locator('#subscribe-email')
    const submitButton = page.getByRole('button', { name: /subscribe/i })

    // Empty email: disabled.
    await expect(submitButton).toBeDisabled()

    // Invalid, non-empty email: still disabled.
    await emailInput.fill('not-an-email')
    await expect(submitButton).toBeDisabled()

    // Valid email: enabled.
    await emailInput.fill('test@example.com')
    await expect(submitButton).toBeEnabled()
  })

  test('successful submission shows the success message and hides the email input', async ({ page }) => {
    await mockLoggedOutMember(page)
    await mockMagicLinkSuccess(page)
    await page.goto('/subscribe')

    await page.locator('#subscribe-email').fill('test@example.com')
    await page.getByRole('button', { name: /subscribe/i }).click()

    const success = page.locator('.subscribe-confirmation')
    await expect(success).toBeVisible()
    await expect(success).toHaveAttribute('role', 'status')
    await expect(success).toContainText(/click the link/i)
    await expect(page.locator('#subscribe-email')).toHaveCount(0)
  })

  test('failed submission shows the error and keeps the form usable', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.route('**/members/api/send-magic-link/', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Verification failed. Please try again.' }] }),
      }),
    )
    await page.goto('/subscribe')

    await page.locator('#subscribe-email').fill('test@example.com')
    await page.getByRole('button', { name: /subscribe/i }).click()

    const error = page.locator('.connect-auth-error')
    await expect(error).toBeVisible()
    await expect(error).toHaveAttribute('role', 'alert')
    await expect(error).toContainText(/verification failed/i)

    // Retry must still be possible.
    await expect(page.locator('#subscribe-email')).toBeVisible()
  })

  test('sends the typed email in the magic-link request body', async ({ page }) => {
    await mockLoggedOutMember(page)
    let requestBody = ''
    await page.route('**/members/api/send-magic-link/', (route) => {
      requestBody = route.request().postData() || ''
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })
    await page.goto('/subscribe')

    await page.locator('#subscribe-email').fill('ada@example.com')
    await page.getByRole('button', { name: /subscribe/i }).click()

    await expect(page.locator('.subscribe-confirmation')).toBeVisible()
    // Goes through the shared magicLink helper, so it carries the signup emailType and a
    // label that lets subscribe-page signups be told apart from /connect ones in Ghost.
    expect(JSON.parse(requestBody || '{}')).toEqual({
      email: 'ada@example.com',
      emailType: 'signup',
      labels: ['subscribe-page'],
    })
  })

  test('trailing slash resolves to the subscribe page, not home', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.goto('/subscribe/')

    await expect(page.getByRole('heading', { name: /^subscribe$/i })).toBeVisible()
    await expect(page.locator('#subscribe-email')).toBeVisible()
  })

  test('the email-capture modal never appears on /subscribe', async ({ page }) => {
    await mockLoggedOutMember(page)
    await page.goto('/subscribe')

    await expect(page.getByRole('heading', { name: /^subscribe$/i })).toBeVisible()
    await expect(page.locator('.email-capture-overlay')).toHaveCount(0)
  })

  test('a magic-link callback landing on /subscribe redirects to the welcome name form', async ({ page }) => {
    await page.route('**/members/api/member**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { uuid: 'member-uuid-123', email: 'ada@example.com', subscriptions: [] },
        }),
      }),
    )

    await page.goto('/subscribe?action=signup&success=true')

    await expect(page).toHaveURL(/\/welcome$/)
    await expect(page.getByLabel(/first name/i)).toBeVisible()
  })
})
