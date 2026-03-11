import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Connect from './Connect'

const { isSubscriberMock, getCurrentMemberMock } = vi.hoisted(() => ({
  isSubscriberMock: vi.fn<() => Promise<boolean>>(),
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; email?: string } | null>>()
}))

vi.mock('./utils', () => ({
  clearLocalSessionFlags: vi.fn(),
  triggerPortalSignOut: vi.fn(),
  setDevMemberOverride: vi.fn(),
  isSubscriber: isSubscriberMock,
  getCurrentMember: getCurrentMemberMock,
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
    getCurrentMemberMock.mockResolvedValue({ id: 'm_123', email: 'new@catsky.club' })
  })

  it('updates to logged-in buttons after magic-link success callback', async () => {
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
    expect(isSubscriberMock).toHaveBeenCalled()
  })

  it('routes signup magic-link callbacks to welcome onboarding', async () => {
    isSubscriberMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    window.history.replaceState({}, '', '/connect?action=signup&success=true')

    render(<Connect />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(window.location.pathname).toBe('/welcome')
    expect(window.location.search).toContain('memberId=m_123')
    expect(window.location.search).toContain('email=new%40catsky.club')
  })

})
