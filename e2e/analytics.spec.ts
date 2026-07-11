import { expect, test, type Page } from '@playwright/test'

type AnalyticsEvent = {
  eventName: string
  properties?: Record<string, unknown>
}

async function installAnalyticsCapture(page: Page) {
  await page.addInitScript(() => {
    const analyticsWindow = window as Window & {
      __catskyAnalyticsEvents?: Array<{ eventName: string; properties?: Record<string, unknown> }>
      __CATSKY_ANALYTICS_CAPTURE__?: (eventName: string, properties?: Record<string, unknown>) => void
    }
    analyticsWindow.__catskyAnalyticsEvents = []
    analyticsWindow.__CATSKY_ANALYTICS_CAPTURE__ = (eventName, properties) => {
      analyticsWindow.__catskyAnalyticsEvents?.push({ eventName, properties })
    }
  })
}

async function analyticsEvents(page: Page): Promise<AnalyticsEvent[]> {
  return page.evaluate(() => {
    const analyticsWindow = window as Window & {
      __catskyAnalyticsEvents?: AnalyticsEvent[]
    }
    return analyticsWindow.__catskyAnalyticsEvents || []
  })
}

async function waitForAnalyticsEvent(page: Page, eventName: string, path?: string) {
  await page.waitForFunction(
    ({ expectedEventName, expectedPath }) => {
      const analyticsWindow = window as Window & {
        __catskyAnalyticsEvents?: AnalyticsEvent[]
      }
      return (analyticsWindow.__catskyAnalyticsEvents || []).some((event) => {
        if (event.eventName !== expectedEventName) return false
        if (!expectedPath) return true
        return event.properties?.path === expectedPath
      })
    },
    { expectedEventName: eventName, expectedPath: path },
  )
}

test.describe('PostHog analytics', () => {
  test.beforeEach(async ({ page }) => {
    await installAnalyticsCapture(page)
    await page.route('**/posthog/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      })
    })
  })

  test('visiting home records one pageview', async ({ page }) => {
    await page.goto('/')
    await waitForAnalyticsEvent(page, '$pageview', '/')

    const homePageviews = (await analyticsEvents(page)).filter(
      (event) => event.eventName === '$pageview' && event.properties?.path === '/',
    )
    expect(homePageviews).toHaveLength(1)
  })

  test('clicking listen records a button click and listen pageview', async ({ page }) => {
    await page.goto('/')
    await waitForAnalyticsEvent(page, '$pageview', '/')

    await page.getByRole('link', { name: 'listen' }).click()
    await waitForAnalyticsEvent(page, '$pageview', '/listen')

    const events = await analyticsEvents(page)
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'button_clicked',
        properties: expect.objectContaining({
          label: 'listen',
          href_type: 'internal',
          path: '/',
        }),
      }),
    )
  })

  test('signup and login buttons record click events', async ({ page }) => {
    await page.goto('/connect')
    await waitForAnalyticsEvent(page, '$pageview', '/connect')

    await page.getByRole('button', { name: 'sign up →' }).click()
    await page.getByRole('button', { name: 'cancel' }).click()
    await page.getByRole('button', { name: 'log in →' }).click()

    const labels = (await analyticsEvents(page))
      .filter((event) => event.eventName === 'button_clicked')
      .map((event) => event.properties?.label)
    expect(labels).toContain('sign up →')
    expect(labels).toContain('log in →')
  })

  test('free-member upgrade CTA records Portal target', async ({ page }) => {
    await page.unroute('**/members/api/member**')
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { id: 'free-member', uuid: 'free-member-uuid', email: 'free@example.com', subscriptions: [] },
        }),
      })
    })

    await page.goto('/connect')
    await expect(page.getByRole('link', { name: 'upgrade to $5/month to unlock the music video' })).toBeVisible()
    await page.getByRole('link', { name: 'upgrade to $5/month to unlock the music video' }).click()

    await page.waitForFunction(() => {
      const analyticsWindow = window as Window & {
        __catskyAnalyticsEvents?: AnalyticsEvent[]
      }
      return (analyticsWindow.__catskyAnalyticsEvents || []).some(
        (event) =>
          event.eventName === 'ghost_portal_trigger_clicked' &&
          event.properties?.portal_target === 'account/plans',
      )
    })
  })

  test('Portal hash open and close transitions are tracked', async ({ page }) => {
    await page.goto('/connect')
    await waitForAnalyticsEvent(page, '$pageview', '/connect')

    await page.evaluate(() => {
      window.location.hash = '#/portal/signin'
    })
    await page.waitForFunction(() => {
      const analyticsWindow = window as Window & {
        __catskyAnalyticsEvents?: AnalyticsEvent[]
      }
      return (analyticsWindow.__catskyAnalyticsEvents || []).some(
        (event) => event.eventName === 'ghost_portal_opened' && event.properties?.portal_target === 'signin',
      )
    })

    await page.evaluate(() => {
      window.location.hash = ''
    })
    await page.waitForFunction(() => {
      const analyticsWindow = window as Window & {
        __catskyAnalyticsEvents?: AnalyticsEvent[]
      }
      return (analyticsWindow.__catskyAnalyticsEvents || []).some(
        (event) => event.eventName === 'ghost_portal_closed' && event.properties?.portal_target === 'signin',
      )
    })
  })

  test('Portal transitions are tracked from the listen account link', async ({ page }) => {
    await page.unroute('**/members/api/member**')
    await page.route('**/members/api/member**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { id: 'free-member', uuid: 'free-member-uuid', email: 'free@example.com', subscriptions: [] },
        }),
      })
    })

    await page.goto('/listen')
    await expect(page.getByRole('link', { name: 'account' })).toBeVisible()
    await page.getByRole('link', { name: 'account' }).click()
    await page.waitForFunction(() => {
      const analyticsWindow = window as Window & {
        __catskyAnalyticsEvents?: AnalyticsEvent[]
      }
      return (analyticsWindow.__catskyAnalyticsEvents || []).some(
        (event) => event.eventName === 'ghost_portal_opened' && event.properties?.portal_target === 'account',
      )
    })

    await page.evaluate(() => {
      window.location.hash = ''
    })
    await page.waitForFunction(() => {
      const analyticsWindow = window as Window & {
        __catskyAnalyticsEvents?: AnalyticsEvent[]
      }
      return (analyticsWindow.__catskyAnalyticsEvents || []).some(
        (event) =>
          event.eventName === 'ghost_portal_session_refreshed' &&
          event.properties?.portal_target === 'account',
      )
    })
  })
})
