import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EngagementSubscribePrompt, {
  ENGAGEMENT_PROMPT_DISMISSED_AT_KEY,
  ENGAGEMENT_PROMPT_DONE_KEY,
  ENGAGEMENT_PROMPT_SUPPRESS_MS,
} from './EngagementSubscribePrompt'
import type { EngagementTrigger } from '../utils/engagement'

const { initMock, onTriggerMock, getMembershipTierMock, trackEventMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
  onTriggerMock: vi.fn(),
  getMembershipTierMock: vi.fn(),
  trackEventMock: vi.fn(),
}))

vi.mock('../utils/engagement', () => ({
  initEngagementTracking: initMock,
  onEngagementTrigger: onTriggerMock,
}))

vi.mock('../utils/subscription', () => ({
  getMembershipTier: getMembershipTierMock,
}))

vi.mock('../utils/analytics', () => ({
  trackEvent: trackEventMock,
}))

vi.mock('./SubscribeDialog', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="subscribe-dialog">
        <button type="button" onClick={onClose}>close</button>
      </div>
    ) : null,
}))

/** Captures the callback the component registers so tests can fire triggers by hand. */
function fireTrigger(trigger: EngagementTrigger = 'songs_listened') {
  const cb = onTriggerMock.mock.calls.at(-1)?.[0] as ((t: EngagementTrigger) => void) | undefined
  if (!cb) throw new Error('component did not subscribe to engagement triggers')
  cb(trigger)
}

describe('EngagementSubscribePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    initMock.mockReturnValue(() => {})
    onTriggerMock.mockReturnValue(() => {})
    getMembershipTierMock.mockResolvedValue('none')
  })

  it('renders nothing before any trigger fires', () => {
    render(<EngagementSubscribePrompt />)
    expect(screen.queryByTestId('subscribe-dialog')).not.toBeInTheDocument()
  })

  it('opens the shared subscribe dialog for a logged-out visitor', async () => {
    render(<EngagementSubscribePrompt />)
    fireTrigger()
    await waitFor(() => expect(screen.getByTestId('subscribe-dialog')).toBeInTheDocument())
    expect(trackEventMock).toHaveBeenCalledWith('email_capture_shown', { trigger: 'songs_listened' })
  })

  it('never prompts an existing member, and marks them done so it stops checking', async () => {
    getMembershipTierMock.mockResolvedValue('free')
    render(<EngagementSubscribePrompt />)
    fireTrigger()
    await waitFor(() => expect(localStorage.getItem(ENGAGEMENT_PROMPT_DONE_KEY)).toBe('1'))
    expect(screen.queryByTestId('subscribe-dialog')).not.toBeInTheDocument()
  })

  it('fails closed when the membership check rejects', async () => {
    getMembershipTierMock.mockRejectedValue(new Error('offline'))
    render(<EngagementSubscribePrompt />)
    fireTrigger()
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalled())
    expect(screen.queryByTestId('subscribe-dialog')).not.toBeInTheDocument()
  })

  it('stays hidden when dismissed less than the suppression window ago', async () => {
    localStorage.setItem(ENGAGEMENT_PROMPT_DISMISSED_AT_KEY, String(Date.now() - 1000))
    render(<EngagementSubscribePrompt />)
    fireTrigger()
    await waitFor(() => expect(getMembershipTierMock).not.toHaveBeenCalled())
    expect(screen.queryByTestId('subscribe-dialog')).not.toBeInTheDocument()
  })

  it('shows again once the suppression window has passed', async () => {
    localStorage.setItem(
      ENGAGEMENT_PROMPT_DISMISSED_AT_KEY,
      String(Date.now() - ENGAGEMENT_PROMPT_SUPPRESS_MS - 1000),
    )
    render(<EngagementSubscribePrompt />)
    fireTrigger()
    await waitFor(() => expect(screen.getByTestId('subscribe-dialog')).toBeInTheDocument())
  })

  it('stays hidden permanently once the done flag is set', async () => {
    localStorage.setItem(ENGAGEMENT_PROMPT_DONE_KEY, '1')
    render(<EngagementSubscribePrompt />)
    fireTrigger()
    await waitFor(() => expect(getMembershipTierMock).not.toHaveBeenCalled())
    expect(screen.queryByTestId('subscribe-dialog')).not.toBeInTheDocument()
  })

  it('treats a corrupt dismissal timestamp as not suppressed', async () => {
    localStorage.setItem(ENGAGEMENT_PROMPT_DISMISSED_AT_KEY, 'not-a-number')
    render(<EngagementSubscribePrompt />)
    fireTrigger()
    await waitFor(() => expect(screen.getByTestId('subscribe-dialog')).toBeInTheDocument())
  })

  it('records a dismissal timestamp when closed', async () => {
    render(<EngagementSubscribePrompt />)
    fireTrigger()
    await waitFor(() => expect(screen.getByTestId('subscribe-dialog')).toBeInTheDocument())

    screen.getByRole('button', { name: 'close' }).click()

    await waitFor(() => expect(screen.queryByTestId('subscribe-dialog')).not.toBeInTheDocument())
    expect(Number(localStorage.getItem(ENGAGEMENT_PROMPT_DISMISSED_AT_KEY))).toBeGreaterThan(0)
    expect(trackEventMock).toHaveBeenCalledWith('email_capture_dismissed', { trigger: 'songs_listened' })
  })

  it('only opens for the first of several triggers', async () => {
    render(<EngagementSubscribePrompt />)
    fireTrigger('video_completed')
    await waitFor(() => expect(screen.getByTestId('subscribe-dialog')).toBeInTheDocument())
    fireTrigger('active_time')
    await waitFor(() => expect(getMembershipTierMock).toHaveBeenCalledTimes(1))
  })

  it('tears down both the tracker and the subscription on unmount', () => {
    const teardown = vi.fn()
    const unsubscribe = vi.fn()
    initMock.mockReturnValue(teardown)
    onTriggerMock.mockReturnValue(unsubscribe)

    const { unmount } = render(<EngagementSubscribePrompt />)
    unmount()

    expect(unsubscribe).toHaveBeenCalled()
    expect(teardown).toHaveBeenCalled()
  })

  it('never sends an email or identifier to analytics', async () => {
    render(<EngagementSubscribePrompt />)
    fireTrigger('active_time')
    await waitFor(() => expect(screen.getByTestId('subscribe-dialog')).toBeInTheDocument())

    for (const call of trackEventMock.mock.calls) {
      expect(Object.keys(call[1] ?? {})).toEqual(['trigger'])
    }
  })
})
