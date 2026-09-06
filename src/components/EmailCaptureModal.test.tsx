import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EmailCaptureModal,
  EMAIL_CAPTURE_DISMISSED_AT_KEY,
  EMAIL_CAPTURE_DONE_KEY,
  EMAIL_CAPTURE_DISMISS_SUPPRESS_MS,
} from './EmailCaptureModal'

const {
  initEngagementTrackingMock,
  onEngagementTriggerMock,
  teardownTrackingMock,
  unsubscribeMock,
  getMembershipTierMock,
  requestMagicLinkMock,
  isValidEmailMock,
  turnstileWidgetPropsSpy,
  triggerCallbacks,
} = vi.hoisted(() => ({
  initEngagementTrackingMock: vi.fn(),
  onEngagementTriggerMock: vi.fn(),
  teardownTrackingMock: vi.fn(),
  unsubscribeMock: vi.fn(),
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
  triggerCallbacks: [] as Array<(t: 'video_completed' | 'active_time' | 'songs_listened') => void>,
}))

vi.mock('../utils/engagement', () => ({
  initEngagementTracking: initEngagementTrackingMock,
  onEngagementTrigger: onEngagementTriggerMock,
}))

vi.mock('../utils/subscription', () => ({
  getMembershipTier: getMembershipTierMock,
}))

vi.mock('../utils/emailCapture', () => ({
  isValidEmail: isValidEmailMock,
  requestMagicLink: requestMagicLinkMock,
}))

vi.mock('./TurnstileWidget', () => ({
  TURNSTILE_SITE_KEY: '',
  TurnstileWidget: (props: { onToken: (t: string | null) => void; resetSignal?: number; className?: string }) => {
    turnstileWidgetPropsSpy(props)
    return null
  },
}))

function fireTrigger(t: 'video_completed' | 'active_time' | 'songs_listened' = 'active_time') {
  triggerCallbacks.forEach((cb) => cb(t))
}

describe('EmailCaptureModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    triggerCallbacks.length = 0
    localStorage.clear()

    initEngagementTrackingMock.mockImplementation(() => teardownTrackingMock)
    onEngagementTriggerMock.mockImplementation((cb: (t: 'video_completed' | 'active_time' | 'songs_listened') => void) => {
      triggerCallbacks.push(cb)
      return unsubscribeMock
    })
    getMembershipTierMock.mockResolvedValue('none')
    requestMagicLinkMock.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing before any trigger fires', () => {
    render(<EmailCaptureModal />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows on a trigger when logged out and not suppressed', async () => {
    render(<EmailCaptureModal />)
    fireTrigger()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(getMembershipTierMock).toHaveBeenCalled()
  })

  it('does not show when getMembershipTier resolves to free', async () => {
    getMembershipTierMock.mockResolvedValue('free')
    render(<EmailCaptureModal />)
    fireTrigger()
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem(EMAIL_CAPTURE_DONE_KEY)).toBe('1')
  })

  it('does not show when getMembershipTier rejects (fail closed)', async () => {
    getMembershipTierMock.mockRejectedValue(new Error('network error'))
    render(<EmailCaptureModal />)
    fireTrigger()
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not show when dismissed less than 7 days ago; shows when older than 7 days', async () => {
    localStorage.setItem(EMAIL_CAPTURE_DISMISSED_AT_KEY, String(Date.now() - 1000))
    const { unmount } = render(<EmailCaptureModal />)
    fireTrigger()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    unmount()

    localStorage.setItem(
      EMAIL_CAPTURE_DISMISSED_AT_KEY,
      String(Date.now() - EMAIL_CAPTURE_DISMISS_SUPPRESS_MS - 1000),
    )
    triggerCallbacks.length = 0
    render(<EmailCaptureModal />)
    fireTrigger()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('does not show when the permanent done key is set', async () => {
    localStorage.setItem(EMAIL_CAPTURE_DONE_KEY, '1')
    render(<EmailCaptureModal />)
    fireTrigger()
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getMembershipTierMock).not.toHaveBeenCalled()
  })

  it('treats a corrupt / non-numeric dismissal timestamp as not-suppressed without throwing', async () => {
    localStorage.setItem(EMAIL_CAPTURE_DISMISSED_AT_KEY, 'not-a-number')
    expect(() => render(<EmailCaptureModal />)).not.toThrow()
    fireTrigger()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('a successful submit calls requestMagicLink with source popup, shows success, and writes the permanent key', async () => {
    render(<EmailCaptureModal />)
    fireTrigger()
    await screen.findByRole('dialog')

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /notify me/i }))

    await waitFor(() => expect(requestMagicLinkMock).toHaveBeenCalledWith('fan@example.com', null, 'popup'))
    expect(await screen.findByRole('status')).toHaveTextContent(/click the link/i)
    expect(localStorage.getItem(EMAIL_CAPTURE_DONE_KEY)).toBe('1')
  })

  it('a failed submit shows the error, keeps the form usable, and bumps the turnstile reset signal', async () => {
    requestMagicLinkMock.mockResolvedValue({ ok: false, error: 'too many requests.' })
    render(<EmailCaptureModal />)
    fireTrigger()
    await screen.findByRole('dialog')

    const initialResetSignal = turnstileWidgetPropsSpy.mock.calls.at(-1)?.[0]?.resetSignal

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /notify me/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('too many requests.'))
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /notify me/i })).not.toBeDisabled()

    const finalResetSignal = turnstileWidgetPropsSpy.mock.calls.at(-1)?.[0]?.resetSignal
    expect(finalResetSignal).toBeGreaterThan(initialResetSignal)
  })

  it('Escape closes it and writes a dismissal timestamp', async () => {
    render(<EmailCaptureModal />)
    fireTrigger()
    const dialog = await screen.findByRole('dialog')

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(localStorage.getItem(EMAIL_CAPTURE_DISMISSED_AT_KEY)).not.toBeNull()
  })

  it('a backdrop click closes it; a click inside the dialog does not', async () => {
    render(<EmailCaptureModal />)
    fireTrigger()
    const dialog = await screen.findByRole('dialog')

    fireEvent.click(dialog)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const overlay = dialog.parentElement as HTMLElement
    fireEvent.click(overlay)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('only the first of two triggers shows the modal', async () => {
    render(<EmailCaptureModal />)
    fireTrigger('active_time')
    fireTrigger('video_completed')

    await screen.findByRole('dialog')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(getMembershipTierMock).toHaveBeenCalledTimes(1)
  })

  it('focus lands on the email input when it opens', async () => {
    render(<EmailCaptureModal />)
    fireTrigger()
    const input = await screen.findByLabelText(/email/i)
    await waitFor(() => expect(input).toHaveFocus())
  })

  it('tears down both the engagement subscription and the tracking init on unmount', () => {
    const { unmount } = render(<EmailCaptureModal />)
    expect(initEngagementTrackingMock).toHaveBeenCalled()
    expect(onEngagementTriggerMock).toHaveBeenCalled()

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
    expect(teardownTrackingMock).toHaveBeenCalled()
  })
})
