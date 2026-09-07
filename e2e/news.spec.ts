import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * News (blog) section tests
 *
 * Covers the /news feed and /news/<slug> article views described in
 * .context/news-section-plan.md. All Ghost Content API posts traffic is
 * intercepted with page.route — these tests must never reach the live
 * Ghost API. Fixtures mirror the real production response shape captured
 * from Ghost: id, slug, title, excerpt, feature_image, feature_image_alt,
 * published_at, reading_time, visibility, access (plus html on the
 * single-post response).
 *
 * These tests deliberately do NOT use waitForLoadState('networkidle')
 * (unlike some older specs here): the dev server proxies Ghost Portal's
 * settings call to the live site, so the page never reaches network idle
 * and every wait times out. Web-first assertions cover the same ground.
 *
 * Gating is entirely driven by the `access` boolean Ghost returns per
 * post — these tests never mock member cookies/session, only the
 * Content API response itself.
 */

interface GhostPostFixture {
  id: string
  slug: string
  title: string
  excerpt: string
  feature_image: string | null
  feature_image_alt: string | null
  published_at: string
  reading_time: number | null
  visibility: 'public' | 'members' | 'tiers' | 'paid'
  access: boolean
}

// Ordered newest-first, matching the real feed's `order=published_at desc`.
const POSTS: GhostPostFixture[] = [
  {
    id: '1',
    slug: 'sugar-daddy-sample-pack',
    title: 'Sugar Daddy Sample Pack 📦',
    excerpt: 'A peek behind the sample pack that inspired the record.',
    feature_image: null,
    feature_image_alt: null,
    published_at: '2026-08-20T12:00:00.000Z',
    reading_time: 4,
    visibility: 'public',
    access: true,
  },
  {
    id: '2',
    slug: 'studio-session-notes',
    title: 'Studio Session Notes',
    excerpt: 'Field notes from the first week of tracking.',
    feature_image: '/content/images/2026/02/studio-session.jpg',
    feature_image_alt: 'Mixing console in a dim studio',
    published_at: '2026-08-10T09:30:00.000Z',
    reading_time: 6,
    visibility: 'members',
    access: false,
  },
  {
    id: '3',
    slug: 'track-breakdown-motherless-child',
    title: 'Track Breakdown: Motherless Child',
    excerpt: '',
    feature_image: '/content/images/2026/02/track-breakdown.jpg',
    feature_image_alt: 'Waveform screenshot',
    published_at: '2026-07-28T15:00:00.000Z',
    reading_time: 8,
    visibility: 'tiers',
    access: false,
  },
  {
    id: '4',
    slug: 'inside-the-demo-vault',
    title: 'Inside the Demo Vault',
    excerpt: 'What the $20 tier gets that nobody else sees.',
    feature_image: null,
    feature_image_alt: null,
    published_at: '2026-07-15T18:45:00.000Z',
    reading_time: null,
    visibility: 'paid',
    access: false,
  },
  {
    id: '5',
    slug: 'why-catsky-exists',
    title: 'Why Catsky Exists',
    excerpt: 'The mission, in plain language.',
    feature_image: null,
    feature_image_alt: null,
    published_at: '2026-06-01T08:00:00.000Z',
    reading_time: 3,
    visibility: 'public',
    access: true,
  },
]

// Detail html per slug — mirrors Ghost's real behavior of returning a
// free-preview fragment for gated posts (or an empty string) and the
// full body for accessible posts.
const DETAIL_HTML: Record<string, string> = {
  'sugar-daddy-sample-pack': '<p>Full public post body about the sample pack.</p>',
  'studio-session-notes': '<p>Free preview: the first week was chaos.</p>',
  'track-breakdown-motherless-child': '',
  'inside-the-demo-vault': '',
  'why-catsky-exists': '<p>Full body text about the Catsky mission.</p>',
}

// A 1x1 transparent PNG. Feature images must be served locally: a real
// outbound image request never settles in a sandboxed run, so
// waitForLoadState('networkidle') would hang forever.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

function mockGhostImages(page: Page) {
  return page.route('**/content/images/**', (route) => {
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
  })
}

function mockGuestMember(page: Page) {
  return page.route('**/members/api/member/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ member: null }),
    })
  })
}

interface MockGhostContentOptions {
  posts?: GhostPostFixture[]
  detailHtml?: Record<string, string>
  feedStatus?: number
  detailStatus?: number
}

/**
 * Intercepts the `ghost/api/content/posts` glob and distinguishes the feed
 * request (`/ghost/api/content/posts/?...`) from the single-post request
 * (`/ghost/api/content/posts/slug/<slug>/?...`) by inspecting the request
 * pathname, exactly as the two real Ghost Content API endpoints differ.
 */
function mockGhostContent(page: Page, options: MockGhostContentOptions = {}) {
  const { posts = POSTS, detailHtml = DETAIL_HTML, feedStatus = 200, detailStatus = 200 } = options

  void mockGhostImages(page)

  return page.route('**/ghost/api/content/posts/**', (route: Route) => {
    const url = new URL(route.request().url())
    const slugMatch = url.pathname.match(/\/posts\/slug\/([^/]+)\/?$/)

    if (slugMatch) {
      if (detailStatus !== 200) {
        return route.fulfill({
          status: detailStatus,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: detailStatus === 429 ? 'Too many requests' : 'Internal server error', type: detailStatus === 429 ? 'TooManyRequestsError' : 'InternalServerError' }],
          }),
        })
      }

      const slug = decodeURIComponent(slugMatch[1])
      const summary = posts.find((p) => p.slug === slug)

      if (!summary) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'Resource not found', type: 'NotFoundError' }] }),
        })
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ posts: [{ ...summary, html: detailHtml[slug] ?? '' }] }),
      })
    }

    // Feed request.
    if (feedStatus !== 200) {
      return route.fulfill({
        status: feedStatus,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: feedStatus === 429 ? 'Too many requests' : 'Internal server error', type: feedStatus === 429 ? 'TooManyRequestsError' : 'InternalServerError' }],
        }),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        posts,
        meta: { pagination: { page: 1, limit: 'all', pages: 1, total: posts.length, next: null, prev: null } },
      }),
    })
  })
}

test.describe('News section', () => {
  test('/news renders the feed with mocked posts in published order', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page)

    await page.goto('/news')
    const feed = page.getByTestId('news-feed')
    await expect(feed).toBeVisible()

    const cards = page.getByTestId('news-post-card')
    await expect(cards).toHaveCount(POSTS.length)

    const titles = await page.getByTestId('news-post-title').allInnerTexts()
    expect(titles).toEqual(POSTS.map((p) => p.title))
  })

  test('emoji and mixed-case title renders as authored, not lowercased', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page)

    await page.goto('/news')
    const firstTitle = page.getByTestId('news-post-title').first()
    await expect(firstTitle).toHaveText('Sugar Daddy Sample Pack 📦')
    // innerText (unlike textContent) is transform-aware, so this also
    // guards against a `text-transform: lowercase` CSS rule leaking onto
    // post titles from the site chrome / Link component.
    expect(await firstTitle.innerText()).toBe('Sugar Daddy Sample Pack 📦')
  })

  test('top nav shows the news link and navigating to it does not reload the page', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page)

    await page.goto('/')
    // Navigation lives in the top bar; the landing page itself has no nav buttons.
    const newsLink = page.getByTestId('top-nav-link-news')
    await expect(newsLink).toBeVisible()

    // Mark the current document instance so we can prove SPA navigation
    // (no full reload) happened, matching the convention described in
    // navigation.spec.ts.
    await page.evaluate(() => {
      Object.assign(window, { __e2eNoReloadMarker: true })
    })

    await newsLink.click()
    await expect(page).toHaveURL(/\/news$/)
    await expect(page.getByTestId('news-feed')).toBeVisible()

    const markerSurvived = await page.evaluate(
      () => (window as unknown as { __e2eNoReloadMarker?: boolean }).__e2eNoReloadMarker === true
    )
    expect(markerSurvived).toBe(true)
  })

  test('clicking a card navigates to /news/<slug> and renders the article body', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page)

    await page.goto('/news')
    const publicPost = POSTS[0]
    await page.getByTestId('news-post-card').filter({ hasText: publicPost.title }).click()

    await expect(page).toHaveURL(new RegExp(`/news/${publicPost.slug}$`))

    const article = page.getByTestId('news-article')
    await expect(article).toBeVisible()
    await expect(article).toContainText('Full public post body about the sample pack.')

    const heading = page.locator('h1')
    await expect(heading).toHaveText(publicPost.title)
    expect(await heading.innerText()).toBe(publicPost.title)
  })

  test('a locked post shows the CTA and the /connect link', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page)

    await page.goto(`/news/${POSTS[1].slug}`)
    const article = page.getByTestId('news-article')
    await expect(article).toBeVisible()
    await expect(article).toContainText('Free preview: the first week was chaos.')

    const cta = page.getByTestId('news-locked-cta')
    await expect(cta).toBeVisible()
    await expect(cta.getByRole('link', { name: /connect/i })).toHaveAttribute('href', '/connect')
  })

  test('unknown slug shows the not-found state', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page)

    await page.goto('/news/this-slug-does-not-exist')
    const notFound = page.getByTestId('news-not-found')
    await expect(notFound).toBeVisible()
    await expect(notFound.getByRole('link', { name: /news/i })).toHaveAttribute('href', '/news')
  })

  test('browser back from an article returns to the feed', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page)

    await page.goto('/news')
    await page.getByTestId('news-post-card').first().click()
    await expect(page).toHaveURL(new RegExp(`/news/${POSTS[0].slug}$`))

    await page.goBack()

    await expect(page).toHaveURL(/\/news$/)
    await expect(page.getByTestId('news-feed')).toBeVisible()
  })

  test('feed API failure (500) shows the error state, not a blank screen', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page, { feedStatus: 500 })

    await page.goto('/news')
    await expect(page.getByTestId('news-error')).toBeVisible()
    await expect(page.getByTestId('news-feed')).toHaveCount(0)
  })

  test('feed API failure (429, brute-force block) shows the error state, not a blank screen', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page, { feedStatus: 429 })

    await page.goto('/news')
    await expect(page.getByTestId('news-error')).toBeVisible()
    await expect(page.getByTestId('news-feed')).toHaveCount(0)
  })

  test('empty feed shows the empty state', async ({ page }) => {
    await mockGuestMember(page)
    await mockGhostContent(page, { posts: [] })

    await page.goto('/news')
    await expect(page.getByTestId('news-empty')).toBeVisible()
  })
})
