import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Welcome from './Welcome'

const { navigateToMock, fetchMock, getCurrentMemberMock, trackEventMock, turnstilePropsSpy } = vi.hoisted(() => ({
  navigateToMock: vi.fn<(path: string) => void>(),
  fetchMock: vi.fn(),
  getCurrentMemberMock: vi.fn<() => Promise<{ id?: string; uuid?: string; email?: string } | null>>(),
  trackEventMock: vi.fn(),
  turnstilePropsSpy: vi.fn(),
}))

vi.mock('./router/navigation', () => ({
  navigateTo: navigateToMock,
}))

vi.mock('./utils', () => ({
  getCurrentMember: getCurrentMemberMock,
}))

vi.mock('./utils/analytics', () => ({
  identifyMember: vi.fn(),
  trackEvent: trackEventMock,
}))

// The real widget renders nothing without a site key, which is also the local dev state.
// Mocking it lets these tests exercise both the "no Turnstile configured" and the
// "Turnstile configured" paths, and inspect resetSignal.
vi.mock('./components', async () => {
  const actual = await vi.importActual<typeof import('./components')>('./components')
  return {
    ...actual,
    TURNSTILE_SITE_KEY: '',
    TurnstileWidget: (props: { resetSignal?: number }) => {
      turnstilePropsSpy(props)
      return <div data-testid="turnstile" data-reset-signal={props.resetSignal} />
    },
  }
})

const submitForm = () =>
  fireEvent.submit(screen.getByRole('button', { name: /sign up/i }).closest('form') as HTMLFormElement)

describe('Welcome signup completion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: true, status: 202 })
    getCurrentMemberMock.mockResolvedValue(null)
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requires a first name before signing up', () => {
    render(<Welcome />)

    submitForm()

    expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('posts the captured names and navigates only after the save succeeds', async () => {
    window.sessionStorage.setItem('catsky_welcome_member', JSON.stringify({
      memberId: '',
      memberUuid: 'member-uuid-123',
      email: 'ada@example.com',
    }))

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/member-profile', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        memberId: '',
        memberUuid: 'member-uuid-123',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    })))

    await waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/listen'))
    expect(window.sessionStorage.getItem('catsky_welcome_member')).toBeNull()
  })

  it('resolves member identity from the session when storage is empty', async () => {
    getCurrentMemberMock.mockResolvedValue({
      uuid: 'member-uuid-456',
      email: 'grace@example.com',
    })

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Grace' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/member-profile', expect.objectContaining({
      body: JSON.stringify({
        memberId: '',
        memberUuid: 'member-uuid-456',
        email: 'grace@example.com',
        firstName: 'Grace',
        lastName: '',
      }),
    })))
    await waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/listen'))
  })

  // The whole point of the Turnstile gate: a rejected challenge must not look like a signup.
  it('does NOT navigate and surfaces a verification error when the server answers 403', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 })

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/verification failed/i))
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(trackEventMock).toHaveBeenCalledWith('welcome_profile_failed', { status: 403 })
  })

  it('keeps the identity in sessionStorage when the save fails, so a retry can still use it', async () => {
    window.sessionStorage.setItem('catsky_welcome_member', JSON.stringify({
      memberId: '',
      memberUuid: 'member-uuid-123',
      email: 'ada@example.com',
    }))
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not finish your signup/i))
    expect(window.sessionStorage.getItem('catsky_welcome_member')).not.toBeNull()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('bumps the turnstile reset signal after a failed submit, since tokens are single-use', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 })

    render(<Welcome />)
    const initialSignal = screen.getByTestId('turnstile').getAttribute('data-reset-signal')

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByTestId('turnstile').getAttribute('data-reset-signal')).not.toBe(initialSignal)
    })
  })

  it('does not navigate when the network request throws outright', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('only submits once when the button is double-clicked', async () => {
    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    const button = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/listen'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never sends the entered name to analytics', async () => {
    render(<Welcome />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => expect(navigateToMock).toHaveBeenCalled())

    const serialized = JSON.stringify(trackEventMock.mock.calls)
    expect(serialized).not.toContain('Ada')
    expect(serialized).not.toContain('Lovelace')
  })
})
