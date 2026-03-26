import { test, expect } from '@playwright/test'

test.describe('Ghost portal empty-json fallbacks', () => {
  test('newsletter mutation payloads are not transformed by Portal hardening', async ({ page }) => {
    await page.route('**/members/api/member/newsletters/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          newsletters: [{ id: 'catsky', title: 'Catsky Club', subscribed: true }],
        }),
      })
    })

    await page.goto('/connect')

    const result = await page.evaluate(async () => {
      const response = await fetch('/members/api/member/newsletters/?newsletter=catsky', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletters: ['catsky'] }),
      })
      return response.json()
    })

    expect(result).toEqual({
      newsletters: [{ id: 'catsky', title: 'Catsky Club', subscribed: true }],
    })
  })

  test('empty newsletters response preserves native empty-body behavior', async ({ page }) => {
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
        const text = await response.clone().text()
        let jsonError = ''
        try {
          await response.json()
        } catch (error) {
          jsonError = String(error)
        }
        return { ok: true, text, jsonError }
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    })

    expect(result.ok).toBe(true)
    expect(result).toHaveProperty('text', '')
    expect(result).toHaveProperty('jsonError')
    expect(result.jsonError).toContain('SyntaxError')
  })

  test('member session payloads are passed through unchanged when non-empty', async ({ page }) => {
    await page.route('**/members/api/member/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: {
            id: 'm_1',
            newsletters: [{ id: 'catsky', title: 'Catsky Club', subscribed: false }],
          },
        }),
      })
    })

    await page.goto('/connect')

    const result = await page.evaluate(async () => {
      const response = await fetch('/members/api/member/?refresh=true')
      return response.json()
    })

    expect(result).toEqual({
      member: {
        id: 'm_1',
        newsletters: [{ id: 'catsky', title: 'Catsky Club', subscribed: false }],
      },
    })
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
