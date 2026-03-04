import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Connect from './Connect'

const { isSubscriberMock } = vi.hoisted(() => ({
  isSubscriberMock: vi.fn<() => Promise<boolean>>()
}))

vi.mock('./utils', () => ({
  clearLocalSessionFlags: vi.fn(),
  triggerPortalSignOut: vi.fn(),
  setDevMemberOverride: vi.fn(),
  isSubscriber: isSubscriberMock,
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
})
