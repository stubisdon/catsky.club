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

    // Check navigation links are present (use testid to disambiguate from page content)
    await expect(page.getByTestId('top-nav-link-listen')).toBeVisible()
    await expect(page.getByTestId('top-nav-link-watch')).toBeVisible()
    await expect(page.getByTestId('top-nav-link-connect')).toBeVisible()
  })

  test('navigates from landing to listen page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('top-nav-link-listen').click()

    // Wait for navigation
    await expect(page).toHaveURL(/.*\/listen/)

    // Should show listen content
    const heading = page.getByRole('heading', { name: /listen/i })
    await expect(heading).toBeVisible()
  })

  test('navigates from landing to watch page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('top-nav-link-watch').click()

    // Wait for navigation
    await expect(page).toHaveURL(/.*\/watch/)

    // Should show watch content
    const heading = page.getByRole('heading', { name: /watch/i })
    await expect(heading).toBeVisible()
  })

  test('navigates from landing to connect page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('top-nav-link-connect').click()

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
    await page.getByTestId('top-nav-link-watch').click()
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

    // Click home link (top nav wordmark)
    await page.getByTestId('top-nav-wordmark').click()

    // Should be on landing
    await expect(page).toHaveURL('/')
  })

  test('home link from connect page navigates to landing', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click home link (top nav wordmark)
    await page.getByTestId('top-nav-wordmark').click()

    // Should be on landing
    await expect(page).toHaveURL('/')
  })

  test('home link from listen page navigates to landing', async ({ page }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Click home link (top nav wordmark)
    await page.getByTestId('top-nav-wordmark').click()

    // Should be on landing
    await expect(page).toHaveURL('/')
  })

  test('forward button navigation works', async ({ page }) => {
    // Navigate: landing -> watch -> back -> forward
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('top-nav-link-watch').click()
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
    await page.getByTestId('top-nav-link-listen').click()
    await expect(page).toHaveURL(/.*\/listen/)

    // Listen -> Home (via home link)
    await page.getByTestId('top-nav-wordmark').click()
    await expect(page).toHaveURL('/')

    // Landing -> Watch
    await page.getByTestId('top-nav-link-watch').click()
    await expect(page).toHaveURL(/.*\/watch/)

    // Watch -> Connect (via get access button)
    await page.getByRole('link', { name: /get access/i }).click()
    await expect(page).toHaveURL(/.*\/connect/)
  })

  test('top nav does not swallow clicks in empty space (regression for pointer-events bug)', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Test that clicks in the top strip away from nav links hit page content, not nav
    const element = await page.evaluate(() => {
      // Get element at y=27 (middle of the top nav, ~55px tall) in an empty area away from links
      return (document.elementFromPoint(200, 27) as Element).tagName
    })

    // Should return BODY or the page's main element, not a nav container
    expect(element).not.toBe('DIV') // DIV would indicate a .top-nav-* element
  })

  test.describe('(regression) mobile: hamburger toggle is legible against the page background', () => {
    test.use({ colorScheme: 'light' })

    test('light theme', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/watch')
      await page.waitForLoadState('networkidle')

      const toggle = page.getByTestId('top-nav-toggle')
      await expect(toggle).toBeVisible()

      // Verify toggle's color matches the page's text color and differs from background
      const { color, bodyColor, bg } = await toggle.evaluate((el) => ({
        color: window.getComputedStyle(el).color,
        bodyColor: window.getComputedStyle(document.body).color,
        bg: window.getComputedStyle(document.body).backgroundColor,
      }))
      expect(color).toBe(bodyColor)   // inherits the theme's text color
      expect(color).not.toBe(bg)      // therefore not invisible against background
    })
  })

  test.describe('(regression) mobile: hamburger toggle is legible against the page background', () => {
    test.use({ colorScheme: 'dark' })

    test('dark theme', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/watch')
      await page.waitForLoadState('networkidle')

      const toggle = page.getByTestId('top-nav-toggle')
      await expect(toggle).toBeVisible()

      // Verify toggle's color matches the page's text color and differs from background
      const { color, bodyColor, bg } = await toggle.evaluate((el) => ({
        color: window.getComputedStyle(el).color,
        bodyColor: window.getComputedStyle(document.body).color,
        bg: window.getComputedStyle(document.body).backgroundColor,
      }))
      expect(color).toBe(bodyColor)   // inherits the theme's text color
      expect(color).not.toBe(bg)      // therefore not invisible against background
    })
  })

  test.describe('(regression) mobile: overlay close button is legible against the page background', () => {
    test.use({ colorScheme: 'light' })

    test('light theme', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/watch')
      await page.waitForLoadState('networkidle')

      // Open mobile menu
      await page.getByTestId('top-nav-toggle').click()
      await expect(page.getByTestId('top-nav-overlay')).toBeVisible()

      const closeButton = page.getByTestId('top-nav-overlay-close')
      await expect(closeButton).toBeVisible()

      // Verify close button's color matches the page's text color and differs from background
      const { color, bodyColor, bg } = await closeButton.evaluate((el) => ({
        color: window.getComputedStyle(el).color,
        bodyColor: window.getComputedStyle(document.body).color,
        bg: window.getComputedStyle(document.body).backgroundColor,
      }))
      expect(color).toBe(bodyColor)   // inherits the theme's text color
      expect(color).not.toBe(bg)      // therefore not invisible against background
    })
  })

  test.describe('(regression) mobile: overlay close button is legible against the page background', () => {
    test.use({ colorScheme: 'dark' })

    test('dark theme', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/watch')
      await page.waitForLoadState('networkidle')

      // Open mobile menu
      await page.getByTestId('top-nav-toggle').click()
      await expect(page.getByTestId('top-nav-overlay')).toBeVisible()

      const closeButton = page.getByTestId('top-nav-overlay-close')
      await expect(closeButton).toBeVisible()

      // Verify close button's color matches the page's text color and differs from background
      const { color, bodyColor, bg } = await closeButton.evaluate((el) => ({
        color: window.getComputedStyle(el).color,
        bodyColor: window.getComputedStyle(document.body).color,
        bg: window.getComputedStyle(document.body).backgroundColor,
      }))
      expect(color).toBe(bodyColor)   // inherits the theme's text color
      expect(color).not.toBe(bg)      // therefore not invisible against background
    })
  })

  test('(regression) mobile: desktop connect link is hidden at 390px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    const connectLink = page.getByTestId('top-nav-link-connect')
    await expect(connectLink).toBeHidden()
  })
})
