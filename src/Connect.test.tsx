import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import Connect from './Connect'

const mocks = vi.hoisted(() => ({
  getMembershipTierMock: vi.fn<() => Promise<'none' | 'free' | 'paid_5' | 'paid_20'>>(),
  getPaidPlanOptionsMock: vi.fn<() => Promise<Array<{ id?: string; name: string; monthlyAmount: number; perks: string[] }>>>(),
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; uuid?: string; email?: string } | null>>(),
  openPortalAccountPlansMock: vi.fn<() => void>(),
  triggerPortalSignOutMock: vi.fn<() => boolean>(),
  identifyMemberMock: vi.fn(),
  resetAnalyticsIdentityMock: vi.fn(),
  trackEventMock: vi.fn(),
  trackPortalEventMock: vi.fn(),
}))

const {
  getMembershipTierMock,
  getPaidPlanOptionsMock,
  getCurrentMemberMock,
  openPortalAccountPlansMock,
  triggerPortalSignOutMock,
  resetAnalyticsIdentityMock,
  trackEventMock,
} = mocks

vi.mock('./utils', () => ({
  clearLocalSessionFlags: vi.fn(),
  getCurrentMember: mocks.getCurrentMemberMock,
  getMembershipTier: mocks.getMembershipTierMock,
  getPaidPlanOptions: mocks.getPaidPlanOptionsMock,
  openPortalAccount: vi.fn(),
  openPortalAccountPlans: mocks.openPortalAccountPlansMock,
  triggerPortalSignOut: mocks.triggerPortalSignOutMock,
  setDevMemberOverride: vi.fn(),
}))

vi.mock('./utils/analytics', () => ({
  identifyMember: mocks.identifyMemberMock,
  resetAnalyticsIdentity: mocks.resetAnalyticsIdentityMock,
  trackEvent: mocks.trackEventMock,
  trackPortalEvent: mocks.trackPortalEventMock,
}))

describe('Connect membership states and magic-link refresh', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    getMembershipTierMock.mockResolvedValue('none')
    triggerPortalSignOutMock.mockReturnValue(true)
    getPaidPlanOptionsMock.mockResolvedValue([
      { id: 'tier-supporter', name: 'Supporter', monthlyAmount: 500, perks: ['unfinished demos'] },
      { id: 'tier-backstage', name: 'Backstage', monthlyAmount: 2000, perks: ['unfinished demos', 'unreleased videos'] },
    ])
    getCurrentMemberMock.mockResolvedValue(null)
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/connect')
  })

  it('shows one contextual upgrade CTA and non-clickable tier context for free members', async () => {
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
    expect(screen.queryByRole('link', { name: 'upgrade to Studio Pass' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'upgrade to Backstage Circle' })).not.toBeInTheDocument()
    expect(screen.getByText('Studio Pass: unfinished demos • Backstage Circle: unreleased music videos')).toBeInTheDocument()
  })

  it('shows Router-owned failed callback messaging without consuming the global handoff', async () => {
    window.__catskyAuthCallback = { action: 'signup', success: false }

    render(<Connect failedAuthCallback={{ action: 'signup', success: false }} />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText('that link has expired or was already used. request a new one.')).toBeInTheDocument()
    expect(window.__catskyAuthCallback).toEqual({ action: 'signup', success: false })
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

  it('resets analytics identity on logout', async () => {
    getMembershipTierMock.mockResolvedValue('free')

    render(<Connect />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await act(async () => {
      screen.getByRole('link', { name: 'log out' }).click()
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(triggerPortalSignOutMock).toHaveBeenCalledTimes(1)
    expect(resetAnalyticsIdentityMock).toHaveBeenCalledTimes(1)
  })

  it('tracks magic-link outcomes without sending the email address', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ error: 'Invalid email address' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<Connect />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    fireEvent.click(screen.getByRole('button', { name: 'sign up →' }))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'ada@example.com' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'send magic link' }).closest('form')!)
      await vi.runAllTimersAsync()
    })

    expect(trackEventMock).toHaveBeenCalledWith('magic_link_requested', { entry_point: 'signup' })
    expect(trackEventMock).toHaveBeenCalledWith('magic_link_request_failed', {
      entry_point: 'signup',
      status: 400,
    })
    expect(JSON.stringify(trackEventMock.mock.calls)).not.toContain('ada@example.com')
  })

  it('keeps the magic-link request to Ghost’s established email-only contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ success: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<Connect />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    fireEvent.click(screen.getByRole('button', { name: 'log in →' }))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'ada@example.com' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'send magic link' }).closest('form')!)
      await vi.runAllTimersAsync()
    })

    expect(fetchMock).toHaveBeenCalledWith('/members/api/send-magic-link/', expect.objectContaining({
      body: JSON.stringify({
        email: 'ada@example.com',
      }),
    }))
  })

  it('de-emphasises a sent link, focuses the confirmation, and enables resend after the cooldown', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<Connect />)
    await act(async () => { await vi.runAllTimersAsync() })
    fireEvent.click(screen.getByRole('button', { name: 'sign up →' }))
    const input = screen.getByPlaceholderText('your@email.com')
    fireEvent.change(input, { target: { value: 'ada@example.com' } })
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'send magic link' }).closest('form')!)
      await Promise.resolve()
    })

    const button = screen.getByRole('button', { name: 'link sent' })
    expect(button).toBeDisabled()
    expect(input).toHaveAttribute('readonly')
    expect(screen.getByRole('status')).toHaveTextContent('ada@example.com')
    expect(screen.getByRole('status')).toHaveTextContent('you can send another in 30s.')
    expect(document.activeElement).toBe(screen.getByRole('status'))

    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(screen.getByRole('button', { name: 'link sent' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('you can send another in 28s.')

    await act(async () => { await vi.advanceTimersByTimeAsync(28_000) })
    const resendButton = screen.getByRole('button', { name: 'send again' })
    expect(resendButton).toBeEnabled()
    expect(input).not.toHaveAttribute('readonly')
    await act(async () => {
      fireEvent.submit(resendButton.closest('form')!)
      await Promise.resolve()
    })
    expect(trackEventMock).toHaveBeenCalledWith('magic_link_resend_clicked', { entry_point: 'signup' })
  })
})
