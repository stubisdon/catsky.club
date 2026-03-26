import { test, expect } from '@playwright/test'

test.describe('Ghost portal empty-json fallbacks', () => {
  test('empty newsletters response remains json-parse safe', async ({ page }) => {
    await page.route('**/members/api/member/newsletters/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '',
      })
    })

    await page.goto('/connect')

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/members/api/member/newsletters/?newsletter=catsky', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsletters: ['catsky'] }),
        })
        const data = await response.json()
        return { ok: true, data }
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    })

    expect(result).toEqual({ ok: true, data: {} })
  })

  test('empty member session response still resolves to member-null payload', async ({ page }) => {
    await page.route('**/members/api/member/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '',
      })
    })

    await page.goto('/connect')

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/members/api/member/?refresh=true')
        const data = await response.json()
        return { ok: true, data }
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    })

    expect(result).toEqual({ ok: true, data: { member: null } })
  })
})
