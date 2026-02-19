import { test, expect } from '@playwright/test'

/**
 * Navigation Tests
 *
 * Tests for navigation between pages:
 * - Landing page navigation links
 * - Direct URL navigation
 * - Back/forward button navigation
 * - Internal navigation (no page reloads)
 */
test.describe('Navigation', () => {
  test('landing page displays public navigation links', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/')

    // Check navigation links are present
    await expect(page.getByRole('link', { name: 'listen' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'watch' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'connect' })).toBeVisible()
  })

  test('navigates from landing to listen page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'listen' }).click()

    // Wait for navigation
    await expect(page).toHaveURL(/.*\/listen/)

    // Should show listen content
    const heading = page.getByRole('heading', { name: /listen/i })
    await expect(heading).toBeVisible()
  })

  test('navigates from landing to watch page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'watch' }).click()

    // Wait for navigation
    await expect(page).toHaveURL(/.*\/watch/)

    // Should show watch content
    const heading = page.getByRole('heading', { name: /watch/i })
    await expect(heading).toBeVisible()
  })

  test('navigates from landing to connect page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'connect' }).click()

    // Wait for navigation
    await expect(page).toHaveURL(/.*\/connect/)

    // Should show connect content
    const heading = page.getByRole('heading', { name: /connect/i })
    await expect(heading).toBeVisible()
  })

  test('direct navigation to /listen works', async ({ page }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/listen/)

    const heading = page.getByRole('heading', { name: /listen/i })
    await expect(heading).toBeVisible()
  })

  test('direct navigation to /watch works', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/watch/)

    const heading = page.getByRole('heading', { name: /watch/i })
    await expect(heading).toBeVisible()
  })

  test('direct navigation to /connect works', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/connect/)

    const heading = page.getByRole('heading', { name: /connect/i })
    await expect(heading).toBeVisible()
  })

  test('back button navigation works from watch to landing', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('link', { name: 'watch' }).click()
    await expect(page).toHaveURL(/.*\/watch/)

    // Go back
    await page.goBack()

    // Should be back on landing
    await expect(page).toHaveURL('/')
    const heading = page.getByRole('heading', { name: /catsky\.club/i })
    await expect(heading).toBeVisible()
  })

  test('home link from watch page navigates to landing', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Click home link
    await page.getByRole('link', { name: /home/i }).click()

    // Should be on landing
    await expect(page).toHaveURL('/')
  })

  test('home link from connect page navigates to landing', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click home link
    await page.getByRole('link', { name: /home/i }).click()

    // Should be on landing
    await expect(page).toHaveURL('/')
  })

  test('home link from listen page navigates to landing', async ({ page }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Click home link
    await page.getByRole('link', { name: /home/i }).click()

    // Should be on landing
    await expect(page).toHaveURL('/')
  })

  test('forward button navigation works', async ({ page }) => {
    // Navigate: landing -> watch -> back -> forward
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'watch' }).click()
    await expect(page).toHaveURL(/.*\/watch/)

    await page.goBack()
    await expect(page).toHaveURL('/')

    await page.goForward()
    await expect(page).toHaveURL(/.*\/watch/)
  })

  test('multiple navigation steps work correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Landing -> Listen
    await page.getByRole('link', { name: 'listen' }).click()
    await expect(page).toHaveURL(/.*\/listen/)

    // Listen -> Home (via home link)
    await page.getByRole('link', { name: /home/i }).click()
    await expect(page).toHaveURL('/')

    // Landing -> Watch
    await page.getByRole('link', { name: 'watch' }).click()
    await expect(page).toHaveURL(/.*\/watch/)

    // Watch -> Connect (via get access button)
    await page.getByRole('link', { name: /get access/i }).click()
    await expect(page).toHaveURL(/.*\/connect/)
  })
})
