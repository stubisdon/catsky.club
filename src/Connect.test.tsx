import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Connect from './Connect'

const mocks = vi.hoisted(() => ({
  getMembershipTierMock: vi.fn<() => Promise<'none' | 'free' | 'paid_5' | 'paid_20'>>(),
  navigateToMock: vi.fn<(path: string) => void>(),
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; uuid?: string; email?: string } | null>>(),
}))

const { getMembershipTierMock, navigateToMock, getCurrentMemberMock } = mocks

vi.mock('./utils', () => ({
  clearLocalSessionFlags: vi.fn(),
  getCurrentMember: mocks.getCurrentMemberMock,
  getMembershipTier: mocks.getMembershipTierMock,
  triggerPortalSignOut: vi.fn(),
  setDevMemberOverride: vi.fn(),
}))

vi.mock('./router/navigation', () => ({
  navigateTo: mocks.navigateToMock,
}))

describe('Connect membership states and magic-link refresh', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    getMembershipTierMock.mockResolvedValue('none')
    getCurrentMemberMock.mockResolvedValue(null)
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/connect')
  })

  it('shows upgrade options for free members', async () => {
    getMembershipTierMock.mockResolvedValue('free')

    render(<Connect />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByText('your current plan: free member')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'upgrade to supporter plan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'upgrade to backstage plan' })).toBeInTheDocument()
    expect(screen.getByText('paid plans include unfinished demos and unreleased music videos.')).toBeInTheDocument()
  })

  it('updates to logged-in buttons after signin magic-link success callback', async () => {
    getMembershipTierMock
      .mockResolvedValueOnce('none')
      .mockResolvedValueOnce('none')
      .mockResolvedValueOnce('paid_5')

    window.history.replaceState({}, '', '/connect?action=signin&success=true')

    render(<Connect />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })

    expect(screen.getByRole('link', { name: 'account' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'sign up →' })).not.toBeInTheDocument()
    expect(screen.getByText('paid access active (supporter plan)')).toBeInTheDocument()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('sets portal plans hash when free-member upgrade action is clicked', async () => {
    getMembershipTierMock.mockResolvedValue('free')

    render(<Connect />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await act(async () => {
      screen.getByRole('link', { name: 'upgrade to supporter plan' }).click()
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(window.location.hash).toBe('#/portal/account/plans')
  })

  it('routes signup callbacks to welcome after login state is ready', async () => {
    getMembershipTierMock
      .mockResolvedValueOnce('none')
      .mockResolvedValueOnce('none')
      .mockResolvedValueOnce('paid_5')
    getCurrentMemberMock.mockResolvedValue({
      uuid: 'member-uuid-123',
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
        memberId: '',
        memberUuid: 'member-uuid-123',
        email: 'ada@example.com',
      }),
    )
  })
})
