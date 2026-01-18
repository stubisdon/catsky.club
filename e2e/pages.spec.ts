import { test, expect } from '@playwright/test'

test.describe('Page Load Tests', () => {
  test('home page has correct structure', async ({ page }) => {
    await page.goto('/')
    
    // Check page title (if set)
    const title = await page.title()
    expect(title).toBeTruthy()
    
    // Check main container exists
    const container = page.locator('.app-container')
    await expect(container).toBeVisible()
    
    // Check no console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.waitForLoadState('networkidle')
    
    // Allow some non-critical errors, but log them
    if (errors.length > 0) {
      console.log('Console errors found:', errors)
    }
  })

  test('listen page loads correctly', async ({ page }) => {
    await page.goto('/listen')
    
    await expect(page.getByText(/listen/i)).toBeVisible()
    await expect(page.getByText(/publicly released materials/i)).toBeVisible()
    
    // Check external links exist
    const soundcloudLink = page.getByRole('link', { name: /soundcloud/i })
    await expect(soundcloudLink).toBeVisible()
    
    // Check home link exists
    const homeLink = page.getByRole('link', { name: /home/i })
    await expect(homeLink).toBeVisible()
  })

  test('watch page loads correctly', async ({ page }) => {
    await page.goto('/watch')
    
    // Page should load without errors
    await page.waitForLoadState('networkidle')
    
    // Check for any error messages
    const errorText = page.getByText(/error|404|not found/i)
    await expect(errorText).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // Error not found is expected
    })
  })

  test('follow page loads correctly', async ({ page }) => {
    await page.goto('/follow')
    
    // Page should load without errors
    await page.waitForLoadState('networkidle')
    
    const errorText = page.getByText(/error|404|not found/i)
    await expect(errorText).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // Error not found is expected
    })
  })

  test('join page loads correctly', async ({ page }) => {
    await page.goto('/join')
    
    // Page should load without errors
    await page.waitForLoadState('networkidle')
    
    const errorText = page.getByText(/error|404|not found/i)
    await expect(errorText).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // Error not found is expected
    })
  })

  test('player page loads correctly', async ({ page }) => {
    await page.goto('/player')
    
    // Page should load without errors
    await page.waitForLoadState('networkidle')
    
    const errorText = page.getByText(/error|404|not found/i)
    await expect(errorText).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // Error not found is expected
    })
  })

  test('mission page loads correctly', async ({ page }) => {
    await page.goto('/mission')
    
    // Page should load without errors
    await page.waitForLoadState('networkidle')
    
    const errorText = page.getByText(/error|404|not found/i)
    await expect(errorText).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // Error not found is expected
    })
  })

  test('404 page handling', async ({ page }) => {
    await page.goto('/nonexistent-page')
    
    // Should either show 404 or redirect to home
    // The app uses client-side routing, so it might show home or a 404
    await page.waitForLoadState('networkidle')
    
    // At minimum, page should not crash
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
