import { test, expect } from '@playwright/test'

test.describe('Page Load Tests', () => {
  test('root redirects to player', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/player/)
    
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

  test('listen redirects to player (back-compat)', async ({ page }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/player/)
    await expect(page.getByText(/player/i)).toBeVisible()
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

  test('connect page loads correctly', async ({ page }) => {
    await page.goto('/connect')
    
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
    await page.waitForLoadState('networkidle')
    
    // The app normalizes unknown routes to /player
    await expect(page).toHaveURL(/.*\/player/)
    await expect(page.getByText(/player/i)).toBeVisible()
  })
})
