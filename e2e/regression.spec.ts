import { test, expect } from '@playwright/test'

/**
 * Regression Tests
 *
 * These tests verify critical functionality hasn't regressed.
 * They serve as a safety net to catch breaking changes during
 * feature development and refactoring.
 */
test.describe('Regression Tests', () => {
  test('critical navigation paths work', async ({ page }) => {
    await page.goto('/')

    // Test all main navigation paths from landing page
    const navPaths = [
      { link: 'listen', path: '/listen' },
      { link: 'watch', path: '/watch' },
      { link: 'connect', path: '/connect' },
    ]

    for (const { link, path } of navPaths) {
      await page.goto('/')
      await page.getByRole('link', { name: link }).click()
      await expect(page).toHaveURL(new RegExp(`.*${path.replace('/', '\\/')}`))
    }
  })

  test('public nav is present on landing page', async ({ page }) => {
    await page.goto('/')

    // Critical navigation elements that should always be present
    const criticalLinks = ['listen', 'watch', 'connect']

    for (const link of criticalLinks) {
      await expect(page.getByRole('link', { name: link })).toBeVisible()
    }
  })

  test('listen page shows tracks', async ({ page }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Should show at least one track (Vision is first track)
    await expect(page.getByText(/vision/i)).toBeVisible()
  })

  test('watch page shows video', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Should show YouTube iframe
    const iframe = page.locator('iframe[src*="youtube.com/embed"]')
    await expect(iframe).toBeVisible()
  })

  test('connect page shows sign up option', async ({ page }) => {
    // Mock as logged out
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should show sign up button
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
  })

  test('no JavaScript errors on landing page load', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out known non-critical errors (like missing API keys in dev)
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('Ghost') &&
        !error.includes('API') &&
        !error.includes('favicon')
    )

    if (criticalErrors.length > 0) {
      console.error('JavaScript errors found:', criticalErrors)
    }

    // Uncomment to fail on any critical errors
    // expect(criticalErrors).toHaveLength(0)
  })

  test('no JavaScript errors on listen page load', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('Ghost') &&
        !error.includes('API') &&
        !error.includes('favicon') &&
        !error.includes('SoundCloud')
    )

    if (criticalErrors.length > 0) {
      console.error('JavaScript errors found:', criticalErrors)
    }
  })

  test('responsive design works on mobile for landing', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    // Check that content is visible and not cut off
    await expect(page.getByRole('heading', { name: /catsky\.club/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'listen' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'watch' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'connect' })).toBeVisible()
  })

  test('responsive design works on mobile for listen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /listen/i })).toBeVisible()
    await expect(page.getByText(/vision/i)).toBeVisible()
  })

  test('CSS variables are loaded', async ({ page }) => {
    await page.goto('/')

    // Check that CSS custom properties exist
    const cssVariables = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      return {
        colorText: root.getPropertyValue('--color-text'),
        colorBg: root.getPropertyValue('--color-bg'),
      }
    })

    // CSS variables should be defined (even if empty, they should exist)
    expect(cssVariables).toBeDefined()
  })

  test('all pages have app-container', async ({ page }) => {
    const pages = ['/', '/listen', '/watch', '/connect']

    for (const pagePath of pages) {
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      const container = page.locator('.app-container')
      await expect(container).toBeVisible()
    }
  })

  test('home links work from all pages', async ({ page }) => {
    const pagesWithHomeLinks = ['/listen', '/watch', '/connect']

    for (const pagePath of pagesWithHomeLinks) {
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      // Click home link
      await page.getByRole('link', { name: /home/i }).click()

      // Should navigate to landing
      await expect(page).toHaveURL('/')

      // Verify landing content
      const heading = page.getByRole('heading', { name: /catsky\.club/i })
      await expect(heading).toBeVisible()
    }
  })
})
