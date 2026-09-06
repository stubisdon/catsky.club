import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Subscribe from './Subscribe'

const { requestMagicLinkMock, getMembershipTierMock, turnstilePropsSpy } = vi.hoisted(() => ({
  requestMagicLinkMock: vi.fn(),
  getMembershipTierMock: vi.fn(),
  turnstilePropsSpy: vi.fn(),
}))

vi.mock('./utils/magicLink', async () => {
  const actual = await vi.importActual<typeof import('./utils/magicLink')>('./utils/magicLink')
  return {
    ...actual,
    TURNSTILE_SITE_KEY: '',
    requestMagicLink: requestMagicLinkMock,
  }
})

vi.mock('./utils/subscription', () => ({
  getMembershipTier: getMembershipTierMock,
}))

vi.mock('./components/TurnstileWidget', () => ({
  TurnstileWidget: (props: { resetSignal?: number }) => {
    turnstilePropsSpy(props)
    return <div data-testid="turnstile" data-reset-signal={props.resetSignal} />
  },
}))

describe('Subscribe page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMembershipTierMock.mockResolvedValue('none')
    requestMagicLinkMock.mockResolvedValue({ ok: true, status: 201 })
  })

  it('renders the email form for a logged-out visitor', async () => {
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument()
  })

  it('disables submit for an invalid email and enables it for a valid one', async () => {
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    const input = screen.getByLabelText(/email/i)
    const button = screen.getByRole('button', { name: /subscribe/i })

    fireEvent.change(input, { target: { value: 'not-an-email' } })
    expect(button).toBeDisabled()

    fireEvent.change(input, { target: { value: 'fan@example.com' } })
    expect(button).not.toBeDisabled()
  })

  it('submits through the shared magic-link helper and shows the success state', async () => {
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => expect(requestMagicLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'fan@example.com', emailType: 'signup' }),
    ))

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
  })

  it('labels the request so subscribe-page signups can be told apart in Ghost', async () => {
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => expect(requestMagicLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['subscribe-page'] }),
    ))
  })

  it('states in the success copy that they must click the emailed link to finish', async () => {
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    const success = await screen.findByRole('status')
    expect(success.textContent).toMatch(/click the link/i)
    expect(success.textContent).toMatch(/not subscribed/i)
  })

  it('shows the server message on a failed submit and leaves the form usable', async () => {
    requestMagicLinkMock.mockResolvedValue({ ok: false, status: 429, message: 'Too many requests.' })
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('too many requests.'))
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('bumps the turnstile reset signal on a failed submit', async () => {
    requestMagicLinkMock.mockResolvedValue({ ok: false, status: 403, message: 'Verification failed.' })
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    const before = screen.getByTestId('turnstile').getAttribute('data-reset-signal')
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => {
      expect(screen.getByTestId('turnstile').getAttribute('data-reset-signal')).not.toBe(before)
    })
  })

  it('shows the already-subscribed state to an existing member', async () => {
    getMembershipTierMock.mockResolvedValue('free')
    render(<Subscribe />)

    await waitFor(() => expect(screen.getByText(/already on the list/i)).toBeInTheDocument())
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
  })

  it('still renders the form when the membership check rejects', async () => {
    getMembershipTierMock.mockRejectedValue(new Error('offline'))
    render(<Subscribe />)

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument())
  })

  it('only fires one request on a double-click submit', async () => {
    let resolveRequest: (v: unknown) => void = () => {}
    requestMagicLinkMock.mockImplementation(() => new Promise((r) => { resolveRequest = r }))
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    const button = screen.getByRole('button', { name: /subscribe/i })
    fireEvent.click(button)
    fireEvent.click(button)

    resolveRequest({ ok: true, status: 201 })
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    expect(requestMagicLinkMock).toHaveBeenCalledTimes(1)
  })
})
