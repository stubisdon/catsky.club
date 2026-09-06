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
  if ((params.get('action') === 'signup' || params.get('action') === 'signin')) {
    const root = document.createElement('div');
    root.id = 'ghost-portal-root';
    root.textContent = 'You have successfully subscribed to Catsky Club';
    const frame = document.createElement('iframe');
    frame.title = 'Ghost Portal';
    frame.setAttribute('data-testid', 'portal-notification-frame');
    frame.srcdoc = '<p>Signup error: Invalid link / Click here to retry</p>';
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

    await expect(page).toHaveURL(/\/listen$/)
    await expect(page.getByRole('heading', { name: /^welcome$/i })).toHaveCount(0)
  })

  test('skips welcome for a signup callback when the member already has a name', async ({ page }) => {
    await page.route('**/members/api/member**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ member: { ...member.member, name: 'Ada Lovelace' } }),
    }))
    await page.goto('/?action=signup&success=true')
    await expect(page).toHaveURL(/\/listen$/)
    await expect(page.getByRole('heading', { name: /^welcome$/i })).toHaveCount(0)
  })

  test('falls back to welcome with a non-empty root when the signup member request is aborted', async ({ page }) => {
    await page.route('**/members/api/member**', (route) => route.abort())
    await page.goto('/?action=signup&success=true')
    await expect(page).toHaveURL(/\/welcome$/)
    await expect(page.locator('#root')).not.toBeEmpty()
    await expect(page.getByText('connecting…')).toHaveCount(0)
  })

  test('owns expired-link messaging and suppresses Portal notification frames', async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/npm/@tryghost/portal@latest/umd/portal.min.js', (route) => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: portalNotificationStub,
    }))
    await page.goto('/?action=signup&errorCode=INVALID_TOKEN&success=false')
    await expect(page).toHaveURL(/\/connect$/)
    await expect(page.getByText(/that link has expired or was already used/i)).toBeVisible()
    const frameText = await Promise.all(page.frames().map((frame) => frame.locator('body').innerText().catch(() => '')))
    expect(frameText.join(' ')).not.toMatch(/successfully subscribed|Signup error|Click here to retry/i)
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

  test('holds the sent-link confirmation state during the resend cooldown', async ({ page }) => {
    await page.route('**/members/api/send-magic-link/', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }))
    await page.goto('/connect')
    await page.getByRole('button', { name: /sign up/i }).click()
    await page.getByPlaceholder('your@email.com').fill('test@example.com')
    await page.getByRole('button', { name: /send magic link/i }).click()
    await expect(page.getByRole('button', { name: 'link sent' })).toBeDisabled()
    await expect(page.getByRole('status')).toContainText('test@example.com')
    await page.waitForTimeout(2000)
    await expect(page.getByRole('button', { name: 'link sent' })).toBeDisabled()
    await expect(page.getByRole('status')).toContainText(/you can send another in \d+s/i)
  })

  test('recovers a missing app module once, then shows an in-brand fallback instead of a black screen', async ({ page }) => {
    await page.route('**/src/main.tsx', (route) => route.abort())

    await page.goto('/connect')

    await expect(page).toHaveURL(/__catsky_reload=/)
    await expect(page.getByText(/we could not load Catsky Club/i)).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('catsky_app_shell_recovery_attempted'))).toBe('true')
  })
})

test.describe('magic-link callback lands on the uncached /auth path', () => {
  // Production nginx rewrites Ghost's "/?action=..." magic-link redirect to "/auth?action=...".
  // The root URL was once served with a 1-year Cache-Control, so browsers still hold a broken
  // shell for it and the server can never reach them. /auth was never cacheable.
  test('routes every callback correctly from /auth', async ({ page }) => {
    await page.route('**/members/api/member**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(member),
    }))

    await page.goto('/auth?action=signup&success=true')
    await expect(page).toHaveURL(/\/welcome$/)

    await page.goto('/auth?action=signin&success=true')
    await expect(page).toHaveURL(/\/listen$/)

    await page.goto('/auth?action=signup&errorCode=INVALID_TOKEN&success=false')
    await expect(page).toHaveURL(/\/connect$/)
  })
})
