import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Connect from './Connect'

const mocks = vi.hoisted(() => ({
  getMembershipTierMock: vi.fn<() => Promise<'none' | 'free' | 'paid_5' | 'paid_20'>>(),
  getPaidPlanOptionsMock: vi.fn<() => Promise<Array<{ id?: string; name: string; monthlyAmount: number; perks: string[] }>>>(),
  navigateToMock: vi.fn<(path: string) => void>(),
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; uuid?: string; email?: string } | null>>(),
  openPortalAccountPlansMock: vi.fn<() => void>(),
}))

const { getMembershipTierMock, getPaidPlanOptionsMock, navigateToMock, getCurrentMemberMock, openPortalAccountPlansMock } = mocks

vi.mock('./utils', () => ({
  clearLocalSessionFlags: vi.fn(),
  getCurrentMember: mocks.getCurrentMemberMock,
  getMembershipTier: mocks.getMembershipTierMock,
  getPaidPlanOptions: mocks.getPaidPlanOptionsMock,
  openPortalAccount: vi.fn(),
  openPortalAccountPlans: mocks.openPortalAccountPlansMock,
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
    getPaidPlanOptionsMock.mockResolvedValue([
      { id: 'tier-supporter', name: 'Supporter', monthlyAmount: 500, perks: ['unfinished demos'] },
      { id: 'tier-backstage', name: 'Backstage', monthlyAmount: 2000, perks: ['unfinished demos', 'unreleased videos'] },
    ])
    getCurrentMemberMock.mockResolvedValue(null)
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/connect')
  })

  it('shows upgrade options from Ghost tier names for free members', async () => {
    getMembershipTierMock.mockResolvedValue('free')
    getPaidPlanOptionsMock.mockResolvedValue([
      { id: 'tier-a', name: 'Studio Pass', monthlyAmount: 500, perks: ['unfinished demos'] },
      { id: 'tier-b', name: 'Backstage Circle', monthlyAmount: 2000, perks: ['unreleased music videos'] },
    ])

    render(<Connect />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByText('your current plan: free member')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'upgrade to $5/month to unlock the music video' })).toBeInTheDocument()
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

  it('opens account plans in Ghost Portal when free-member video upgrade CTA is clicked', async () => {
    getMembershipTierMock.mockResolvedValue('free')

    render(<Connect />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await act(async () => {
      screen.getByRole('link', { name: 'upgrade to $5/month to unlock the music video' }).click()
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(openPortalAccountPlansMock).toHaveBeenCalledTimes(1)
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
