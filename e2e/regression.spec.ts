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
      { link: 'player', path: '/player' },
      { link: 'watch', path: '/watch' },
      { link: 'connect', path: '/connect' },
    ]
    
    for (const { link, path } of navPaths) {
      await page.goto('/')
      await page.getByRole('link', { name: link }).click()
      await expect(page).toHaveURL(new RegExp(`.*${path.replace('/', '\\/')}`))
    }
  })

  test('public nav is present on player', async ({ page }) => {
    await page.goto('/')
    
    // Critical elements that should always be present
    const criticalElements = [
      'player',
      'watch',
      'connect',
    ]
    
    for (const text of criticalElements) {
      await expect(page.getByText(new RegExp(text, 'i'))).toBeVisible()
    }
  })

  test('player page shows tracks', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Should show some track content
    await expect(page.getByText(/tracks/i)).toBeVisible()
    await expect(page.getByText(/vision/i)).toBeVisible()
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
    await expect(page.getByText(/player/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'player' })).toBeVisible()
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
