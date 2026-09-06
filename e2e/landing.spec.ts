import { test, expect } from '@playwright/test'

/**
 * Landing Page Tests
 *
 * The landing page is the release shelf: masthead, two album covers, the music video, and the
 * social feed. The two covers carry the page's two calls to action, so most of what matters
 * here is that clicking each one opens the right thing.
 *
 * Navigation moved into the top bar, so nav-link assertions live in navigation.spec.ts and in
 * src/components/TopNav.test.tsx rather than here.
 */

const RELEASED_COVER = '[data-testid="album-cover-collection-one"]'
const UPCOMING_COVER = '[data-testid="album-cover-collection-two"]'

type Page = import('@playwright/test').Page

/**
 * Stub /api/social-posts. The feed calls it on mount and the API has no credentials in e2e,
 * so without this the request either hangs or returns whatever the environment happens to
 * have configured.
 */
async function stubSocialPosts(page: Page, body?: object) {
  await page.route('**/api/social-posts*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body ?? { posts: {}, errors: {}, fetchedAt: new Date().toISOString() }),
    })
  )
}

/**
 * Stub the third-party image hosts the page links to (YouTube posters, social thumbnails).
 * These are real remote URLs, so in a sandboxed or offline runner they stall rather than
 * fail, which is what previously made `networkidle` unreachable.
 */
async function stubRemoteImages(page: Page) {
  // 1x1 transparent GIF.
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  await page.route(/i\.ytimg\.com|cdninstagram\.com|tiktokcdn|sndcdn\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'image/gif', body: pixel })
  )
}

/**
 * Open the landing page and wait for it to be interactive.
 *
 * Deliberately not `waitForLoadState('networkidle')`: the page legitimately talks to Ghost
 * for membership state and to YouTube for poster frames, and a single slow third party would
 * make every test in the file time out. Waiting on the element under test is both faster and
 * a truer statement of what the test needs.
 */
async function gotoLanding(page: Page) {
  await stubRemoteImages(page)
  await page.goto('/')
  await page.locator('[data-testid="album-shelf"]').waitFor({ state: 'visible' })
}

test.describe('Landing Page - Content', () => {
  test.beforeEach(async ({ page }) => {
    await stubSocialPosts(page)
  })

  test('displays the masthead', async ({ page }) => {
    await gotoLanding(page)

    await expect(page.getByRole('heading', { level: 1, name: 'catsky' })).toBeVisible()
    await expect(page.locator('.home-domain')).toHaveText('catsky.club')
  })

  test('displays tagline/poem content', async ({ page }) => {
    await gotoLanding(page)

    await expect(page.getByText(/in the world of data/i)).toBeVisible()
    await expect(page.getByText(/scattered everywhere/i)).toBeVisible()
    await expect(page.getByText(/here to find a meaning/i)).toBeVisible()
    await expect(page.getByText(/for the ones who care/i)).toBeVisible()
  })

  test('displays both album covers, the video and the social feed', async ({ page }) => {
    await gotoLanding(page)

    await expect(page.locator(RELEASED_COVER)).toBeVisible()
    await expect(page.locator(UPCOMING_COVER)).toBeVisible()
    await expect(page.getByTestId('video-feature')).toBeVisible()
    await expect(page.getByTestId('social-feed')).toBeVisible()
  })

  test('links out to every streaming platform', async ({ page }) => {
    await gotoLanding(page)

    const footer = page.locator('.listen-row')
    await expect(footer.getByRole('link', { name: /spotify/i })).toHaveAttribute(
      'href',
      /open\.spotify\.com/
    )
    await expect(footer.getByRole('link', { name: /apple music/i })).toHaveAttribute(
      'href',
      /music\.apple\.com/
    )
    await expect(footer.getByRole('link', { name: /more platforms/i })).toBeVisible()
  })

  test('links to each social profile', async ({ page }) => {
    await gotoLanding(page)

    await expect(page.getByTestId('social-profile-instagram')).toHaveAttribute(
      'href',
      /instagram\.com/
    )
    await expect(page.getByTestId('social-profile-tiktok')).toHaveAttribute('href', /tiktok\.com/)
    await expect(page.getByTestId('social-profile-youtube')).toHaveAttribute('href', /youtube\.com/)
  })
})

test.describe('Landing Page - Album covers', () => {
  test.beforeEach(async ({ page }) => {
    await stubSocialPosts(page)
  })

  test('released cover opens the tracklist with all five tracks', async ({ page }) => {
    await gotoLanding(page)

    await page.locator(RELEASED_COVER).click()

    const dialog = page.getByTestId('album-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId('album-tracklist').locator('> li')).toHaveCount(5)
    await expect(dialog.getByText('Sugar Daddy')).toBeVisible()
  })

  test('expanding a track reveals its player and platform links', async ({ page }) => {
    await gotoLanding(page)

    await page.locator(RELEASED_COVER).click()
    await page.getByTestId('album-track-1').click()

    const dialog = page.getByTestId('album-dialog')
    // Audio streams from SoundCloud; the icons point at the stores.
    await expect(dialog.locator('.album-track-player')).toHaveAttribute(
      'src',
      /w\.soundcloud\.com/
    )
    await expect(dialog.getByRole('link', { name: /spotify/i })).toBeVisible()
    await expect(dialog.getByRole('link', { name: /apple music/i })).toBeVisible()
    await expect(dialog.getByRole('link', { name: /more platforms/i })).toBeVisible()
  })

  test('only one track is expanded at a time', async ({ page }) => {
    await gotoLanding(page)

    await page.locator(RELEASED_COVER).click()
    await page.getByTestId('album-track-1').click()
    await page.getByTestId('album-track-2').click()

    // A second open player would mean two tracks could play over each other.
    await expect(page.locator('.album-track-player')).toHaveCount(1)
  })

  test('upcoming cover opens the subscribe prompt', async ({ page }) => {
    await gotoLanding(page)

    await page.locator(UPCOMING_COVER).click()

    const dialog = page.getByTestId('subscribe-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/subscribe for updates about upcoming releases/i)).toBeVisible()
    await expect(dialog.getByTestId('subscribe-email')).toBeVisible()
  })

  test('subscribe prompt rejects an invalid email before calling the API', async ({ page }) => {
    let magicLinkCalls = 0
    await page.route('**/members/api/send-magic-link/', (route) => {
      magicLinkCalls += 1
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    await gotoLanding(page)

    await page.locator(UPCOMING_COVER).click()
    await page.getByTestId('subscribe-email').fill('not-an-email')
    await page.getByTestId('subscribe-submit').click()

    await expect(page.getByTestId('subscribe-error')).toBeVisible()
    expect(magicLinkCalls).toBe(0)
  })

  test('subscribe prompt confirms after a successful magic-link request', async ({ page }) => {
    await page.route('**/members/api/send-magic-link/', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
    )

    await gotoLanding(page)

    await page.locator(UPCOMING_COVER).click()
    await page.getByTestId('subscribe-email').fill('fan@example.com')
    await page.getByTestId('subscribe-submit').click()

    await expect(page.getByTestId('subscribe-confirmation')).toBeVisible()
  })

  test('subscribe prompt surfaces a server error', async ({ page }) => {
    await page.route('**/members/api/send-magic-link/', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Verification failed. Please try again.' }] }),
      })
    )

    await gotoLanding(page)

    await page.locator(UPCOMING_COVER).click()
    await page.getByTestId('subscribe-email').fill('fan@example.com')
    await page.getByTestId('subscribe-submit').click()

    await expect(page.getByTestId('subscribe-error')).toContainText(/verification failed/i)
  })
})

test.describe('Landing Page - Dialog behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await stubSocialPosts(page)
  })

  test('escape closes the dialog', async ({ page }) => {
    await gotoLanding(page)

    await page.locator(UPCOMING_COVER).click()
    await expect(page.getByTestId('subscribe-dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('subscribe-dialog')).toBeHidden()
  })

  test('the close button closes the dialog', async ({ page }) => {
    await gotoLanding(page)

    await page.locator(RELEASED_COVER).click()
    await expect(page.getByTestId('album-dialog')).toBeVisible()

    await page.getByTestId('dialog-close').click()
    await expect(page.getByTestId('album-dialog')).toBeHidden()
  })

  test('clicking the backdrop closes the dialog', async ({ page }) => {
    await gotoLanding(page)

    await page.locator(UPCOMING_COVER).click()
    await expect(page.getByTestId('subscribe-dialog')).toBeVisible()

    // Top-left corner is backdrop, never panel.
    await page.locator('.dialog-backdrop').click({ position: { x: 5, y: 5 } })
    await expect(page.getByTestId('subscribe-dialog')).toBeHidden()
  })

  test('focus returns to the cover that opened the dialog', async ({ page }) => {
    await gotoLanding(page)

    await page.locator(UPCOMING_COVER).click()
    await expect(page.getByTestId('subscribe-dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator(UPCOMING_COVER)).toBeFocused()
  })
})

test.describe('Landing Page - Social feed', () => {
  test('renders up to three posts per platform', async ({ page }) => {
    await stubSocialPosts(page, {
      posts: {
        youtube: [
          {
            platform: 'youtube',
            id: 'a',
            url: 'https://www.youtube.com/watch?v=a',
            thumbnailUrl: 'https://i.ytimg.com/vi/a/mqdefault.jpg',
            caption: 'first',
            publishedAt: new Date().toISOString(),
          },
          {
            platform: 'youtube',
            id: 'b',
            url: 'https://www.youtube.com/watch?v=b',
            thumbnailUrl: 'https://i.ytimg.com/vi/b/mqdefault.jpg',
            caption: 'second',
            publishedAt: new Date().toISOString(),
          },
          {
            platform: 'youtube',
            id: 'c',
            url: 'https://www.youtube.com/watch?v=c',
            thumbnailUrl: 'https://i.ytimg.com/vi/c/mqdefault.jpg',
            caption: 'third',
            publishedAt: new Date().toISOString(),
          },
        ],
      },
      errors: {},
      fetchedAt: new Date().toISOString(),
    })

    await gotoLanding(page)

    const youtubeColumn = page.locator('.social-column').nth(2)
    await expect(youtubeColumn.locator('.social-post')).toHaveCount(3)
    await expect(youtubeColumn.getByText('first')).toBeVisible()
  })

  test('a platform with no posts still invites a follow', async ({ page }) => {
    // No credentials configured is the normal state until tokens are set; the column must not
    // render as an empty, broken-looking block.
    await stubSocialPosts(page, {
      posts: { instagram: [], tiktok: [], youtube: [] },
      errors: { instagram: 'INSTAGRAM_ACCESS_TOKEN is not set' },
      fetchedAt: new Date().toISOString(),
    })

    await gotoLanding(page)

    await expect(page.locator('.social-empty').first()).toBeVisible()
    // The visitor is never shown the integration's error.
    await expect(page.getByText(/ACCESS_TOKEN/)).toHaveCount(0)
  })

  test('a failing social API does not break the page', async ({ page }) => {
    await page.route('**/api/social-posts*', (route) => route.fulfill({ status: 502, body: '{}' }))

    await gotoLanding(page)

    await expect(page.getByRole('heading', { level: 1, name: 'catsky' })).toBeVisible()
    await expect(page.locator(RELEASED_COVER)).toBeVisible()
  })
})

test.describe('Landing Page - Music video', () => {
  test.beforeEach(async ({ page }) => {
    await stubSocialPosts(page)
  })

  test('shows a poster rather than embedding YouTube on load', async ({ page }) => {
    await gotoLanding(page)

    await expect(page.getByTestId('video-play')).toBeVisible()
    // The facade keeps the YouTube player bundle off the initial page load.
    await expect(page.locator('.video-embed')).toHaveCount(0)
  })

  test('swaps in the embed once play is clicked', async ({ page }) => {
    await gotoLanding(page)

    await page.getByTestId('video-play').click()

    await expect(page.locator('.video-embed')).toHaveAttribute('src', /youtube-nocookie\.com/)
  })
})

test.describe('Landing Page - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await stubSocialPosts(page)
  })

  for (const [label, size] of [
    ['mobile', { width: 375, height: 667 }],
    ['tablet', { width: 768, height: 1024 }],
    ['desktop', { width: 1920, height: 1080 }],
  ] as const) {
    test(`displays correctly on ${label} viewport`, async ({ page }) => {
      await page.setViewportSize(size)
      await gotoLanding(page)

      await expect(page.getByRole('heading', { level: 1, name: 'catsky' })).toBeVisible()
      await expect(page.locator(RELEASED_COVER)).toBeVisible()
      await expect(page.locator(UPCOMING_COVER)).toBeVisible()
    })
  }

  test('album shelf stacks to one column on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await gotoLanding(page)

    const columns = await page
      .locator('.album-shelf')
      .evaluate((el) => window.getComputedStyle(el).gridTemplateColumns.split(' ').length)

    expect(columns).toBe(1)
  })
})

test.describe('Landing Page - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await stubSocialPosts(page)
  })

  test('has exactly one h1', async ({ page }) => {
    await gotoLanding(page)

    expect(await page.locator('h1').count()).toBe(1)
  })

  test('album covers are reachable and operable by keyboard', async ({ page }) => {
    await gotoLanding(page)

    await page.locator(RELEASED_COVER).focus()
    await expect(page.locator(RELEASED_COVER)).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByTestId('album-dialog')).toBeVisible()
  })

  test('each cover names its destination for screen readers', async ({ page }) => {
    await gotoLanding(page)

    await expect(page.locator(RELEASED_COVER)).toHaveAttribute('aria-label', /open tracklist/i)
    await expect(page.locator(UPCOMING_COVER)).toHaveAttribute('aria-label', /subscribe/i)
  })

  test('text content is selectable', async ({ page }) => {
    await gotoLanding(page)

    const userSelect = await page
      .locator('.home-scroll')
      .evaluate((el) => window.getComputedStyle(el).userSelect)

    expect(userSelect).toBe('text')
  })

  test('decorative grain and frame never intercept clicks', async ({ page }) => {
    await gotoLanding(page)

    const pointerEvents = await page
      .locator('.paper-surface')
      .evaluate((el) => window.getComputedStyle(el).pointerEvents)

    expect(pointerEvents).toBe('none')
  })
})

test.describe('Landing Page - Error Handling', () => {
  test('loads without critical JavaScript errors', async ({ page }) => {
    await stubSocialPosts(page)
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await gotoLanding(page)

    // Filter out non-critical errors (Ghost API, favicon, network errors, dev environment, etc.)
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('Ghost') &&
        !error.includes('API') &&
        !error.includes('404') &&
        !error.includes('Failed to load resource') &&
        !error.includes('net::ERR') &&
        !error.includes('Module') &&
        !error.includes('read only property')
    )

    if (criticalErrors.length > 0) {
      console.error('Critical errors found:', criticalErrors)
    }

    expect(criticalErrors).toHaveLength(0)
  })

  test('handles slow network gracefully', async ({ page }) => {
    await stubSocialPosts(page)
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      route.continue()
    })

    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'catsky' })).toBeVisible({
      timeout: 10000,
    })
  })
})

test.describe('Landing Page - Content Scrolling', () => {
  test('page content is scrollable', async ({ page }) => {
    await stubSocialPosts(page)
    await gotoLanding(page)

    const overflowY = await page
      .locator('.home-scroll')
      .evaluate((el) => window.getComputedStyle(el).overflowY)

    expect(overflowY).toBe('auto')
  })

  test('the page is taller than the viewport', async ({ page }) => {
    await stubSocialPosts(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await gotoLanding(page)

    const { scrollHeight, clientHeight } = await page
      .locator('.home-scroll')
      .evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))

    expect(scrollHeight).toBeGreaterThan(clientHeight)
  })
})

test.describe('Landing Page - Direct URL Access', () => {
  test('root URL loads landing page', async ({ page }) => {
    await stubSocialPosts(page)
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { level: 1, name: 'catsky' })).toBeVisible()
  })
})

test.describe('Landing Page - Performance', () => {
  test('page loads within reasonable time', async ({ page }) => {
    await stubSocialPosts(page)
    const startTime = Date.now()

    await gotoLanding(page)

    expect(Date.now() - startTime).toBeLessThan(5000)
  })

  test('critical content appears quickly', async ({ page }) => {
    await stubSocialPosts(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'catsky' })).toBeVisible({
      timeout: 2000,
    })
  })
})
