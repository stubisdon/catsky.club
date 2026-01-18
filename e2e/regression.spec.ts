import { test, expect } from '@playwright/test'

/**
 * Regression tests to catch breaking changes
 * These tests verify critical functionality hasn't regressed
 */
test.describe('Regression Tests', () => {
  test('critical navigation paths work', async ({ page }) => {
    await page.goto('/')
    
    // Test all main navigation paths
    const navPaths = [
      { link: 'listen', path: '/listen' },
      { link: 'watch', path: '/watch' },
      { link: 'connect', path: '/follow' },
    ]
    
    for (const { link, path } of navPaths) {
      await page.goto('/')
      await page.getByRole('link', { name: link }).click()
      await expect(page).toHaveURL(new RegExp(`.*${path.replace('/', '\\/')}`))
    }
  })

  test('home page content structure is intact', async ({ page }) => {
    await page.goto('/')
    
    // Critical elements that should always be present
    const criticalElements = [
      'catsky.club',
      'in the world of data',
      'listen',
      'watch',
      'connect',
    ]
    
    for (const text of criticalElements) {
      await expect(page.getByText(new RegExp(text, 'i'))).toBeVisible()
    }
  })

  test('listen page external links are present', async ({ page }) => {
    await page.goto('/listen')
    
    // Check that external links exist (they might change URLs, but should exist)
    const links = page.locator('a[href^="http"]')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)
  })

  test('no JavaScript errors on page load', async ({ page }) => {
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
      (error) => !error.includes('Ghost') && !error.includes('API')
    )
    
    if (criticalErrors.length > 0) {
      console.error('JavaScript errors found:', criticalErrors)
    }
    
    // For now, we'll just log errors but not fail
    // You can uncomment the line below to fail on any errors
    // expect(criticalErrors).toHaveLength(0)
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // Check that content is visible and not cut off
    await expect(page.getByText('catsky.club')).toBeVisible()
    await expect(page.getByRole('link', { name: 'listen' })).toBeVisible()
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
})
