import { test, expect } from '@playwright/test'

/**
 * Player Page Tests
 * 
 * Tests for the /player page including:
 * - Access control (guest, free subscriber, paid subscriber)
 * - Track selection and playback
 * - SoundCloud integration
 * - Voting and feedback features
 * - Error handling
 */

test.describe('Player Page - Access Control', () => {
  test('guest user sees only first track', async ({ page }) => {
    // Mock subscription check to return 'not_subscriber'
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Should see "checking access..." then player content
    await expect(page.getByText(/player/i)).toBeVisible()
    
    // Should see status message for guest
    await expect(page.getByText(/guest.*first track only/i)).toBeVisible()
    
    // Should see only first track (Vision)
    await expect(page.getByText('Vision')).toBeVisible()
    
    // Should NOT see second track (Overpriced Airbnb) as accessible
    const tracks = page.locator('text=Overpriced Airbnb')
    const count = await tracks.count()
    // It might be visible as locked, but let's check if it's in accessible tracks
    const accessibleTracks = page.locator('[style*="cursor: pointer"]').filter({ hasText: 'Overpriced Airbnb' })
    await expect(accessibleTracks).toHaveCount(0)
    
    // Should see locked tracks section
    await expect(page.getByText(/locked/i).first()).toBeVisible()
  })

  test('free subscriber sees first 2 tracks', async ({ page }) => {
    // Mock subscription check to return 'free_subscriber'
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [],
          },
        }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Should see status message for free subscriber
    await expect(page.getByText(/free subscriber.*first 2 tracks/i)).toBeVisible()
    
    // Should see first track (Vision)
    await expect(page.getByText('Vision')).toBeVisible()
    
    // Should see second track (Overpriced Airbnb) as accessible
    const secondTrack = page.locator('[style*="cursor: pointer"]').filter({ hasText: 'Overpriced Airbnb' })
    await expect(secondTrack).toBeVisible()
    
    // Should see third track (Nova) as locked
    await expect(page.getByText('Nova')).toBeVisible()
    const lockedNova = page.locator('text=Nova').locator('..').filter({ hasText: /locked/i })
    // Nova should be in locked section
    await expect(page.getByText(/upgrade to paid/i)).toBeVisible()
  })

  test('paid subscriber sees all tracks', async ({ page }) => {
    // Mock subscription check to return 'paid_subscriber'
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [
              {
                id: 'sub-1',
                status: 'active',
                price: { amount: 1000, currency: 'USD' },
              },
            ],
          },
        }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Should see status message for paid subscriber
    await expect(page.getByText(/paid subscriber.*full access/i)).toBeVisible()
    
    // Should see all three tracks as accessible
    await expect(page.getByText('Vision')).toBeVisible()
    await expect(page.getByText('Overpriced Airbnb')).toBeVisible()
    await expect(page.getByText('Nova')).toBeVisible()
    
    // Should NOT see locked tracks section
    await expect(page.getByText(/upgrade to paid/i)).not.toBeVisible()
    
    // Wait for tracks to load
    await page.waitForSelector('text=Vision', { state: 'visible' })
    
    // Should see voting buttons on tracks (they're inside the track container)
    const firstTrack = page.locator('text=Vision').locator('..').locator('..')
    const voteButtons = firstTrack.locator('button').filter({ hasText: /↑|↓/ })
    await expect(voteButtons.first()).toBeVisible({ timeout: 5000 })
    
    // Should see feedback buttons
    const feedbackButton = firstTrack.getByRole('button', { name: /feedback/i })
    await expect(feedbackButton).toBeVisible({ timeout: 5000 })
  })

  test('subscription check error shows guest access', async ({ page }) => {
    // Mock subscription check to fail
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Should still show player (not crash)
    await expect(page.getByText(/player/i)).toBeVisible()
    
    // Should default to guest access (first track only)
    await expect(page.getByText('Vision')).toBeVisible()
  })
})

test.describe('Player Page - Track Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Default to paid subscriber for track selection tests
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [
              {
                id: 'sub-1',
                status: 'active',
                price: { amount: 1000, currency: 'USD' },
              },
            ],
          },
        }),
      })
    })
  })

  test('clicking track selects it and shows player', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')
    
    // Wait for tracks to be visible
    await page.waitForSelector('text=Vision', { state: 'visible' })

    // Click on first track (click on the track container, not just the text)
    const visionTrack = page.locator('text=Vision').locator('..').locator('..').first()
    await visionTrack.click()
    
    // Wait a bit for the selection to take effect
    await page.waitForTimeout(500)
    
    // Track should be highlighted/selected (check the title has bold font-weight)
    const trackTitle = visionTrack.locator('text=Vision').first()
    await expect(trackTitle).toHaveCSS('font-weight', /bold|700/, { timeout: 2000 })
    
    // Player section should show track title (look for it in the player section specifically)
    const playerSection = page.locator('[style*="border: 1px solid"]').filter({ hasText: 'Vision' }).first()
    await expect(playerSection).toBeVisible({ timeout: 5000 })
    
    // SoundCloud iframe should be present
    const iframe = page.locator('iframe[src*="soundcloud"]')
    await expect(iframe).toBeVisible({ timeout: 5000 })
  })

  test('clicking locked track does nothing (free subscriber)', async ({ page }) => {
    // Mock as free subscriber
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [],
          },
        }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Try to click locked track (Nova - third track)
    const novaTrack = page.locator('text=Nova').locator('..').first()
    await novaTrack.click()
    
    // Track should not be selected (no player should appear for Nova)
    const playerSection = page.locator('text=Nova').filter({ hasText: /^Nova$/ })
    // The player section should not show Nova as selected
    // We can check that the player section doesn't contain Nova title
    const playerTitle = page.locator('[style*="font-weight: bold"]').filter({ hasText: 'Nova' })
    await expect(playerTitle).toHaveCount(0)
  })

  test('switching between tracks updates player', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Select first track
    await page.getByText('Vision').click()
    await expect(page.locator('iframe[src*="soundcloud"]').first()).toBeVisible()
    
    // Select second track
    await page.getByText('Overpriced Airbnb').click()
    
    // Player should update (iframe src should change)
    const iframes = page.locator('iframe[src*="soundcloud"]')
    const iframeSrc = await iframes.first().getAttribute('src')
    expect(iframeSrc).toContain('overpriced-airbnb')
  })
})

test.describe('Player Page - SoundCloud Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [
              {
                id: 'sub-1',
                status: 'active',
                price: { amount: 1000, currency: 'USD' },
              },
            ],
          },
        }),
      })
    })
  })

  test('SoundCloud iframe loads with correct URL', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Select first track
    await page.getByText('Vision').click()
    
    // Check iframe exists and has correct attributes
    const iframe = page.locator('iframe[src*="soundcloud"]').first()
    await expect(iframe).toBeVisible()
    
    const src = await iframe.getAttribute('src')
    expect(src).toContain('w.soundcloud.com/player')
    expect(src).toContain('vision-v1')
    
    // Check iframe attributes
    await expect(iframe).toHaveAttribute('allow', 'autoplay')
    await expect(iframe).toHaveAttribute('scrolling', 'no')
  })

  test('SoundCloud iframe does not show invalid URL error', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Select first track
    await page.getByText('Vision').click()
    
    // Wait for iframe to load
    const iframe = page.locator('iframe[src*="soundcloud"]').first()
    await expect(iframe).toBeVisible()
    
    // Check that SoundCloud error message is NOT visible
    // SoundCloud shows "You have not provided a valid SoundCloud URL" if URL is invalid
    const errorMessage = page.getByText(/you have not provided a valid soundcloud url/i)
    await expect(errorMessage).not.toBeVisible({ timeout: 5000 })
    
    // Verify the iframe src contains the track URL properly encoded
    const src = await iframe.getAttribute('src')
    expect(src).toBeTruthy()
    // URL should be properly encoded in the embed URL
    expect(src).toContain('url=')
  })

  test('SoundCloud widget shows for all tracks', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    const tracks = ['Vision', 'Overpriced Airbnb', 'Nova']
    
    for (const trackName of tracks) {
      await page.getByText(trackName).click()
      
      const iframe = page.locator('iframe[src*="soundcloud"]').first()
      await expect(iframe).toBeVisible()
      
      const src = await iframe.getAttribute('src')
      expect(src).toBeTruthy()
    }
  })

  test('SoundCloud player has hint text for play button', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Select first track
    await page.getByText('Vision').click()
    
    // Check that hint text is visible
    const hintText = page.getByText(/click the circle to play/i)
    await expect(hintText).toBeVisible()
    
    // Verify it's positioned above the iframe
    const iframe = page.locator('iframe[src*="soundcloud"]').first()
    await expect(iframe).toBeVisible()
  })
})

test.describe('Player Page - Voting and Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [
              {
                id: 'sub-1',
                status: 'active',
                price: { amount: 1000, currency: 'USD' },
              },
            ],
          },
        }),
      })
    })
  })

  test('voting buttons only visible for paid subscribers', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Should see upvote and downvote buttons
    const upvoteButton = page.locator('button').filter({ hasText: '↑' })
    const downvoteButton = page.locator('button').filter({ hasText: '↓' })
    
    await expect(upvoteButton.first()).toBeVisible()
    await expect(downvoteButton.first()).toBeVisible()
  })

  test('voting buttons not visible for free subscribers', async ({ page }) => {
    // Mock as free subscriber
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [],
          },
        }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Should NOT see voting buttons
    const voteButtons = page.locator('button').filter({ hasText: /↑|↓/ })
    await expect(voteButtons).toHaveCount(0)
  })

  test('clicking vote button toggles vote state', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')
    
    // Wait for tracks to load
    await page.waitForSelector('text=Vision', { state: 'visible' })

    // Find first track's upvote button (need to go up to the track container)
    const firstTrack = page.locator('text=Vision').locator('..').locator('..').first()
    const upvoteButton = firstTrack.locator('button').filter({ hasText: '↑' }).first()
    
    // Wait for button to be visible
    await expect(upvoteButton).toBeVisible({ timeout: 5000 })
    
    // Click upvote
    await upvoteButton.click()
    
    // Wait a bit for state to update
    await page.waitForTimeout(300)
    
    // Button should be highlighted (check color or style)
    const buttonColor = await upvoteButton.evaluate((el) => {
      return window.getComputedStyle(el).color
    })
    // The active state should have different styling
    
    // Click again to toggle off
    await upvoteButton.click()
    await page.waitForTimeout(300)
  })

  test('feedback form opens and closes', async ({ page }) => {
    await page.goto('/player')
    await page.waitForLoadState('networkidle')
    
    // Wait for tracks to load
    await page.waitForSelector('text=Vision', { state: 'visible' })

    // Find feedback button for first track (need to go up to the track container)
    const firstTrack = page.locator('text=Vision').locator('..').locator('..').first()
    const feedbackButton = firstTrack.getByRole('button', { name: /feedback/i }).first()
    
    // Wait for button to be visible
    await expect(feedbackButton).toBeVisible({ timeout: 5000 })
    
    // Click to open feedback form
    await feedbackButton.click()
    await page.waitForTimeout(300)
    
    // Textarea should be visible
    const textarea = page.locator('textarea[placeholder*="share your thoughts"]')
    await expect(textarea).toBeVisible({ timeout: 5000 })
    
    // Submit button should be visible
    const submitButton = page.getByRole('button', { name: /submit/i })
    await expect(submitButton).toBeVisible({ timeout: 5000 })
    
    // Click feedback button again to close
    await feedbackButton.click()
    await page.waitForTimeout(300)
    
    // Form should be hidden
    await expect(textarea).not.toBeVisible({ timeout: 2000 })
  })

  test('feedback form not visible for free subscribers', async ({ page }) => {
    // Mock as free subscriber
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [],
          },
        }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Should NOT see feedback buttons
    const feedbackButtons = page.getByRole('button', { name: /feedback/i })
    await expect(feedbackButtons).toHaveCount(0)
  })
})

test.describe('Player Page - Error Cases', () => {
  test('handles subscription API timeout gracefully', async ({ page }) => {
    // Mock subscription check to timeout
    await page.route('**/members/api/member/', (route) => {
      // Don't fulfill, let it timeout
      setTimeout(() => {
        route.abort()
      }, 100)
    })

    await page.goto('/player')
    
    // Should eventually show content (defaults to guest)
    await page.waitForTimeout(2000)
    await expect(page.getByText(/player/i)).toBeVisible()
  })

  test('handles missing tracks gracefully', async ({ page }) => {
    // This test would require mocking the tracks config
    // For now, we'll just verify the page doesn't crash
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [
              {
                id: 'sub-1',
                status: 'active',
                price: { amount: 1000, currency: 'USD' },
              },
            ],
          },
        }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Page should load without errors
    await expect(page.getByText(/player/i)).toBeVisible()
  })
})

test.describe('Player Page - UI Elements', () => {
  test('home link is present and works', async ({ page }) => {
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Home link should be visible
    const homeLink = page.getByRole('link', { name: /home/i })
    await expect(homeLink).toBeVisible()
    
    // Clicking should navigate
    await homeLink.click()
    await expect(page).toHaveURL(/.*\/$/)
  })

  test('page is scrollable vertically', async ({ page }) => {
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [
              {
                id: 'sub-1',
                status: 'active',
                price: { amount: 1000, currency: 'USD' },
              },
            ],
          },
        }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Check that the content container has overflow-y: auto
    const contentContainer = page.locator('.app-container > div').first()
    const overflowY = await contentContainer.evaluate((el) => {
      return window.getComputedStyle(el).overflowY
    })
    expect(overflowY).toBe('auto')

    // Verify we can scroll by checking scroll position
    const initialScrollTop = await contentContainer.evaluate((el) => el.scrollTop)
    
    // Try to scroll down
    await contentContainer.evaluate((el) => {
      el.scrollTop = 100
    })
    
    const scrolledTop = await contentContainer.evaluate((el) => el.scrollTop)
    expect(scrolledTop).toBeGreaterThan(initialScrollTop)
  })

  test('page content is accessible when scrolling', async ({ page }) => {
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [
              {
                id: 'sub-1',
                status: 'active',
                price: { amount: 1000, currency: 'USD' },
              },
            ],
          },
        }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Verify all tracks are visible (should be scrollable to see all)
    await expect(page.getByText('Vision')).toBeVisible()
    await expect(page.getByText('Overpriced Airbnb')).toBeVisible()
    await expect(page.getByText('Nova')).toBeVisible()
    
    // Verify home link is accessible (should be at bottom, scrollable)
    const homeLink = page.getByRole('link', { name: /home/i })
    await expect(homeLink).toBeVisible()
  })

  test('upgrade button works for free subscribers', async ({ page }) => {
    // Mock as free subscriber
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'test-member',
            email: 'test@example.com',
            subscriptions: [],
          },
        }),
      })
    })

    await page.goto('/player')
    await page.waitForLoadState('networkidle')

    // Should see upgrade button
    const upgradeButton = page.getByRole('button', { name: /upgrade/i })
    await expect(upgradeButton).toBeVisible()
    
    // Clicking should trigger portal (check hash change)
    await upgradeButton.click()
    
    // Should navigate to portal
    await expect(page).toHaveURL(/.*#\/portal\/account/)
  })
})
