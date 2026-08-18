import { test, expect } from '@playwright/test'

/**
 * Theme resolution.
 *
 * Precedence: stored preference ('catsky_theme' = light | dark) > OS prefers-color-scheme >
 * sun position (IANA timezone → coordinates) > light.
 *
 * Reaching the solar step requires an OS that expresses no preference. Playwright's
 * `colorScheme: 'no-preference'` is not enough: `no-preference` was dropped from the spec, so
 * Chromium still answers `(prefers-color-scheme: light)` with `matches: true` under it (verified).
 * `silenceOsPreference()` below therefore stubs `matchMedia` so both colour-scheme queries miss,
 * which is the only way this branch is observable end to end.
 *
 * London on 2026-06-21 (BST, UTC+1): sunrise 03:43Z, sunset 20:21Z.
 */

type Page = import('@playwright/test').Page

const LONDON_LOCAL_NOON = new Date('2026-06-21T11:00:00Z')
const LONDON_LOCAL_MIDNIGHT = new Date('2026-06-21T23:00:00Z')

const themeToggle = /^theme: (light|dark|system) — switch to (light|dark|system)$/

/**
 * Make every `prefers-color-scheme` query miss, from before the pre-paint script runs, so the
 * chain falls through the OS step exactly as it would on a platform that reports nothing.
 */
async function silenceOsPreference(page: Page) {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window)
    window.matchMedia = ((query: string) =>
      query.indexOf('prefers-color-scheme') === -1
        ? real(query)
        : {
            media: query,
            matches: false,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent: () => false,
          }) as typeof window.matchMedia
  })
}

async function loadWithClock(page: Page, now: Date) {
  await page.clock.setFixedTime(now)
  await page.goto('/')
  await page.getByRole('button', { name: themeToggle }).waitFor()
}

test.describe('Theme - the OS preference outranks the sun', () => {
  test.use({ timezoneId: 'Europe/London', colorScheme: 'dark' })

  test('is dark at midday when the OS asks for dark', async ({ page }) => {
    await loadWithClock(page, LONDON_LOCAL_NOON)

    // The sun is well up over London; the OS still wins.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'theme: system — switch to light' })).toBeVisible()
  })
})

test.describe('Theme - the OS preference outranks the sun after sunset too', () => {
  test.use({ timezoneId: 'Europe/London', colorScheme: 'light' })

  test('is light at midnight when the OS asks for light', async ({ page }) => {
    await loadWithClock(page, LONDON_LOCAL_MIDNIGHT)

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})

test.describe('Theme - the sun is the fallback when the OS says nothing', () => {
  test.use({ timezoneId: 'Europe/London', colorScheme: 'no-preference' })
  test.beforeEach(async ({ page }) => silenceOsPreference(page))

  test('is light while the sun is up', async ({ page }) => {
    await loadWithClock(page, LONDON_LOCAL_NOON)

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('is dark after sunset', async ({ page }) => {
    await loadWithClock(page, LONDON_LOCAL_MIDNIGHT)

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('caches the automatic result without pinning a preference', async ({ page }) => {
    await loadWithClock(page, LONDON_LOCAL_MIDNIGHT)

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    const storage = await page.evaluate(() => ({
      preference: localStorage.getItem('catsky_theme'),
      auto: localStorage.getItem('catsky_theme_auto'),
    }))

    expect(storage.preference).toBeNull()
    expect(storage.auto).toContain('dark')
  })
})

test.describe('Theme - light is the last resort', () => {
  test.use({ timezoneId: 'Indian/Kerguelen', colorScheme: 'no-preference' })
  test.beforeEach(async ({ page }) => silenceOsPreference(page))

  test('falls back to light when neither the OS nor the timezone table can answer', async ({
    page,
  }) => {
    await loadWithClock(page, LONDON_LOCAL_MIDNIGHT)

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})

test.describe('Theme - a stored preference outranks everything', () => {
  test.use({ timezoneId: 'Europe/London', colorScheme: 'dark' })

  test('pins the chosen mode across a reload even when the OS disagrees', async ({ page }) => {
    await loadWithClock(page, LONDON_LOCAL_NOON)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // system → light
    await page.getByRole('button', { name: 'theme: system — switch to light' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await page.evaluate(() => localStorage.getItem('catsky_theme'))).toBe('light')

    await page.reload()
    await page.getByRole('button', { name: themeToggle }).waitFor()

    // The OS still asks for dark; the stored preference outranks it.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('button', { name: 'theme: light — switch to dark' })).toBeVisible()
  })

  test('cycles light → dark → system and hands control back to the OS', async ({ page }) => {
    await loadWithClock(page, LONDON_LOCAL_NOON)

    await page.getByRole('button', { name: 'theme: system — switch to light' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await page.getByRole('button', { name: 'theme: light — switch to dark' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await page.evaluate(() => localStorage.getItem('catsky_theme'))).toBe('dark')

    await page.getByRole('button', { name: 'theme: dark — switch to system' }).click()
    await expect(page.getByRole('button', { name: 'theme: system — switch to light' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('catsky_theme'))).toBe('system')

    // Back on the OS preference, which is dark for this project.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})

test.describe('Theme - no flash before paint', () => {
  test.use({ timezoneId: 'Europe/London', colorScheme: 'dark' })

  test('has the stored preference applied as soon as the document is parsed', async ({ page }) => {
    await loadWithClock(page, LONDON_LOCAL_NOON)
    await page.evaluate(() => localStorage.setItem('catsky_theme', 'light'))

    await page.reload({ waitUntil: 'domcontentloaded' })

    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light')
  })

  test('has the OS preference applied as soon as the document is parsed', async ({ page }) => {
    await page.clock.setFixedTime(LONDON_LOCAL_NOON)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
    expect(await page.evaluate(() => localStorage.getItem('catsky_theme'))).toBeNull()
  })
})

test.describe('Theme - the pre-paint cache covers the solar path', () => {
  test.use({ timezoneId: 'Europe/London', colorScheme: 'no-preference' })
  test.beforeEach(async ({ page }) => silenceOsPreference(page))

  test('reuses the cached automatic result on the next visit', async ({ page }) => {
    await loadWithClock(page, LONDON_LOCAL_MIDNIGHT)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.reload({ waitUntil: 'domcontentloaded' })

    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
    expect(await page.evaluate(() => localStorage.getItem('catsky_theme'))).toBeNull()
  })
})
