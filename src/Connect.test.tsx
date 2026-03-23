import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Connect from './Connect'

const mocks = vi.hoisted(() => ({
  isSubscriberMock: vi.fn<() => Promise<boolean>>(),
  navigateToMock: vi.fn<(path: string) => void>(),
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; email?: string } | null>>(),
}))

const { isSubscriberMock, navigateToMock, getCurrentMemberMock } = mocks

vi.mock('./utils', () => ({
  clearLocalSessionFlags: vi.fn(),
  getCurrentMember: mocks.getCurrentMemberMock,
  triggerPortalSignOut: vi.fn(),
  setDevMemberOverride: vi.fn(),
  isSubscriber: mocks.isSubscriberMock,
}))

vi.mock('./router/navigation', () => ({
  navigateTo: mocks.navigateToMock,
}))

describe('Connect magic-link state refresh', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    isSubscriberMock.mockResolvedValue(false)
    getCurrentMemberMock.mockResolvedValue(null)
    window.sessionStorage.clear()
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
    getCurrentMemberMock.mockResolvedValue({
      id: 'member-123',
      email: 'ada@example.com',
    })

    window.history.replaceState({}, '', '/connect?action=signup&success=true')

    render(<Connect />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })

    expect(navigateToMock).toHaveBeenCalledWith('/welcome')
    expect(window.location.search).toBe('')
    expect(window.sessionStorage.getItem('catsky_welcome_member')).toBe(
      JSON.stringify({
        memberId: 'member-123',
        email: 'ada@example.com',
      }),
    )
  })
})
