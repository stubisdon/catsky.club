import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Connect from './Connect'

const mocks = vi.hoisted(() => ({
  getMembershipTierMock: vi.fn<() => Promise<'none' | 'free' | 'paid_5' | 'paid_20'>>(),
  getPlanOptionsMock: vi.fn<() => Promise<{ freePlanName: string | null; paidPlans: Array<{ id?: string; name: string; monthlyAmount: number; perks: string[] }> }>>(),
  navigateToMock: vi.fn<(path: string) => void>(),
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; uuid?: string; email?: string } | null>>(),
}))

const {
  getMembershipTierMock,
  getPlanOptionsMock,
  navigateToMock,
  getCurrentMemberMock,
} = mocks

vi.mock('./utils', () => ({
  clearLocalSessionFlags: vi.fn(),
  getCurrentMember: mocks.getCurrentMemberMock,
  getMembershipTier: mocks.getMembershipTierMock,
  getPlanOptions: mocks.getPlanOptionsMock,
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
    getPlanOptionsMock.mockResolvedValue({
      freePlanName: 'Free',
      paidPlans: [
        { id: 'tier-supporter', name: 'Supporter', monthlyAmount: 500, perks: ['unfinished demos'] },
        { id: 'tier-backstage', name: 'Backstage', monthlyAmount: 2000, perks: ['unfinished demos', 'unreleased videos'] },
      ],
    })
    getCurrentMemberMock.mockResolvedValue(null)
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/connect')
  })

  it('shows upgrade options from Ghost tier names for free members', async () => {
    getMembershipTierMock.mockResolvedValue('free')
    getPlanOptionsMock.mockResolvedValue({
      freePlanName: 'Community',
      paidPlans: [
        { id: 'tier-a', name: 'Studio Pass', monthlyAmount: 500, perks: ['unfinished demos'] },
        { id: 'tier-b', name: 'Backstage Circle', monthlyAmount: 2000, perks: ['unreleased music videos'] },
      ],
    })

    render(<Connect />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByText('your current plan: Community')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'upgrade to Studio Pass' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'upgrade to Backstage Circle' })).toBeInTheDocument()
    expect(screen.getByText('Studio Pass: unfinished demos • Backstage Circle: unreleased music videos')).toBeInTheDocument()
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
    expect(screen.getByText('paid access active (Supporter)')).toBeInTheDocument()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('keeps Ghost portal account/plans attributes on free-member upgrade actions', async () => {
    getMembershipTierMock.mockResolvedValue('free')

    render(<Connect />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    const upgradeLink = screen.getByRole('link', { name: 'upgrade to Supporter' })
    expect(upgradeLink).toHaveAttribute('data-portal', 'account/plans')
    expect(upgradeLink).toHaveAttribute('href', '#/portal/account/plans')
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
