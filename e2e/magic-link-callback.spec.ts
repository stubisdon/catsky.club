import { expect, test, type Page } from '@playwright/test'

const member = {
  member: {
    uuid: 'member-uuid-123',
    email: 'ada@example.com',
    subscriptions: [],
  },
}

const portalNotificationStub = `
(() => {
  const params = new URLSearchParams(window.location.search);
  if ((params.get('action') === 'signup' || params.get('action') === 'signin') && params.get('success') === 'true') {
    const root = document.createElement('div');
    root.id = 'ghost-portal-root';
    root.textContent = 'You have successfully subscribed to Catsky Club';
    const frame = document.createElement('iframe');
    frame.title = 'Ghost Portal';
    frame.srcdoc = '<p>You have successfully subscribed to Catsky Club</p>';
    root.appendChild(frame);
    document.body.appendChild(root);
  }
})();
`

async function mockMember(page: Page) {
  await page.route('**/members/api/member**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(member),
  }))
}

test.describe('magic-link callback regression coverage', () => {
  test('routes a root signup callback to the welcome name form', async ({ page }) => {
    await mockMember(page)

    await page.goto('/?action=signup&success=true')

    await expect(page).toHaveURL(/\/welcome$/)
    await expect(page.getByRole('heading', { name: /^welcome$/i })).toBeVisible()
    await expect(page.getByLabel(/first name/i)).toBeVisible()
  })

  test('supports signup callbacks from connect and listen paths', async ({ page }) => {
    await mockMember(page)

    for (const path of ['/connect', '/listen']) {
      await page.goto(`${path}?action=signup&success=true`)
      await expect(page).toHaveURL(/\/welcome$/)
      await expect(page.getByRole('heading', { name: /^welcome$/i })).toBeVisible()
    }
  })

  test('queues the full profile payload and moves to listen without waiting for its response', async ({ page }) => {
    let profileRequestBody = ''
    let profileRequestResolved = false
    await mockMember(page)
    await page.route('**/api/member-profile', async (route) => {
      profileRequestBody = route.request().postData() || ''
      await new Promise((resolve) => setTimeout(resolve, 1500))
      profileRequestResolved = true
      await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ queued: true }) })
    })

    await page.goto('/?action=signup&success=true')
    await page.getByLabel(/first name/i).fill('Ada')
    await page.getByLabel(/last name/i).fill('Lovelace')
    await page.getByRole('button', { name: /continue/i }).click()

    await expect(page).toHaveURL(/\/listen$/)
    expect(profileRequestResolved).toBe(false)
    await expect.poll(() => JSON.parse(profileRequestBody || '{}')).toEqual({
      memberId: '',
      memberUuid: 'member-uuid-123',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
  })

  test('queues an empty last name when only the first name is supplied', async ({ page }) => {
    let profileRequestBody = ''
    await mockMember(page)
    await page.route('**/api/member-profile', (route) => {
      profileRequestBody = route.request().postData() || ''
      return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ queued: true }) })
    })

    await page.goto('/?action=signup&success=true')
    await page.getByLabel(/first name/i).fill('Ada')
    await page.getByRole('button', { name: /continue/i }).click()

    await expect(page).toHaveURL(/\/listen$/)
    await expect.poll(() => JSON.parse(profileRequestBody || '{}').lastName).toBe('')
  })

  test('keeps signin callbacks out of welcome and strips their params', async ({ page }) => {
    await mockMember(page)

    await page.goto('/?action=signin&success=true')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /^welcome$/i })).toHaveCount(0)
  })

  test('prevents the Portal success notification after callbacks', async ({ page }) => {
    await mockMember(page)
    await page.route('https://cdn.jsdelivr.net/npm/@tryghost/portal@latest/umd/portal.min.js', (route) => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: portalNotificationStub,
    }))

    await page.goto('/?action=signup&success=true')
    await expect(page.getByRole('heading', { name: /^welcome$/i })).toBeVisible()
    await page.waitForTimeout(100)

    await expect(page.locator('#ghost-portal-root')).toHaveCount(0)
    await expect(page.getByText(/successfully subscribed/i)).toHaveCount(0)
    const portalFrameText = await Promise.all(
      page.frames().map((frame) => frame.locator('body').innerText().catch(() => '')),
    )
    expect(portalFrameText.join(' ')).not.toMatch(/successfully subscribed/i)
  })

  test('leaves non-auth query params and Portal hashes untouched', async ({ page }) => {
    await page.goto('/?stripe=success')
    await expect(page).toHaveURL(/\/?stripe=success$/)

    await page.goto('/connect#/portal/signup')
    await expect(page).toHaveURL(/\/connect#\/portal\/signup$/)
  })

  test('keeps the magic-link request on Ghost’s established email-only contract', async ({ page }) => {
    let requestBody = ''
    await page.route('**/members/api/send-magic-link/', (route) => {
      requestBody = route.request().postData() || ''
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    })

    await page.goto('/connect')
    await page.getByRole('button', { name: /sign up/i }).click()
    await page.getByPlaceholder('your@email.com').fill('test@example.com')
    await page.getByRole('button', { name: /send magic link/i }).click()

    await expect.poll(() => JSON.parse(requestBody || '{}')).toEqual({
      email: 'test@example.com',
    })
  })
})
