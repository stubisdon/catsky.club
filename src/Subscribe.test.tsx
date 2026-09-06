import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Subscribe from './Subscribe'

const { getMembershipTierMock, requestMagicLinkMock, isValidEmailMock, turnstileWidgetPropsSpy } = vi.hoisted(() => ({
  getMembershipTierMock: vi.fn(),
  requestMagicLinkMock: vi.fn(),
  isValidEmailMock: vi.fn((email: string) => {
    const trimmed = email.trim()
    if (!trimmed) return false
    const atIndex = trimmed.indexOf('@')
    if (atIndex <= 0) return false
    const domain = trimmed.slice(atIndex + 1)
    return domain.includes('.')
  }),
  turnstileWidgetPropsSpy: vi.fn(),
}))

vi.mock('./utils/subscription', () => ({
  getMembershipTier: getMembershipTierMock,
}))

vi.mock('./utils/emailCapture', () => ({
  isValidEmail: isValidEmailMock,
  requestMagicLink: requestMagicLinkMock,
}))

vi.mock('./components', async () => {
  const actual = await vi.importActual<typeof import('./components')>('./components')
  return {
    ...actual,
    TURNSTILE_SITE_KEY: '',
    TurnstileWidget: (props: { onToken: (t: string | null) => void; resetSignal?: number; className?: string }) => {
      turnstileWidgetPropsSpy(props)
      return null
    },
  }
})

describe('Subscribe page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMembershipTierMock.mockResolvedValue('none')
    requestMagicLinkMock.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('submits with the typed email and source, then shows success and hides the form', async () => {
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => expect(requestMagicLinkMock).toHaveBeenCalledWith('fan@example.com', null, 'subscribe_page'))

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
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

  it('shows the server error on a failed submit and leaves the form usable', async () => {
    requestMagicLinkMock.mockResolvedValue({ ok: false, error: 'too many requests. try later.' })
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('too many requests. try later.'))
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /subscribe/i })).not.toBeDisabled()
  })

  it('bumps the turnstile reset signal on a failed submit', async () => {
    requestMagicLinkMock.mockResolvedValue({ ok: false, error: 'nope' })
    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    const initialResetSignal = turnstileWidgetPropsSpy.mock.calls.at(-1)?.[0]?.resetSignal

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('nope'))

    const finalResetSignal = turnstileWidgetPropsSpy.mock.calls.at(-1)?.[0]?.resetSignal
    expect(finalResetSignal).toBeGreaterThan(initialResetSignal)
  })

  it('shows the already-subscribed state and no email input for a logged-in visitor', async () => {
    getMembershipTierMock.mockResolvedValue('free')
    render(<Subscribe />)

    await waitFor(() => expect(screen.getByText(/already on the list/i)).toBeInTheDocument())
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
  })

  it('renders the form if getMembershipTier rejects', async () => {
    getMembershipTierMock.mockRejectedValue(new Error('network error'))
    render(<Subscribe />)

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument())
  })

  it('only fires one requestMagicLink call on a double-click submit', async () => {
    let resolveRequest: (value: { ok: boolean }) => void = () => {}
    requestMagicLinkMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )

    render(<Subscribe />)
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    const button = screen.getByRole('button', { name: /subscribe/i })
    fireEvent.click(button)
    fireEvent.click(button)

    resolveRequest({ ok: true })
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())

    expect(requestMagicLinkMock).toHaveBeenCalledTimes(1)
  })
})
