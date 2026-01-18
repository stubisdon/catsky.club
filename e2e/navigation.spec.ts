import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('player page loads and displays public nav', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/player/)

    // Check navigation links are present
    await expect(page.getByRole('link', { name: 'player' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'watch' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'connect' })).toBeVisible()
  })

  test('navigates to watch page', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'watch' }).click()
    
    // Wait for navigation
    await expect(page).toHaveURL(/.*\/watch/)
  })

  test('navigates to connect page', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'connect' }).click()
    
    // Wait for navigation
    await expect(page).toHaveURL(/.*\/connect/)
  })

  test('direct navigation to /listen redirects to /player', async ({ page }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/player/)
    await expect(page.getByText(/player/i)).toBeVisible()
  })

  test('direct navigation to /player works', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/player/)
  })

  test('direct navigation to /watch works', async ({ page }) => {
    await page.goto('/watch')
    
    await expect(page).toHaveURL(/.*\/watch/)
  })

  test('direct navigation to /connect works', async ({ page }) => {
    await page.goto('/connect')
    
    await expect(page).toHaveURL(/.*\/connect/)
  })

  test('back button navigation works', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')
    await page.getByRole('link', { name: 'watch' }).click()
    await expect(page).toHaveURL(/.*\/watch/)
    
    // Go back
    await page.goBack()
    
    // Should be back on player
    await expect(page).toHaveURL(/.*\/player/)
    await expect(page.getByText(/player/i)).toBeVisible()
  })
})
