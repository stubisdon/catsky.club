import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Connect from './Connect'

const { isSubscriberMock, navigateToMock } = vi.hoisted(() => ({
  isSubscriberMock: vi.fn<() => Promise<boolean>>(),
  navigateToMock: vi.fn<(path: string) => void>(),
}))

vi.mock('./utils', () => ({
  clearLocalSessionFlags: vi.fn(),
  triggerPortalSignOut: vi.fn(),
  setDevMemberOverride: vi.fn(),
  isSubscriber: isSubscriberMock,
}))

vi.mock('./router/navigation', () => ({
  navigateTo: navigateToMock,
}))

describe('Connect magic-link state refresh', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    isSubscriberMock.mockResolvedValue(false)
    window.history.replaceState({}, '', '/connect')
  })

  it('updates to logged-in buttons after signin magic-link success callback', async () => {
    isSubscriberMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    window.history.replaceState({}, '', '/connect?action=signin&success=true')

    render(<Connect />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })

    expect(screen.getByRole('link', { name: 'account' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'sign up →' })).not.toBeInTheDocument()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('routes signup callbacks to welcome after login state is ready', async () => {
    isSubscriberMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    window.history.replaceState({}, '', '/connect?action=signup&success=true')

    render(<Connect />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })

    expect(navigateToMock).toHaveBeenCalledWith('/welcome')
    expect(window.location.search).toBe('')
  })
})
