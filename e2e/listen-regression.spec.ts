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

  test('listen content panel stays within the viewport without padding-induced overflow', async ({ page }) => {
    await page.goto('/listen')

    const metrics = await page.locator('.app-container > div').first().evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        viewportHeight: window.innerHeight,
      }
    })

    expect(metrics.top).toBeGreaterThanOrEqual(0)
    expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight)
    expect(metrics.height).toBeLessThanOrEqual(metrics.viewportHeight)
  })
})
