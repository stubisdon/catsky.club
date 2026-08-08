import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  register: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}))

const subscriptionMocks = vi.hoisted(() => ({
  getMembershipTier: vi.fn(),
  getCurrentMember: vi.fn(),
}))

vi.mock('posthog-js', () => ({
  default: posthogMock,
}))

vi.mock('./subscription', () => ({
  getMembershipTier: subscriptionMocks.getMembershipTier,
  getCurrentMember: subscriptionMocks.getCurrentMember,
}))

async function loadAnalytics() {
  return import('./analytics')
}

function setWindowUrl(url: string) {
  const maybeHappyDOM = window as Window & { happyDOM?: { setURL: (url: string) => void } }
  maybeHappyDOM.happyDOM?.setURL(url)
}

describe('analytics', () => {
  let cleanup: (() => void) | null = null

  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    document.body.innerHTML = ''
    setWindowUrl('http://localhost/')
    window.history.replaceState({}, '', '/')
    subscriptionMocks.getMembershipTier.mockResolvedValue('none')
    subscriptionMocks.getCurrentMember.mockResolvedValue(null)
    cleanup = null
  })

  afterEach(() => {
    cleanup?.()
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('no-ops when the token is missing', async () => {
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()
    analytics.trackPageView({ path: '/' })

    expect(posthogMock.init).not.toHaveBeenCalled()
    expect(posthogMock.capture).not.toHaveBeenCalled()
    expect(analytics.isAnalyticsEnabled()).toBe(false)
  })

  it('stays disabled on localhost unless explicitly enabled', async () => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()

    expect(posthogMock.init).not.toHaveBeenCalled()
    expect(analytics.isAnalyticsEnabled()).toBe(false)
  })

  it('stays disabled in Vite dev mode on non-local hosts unless explicitly enabled', async () => {
    setWindowUrl('https://preview.catsky.test/')
    expect(window.location.hostname).toBe('preview.catsky.test')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('MODE', 'development')
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()

    expect(posthogMock.init).not.toHaveBeenCalled()
    expect(analytics.isAnalyticsEnabled()).toBe(false)
  })

  it('can be explicitly enabled on localhost', async () => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_ENABLED', 'true')
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()

    expect(posthogMock.init).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        capture_pageview: false,
        autocapture: true,
      }),
    )
    expect(analytics.isAnalyticsEnabled()).toBe(true)
  })

  it('does not capture events before initialization', async () => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_ENABLED', 'true')
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.trackPageView({ path: '/' })

    expect(posthogMock.capture).not.toHaveBeenCalled()
  })

  it('captures safe button metadata from the document click listener', async () => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_ENABLED', 'true')
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()
    document.body.innerHTML = '<button data-analytics-id="hero-listen" aria-label="Listen now">ignored text</button>'
    document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(posthogMock.capture).toHaveBeenCalledWith('button_clicked', {
      label: 'Listen now',
      element_type: 'button',
      path: '/',
      href_type: 'none',
      portal_target: undefined,
      analytics_id: 'hero-listen',
    })
  })

  it('ignores hidden Ghost Portal trigger clicks', async () => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_ENABLED', 'true')
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()
    document.body.innerHTML = `
      <div id="ghost-portal-triggers">
        <button data-portal="account/plans" type="button">plans</button>
      </div>
    `
    document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(posthogMock.capture).not.toHaveBeenCalled()
  })

  it('does not include form input values in click metadata', async () => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_ENABLED', 'true')
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()
    document.body.innerHTML = `
      <form>
        <input type="email" value="ada@example.com" />
        <button type="submit">send magic link</button>
      </form>
    `
    document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(JSON.stringify(posthogMock.capture.mock.calls)).not.toContain('ada@example.com')
  })

  it('tracks Portal hash transitions globally and refreshes session analytics', async () => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_ENABLED', 'true')
    subscriptionMocks.getMembershipTier
      .mockResolvedValueOnce('free')
      .mockResolvedValueOnce('paid_5')
    subscriptionMocks.getCurrentMember.mockResolvedValue({ uuid: 'member-uuid' })
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()
    window.location.hash = '#/portal/account'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await Promise.resolve()
    window.location.hash = ''
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    await vi.advanceTimersByTimeAsync(300)

    expect(posthogMock.capture).toHaveBeenCalledWith('ghost_portal_opened', { portal_target: 'account' })
    expect(posthogMock.capture).toHaveBeenCalledWith('ghost_portal_closed', { portal_target: 'account' })
    expect(posthogMock.capture).toHaveBeenCalledWith('ghost_portal_session_refreshed', {
      portal_target: 'account',
      previous_membership_tier: 'free',
      membership_tier: 'paid_5',
      changed: true,
    })
    expect(posthogMock.identify).toHaveBeenCalledWith('member-uuid', { membership_tier: 'paid_5' })
  })

  it('identifies members with stable ids only', async () => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_ENABLED', 'true')
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()
    analytics.identifyMember({ uuid: 'member-uuid', id: 'member-id', email: 'ada@example.com' } as never, 'paid_5')

    expect(posthogMock.register).toHaveBeenCalledWith({ membership_tier: 'paid_5' })
    expect(posthogMock.identify).toHaveBeenCalledWith('member-uuid', { membership_tier: 'paid_5' })
    expect(JSON.stringify(posthogMock.identify.mock.calls)).not.toContain('ada@example.com')
  })

  it('resets stored member identity when no stable member id is available', async () => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_ENABLED', 'true')
    const analytics = await loadAnalytics()
    cleanup = analytics.resetAnalyticsForTests

    analytics.initAnalytics()
    analytics.identifyMember({ uuid: 'member-uuid' }, 'paid_5')
    analytics.identifyMember(null, 'none')

    expect(posthogMock.reset).toHaveBeenCalledTimes(1)
    expect(posthogMock.register).toHaveBeenLastCalledWith({ membership_tier: 'none' })
  })

  it('resets identity only when enabled', async () => {
    const disabledAnalytics = await loadAnalytics()
    cleanup = disabledAnalytics.resetAnalyticsForTests
    disabledAnalytics.resetAnalyticsIdentity()
    expect(posthogMock.reset).not.toHaveBeenCalled()

    vi.resetModules()
    vi.stubEnv('VITE_PUBLIC_POSTHOG_TOKEN', 'test-token')
    vi.stubEnv('VITE_PUBLIC_POSTHOG_ENABLED', 'true')
    const enabledAnalytics = await loadAnalytics()
    cleanup = enabledAnalytics.resetAnalyticsForTests
    enabledAnalytics.initAnalytics()
    enabledAnalytics.resetAnalyticsIdentity()

    expect(posthogMock.reset).toHaveBeenCalledTimes(1)
  })
})
