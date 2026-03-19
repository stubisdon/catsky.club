import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Welcome from './Welcome'

const { navigateToMock, fetchMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn<(path: string) => void>(),
  fetchMock: vi.fn(),
}))

vi.mock('./router/navigation', () => ({
  navigateTo: navigateToMock,
}))

describe('Welcome onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: true })
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

  it('queues the profile save with sendBeacon and navigates immediately', () => {
    const sendBeaconMock = vi.fn(() => true)
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    })

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(sendBeaconMock).toHaveBeenCalledOnce()
    expect(sendBeaconMock).toHaveBeenCalledWith('/api/member-profile', expect.any(Blob))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(navigateToMock).toHaveBeenCalledWith('/listen')
  })

  it('falls back to keepalive fetch when sendBeacon is unavailable', () => {
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    })

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(fetchMock).toHaveBeenCalledWith('/api/member-profile', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    }))
    expect(navigateToMock).toHaveBeenCalledWith('/listen')
  })
})
