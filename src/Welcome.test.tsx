import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Welcome from './Welcome'

const { getCurrentMemberMock, navigateToMock } = vi.hoisted(() => ({
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; email?: string } | null>>(),
  navigateToMock: vi.fn<(path: string) => void>(),
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
  })

  afterEach(() => {
    vi.useRealTimers()
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
})
