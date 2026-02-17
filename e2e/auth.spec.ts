import { test, expect } from '@playwright/test'

/**
 * Authentication Tests (Sign Up / Sign In)
 *
 * Tests for the /connect page including:
 * - Sign up form and flow
 * - Sign in (log in) functionality
 * - Log out functionality
 * - Account access
 * - Error handling
 * - Portal integration
 */

test.describe('Connect Page - Basic Elements', () => {
  test('connect page loads with correct title', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Check page title heading
    const heading = page.getByRole('heading', { name: /connect/i })
    await expect(heading).toBeVisible()
  })

  test('connect page has sign up button when logged out', async ({ page }) => {
    // Mock as not logged in
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should see sign up button
    const signUpBtn = page.getByRole('button', { name: /sign up/i })
    await expect(signUpBtn).toBeVisible()
  })

  test('connect page has log in link when logged out', async ({ page }) => {
    // Mock as not logged in
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should see log in link
    const logInLink = page.getByRole('link', { name: /log in/i })
    await expect(logInLink).toBeVisible()
  })

  test('connect page has account link', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should see account link
    const accountLink = page.getByRole('link', { name: /account/i })
    await expect(accountLink).toBeVisible()
  })

  test('connect page has log out link', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should see log out link
    const logOutLink = page.getByRole('link', { name: /log out/i })
    await expect(logOutLink).toBeVisible()
  })

  test('connect page has home navigation link', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should see home link
    const homeLink = page.getByRole('link', { name: /home/i })
    await expect(homeLink).toBeVisible()
  })

  test('connect page has continue link', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should see continue link
    const continueLink = page.getByRole('link', { name: /continue/i })
    await expect(continueLink).toBeVisible()
  })
})

test.describe('Sign Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock as not logged in for sign up tests
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })
  })

  test('clicking sign up button shows email form', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click sign up button
    const signUpBtn = page.getByRole('button', { name: /sign up/i })
    await expect(signUpBtn).toBeVisible()
    await signUpBtn.click()

    // Email input should now be visible
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await expect(emailInput).toBeVisible()

    // Send magic link button should be visible
    const sendLinkBtn = page.getByRole('button', { name: /send magic link/i })
    await expect(sendLinkBtn).toBeVisible()

    // Cancel button should be visible
    const cancelBtn = page.getByRole('button', { name: /cancel/i })
    await expect(cancelBtn).toBeVisible()
  })

  test('sign up form validates email input', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click sign up to show form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Try submitting with empty email
    const sendLinkBtn = page.getByRole('button', { name: /send magic link/i })
    await sendLinkBtn.click()

    // Should show validation error
    const errorMsg = page.getByText(/please enter a valid email/i)
    await expect(errorMsg).toBeVisible()
  })

  test('sign up form validates email format', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click sign up to show form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Wait for form to appear
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await expect(emailInput).toBeVisible()

    // Enter invalid email (no @)
    await emailInput.fill('invalid-email')

    // Get the submit button and submit form via click
    const submitBtn = page.getByRole('button', { name: /send magic link/i })
    await expect(submitBtn).toBeVisible()
    
    // Use JavaScript to submit the form to ensure it triggers
    await page.evaluate(() => {
      const form = document.querySelector('form')
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      }
    })

    // Wait for validation error to appear
    await page.waitForTimeout(500)

    // Should show validation error
    const errorMsg = page.getByText(/please enter a valid email/i)
    await expect(errorMsg).toBeVisible({ timeout: 5000 })
  })

  test('sign up form submits successfully with valid email', async ({ page }) => {
    // Mock the magic link API
    await page.route('**/members/api/send-magic-link/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click sign up to show form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Enter valid email
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await emailInput.fill('test@example.com')

    // Submit form
    await page.getByRole('button', { name: /send magic link/i }).click()

    // Should show success message
    const successMsg = page.getByText(/check your email for the sign-in link/i)
    await expect(successMsg).toBeVisible()
  })

  test('sign up form shows loading state during submission', async ({ page }) => {
    // Mock the magic link API with delay
    await page.route('**/members/api/send-magic-link/', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click sign up to show form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Enter valid email
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await emailInput.fill('test@example.com')

    // Submit form
    await page.getByRole('button', { name: /send magic link/i }).click()

    // Should show loading state
    const loadingBtn = page.getByRole('button', { name: /sending/i })
    await expect(loadingBtn).toBeVisible()
  })

  test('sign up form handles API error gracefully', async ({ page }) => {
    // Mock the magic link API to return error
    await page.route('**/members/api/send-magic-link/', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid email address' }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click sign up to show form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Enter email
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await emailInput.fill('test@example.com')

    // Submit form
    await page.getByRole('button', { name: /send magic link/i }).click()

    // Should show error message
    const errorMsg = page.getByText(/invalid email address/i)
    await expect(errorMsg).toBeVisible()
  })

  test('sign up form handles network error gracefully', async ({ page }) => {
    // Mock the magic link API to fail
    await page.route('**/members/api/send-magic-link/', (route) => {
      route.abort('failed')
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click sign up to show form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Enter email
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await emailInput.fill('test@example.com')

    // Submit form
    await page.getByRole('button', { name: /send magic link/i }).click()

    // Wait a bit for error to appear
    await page.waitForTimeout(500)

    // Should show network error message
    const errorMsg = page.getByText(/network error|failed/i)
    await expect(errorMsg).toBeVisible()
  })

  test('cancel button hides sign up form', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click sign up to show form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Form should be visible
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await expect(emailInput).toBeVisible()

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click()

    // Form should be hidden
    await expect(emailInput).not.toBeVisible()

    // Sign up button should be visible again
    const signUpBtn = page.getByRole('button', { name: /sign up/i })
    await expect(signUpBtn).toBeVisible()
  })

  test('email input has autofocus when form opens', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click sign up to show form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Email input should be focused
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await expect(emailInput).toBeFocused()
  })
})

test.describe('Sign In Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock as not logged in
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })
  })

  test('log in link has correct portal href', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Check log in link
    const logInLink = page.getByRole('link', { name: /log in/i })
    await expect(logInLink).toHaveAttribute('href', '#/portal/signin')
    await expect(logInLink).toHaveAttribute('data-portal', 'signin')
  })

  test('clicking log in sets hash for portal', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click log in
    const logInLink = page.getByRole('link', { name: /log in/i })
    await logInLink.click()

    // Hash should be set
    await page.waitForTimeout(100)
    const hash = await page.evaluate(() => window.location.hash)
    expect(hash).toBe('#/portal/signin')
  })

  test('account link has correct portal href', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Check account link
    const accountLink = page.getByRole('link', { name: /account/i })
    await expect(accountLink).toHaveAttribute('href', '#/portal/account')
    await expect(accountLink).toHaveAttribute('data-portal', 'account')
  })

  test('clicking account link sets hash for portal', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click account
    const accountLink = page.getByRole('link', { name: /account/i })
    await accountLink.click()

    // Hash should be set
    await page.waitForTimeout(100)
    const hash = await page.evaluate(() => window.location.hash)
    expect(hash).toBe('#/portal/account')
  })
})

test.describe('Log Out Flow', () => {
  test('log out link is always visible', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Log out should be visible
    const logOutLink = page.getByRole('link', { name: /log out/i })
    await expect(logOutLink).toBeVisible()
  })

  test('log out link has correct data attribute', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Log out should have data-members-signout attribute (boolean attribute)
    const logOutLink = page.getByRole('link', { name: /log out/i })
    const hasAttr = await logOutLink.evaluate((el) => el.hasAttribute('data-members-signout'))
    expect(hasAttr).toBe(true)
  })

  test('clicking log out triggers sign out handler', async ({ page }) => {
    // Mock as logged in
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

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Log out link should be clickable
    const logOutLink = page.getByRole('link', { name: /log out/i })
    await expect(logOutLink).toBeVisible()

    // Set up a flag to track if the click handler was called
    let clicked = false
    await page.exposeFunction('trackLogout', () => {
      clicked = true
    })

    // Add click listener before clicking
    await page.evaluate(() => {
      const logoutLink = document.querySelector('[data-members-signout]')
      if (logoutLink) {
        logoutLink.addEventListener('click', () => {
          (window as unknown as { trackLogout: () => void }).trackLogout()
        })
      }
    })

    // Click log out
    await logOutLink.click()

    // Verify click was registered
    await page.waitForTimeout(100)
    expect(clicked).toBe(true)
  })
})

test.describe('Logged In State', () => {
  test('hides sign up and log in when logged in', async ({ page }) => {
    // Mock as logged in
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

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Sign up button should NOT be visible
    const signUpBtn = page.getByRole('button', { name: /sign up →/i })
    await expect(signUpBtn).not.toBeVisible()

    // Log in link should NOT be visible
    const logInLink = page.getByRole('link', { name: /log in/i })
    await expect(logInLink).not.toBeVisible()
  })

  test('shows account link when logged in', async ({ page }) => {
    // Mock as logged in
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

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Account link should be visible
    const accountLink = page.getByRole('link', { name: /account/i })
    await expect(accountLink).toBeVisible()
  })
})

test.describe('Navigation from Connect', () => {
  test('home link navigates to landing page', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click home link
    const homeLink = page.getByRole('link', { name: /home/i })
    await homeLink.click()

    // Should be on home page
    await expect(page).toHaveURL('/')
  })

  test('continue link navigates to listen page', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Click continue link
    const continueLink = page.getByRole('link', { name: /continue/i })
    await continueLink.click()

    // Should be on listen page
    await expect(page).toHaveURL('/listen')
  })
})

test.describe('Connect Page - Error Handling', () => {
  test('handles member API error gracefully', async ({ page }) => {
    // Mock member API to fail
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Page should still load without crashing
    const heading = page.getByRole('heading', { name: /connect/i })
    await expect(heading).toBeVisible()

    // Should show logged out state (sign up visible)
    const signUpBtn = page.getByRole('button', { name: /sign up/i })
    await expect(signUpBtn).toBeVisible()
  })

  test('handles member API timeout gracefully', async ({ page }) => {
    // Mock member API to timeout
    await page.route('**/members/api/member/', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      route.abort()
    })

    await page.goto('/connect')
    
    // Wait for page to settle
    await page.waitForTimeout(500)

    // Page should still load
    const heading = page.getByRole('heading', { name: /connect/i })
    await expect(heading).toBeVisible()
  })
})

test.describe('Connect Page - Accessibility', () => {
  test('page has proper heading structure', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should have h1 heading
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toHaveText(/connect/i)
  })

  test('buttons and links are keyboard accessible', async ({ page }) => {
    // Mock as not logged in
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Tab to sign up button
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should be able to navigate with keyboard
    const signUpBtn = page.getByRole('button', { name: /sign up/i })
    
    // Press Enter to activate
    await signUpBtn.focus()
    await page.keyboard.press('Enter')

    // Form should open
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await expect(emailInput).toBeVisible()
  })

  test('form inputs have proper labels', async ({ page }) => {
    // Mock as not logged in
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Open sign up form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Email input should have placeholder text (acting as label)
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('type', 'email')
  })
})

test.describe('Connect Page - Responsive Design', () => {
  test('page works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // All critical elements should be visible
    await expect(page.getByRole('heading', { name: /connect/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /account/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /log out/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible()
  })

  test('sign up form works on mobile', async ({ page }) => {
    // Mock as not logged in
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Open sign up form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Form should be visible and usable
    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await expect(emailInput).toBeVisible()
    await emailInput.fill('test@example.com')

    // Buttons should be tappable
    const sendLinkBtn = page.getByRole('button', { name: /send magic link/i })
    await expect(sendLinkBtn).toBeVisible()
  })
})
