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

  it('shows retry session action instead of auto-redirecting when retries fail', async () => {
    getCurrentMemberMock.mockResolvedValue(null)

    render(<Welcome />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(screen.getByText(/couldn't confirm your session yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry session check/i })).toBeVisible()
  })

  it('recovers after retry when session appears later', async () => {
    getCurrentMemberMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'member-2', email: 'later@user.com' })

    render(<Welcome />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    const retryButton = screen.getByRole('button', { name: /retry session check/i })
    fireEvent.click(retryButton)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    expect(screen.getByLabelText(/first name/i)).not.toBeDisabled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
