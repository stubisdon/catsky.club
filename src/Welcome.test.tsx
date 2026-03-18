import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Welcome from './Welcome'

const { getCurrentMemberMock, navigateToMock, fetchMock } = vi.hoisted(() => ({
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; email?: string } | null>>(),
  navigateToMock: vi.fn<(path: string) => void>(),
  fetchMock: vi.fn(),
}))

vi.mock('./utils', () => ({
  getCurrentMember: getCurrentMemberMock,
}))

vi.mock('./router/navigation', () => ({
  navigateTo: navigateToMock,
}))

describe('Welcome onboarding session checks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps user on /welcome while member session becomes available', async () => {
    getCurrentMemberMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'member-1', email: 'new@user.com' })

    render(<Welcome />)

    expect(screen.getByText(/checking your session/i)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/first name/i)).not.toBeDisabled()
  })

  it('shows a non-error helper message and manual refresh action when initial retries fail', async () => {
    getCurrentMemberMock.mockResolvedValue(null)

    render(<Welcome />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9200)
    })

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(screen.getByText(/still connecting your account/i)).toBeInTheDocument()
    expect(screen.queryByText(/couldn't confirm your session yet/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh session/i })).toBeVisible()
  })

  it('recovers automatically after a background session recheck succeeds', async () => {
    getCurrentMemberMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'member-2', email: 'later@user.com' })

    render(<Welcome />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9200)
    })

    expect(screen.getByText(/still connecting your account/i)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(getCurrentMemberMock).toHaveBeenCalledTimes(6)
    expect(screen.queryByText(/still connecting your account/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).not.toBeDisabled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('manual refresh recovers when the session appears later', async () => {
    getCurrentMemberMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'member-3', email: 'retry@user.com' })

    render(<Welcome />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9200)
    })

    const retryButton = screen.getByRole('button', { name: /refresh session/i })
    fireEvent.click(retryButton)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(screen.getByLabelText(/first name/i)).not.toBeDisabled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('lets the user press continue immediately and resolves the member inline before saving', async () => {
    getCurrentMemberMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 'member-4', email: 'submit@user.com' })

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } })

    const continueButton = screen.getByRole('button', { name: /continue/i })
    expect(continueButton).toBeEnabled()

    await act(async () => {
      fireEvent.submit(continueButton.closest('form') as HTMLFormElement)
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/member-profile', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
    expect(navigateToMock).toHaveBeenCalledWith('/listen')
  })
})
