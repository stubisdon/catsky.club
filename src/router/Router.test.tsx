import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Router from './Router'
import { resolveView } from './resolveView'

const analytics = vi.hoisted(() => ({
  trackPageView: vi.fn(),
  getCurrentMember: vi.fn(),
}))

const utils = vi.hoisted(() => ({
  getMembershipTier: vi.fn(),
}))

vi.mock('../App', () => ({ default: () => <div>home view</div> }))
vi.mock('../Watch', () => ({ default: () => <div>watch view</div> }))
vi.mock('../Video', () => ({ default: () => <div>video view</div> }))
vi.mock('../Connect', () => ({
  default: ({ failedAuthCallback }: { failedAuthCallback?: { action: string; success: boolean } | null }) => (
    <div>connect view {failedAuthCallback?.success === false ? 'failed callback' : ''}</div>
  ),
}))
vi.mock('../Mission', () => ({ default: () => <div>mission view</div> }))
vi.mock('../Listen', () => ({ default: () => <div>listen view</div> }))
vi.mock('../Welcome', () => ({ default: () => <div>welcome view</div> }))
vi.mock('../utils/analytics', () => ({
  trackPageView: analytics.trackPageView,
}))
vi.mock('../utils', () => ({
  getCurrentMember: analytics.getCurrentMember,
  getMembershipTier: utils.getMembershipTier,
}))

describe('Router signup callback normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    analytics.getCurrentMember.mockResolvedValue({ name: '' })
    utils.getMembershipTier.mockResolvedValue('none')
    delete window.__catskyAuthCallback
    window.history.replaceState({}, '', '/connect')
  })

  it.each([
    ['/', 'signup', 'welcome'],
    ['/connect', 'signup', 'welcome'],
    ['/listen', 'signup', 'welcome'],
    ['/watch', 'signup', 'welcome'],
    ['/', 'signin', 'listen'],
    ['/connect', 'signin', 'listen'],
    ['/listen', 'signin', 'listen'],
    ['/watch', 'signin', 'listen'],
  ] as const)('resolves %s %s callbacks without reading captured global state', (pathname, action, view) => {
    window.__catskyAuthCallback = { action: action === 'signup' ? 'signin' : 'signup', success: true }

    expect(resolveView(pathname, `?action=${action}&success=true`)).toMatchObject({ view })
  })

  it.each([
    ['/', '?action=signup&success=false'],
    ['/connect', '?success=false&action=signup'],
    ['/watch', '?action=signin&success=false'],
  ])('routes failed callbacks to connect: %s%s', (pathname, search) => {
    expect(resolveView(pathname, search)).toMatchObject({
      view: 'connect',
    })
  })

  it.each([
    ['/', 'home'],
    ['/listen', 'listen'],
  ] as const)('leaves unrelated callback-shaped params on their normal view', (pathname, view) => {
    expect(resolveView(pathname, '?action=other&success=true')).toMatchObject({ view })
  })

  it('preserves unrelated query params while normalizing auth callbacks', () => {
    expect(resolveView('/', '?stripe=success&action=signup&success=true')).toEqual({
      view: 'welcome',
      normalizedPath: '/welcome?stripe=success',
    })
    expect(resolveView('/listen', '?source=email&action=signin&success=true')).toEqual({
      view: 'listen',
      normalizedPath: '/listen?source=email',
    })
  })

  it.each([
    [null],
    [undefined],
    [''],
    ['   '],
  ])('routes signup callbacks with an unknown or blank member name to welcome', (memberName) => {
    expect(resolveView('/', '?action=signup&success=true', undefined, memberName)).toMatchObject({
      view: 'welcome',
    })
  })

  it('routes signup callbacks with a saved member name to listen', () => {
    expect(resolveView('/', '?action=signup&success=true', undefined, 'Ada')).toMatchObject({
      view: 'listen',
    })
  })

  it('captures the initial pageview once and does not duplicate the same URL', async () => {
    window.history.replaceState({}, '', '/')

    render(<Router />)

    await waitFor(() => {
      expect(analytics.trackPageView).toHaveBeenCalledTimes(1)
    })
    expect(analytics.trackPageView).toHaveBeenCalledWith({
      path: '/',
      search_present: false,
      hash_present: false,
      view: 'home',
      normalized: false,
    })

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(analytics.trackPageView).toHaveBeenCalledTimes(1)
  })

  it('captures pageviews for popstate route changes', async () => {
    window.history.replaceState({}, '', '/')

    render(<Router />)

    await waitFor(() => {
      expect(analytics.trackPageView).toHaveBeenCalledTimes(1)
    })

    window.history.pushState({}, '', '/listen')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => {
      expect(screen.getByText('listen view')).toBeInTheDocument()
      expect(analytics.trackPageView).toHaveBeenCalledTimes(2)
    })
    expect(analytics.trackPageView).toHaveBeenLastCalledWith({
      path: '/listen',
      search_present: false,
      hash_present: false,
      view: 'listen',
      normalized: false,
    })
  })

  it('renders welcome immediately for signup callbacks and normalizes the URL', async () => {
    window.history.replaceState({}, '', '/connect?action=signup&success=true')

    render(<Router />)

    await waitFor(() => {
      expect(screen.getByText('welcome view')).toBeInTheDocument()
      expect(window.location.pathname).toBe('/welcome')
      expect(window.location.search).toBe('')
    })
    expect(analytics.trackPageView).toHaveBeenCalledWith({
      path: '/welcome',
      search_present: false,
      hash_present: false,
      view: 'welcome',
      normalized: true,
    })
  })

  it('uses the inline callback handoff and clears it after a signup callback is consumed', async () => {
    window.__catskyAuthCallback = { action: 'signup', success: true }
    window.history.replaceState({}, '', '/?stripe=success')

    render(<Router />)

    await waitFor(() => {
      expect(screen.getByText('welcome view')).toBeInTheDocument()
      expect(window.location.pathname).toBe('/welcome')
      expect(window.location.search).toBe('?stripe=success')
      expect(window.__catskyAuthCallback).toBeUndefined()
    })
  })

  it('keeps the Portal hash while stripping signin callback params', async () => {
    window.history.replaceState({}, '', '/connect?action=signin&success=true#/portal/account')

    render(<Router />)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/listen')
      expect(window.location.search).toBe('')
      expect(window.location.hash).toBe('#/portal/account')
    })
  })

  it('skips welcome for a named signup member and falls back to welcome when member resolution fails', async () => {
    analytics.getCurrentMember.mockResolvedValueOnce({ name: 'Ada Lovelace' })
    window.history.replaceState({}, '', '/?action=signup&success=true')
    const { unmount } = render(<Router />)
    await waitFor(() => expect(screen.getByText('listen view')).toBeInTheDocument())
    unmount()

    analytics.getCurrentMember.mockResolvedValueOnce(null)
    window.history.replaceState({}, '', '/?action=signup&success=true')
    render(<Router />)
    await waitFor(() => expect(screen.getByText('welcome view')).toBeInTheDocument())
  })

  it('falls back to welcome after a rejected signup member request', async () => {
    analytics.getCurrentMember.mockRejectedValueOnce(new Error('member request failed'))
    window.history.replaceState({}, '', '/?action=signup&success=true')

    render(<Router />)

    await waitFor(() => expect(screen.getByText('welcome view')).toBeInTheDocument())
    expect(screen.queryByText('connecting…')).not.toBeInTheDocument()
  })

  it('falls back to welcome after the signup member request times out', async () => {
    vi.useFakeTimers()
    analytics.getCurrentMember.mockImplementationOnce(() => new Promise(() => {}))
    window.history.replaceState({}, '', '/?action=signup&success=true')

    render(<Router />)
    expect(screen.getByText('connecting…')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })

    expect(screen.getByText('welcome view')).toBeInTheDocument()
    expect(screen.queryByText('connecting…')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('clears failed callbacks so later navigation is not forced back to connect', async () => {
    window.__catskyAuthCallback = { action: 'signup', success: false }
    window.history.replaceState({}, '', '/connect')

    render(<Router />)

    await waitFor(() => expect(screen.getByText(/connect view/)).toBeInTheDocument())
    expect(window.__catskyAuthCallback).toBeUndefined()

    window.history.pushState({}, '', '/listen')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => expect(screen.getByText('listen view')).toBeInTheDocument())
  })

  it('uses the captured failed callback even if a child clears the global handoff first', async () => {
    window.__catskyAuthCallback = { action: 'signup', success: false }
    window.history.replaceState({}, '', '/')

    render(<Router />)
    delete window.__catskyAuthCallback

    await waitFor(() => {
      expect(screen.getByText(/connect view failed callback/)).toBeInTheDocument()
      expect(window.location.pathname).toBe('/connect')
    })
  })

  it('renders video view for /video route', () => {
    window.history.replaceState({}, '', '/video')

    render(<Router />)

    expect(screen.getByText('video view')).toBeInTheDocument()
  })
})
