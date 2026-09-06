import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Router from './Router'
import { resolveView } from './resolveView'

const analytics = vi.hoisted(() => ({
  trackPageView: vi.fn(),
}))

vi.mock('../App', () => ({ default: () => <div>home view</div> }))
vi.mock('../Watch', () => ({ default: () => <div>watch view</div> }))
vi.mock('../Video', () => ({ default: () => <div>video view</div> }))
vi.mock('../Connect', () => ({ default: () => <div>connect view</div> }))
vi.mock('../Mission', () => ({ default: () => <div>mission view</div> }))
vi.mock('../Listen', () => ({ default: () => <div>listen view</div> }))
vi.mock('../Welcome', () => ({ default: () => <div>welcome view</div> }))
vi.mock('../Subscribe', () => ({ default: () => <div>subscribe view</div> }))
vi.mock('../components/EmailCaptureModal', () => ({
  EmailCaptureModal: () => <div>email capture modal</div>,
}))
vi.mock('../utils/analytics', () => ({
  trackPageView: analytics.trackPageView,
}))

describe('Router signup callback normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete window.__catskyAuthCallback
    window.history.replaceState({}, '', '/connect')
  })

  it.each([
    ['/', 'signup', 'welcome'],
    ['/connect', 'signup', 'welcome'],
    ['/listen', 'signup', 'welcome'],
    ['/watch', 'signup', 'welcome'],
    ['/', 'signin', 'home'],
    ['/connect', 'signin', 'connect'],
    ['/listen', 'signin', 'listen'],
    ['/watch', 'signin', 'watch'],
  ] as const)('resolves %s %s callbacks without reading captured global state', (pathname, action, view) => {
    window.__catskyAuthCallback = { action: action === 'signup' ? 'signin' : 'signup', success: true }

    expect(resolveView(pathname, `?action=${action}&success=true`)).toMatchObject({ view })
  })

  it.each([
    ['/', ''],
    ['/connect', '?success=false&action=signup'],
    ['/listen', '?action=other&success=true'],
    ['/watch', '?action=signin&success=false'],
  ])('leaves non-success callbacks on their normal view: %s%s', (pathname, search) => {
    expect(resolveView(pathname, search)).toMatchObject({
      view: pathname === '/' ? 'home' : pathname.slice(1),
    })
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

    expect(screen.getByText('welcome view')).toBeInTheDocument()
    await waitFor(() => {
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

    expect(screen.getByText('welcome view')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/welcome')
      expect(window.location.search).toBe('?stripe=success')
      expect(window.__catskyAuthCallback).toBeUndefined()
    })
  })

  it('keeps the Portal hash while stripping signin callback params', async () => {
    window.history.replaceState({}, '', '/connect?action=signin&success=true#/portal/account')

    render(<Router />)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/connect')
      expect(window.location.search).toBe('')
      expect(window.location.hash).toBe('#/portal/account')
    })
  })

  it('renders video view for /video route', () => {
    window.history.replaceState({}, '', '/video')

    render(<Router />)

    expect(screen.getByText('video view')).toBeInTheDocument()
  })
})

describe('Router /subscribe route and email capture mount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete window.__catskyAuthCallback
  })

  it.each(['/subscribe', '/subscribe/'])('resolves %s to the subscribe view', (pathname) => {
    expect(resolveView(pathname, '')).toMatchObject({ view: 'subscribe' })
  })

  it('renders the subscribe view for /subscribe', () => {
    window.history.replaceState({}, '', '/subscribe')
    render(<Router />)
    expect(screen.getByText('subscribe view')).toBeInTheDocument()
  })

  it('mounts the email capture modal on ordinary browsing views', () => {
    window.history.replaceState({}, '', '/listen')
    render(<Router />)
    expect(screen.getByText('listen view')).toBeInTheDocument()
    expect(screen.getByText('email capture modal')).toBeInTheDocument()
  })

  // Asking for an email on the pages that already ask for one would be pushy and confusing.
  it.each([
    ['/subscribe', 'subscribe view'],
    ['/welcome', 'welcome view'],
    ['/connect', 'connect view'],
  ])('does NOT mount the email capture modal on %s', (pathname, viewText) => {
    window.history.replaceState({}, '', pathname)
    render(<Router />)
    expect(screen.getByText(viewText)).toBeInTheDocument()
    expect(screen.queryByText('email capture modal')).not.toBeInTheDocument()
  })

  // resolveView short-circuits every signup callback to /welcome regardless of path, which is
  // exactly what the double-step signup needs: the emailed link can land anywhere and still
  // finish on the name + Turnstile form.
  it('sends a signup callback landing on /subscribe to the welcome view', () => {
    expect(resolveView('/subscribe', '?action=signup&success=true')).toMatchObject({
      view: 'welcome',
      normalizedPath: '/welcome',
    })
  })
})
