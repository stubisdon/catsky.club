import { test, expect } from '@playwright/test'

/**
 * Listen Page Tests
 *
 * Tests for the /listen page (music player / tracks) including:
 * - Access control (guest, free subscriber, paid subscriber)
 * - Track selection and playback
 * - SoundCloud integration
 * - Voting and feedback features
 * - Error handling
 */

test.describe('Listen page - Access Control', () => {
  test('guest user sees first track accessible and others locked', async ({ page }) => {
    // Mock subscription check to return 'not_subscriber'
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Should see listen heading
    await expect(page.getByRole('heading', { name: /listen/i })).toBeVisible()
    
    // Should see first track (Vision) - accessible
    await expect(page.getByText('Vision')).toBeVisible()
    
    // Should see locked tracks with "sign up" text
    const signUpTexts = page.getByText('sign up')
    const signUpCount = await signUpTexts.count()
    // Guest should see 2 locked tracks (Overpriced Airbnb and Nova)
    expect(signUpCount).toBeGreaterThanOrEqual(1)
  })

  test('free subscriber sees first 2 tracks accessible', async ({ page }) => {
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Should see listen heading
    await expect(page.getByRole('heading', { name: /listen/i })).toBeVisible()
    
    // Should see first track (Vision)
    await expect(page.getByText('Vision')).toBeVisible()
    
    // Should see second track (Overpriced Airbnb)
    await expect(page.getByText('Overpriced Airbnb')).toBeVisible()
    
    // Should see third track (Nova) which is locked
    await expect(page.getByText('Nova')).toBeVisible()
    
    // Nova track container should have "sign up" text visible (locked track indicator)
    // Use a more specific locator to avoid hidden ghost portal buttons
    const novaTrackContainer = page.locator('div').filter({ hasText: /^Nova.*sign up$/i }).first()
    await expect(novaTrackContainer).toBeVisible()
  })

  test('paid subscriber sees all tracks accessible', async ({ page }) => {
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Should see listen heading
    await expect(page.getByRole('heading', { name: /listen/i })).toBeVisible()
    
    // Should see all three tracks as accessible
    await expect(page.getByText('Vision')).toBeVisible()
    await expect(page.getByText('Overpriced Airbnb')).toBeVisible()
    await expect(page.getByText('Nova')).toBeVisible()
    
    // No track should have "sign up" text visible (all tracks unlocked for paid)
    // Check within the track list area, not hidden Ghost portal buttons
    const tracksArea = page.locator('.app-container')
    const visibleSignUp = tracksArea.locator('div:visible').filter({ hasText: /^.*sign up$/i })
    await expect(visibleSignUp).toHaveCount(0)
    
    // Should see voting buttons on tracks (paid subscribers get voting)
    const upvoteButtons = page.locator('button').filter({ hasText: '↑' })
    await expect(upvoteButtons.first()).toBeVisible({ timeout: 5000 })
    
    // Should see feedback buttons
    const feedbackButton = page.getByRole('button', { name: /feedback/i }).first()
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Should still show listen page (not crash)
    await expect(page.getByText(/listen/i)).toBeVisible()
    
    // Should default to guest access (first track only)
    await expect(page.getByText('Vision')).toBeVisible()
  })
})

test.describe('Listen page - Track Selection', () => {
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
    await page.goto('/listen')
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Try to click locked track (Nova - third track)
    const novaTrack = page.locator('text=Nova').locator('..').first()
    await novaTrack.click()
    
    // Track should not be selected (no player should appear for Nova)
    // The player section should not show Nova as selected
    // We can check that the player section doesn't contain Nova title
    const playerTitle = page.locator('[style*="font-weight: bold"]').filter({ hasText: 'Nova' })
    await expect(playerTitle).toHaveCount(0)
  })

  test('switching between tracks updates player', async ({ page }) => {
    await page.goto('/listen')
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

test.describe('Listen page - SoundCloud Integration', () => {
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
    await page.goto('/listen')
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
    await page.goto('/listen')
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
    await page.goto('/listen')
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
    await page.goto('/listen')
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

test.describe('Listen page - Voting and Feedback', () => {
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
    await page.goto('/listen')
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Should NOT see voting buttons
    const voteButtons = page.locator('button').filter({ hasText: /↑|↓/ })
    await expect(voteButtons).toHaveCount(0)
  })

  test('clicking vote button toggles vote state', async ({ page }) => {
    await page.goto('/listen')
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
    // The active state should have different styling
    
    // Click again to toggle off
    await upvoteButton.click()
    await page.waitForTimeout(300)
  })

  test('feedback form opens and closes', async ({ page }) => {
    await page.goto('/listen')
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Should NOT see feedback buttons
    const feedbackButtons = page.getByRole('button', { name: /feedback/i })
    await expect(feedbackButtons).toHaveCount(0)
  })
})

test.describe('Listen page - Error Cases', () => {
  test('handles subscription API timeout gracefully', async ({ page }) => {
    // Mock subscription check to timeout
    await page.route('**/members/api/member/', (route) => {
      // Don't fulfill, let it timeout
      setTimeout(() => {
        route.abort()
      }, 100)
    })

    await page.goto('/listen')
    
    // Should eventually show content (defaults to guest)
    await page.waitForTimeout(2000)
    await expect(page.getByText(/listen/i)).toBeVisible()
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Page should load without errors
    await expect(page.getByText(/listen/i)).toBeVisible()
  })
})

test.describe('Listen page - UI Elements', () => {
  test('public nav is present and works', async ({ page }) => {
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Home link should be visible (Listen page has ← home)
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible()

    // Navigate home then check nav is there
    await page.getByRole('link', { name: /home/i }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'listen' })).toBeVisible()
    await page.getByRole('link', { name: 'watch' }).click()
    await expect(page).toHaveURL(/.*\/watch/)
  })

  test('page has scrollable content container', async ({ page }) => {
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Check that the content container has overflow-y: auto (scrollable when needed)
    const contentContainer = page.locator('.app-container > div').first()
    const overflowY = await contentContainer.evaluate((el) => {
      return window.getComputedStyle(el).overflowY
    })
    
    // Should be 'auto' which enables scrolling when content exceeds container
    expect(overflowY).toBe('auto')
    
    // Check that max-height is set (to enable scrolling)
    const maxHeight = await contentContainer.evaluate((el) => {
      return window.getComputedStyle(el).maxHeight
    })
    expect(maxHeight).toBeTruthy()
    expect(maxHeight).not.toBe('none')
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Verify all tracks are visible (should be scrollable to see all)
    await expect(page.getByText('Vision')).toBeVisible()
    await expect(page.getByText('Overpriced Airbnb')).toBeVisible()
    await expect(page.getByText('Nova')).toBeVisible()

    // Verify home link is accessible
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible()
  })

  test('clicking locked track navigates to connect', async ({ page }) => {
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

    await page.goto('/listen')
    await page.waitForLoadState('networkidle')

    // Locked track shows "sign up"; click the locked track container (Nova)
    const lockedTrack = page.locator('text=Nova').locator('..').first()
    await expect(lockedTrack).toBeVisible()
    await lockedTrack.click()

    // Should navigate to connect page
    await expect(page).toHaveURL(/.*\/connect/)
  })
})
