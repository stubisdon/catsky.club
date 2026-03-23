import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Welcome from './Welcome'

const { navigateToMock, fetchMock, getCurrentMemberMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn<(path: string) => void>(),
  fetchMock: vi.fn(),
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; email?: string } | null>>(),
}))

vi.mock('./router/navigation', () => ({
  navigateTo: navigateToMock,
}))

vi.mock('./utils', () => ({
  getCurrentMember: getCurrentMemberMock,
}))

describe('Welcome onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: true })
    getCurrentMemberMock.mockResolvedValue(null)
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requires a first name before continuing', () => {
    render(<Welcome />)

    fireEvent.submit(screen.getByRole('button', { name: /continue/i }).closest('form') as HTMLFormElement)

    expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('starts a keepalive fetch immediately and navigates without waiting', async () => {
    window.sessionStorage.setItem('catsky_welcome_member', JSON.stringify({
      memberId: 'member-123',
      email: 'ada@example.com',
    }))

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/member-profile', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        memberId: 'member-123',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    })))
    expect(window.sessionStorage.getItem('catsky_welcome_member')).toBeNull()
    expect(navigateToMock).toHaveBeenCalledWith('/listen')
  })

  it('resolves member identity in the background when storage is empty', async () => {
    getCurrentMemberMock.mockResolvedValue({
      id: 'member-456',
      email: 'grace@example.com',
    })

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Grace' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/member-profile', expect.objectContaining({
      body: JSON.stringify({
        memberId: 'member-456',
        email: 'grace@example.com',
        firstName: 'Grace',
        lastName: '',
      }),
    })))
    expect(navigateToMock).toHaveBeenCalledWith('/listen')
  })

  it('falls back to sendBeacon if fetch cannot be queued', async () => {
    const sendBeaconMock = vi.fn(() => true)
    fetchMock.mockImplementation(() => {
      throw new Error('queue failed')
    })
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    })

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(sendBeaconMock).toHaveBeenCalledOnce())
    expect(sendBeaconMock).toHaveBeenCalledWith('/api/member-profile', expect.any(Blob))
    expect(navigateToMock).toHaveBeenCalledWith('/listen')
  })
})
