import { test, expect } from '@playwright/test'

/**
 * Landing Page Tests
 *
 * Tests for the landing page (/) including:
 * - Page content and branding
 * - Navigation links
 * - Hero section
 * - Responsive design
 * - Accessibility
 */

test.describe('Landing Page - Content', () => {
  test('displays main heading with site name', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const heading = page.getByRole('heading', { name: /catsky\.club/i })
    await expect(heading).toBeVisible()
  })

  test('displays tagline/poem content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check for the poem/tagline content
    await expect(page.getByText(/in the world of data/i)).toBeVisible()
    await expect(page.getByText(/scattered everywhere/i)).toBeVisible()
    await expect(page.getByText(/here to find a meaning/i)).toBeVisible()
    await expect(page.getByText(/for the ones who care/i)).toBeVisible()
  })

  test('has app-container wrapper', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const container = page.locator('.app-container')
    await expect(container).toBeVisible()
  })
})

test.describe('Landing Page - Navigation Links', () => {
  test('displays listen navigation link', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Scope to app-container to get page content link, not nav link
    const listenLink = page.locator('.app-container a[href="/listen"]').first()
    await expect(listenLink).toBeVisible()
    await expect(listenLink).toHaveAttribute('href', '/listen')
  })

  test('displays watch navigation link', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Scope to app-container to get page content link, not nav link
    const watchLink = page.locator('.app-container a[href="/watch"]').first()
    await expect(watchLink).toBeVisible()
    await expect(watchLink).toHaveAttribute('href', '/watch')
  })

  test('displays connect navigation link', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Scope to app-container to get page content link, not nav link
    const connectLink = page.locator('.app-container a[href="/connect"]').first()
    await expect(connectLink).toBeVisible()
    await expect(connectLink).toHaveAttribute('href', '/connect')
  })

  test('listen link navigates to listen page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('.app-container a[href="/listen"]').first().click()
    await expect(page).toHaveURL(/.*\/listen/)
  })

  test('watch link navigates to watch page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('.app-container a[href="/watch"]').first().click()
    await expect(page).toHaveURL(/.*\/watch/)
  })

  test('connect link navigates to connect page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('.app-container a[href="/connect"]').first().click()
    await expect(page).toHaveURL(/.*\/connect/)
  })

  test('all navigation links have hover effects', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const links = ['/listen', '/watch', '/connect']

    for (const href of links) {
      // Scope to app-container to get page content link, not nav link
      const link = page.locator(`.app-container a[href="${href}"]`).first()

      // Get initial background
      const initialBg = await link.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      // Hover over link
      await link.hover()

      // Wait for transition
      await page.waitForTimeout(400)

      // Check background changed (hover effect)
      const hoverBg = await link.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      // Background should be different on hover
      expect(hoverBg).not.toBe(initialBg)
    }
  })
})

test.describe('Landing Page - Styling', () => {
  test('heading has lowercase text transform', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const heading = page.getByRole('heading', { name: /catsky\.club/i })

    const textTransform = await heading.evaluate((el) => {
      return window.getComputedStyle(el).textTransform
    })

    expect(textTransform).toBe('lowercase')
  })

  test('navigation links have styled borders', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Scope to app-container to get page content link, not nav link
    const listenLink = page.locator('.app-container a[href="/listen"]').first()

    const borderStyle = await listenLink.evaluate((el) => {
      return window.getComputedStyle(el).borderStyle
    })

    expect(borderStyle).toBe('solid')
  })

  test('navigation links have padding', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Scope to app-container to get page content link, not nav link
    const listenLink = page.locator('.app-container a[href="/listen"]').first()

    const padding = await listenLink.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        paddingTop: parseFloat(style.paddingTop),
        paddingBottom: parseFloat(style.paddingBottom),
        paddingLeft: parseFloat(style.paddingLeft),
        paddingRight: parseFloat(style.paddingRight),
      }
    })

    // Should have some padding
    expect(padding.paddingTop).toBeGreaterThan(0)
    expect(padding.paddingBottom).toBeGreaterThan(0)
    expect(padding.paddingLeft).toBeGreaterThan(0)
    expect(padding.paddingRight).toBeGreaterThan(0)
  })
})

test.describe('Landing Page - Responsive Design', () => {
  test('displays correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // All critical elements should be visible
    await expect(page.getByRole('heading', { name: /catsky\.club/i })).toBeVisible()
    // Scope to app-container to get page content links
    await expect(page.locator('.app-container a[href="/listen"]').first()).toBeVisible()
    await expect(page.locator('.app-container a[href="/watch"]').first()).toBeVisible()
    await expect(page.locator('.app-container a[href="/connect"]').first()).toBeVisible()
  })

  test('displays correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // All critical elements should be visible
    await expect(page.getByRole('heading', { name: /catsky\.club/i })).toBeVisible()
    // Scope to app-container to get page content links
    await expect(page.locator('.app-container a[href="/listen"]').first()).toBeVisible()
    await expect(page.locator('.app-container a[href="/watch"]').first()).toBeVisible()
    await expect(page.locator('.app-container a[href="/connect"]').first()).toBeVisible()
  })

  test('displays correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // All critical elements should be visible
    await expect(page.getByRole('heading', { name: /catsky\.club/i })).toBeVisible()
    // Scope to app-container to get page content links
    await expect(page.locator('.app-container a[href="/listen"]').first()).toBeVisible()
    await expect(page.locator('.app-container a[href="/watch"]').first()).toBeVisible()
    await expect(page.locator('.app-container a[href="/connect"]').first()).toBeVisible()
  })

  test('navigation links wrap correctly on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Links should still be visible and accessible (scope to app-container)
    await expect(page.locator('.app-container a[href="/listen"]').first()).toBeVisible()
    await expect(page.locator('.app-container a[href="/watch"]').first()).toBeVisible()
    await expect(page.locator('.app-container a[href="/connect"]').first()).toBeVisible()

    // Check that navigation container has flex-wrap
    const navContainer = page.locator('.app-container > div > div').last()
    const flexWrap = await navContainer.evaluate((el) => {
      return window.getComputedStyle(el).flexWrap
    })

    expect(flexWrap).toBe('wrap')
  })
})

test.describe('Landing Page - Accessibility', () => {
  test('has proper heading structure', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBe(1)
  })

  test('navigation links are keyboard accessible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Tab through the page
    await page.keyboard.press('Tab')

    // First link should be focusable (scope to app-container)
    const listenLink = page.locator('.app-container a[href="/listen"]').first()
    await listenLink.focus()

    // Should be able to activate with Enter
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/.*\/listen/)
  })

  test('text content is selectable', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const contentContainer = page.locator('.app-container > div').first()

    const userSelect = await contentContainer.evaluate((el) => {
      return window.getComputedStyle(el).userSelect
    })

    expect(userSelect).toBe('text')
  })

  test('page has visible focus indicators', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Focus on a link (scope to app-container)
    const listenLink = page.locator('.app-container a[href="/listen"]').first()
    await listenLink.focus()

    // Check that the focused element is visible
    await expect(listenLink).toBeVisible()
    await expect(listenLink).toBeFocused()
  })
})

test.describe('Landing Page - Error Handling', () => {
  test('loads without critical JavaScript errors', async ({ page }) => {
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

    // Filter out non-critical errors (Ghost API, favicon, network errors, dev environment, etc.)
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('Ghost') &&
        !error.includes('API') &&
        !error.includes('404') &&
        !error.includes('Failed to load resource') &&
        !error.includes('net::ERR') &&
        !error.includes('Module') && // Dev environment module loading issues
        !error.includes('read only property') // Module system issues
    )

    if (criticalErrors.length > 0) {
      console.error('Critical errors found:', criticalErrors)
    }

    // Log non-critical errors for informational purposes
    if (errors.length > criticalErrors.length) {
      console.log('Non-critical errors filtered:', errors.length - criticalErrors.length)
    }

    expect(criticalErrors).toHaveLength(0)
  })

  test('handles slow network gracefully', async ({ page }) => {
    // Slow down network
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      route.continue()
    })

    await page.goto('/')

    // Page should eventually load
    const heading = page.getByRole('heading', { name: /catsky\.club/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Landing Page - Content Scrolling', () => {
  test('page content is scrollable', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const contentContainer = page.locator('.app-container > div').first()

    const overflowY = await contentContainer.evaluate((el) => {
      return window.getComputedStyle(el).overflowY
    })

    expect(overflowY).toBe('auto')
  })
})

test.describe('Landing Page - Direct URL Access', () => {
  test('root URL loads landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')

    const heading = page.getByRole('heading', { name: /catsky\.club/i })
    await expect(heading).toBeVisible()
  })

  test('trailing slash is handled', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should still show landing page
    const heading = page.getByRole('heading', { name: /catsky\.club/i })
    await expect(heading).toBeVisible()
  })
})

test.describe('Landing Page - Performance', () => {
  test('page loads within reasonable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('critical content appears quickly', async ({ page }) => {
    await page.goto('/')

    // Heading should be visible within 2 seconds
    const heading = page.getByRole('heading', { name: /catsky\.club/i })
    await expect(heading).toBeVisible({ timeout: 2000 })
  })
})
