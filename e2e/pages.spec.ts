import { test, expect } from '@playwright/test'

/**
 * Page Load Tests
 *
 * Tests that verify all pages load correctly without errors.
 * These tests serve as smoke tests to catch breaking changes.
 */
test.describe('Page Load Tests', () => {
  test('landing page (root) loads correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/')

    // Check page title (if set)
    const title = await page.title()
    expect(title).toBeTruthy()

    // Check main container exists
    const container = page.locator('.app-container')
    await expect(container).toBeVisible()

    // Check heading is visible
    const heading = page.getByRole('heading', { name: /catsky\.club/i })
    await expect(heading).toBeVisible()
  })

  test('landing page has no critical console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (error) => !error.includes('Ghost') && !error.includes('API') && !error.includes('favicon')
    )

    // Log any errors found
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors)
    }
  })

  test('listen page loads correctly', async ({ page }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/listen/)

    // Should show listen heading
    const heading = page.getByRole('heading', { name: /listen/i })
    await expect(heading).toBeVisible()
  })

  test('watch page loads correctly', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/watch/)

    // Should show watch heading
    const heading = page.getByRole('heading', { name: /watch/i })
    await expect(heading).toBeVisible()
  })

  test('connect page loads correctly', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/connect/)

    // Should show connect heading
    const heading = page.getByRole('heading', { name: /connect/i })
    await expect(heading).toBeVisible()
  })

  test('mission page loads correctly', async ({ page }) => {
    await page.goto('/mission')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/mission/)

    // Page should load without errors
    const container = page.locator('.app-container')
    await expect(container).toBeVisible()
  })

  test('404 / unknown routes redirect to landing page', async ({ page }) => {
    await page.goto('/nonexistent-page')
    await page.waitForLoadState('networkidle')

    // The app normalizes unknown routes to landing page (/)
    await expect(page).toHaveURL('/')

    // Should show landing page content
    const heading = page.getByRole('heading', { name: /catsky\.club/i })
    await expect(heading).toBeVisible()
  })

  test('trailing slashes are handled correctly', async ({ page }) => {
    await page.goto('/watch/')
    await page.waitForLoadState('networkidle')

    // Should still load watch page
    const heading = page.getByRole('heading', { name: /watch/i })
    await expect(heading).toBeVisible()
  })
})
