import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('home page loads and displays main content', async ({ page }) => {
    await page.goto('/')
    
    // Check main heading
    await expect(page.getByText('catsky.club')).toBeVisible()
    
    // Check tagline
    await expect(page.getByText(/in the world of data/i)).toBeVisible()
    
    // Check navigation links are present
    await expect(page.getByRole('link', { name: 'listen' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'watch' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'connect' })).toBeVisible()
  })

  test('navigates to listen page', async ({ page }) => {
    await page.goto('/')
    
    // Click listen link
    await page.getByRole('link', { name: 'listen' }).click()
    
    // Wait for navigation
    await expect(page).toHaveURL(/.*\/listen/)
    
    // Check listen page content
    await expect(page.getByText(/listen/i)).toBeVisible()
  })

  test('navigates to watch page', async ({ page }) => {
    await page.goto('/')
    
    // Click watch link
    await page.getByRole('link', { name: 'watch' }).click()
    
    // Wait for navigation
    await expect(page).toHaveURL(/.*\/watch/)
  })

  test('navigates to connect page', async ({ page }) => {
    await page.goto('/')
    
    // Click connect link (which navigates to /connect)
    await page.getByRole('link', { name: 'connect' }).click()
    
    // Wait for navigation
    await expect(page).toHaveURL(/.*\/connect/)
  })

  test('direct navigation to /listen works', async ({ page }) => {
    await page.goto('/listen')
    
    await expect(page).toHaveURL(/.*\/listen/)
    await expect(page.getByText(/listen/i)).toBeVisible()
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
    await page.goto('/')
    await page.getByRole('link', { name: 'listen' }).click()
    await expect(page).toHaveURL(/.*\/listen/)
    
    // Go back
    await page.goBack()
    
    // Should be back on home page
    await expect(page).toHaveURL(/.*\/$|.*\/$/)
    await expect(page.getByText('catsky.club')).toBeVisible()
  })
})
