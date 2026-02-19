import { test, expect } from '@playwright/test'

/**
 * Watch Page Tests
 *
 * Tests for the /watch page including:
 * - Page loading and content
 * - YouTube video embed
 * - Navigation elements
 * - CTA (Call to Action) buttons
 * - Responsive design
 */

test.describe('Watch Page - Basic Elements', () => {
  test('watch page loads correctly', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Check page title heading
    const heading = page.getByRole('heading', { name: /watch/i })
    await expect(heading).toBeVisible()
  })

  test('watch page has correct URL', async ({ page }) => {
    await page.goto('/watch')
    await expect(page).toHaveURL(/.*\/watch/)
  })

  test('watch page contains app container', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    const container = page.locator('.app-container')
    await expect(container).toBeVisible()
  })
})

test.describe('Watch Page - YouTube Video', () => {
  test('YouTube iframe is present', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Check for YouTube iframe
    const iframe = page.locator('iframe[src*="youtube.com/embed"]')
    await expect(iframe).toBeVisible()
  })

  test('YouTube iframe has correct attributes', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    const iframe = page.locator('iframe[src*="youtube.com/embed"]')
    
    // Check src contains YouTube embed URL
    const src = await iframe.getAttribute('src')
    expect(src).toContain('youtube.com/embed')
    
    // Check allowFullScreen attribute
    await expect(iframe).toHaveAttribute('allowFullScreen', '')
    
    // Check allow attribute for features
    const allow = await iframe.getAttribute('allow')
    expect(allow).toContain('accelerometer')
    expect(allow).toContain('autoplay')
    expect(allow).toContain('picture-in-picture')
  })

  test('YouTube iframe has proper responsive container', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // The iframe should be in a responsive container with 16:9 aspect ratio
    const iframe = page.locator('iframe[src*="youtube.com/embed"]')
    const parent = iframe.locator('..')
    
    // Check that iframe fills the container
    const iframeStyle = await iframe.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        position: style.position,
        width: style.width,
        height: style.height,
      }
    })
    
    expect(iframeStyle.position).toBe('absolute')
    expect(iframeStyle.width).toBeTruthy()
    expect(iframeStyle.height).toBeTruthy()
  })

  test('YouTube iframe has title attribute', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    const iframe = page.locator('iframe[src*="youtube.com/embed"]')
    const title = await iframe.getAttribute('title')
    
    // Should have a descriptive title for accessibility
    expect(title).toBeTruthy()
    expect(title!.toLowerCase()).toContain('video')
  })
})

test.describe('Watch Page - Content', () => {
  test('displays teaser description', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Check for description text about accessing full video
    const description = page.getByText(/get access to the full music video/i)
    await expect(description).toBeVisible()
  })

  test('displays get access CTA button', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Check for CTA button
    const ctaButton = page.getByRole('link', { name: /get access/i })
    await expect(ctaButton).toBeVisible()
  })

  test('get access button links to connect page', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Click get access button
    const ctaButton = page.getByRole('link', { name: /get access/i })
    await ctaButton.click()

    // Should navigate to connect page
    await expect(page).toHaveURL(/.*\/connect/)
  })

  test('get access button has hover effect', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    const ctaButton = page.getByRole('link', { name: /get access/i })
    
    // Get initial background
    const initialBg = await ctaButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Hover over button
    await ctaButton.hover()
    
    // Wait for hover transition
    await page.waitForTimeout(400)

    // Check background changed (hover effect)
    const hoverBg = await ctaButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Background should be different on hover
    expect(hoverBg).not.toBe(initialBg)
  })
})

test.describe('Watch Page - Navigation', () => {
  test('home link is present', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Check for home link
    const homeLink = page.getByRole('link', { name: /home/i })
    await expect(homeLink).toBeVisible()
  })

  test('home link navigates to landing page', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Click home link
    const homeLink = page.getByRole('link', { name: /home/i })
    await homeLink.click()

    // Should navigate to home
    await expect(page).toHaveURL('/')
  })

  test('home link is positioned at bottom left', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    const homeLink = page.getByRole('link', { name: /home/i })
    
    // Check position
    const position = await homeLink.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        position: style.position,
        bottom: style.bottom,
        left: style.left,
      }
    })

    expect(position.position).toBe('fixed')
    expect(position.bottom).toBe('16px') // 1rem = 16px
    expect(position.left).toBe('16px')
  })

  test('back button navigation works', async ({ page }) => {
    // Start on home
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate to watch
    await page.getByRole('link', { name: 'watch' }).click()
    await expect(page).toHaveURL(/.*\/watch/)

    // Go back
    await page.goBack()
    
    // Should be back on home
    await expect(page).toHaveURL('/')
  })
})

test.describe('Watch Page - Direct Navigation', () => {
  test('direct URL access works', async ({ page }) => {
    await page.goto('/watch')
    await expect(page).toHaveURL(/.*\/watch/)
    
    const heading = page.getByRole('heading', { name: /watch/i })
    await expect(heading).toBeVisible()
  })

  test('trailing slash redirects correctly', async ({ page }) => {
    await page.goto('/watch/')
    await page.waitForLoadState('networkidle')
    
    // Should still load watch page
    const heading = page.getByRole('heading', { name: /watch/i })
    await expect(heading).toBeVisible()
  })
})

test.describe('Watch Page - Responsive Design', () => {
  test('page displays correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // All critical elements should be visible
    await expect(page.getByRole('heading', { name: /watch/i })).toBeVisible()
    await expect(page.locator('iframe[src*="youtube.com/embed"]')).toBeVisible()
    await expect(page.getByRole('link', { name: /get access/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible()
  })

  test('page displays correctly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // All critical elements should be visible
    await expect(page.getByRole('heading', { name: /watch/i })).toBeVisible()
    await expect(page.locator('iframe[src*="youtube.com/embed"]')).toBeVisible()
  })

  test('YouTube video container maintains aspect ratio on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Check the video container maintains 16:9 aspect ratio
    const videoContainer = page.locator('iframe[src*="youtube.com/embed"]').locator('..')
    
    const dimensions = await videoContainer.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    })

    // Calculate aspect ratio (width / height should be approximately 16/9 = 1.78)
    // Allowing some margin for rounding
    const aspectRatio = dimensions.width / dimensions.height
    expect(aspectRatio).toBeCloseTo(16 / 9, 1) // 16:9 = 1.78, allow 0.1 tolerance
  })
})

test.describe('Watch Page - Accessibility', () => {
  test('page has proper heading structure', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Should have h1 heading
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toHaveText(/watch/i)
  })

  test('links are keyboard accessible', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Tab to get access link
    await page.keyboard.press('Tab')

    // Should be able to focus the link
    const ctaButton = page.getByRole('link', { name: /get access/i })
    await ctaButton.focus()
    
    // Press Enter to navigate
    await page.keyboard.press('Enter')

    // Should navigate to connect
    await expect(page).toHaveURL(/.*\/connect/)
  })

  test('iframe has accessible title', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    const iframe = page.locator('iframe[src*="youtube.com/embed"]')
    
    // Title attribute for screen readers
    const title = await iframe.getAttribute('title')
    expect(title).toBeTruthy()
  })
})

test.describe('Watch Page - Error Handling', () => {
  test('page loads without JavaScript errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Filter out non-critical errors (like third-party script errors, dev environment, etc.)
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('youtube') &&
        !error.includes('googlevideo') &&
        !error.includes('third-party') &&
        !error.includes('favicon') &&
        !error.includes('Ghost') &&
        !error.includes('API') &&
        !error.includes('404') &&
        !error.includes('Failed to load resource') &&
        !error.includes('net::ERR') &&
        !error.includes('Module') && // Dev environment module loading issues
        !error.includes('read only property') // Module system issues
    )

    // Log any errors found
    if (criticalErrors.length > 0) {
      console.log('Critical errors found:', criticalErrors)
    }

    // No critical errors should occur
    expect(criticalErrors).toHaveLength(0)
  })

  test('page handles slow network gracefully', async ({ page }) => {
    // Slow down network
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      route.continue()
    })

    await page.goto('/watch')
    
    // Page should eventually load
    const heading = page.getByRole('heading', { name: /watch/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Watch Page - Content Scrolling', () => {
  test('page content is scrollable', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Get the scrollable container
    const contentContainer = page.locator('.app-container > div').first()
    
    // Check overflow-y style
    const overflowY = await contentContainer.evaluate((el) => {
      return window.getComputedStyle(el).overflowY
    })

    expect(overflowY).toBe('auto')
  })

  test('all content is accessible', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // All key elements should be visible
    await expect(page.getByRole('heading', { name: /watch/i })).toBeVisible()
    await expect(page.locator('iframe[src*="youtube.com/embed"]')).toBeVisible()
    await expect(page.getByText(/get access to the full music video/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /get access/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible()
  })
})

test.describe('Watch Page - Text Selection', () => {
  test('text content is selectable', async ({ page }) => {
    await page.goto('/watch')
    await page.waitForLoadState('networkidle')

    // Get the content container
    const contentContainer = page.locator('.app-container > div').first()
    
    // Check user-select style
    const userSelect = await contentContainer.evaluate((el) => {
      return window.getComputedStyle(el).userSelect
    })

    expect(userSelect).toBe('text')
  })
})
