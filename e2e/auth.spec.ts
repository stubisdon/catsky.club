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
    await page.route('**/members/api/member**', (route) => {
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

  test('connect page has log in button when logged out', async ({ page }) => {
    // Mock as not logged in
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should see log in button
    const logInBtn = page.getByRole('button', { name: /log in/i })
    await expect(logInBtn).toBeVisible()
  })

  test('connect page has account link when logged in', async ({ page }) => {
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { id: 'test-member', email: 'test@example.com', subscriptions: [] },
        }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should see account link
    const accountLink = page.getByRole('link', { name: /account/i })
    await expect(accountLink).toBeVisible()
  })

  test('connect page has log out link when logged in', async ({ page }) => {
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { id: 'test-member', email: 'test@example.com', subscriptions: [] },
        }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Should see log out link
    const logOutLink = page.getByRole('link', { name: /log out/i })
    await expect(logOutLink).toBeVisible()
  })

  test('free members see plan upgrade actions and upgrade click opens plans hash without portal runtime errors', async ({ page }) => {
    const portalErrors: string[] = []
    page.on('pageerror', (error) => {
      const message = String(error?.message || error)
      if (/includes/i.test(message)) portalErrors.push(message)
    })

    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { id: 'free-member', email: 'free@example.com', subscriptions: [] },
        }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: 'upgrade to supporter plan' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'upgrade to backstage plan' })).toBeVisible()
    await expect(page.getByText('paid plans include unfinished demos and unreleased music videos.')).toBeVisible()

    await page.getByRole('link', { name: 'upgrade to supporter plan' }).click()
    await expect(page).toHaveURL(/#\/portal\/account\/plans$/)
    expect(portalErrors).toEqual([])
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
    await expect(continueLink).toHaveCSS('display', 'inline')
    await expect(continueLink).toHaveCSS('border-top-width', '0px')
    await expect(continueLink).toHaveCSS('font-size', '14.4px')
  })
})

test.describe('Sign Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock as not logged in for sign up tests
    await page.route('**/members/api/member**', (route) => {
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
    const successMsg = page.getByText(/check your email for the sign-up link/i)
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

test.describe('Log In Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock as not logged in
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })
  })

  test('log in button opens shared auth form', async ({ page }) => {
    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    const logInBtn = page.getByRole('button', { name: /log in/i })
    await logInBtn.click()

    const emailInput = page.getByPlaceholder(/your@email.com/i)
    await expect(emailInput).toBeVisible()
  })

  test('account link has correct portal href when logged in', async ({ page }) => {
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { id: 'test-member', email: 'test@example.com', subscriptions: [] },
        }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    const accountLink = page.getByRole('link', { name: /account/i })
    await expect(accountLink).toHaveAttribute('href', '#/portal/account')
    await expect(accountLink).toHaveAttribute('data-portal', 'account')
  })

  test('clicking account link sets hash for portal', async ({ page }) => {
    await page.route('**/members/api/member**', (route) => {
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
  test('log out link is visible when logged in', async ({ page }) => {
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { id: 'test-member', email: 'test@example.com', subscriptions: [] },
        }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    // Log out should be visible
    const logOutLink = page.getByRole('link', { name: /log out/i })
    await expect(logOutLink).toBeVisible()
  })

  test('log out link is hidden when logged out', async ({ page }) => {
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })

    await page.goto('/connect')
    await page.waitForLoadState('networkidle')

    const logOutLink = page.getByRole('link', { name: /log out/i })
    await expect(logOutLink).not.toBeVisible()
  })

  test('clicking log out triggers sign out handler', async ({ page }) => {
    // Mock as logged in
    await page.route('**/members/api/member**', (route) => {
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
    await page.route('**/members/api/member**', (route) => {
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
    const logInBtn = page.getByRole('button', { name: /log in/i })
    await expect(logInBtn).not.toBeVisible()
  })

  test('shows account link when logged in', async ({ page }) => {
    // Mock as logged in
    await page.route('**/members/api/member**', (route) => {
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

  test('magic-link success callback refreshes buttons to logged-in state', async ({ page }) => {
    let memberChecks = 0

    await page.route('**/members/api/member**', (route) => {
      memberChecks += 1

      if (memberChecks < 3) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ member: null }),
        })
        return
      }

      // Ghost may return the member directly instead of wrapping under { member }.
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-member',
          email: 'test@example.com',
          subscriptions: [],
        }),
      })
    })

    await page.goto('/connect?action=signin&success=true')

    await expect(page.getByRole('link', { name: /account/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /sign up/i })).not.toBeVisible()
    expect(memberChecks).toBeGreaterThanOrEqual(3)
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
    await page.route('**/members/api/member**', (route) => {
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
    await page.route('**/members/api/member**', async (route) => {
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
    await page.route('**/members/api/member**', (route) => {
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
    await page.route('**/members/api/member**', (route) => {
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
    await page.route('**/members/api/member**', (route) => {
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
    await page.route('**/members/api/member**', (route) => {
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


test.describe('Welcome onboarding flow', () => {
  test('welcome keeps the continue CTA immediately clickable and styles field notes as secondary helper text', async ({ page }) => {
    await page.goto('/welcome')

    await expect(page.getByText(/save this in the background while you keep browsing/i)).toBeVisible()

    const continueButton = page.getByRole('button', { name: /continue/i })
    await expect(continueButton).toBeVisible()
    await expect(continueButton).toHaveCSS('border-top-width', '2px')
    await expect(continueButton).toHaveCSS('text-transform', 'lowercase')
    await expect(continueButton).toBeDisabled()

    const firstNameLabel = page.locator('label[for="firstName"]')
    const firstNameText = firstNameLabel.locator('span').first()
    const firstNameNote = firstNameLabel.getByText('*')
    await expect(firstNameNote).toHaveCSS('font-size', '11.52px')
    await expect(firstNameText).not.toHaveCSS('font-size', '11.52px')

    const lastNameLabel = page.locator('label[for="lastName"]')
    const optionalNote = lastNameLabel.getByText('(optional)')
    await expect(optionalNote).toHaveCSS('font-size', '11.52px')
    await expect(optionalNote).toHaveCSS('opacity', '0.62')

    await page.getByLabel(/first name/i).fill('Ada')
    await expect(continueButton).toBeEnabled()
  })

  test('signup callback opens welcome directly and profile submission continues to listen without waiting for the profile save', async ({ page }) => {
    let profileRequestCount = 0
    let profileRequestBody = ''

    await page.route('**/members/api/member**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            uuid: 'member-uuid-123',
            email: 'ada@example.com',
            subscriptions: [],
          },
        }),
      })
    })

    await page.route('**/api/member-profile', async (route) => {
      profileRequestCount += 1
      profileRequestBody = route.request().postData() || ''
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ queued: true }),
      })
    })

    await page.goto('/connect?action=signup&success=true')
    await expect(page).toHaveURL(/\/welcome$/)
    await expect(page.getByRole('heading', { name: /^welcome$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^connect$/i })).not.toBeVisible()

    await page.getByLabel(/first name/i).fill('Ada')
    await page.getByLabel(/last name/i).fill('Lovelace')
    await page.getByRole('button', { name: /continue/i }).click()

    await expect(page).toHaveURL(/\/listen$/)
    await expect.poll(() => profileRequestCount).toBe(1)
    await expect.poll(() => JSON.parse(profileRequestBody || '{}')).toMatchObject({
      memberUuid: 'member-uuid-123',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
  })
})
