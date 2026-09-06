#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright'

/**
 * Reproducible UX screenshot evidence for the /read (blog) section.
 *
 * Modelled on capture-ui-journey-screenshots.mjs: same dev-server bootstrap,
 * same readiness-wait logic, same logging style. The one deliberate
 * difference is that this script never calls waitForLoadState('networkidle')
 * — the dev server proxies Ghost Portal's settings call to the live site,
 * so the page never reaches network idle here and every such wait times
 * out. We wait on the actual data-testid elements instead, exactly as
 * e2e/read.spec.ts does.
 *
 * The live Ghost Content API cannot be used for this either: our IP is
 * currently inside Ghost's brute-force block and returns HTTP 429 for
 * every content request. So every Ghost request is intercepted with
 * page.route and fulfilled with fixtures that mirror the real production
 * response shape, reusing the same fixtures as e2e/read.spec.ts.
 */

const HOST = process.env.PLAYWRIGHT_WEB_HOST || '127.0.0.1'
const PORT = Number(process.env.PLAYWRIGHT_WEB_PORT || 3000)
const BASE_URL = `http://${HOST}:${PORT}`
const OUTPUT_DIR = process.env.READ_SCREENSHOT_OUTPUT_DIR || 'artifacts/read-journey'
const SERVER_READY_TIMEOUT_MS = Number(process.env.READ_SCREENSHOT_READY_TIMEOUT_MS || 120000)
const ELEMENT_READY_TIMEOUT_MS = Number(process.env.READ_SCREENSHOT_ELEMENT_TIMEOUT_MS || 15000)

// Ordered newest-first, matching the real feed's `order=published_at desc`.
// Fixtures reuse the same shape and content as e2e/read.spec.ts: id, slug,
// title, excerpt, feature_image, feature_image_alt, published_at,
// visibility, access (plus html on the single-post response).
const POSTS = [
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
const DETAIL_HTML = {
  'sugar-daddy-sample-pack': '<p>Full public post body about the sample pack.</p>',
  'studio-session-notes': '<p>Free preview: the first week was chaos.</p>',
  'track-breakdown-motherless-child': '',
  'inside-the-demo-vault': '',
  'why-catsky-exists': '<p>Full body text about the Catsky mission.</p>',
}

// A 1x1 transparent PNG. Feature images must be served locally: a real
// outbound image request never settles in this environment.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

function mockGhostImages(page) {
  return page.route('**/content/images/**', (route) => {
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
  })
}

function mockGuestMember(page) {
  return page.route('**/members/api/member/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ member: null }),
    })
  })
}

/**
 * Intercepts the `ghost/api/content/posts` glob and distinguishes the feed
 * request (`/ghost/api/content/posts/?...`) from the single-post request
 * (`/ghost/api/content/posts/slug/<slug>/?...`) by inspecting the request
 * pathname, exactly as the two real Ghost Content API endpoints differ.
 */
function mockGhostContent(page) {
  void mockGhostImages(page)

  return page.route('**/ghost/api/content/posts/**', (route) => {
    const url = new URL(route.request().url())
    const slugMatch = url.pathname.match(/\/posts\/slug\/([^/]+)\/?$/)

    if (slugMatch) {
      const slug = decodeURIComponent(slugMatch[1])
      const summary = POSTS.find((p) => p.slug === slug)

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
        body: JSON.stringify({ posts: [{ ...summary, html: DETAIL_HTML[slug] ?? '' }] }),
      })
    }

    // Feed request.
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        posts: POSTS,
        meta: { pagination: { page: 1, limit: 'all', pages: 1, total: POSTS.length, next: null, prev: null } },
      }),
    })
  })
}

function requestOnce(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
        })
      })
    })
    req.on('error', reject)
    req.setTimeout(3000, () => req.destroy(new Error('request timeout')))
  })
}

async function isServerAlreadyRunning(url) {
  try {
    const response = await requestOnce(url)
    return response.statusCode >= 200 && response.statusCode < 500 && response.body.includes('<div id="root"></div>')
  } catch {
    return false
  }
}

async function waitForReadiness(url) {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await requestOnce(url)
      if (response.statusCode >= 200 && response.statusCode < 500 && response.body.includes('<div id="root"></div>')) {
        return
      }
      lastError = new Error(`Unexpected readiness response: ${response.statusCode}`)
    } catch (error) {
      lastError = error
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  const details = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`Timed out waiting for ${url}. Last error: ${details}`)
}

function terminate(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return
  }
  child.kill('SIGTERM')
}

async function shutdownServer(child) {
  if (!child || child.exitCode !== null) {
    return
  }

  terminate(child)

  await new Promise((resolve) => {
    const forceKillTimer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL')
      }
    }, 5000)

    child.once('exit', () => {
      clearTimeout(forceKillTimer)
      resolve()
    })
  })
}

async function waitForTestId(page, testId, label) {
  try {
    await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: ELEMENT_READY_TIMEOUT_MS, state: 'visible' })
  } catch {
    throw new Error(`Expected element for "${label}" (data-testid="${testId}") never appeared`)
  }
}

/**
 * This app renders into a `.app-container` that is `position: fixed;
 * height: 100vh; overflow: hidden`, with the actual page content in a
 * nested div that scrolls internally (`max-height: 100vh; overflow-y:
 * auto`). The document itself never grows, so Playwright's
 * `page.screenshot({ fullPage: true })` only ever captures one viewport's
 * worth of content — anything below the fold is silently clipped instead
 * of being included.
 *
 * To get a real full-content screenshot when a page is taller than the
 * viewport, we measure the scrollable content's height, grow the
 * viewport to match (the fixed `100vh` container grows with it, so
 * `overflow-y: auto` never needs to kick in), then take a normal
 * (non-fullPage) screenshot. The viewport is restored afterwards so the
 * next capture starts from a clean baseline.
 */
async function captureContentScreenshot(page, filePath, baseViewport) {
  await page.setViewportSize(baseViewport)

  // Let any mocked images finish loading so their rendered size (and thus
  // the content's scrollHeight) is accurate before we measure it.
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete))

  const contentHeight = await page.evaluate(() => {
    const content = document.querySelector('.app-container')?.firstElementChild
    return content ? Math.ceil(content.scrollHeight) : document.documentElement.scrollHeight
  })

  const targetHeight = Math.max(baseViewport.height, contentHeight)
  if (targetHeight > baseViewport.height) {
    await page.setViewportSize({ width: baseViewport.width, height: targetHeight })
  }

  await page.screenshot({
    path: filePath,
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  })

  if (targetHeight > baseViewport.height) {
    await page.setViewportSize(baseViewport)
  }
}

async function run() {
  let server = null
  let reusedServer = false

  if (await isServerAlreadyRunning(`${BASE_URL}/`)) {
    reusedServer = true
    console.log(`[read-screenshots] Reusing existing dev server at ${BASE_URL}`)
  } else {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', HOST, '--port', String(PORT), '--strictPort'], {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: process.env,
    })
  }

  const shutdown = () => terminate(server)
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  try {
    await waitForReadiness(`${BASE_URL}/`)

    await mkdir(OUTPUT_DIR, { recursive: true })

    const browser = await chromium.launch({ headless: true })

    // --- 01: home page, showing the new `read` nav button (desktop) ---
    const desktopViewport = { width: 1440, height: 900 }
    const desktopContext = await browser.newContext({ viewport: desktopViewport })
    const desktopPage = await desktopContext.newPage()
    await desktopPage.emulateMedia({ reducedMotion: 'reduce' })
    await mockGuestMember(desktopPage)
    await mockGhostContent(desktopPage)

    await desktopPage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await desktopPage.waitForSelector('a:has-text("read")', { timeout: ELEMENT_READY_TIMEOUT_MS, state: 'visible' })
    await captureContentScreenshot(desktopPage, path.join(OUTPUT_DIR, '01-home-with-read-link.png'), desktopViewport)
    console.log('[read-screenshots] Captured Home page entry state (read nav link visible): 01-home-with-read-link.png')

    // --- 02: /read feed, desktop ---
    await desktopPage.goto(`${BASE_URL}/read`, { waitUntil: 'domcontentloaded' })
    await waitForTestId(desktopPage, 'read-feed', 'read feed')
    await captureContentScreenshot(desktopPage, path.join(OUTPUT_DIR, '02-read-feed.png'), desktopViewport)
    console.log('[read-screenshots] Captured Read feed (desktop): 02-read-feed.png')

    // --- 03: /read/<slug> unlocked article ---
    const unlockedSlug = POSTS[0].slug
    await desktopPage.goto(`${BASE_URL}/read/${unlockedSlug}`, { waitUntil: 'domcontentloaded' })
    await waitForTestId(desktopPage, 'read-article', 'unlocked article')
    await captureContentScreenshot(desktopPage, path.join(OUTPUT_DIR, '03-read-article.png'), desktopViewport)
    console.log(`[read-screenshots] Captured unlocked article (${unlockedSlug}): 03-read-article.png`)

    // --- 04: /read/<slug> locked article, showing the locked CTA ---
    const lockedSlug = POSTS[1].slug
    await desktopPage.goto(`${BASE_URL}/read/${lockedSlug}`, { waitUntil: 'domcontentloaded' })
    await waitForTestId(desktopPage, 'read-locked-cta', 'locked CTA')
    await captureContentScreenshot(desktopPage, path.join(OUTPUT_DIR, '04-read-article-locked.png'), desktopViewport)
    console.log(`[read-screenshots] Captured locked article (${lockedSlug}): 04-read-article-locked.png`)

    await desktopContext.close()

    // --- 05: /read feed, mobile viewport ---
    const mobileViewport = { width: 390, height: 844 }
    const mobileContext = await browser.newContext({ viewport: mobileViewport })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.emulateMedia({ reducedMotion: 'reduce' })
    await mockGuestMember(mobilePage)
    await mockGhostContent(mobilePage)

    await mobilePage.goto(`${BASE_URL}/read`, { waitUntil: 'domcontentloaded' })
    await waitForTestId(mobilePage, 'read-feed', 'read feed (mobile)')
    await captureContentScreenshot(mobilePage, path.join(OUTPUT_DIR, '05-read-feed-mobile.png'), mobileViewport)
    console.log('[read-screenshots] Captured Read feed (mobile, 390x844): 05-read-feed-mobile.png')

    await mobileContext.close()
    await browser.close()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[read-screenshots] Failed to capture read section screenshots: ${message}`)
    process.exitCode = 1
  } finally {
    if (!reusedServer) {
      await shutdownServer(server)
    }
  }
}

run()
