import { test, expect } from '@playwright/test'

test.describe('Listen page regressions', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })
  })

  test('clicking a public track opens the SoundCloud player near the top of the page', async ({ page }) => {
    await page.goto('/listen')

    const introTrack = page.locator('div').filter({ hasText: /^Intro$/ }).first()
    await introTrack.click()

    const player = page.locator('iframe[title*="SoundCloud player"]').first()
    await expect(player).toBeVisible()

    const playerTop = await player.evaluate((el) => el.getBoundingClientRect().top)
    expect(playerTop).toBeLessThan(500)
  })

  test('selected player renders before the full track list to avoid extra inner-scroll growth', async ({ page }) => {
    await page.goto('/listen')

    await page.locator('div').filter({ hasText: /^Baby Mama$/ }).first().click()

    const content = page.locator('.app-container > div').first()
    const order = await content.evaluate((el) => {
      const children = Array.from(el.children)
      const playerIndex = children.findIndex((child) => child.querySelector('iframe[title*="SoundCloud player"]'))
      const listIndex = children.findIndex((child) => child.querySelector('div[style*="flex-direction: column"]'))
      return { playerIndex, listIndex }
    })

    expect(order.playerIndex).toBeGreaterThan(-1)
    expect(order.listIndex).toBeGreaterThan(-1)
    expect(order.playerIndex).toBeLessThan(order.listIndex)
  })

  test('listen page avoids a phantom scrollbar even when desktop browsers render larger text', async ({ page }) => {
    await page.setViewportSize({ width: 1728, height: 900 })
    await page.goto('/listen')
    await page.addStyleTag({ content: 'body { font-size: 28px !important; }' })

    const metrics = await page.locator('.listen-page-shell > div').first().evaluate((el) => ({
      panelScrollHeight: el.scrollHeight,
      panelClientHeight: el.clientHeight,
      panelOverflowAmount: el.scrollHeight - el.clientHeight,
      windowInnerHeight: window.innerHeight,
      bodyScrollHeight: document.body.scrollHeight,
      bodyClientHeight: document.body.clientHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      documentClientHeight: document.documentElement.clientHeight,
    }))

    expect(metrics.panelScrollHeight).toBe(metrics.panelClientHeight)
    expect(metrics.panelOverflowAmount).toBe(0)
    expect(metrics.bodyScrollHeight).toBe(metrics.windowInnerHeight)
    expect(metrics.bodyClientHeight).toBe(metrics.windowInnerHeight)
    expect(metrics.documentScrollHeight).toBe(metrics.windowInnerHeight)
    expect(metrics.documentClientHeight).toBe(metrics.windowInnerHeight)
  })

  test('free-member listen page also stays scrollbar-free with account chrome visible', async ({ page }) => {
    await page.route('**/members/api/member/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'free-member',
            email: 'member@example.com',
            subscriptions: [],
          },
        }),
      })
    })

    await page.setViewportSize({ width: 1728, height: 900 })
    await page.goto('/listen')
    await page.addStyleTag({ content: 'body { font-size: 28px !important; }' })

    const metrics = await page.locator('.listen-page-shell > div').first().evaluate((el) => ({
      panelScrollHeight: el.scrollHeight,
      panelClientHeight: el.clientHeight,
      bodyScrollHeight: document.body.scrollHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      windowInnerHeight: window.innerHeight,
    }))

    expect(metrics.panelScrollHeight).toBe(metrics.panelClientHeight)
    expect(metrics.bodyScrollHeight).toBe(metrics.windowInnerHeight)
    expect(metrics.documentScrollHeight).toBe(metrics.windowInnerHeight)
  })

  test('listen content panel stays top-anchored so the track list does not waste viewport height', async ({ page }) => {
    await page.goto('/listen')

    const metrics = await page.locator('.listen-page-shell > div').first().evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const heading = el.querySelector('h1')
      const headingRect = heading?.getBoundingClientRect()
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        viewportHeight: window.innerHeight,
        headingTop: headingRect?.top ?? null,
      }
    })

    expect(metrics.top).toBe(0)
    expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight)
    expect(metrics.height).toBeLessThanOrEqual(metrics.viewportHeight)
    expect(metrics.headingTop).not.toBeNull()
    expect(metrics.headingTop!).toBeLessThan(80)
  })
})
