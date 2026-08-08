import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Router from './Router'

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
vi.mock('../utils/analytics', () => ({
  trackPageView: analytics.trackPageView,
}))

describe('Router signup callback normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/connect')
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

  it('renders video view for /video route', () => {
    window.history.replaceState({}, '', '/video')

    render(<Router />)

    expect(screen.getByText('video view')).toBeInTheDocument()
  })
})
