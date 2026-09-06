import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Listen from './Listen'
import { getEngagementState, resetEngagementForTests } from './utils/engagement'
import type { SoundCloudProgressOptions } from './utils/playerApis'

const mocks = vi.hoisted(() => ({
  getMembershipTierMock: vi.fn<() => Promise<'none' | 'free' | 'paid_5' | 'paid_20'>>(),
  observeSoundCloudProgressMock: vi.fn<(options: SoundCloudProgressOptions) => () => void>(),
}))

vi.mock('./utils', () => ({
  getMembershipTier: mocks.getMembershipTierMock,
  getDirectAudioUrl: vi.fn(() => null),
  getSoundCloudEmbedUrl: vi.fn(() => 'about:blank'),
  openPortalAccount: vi.fn(),
}))

vi.mock('./utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('./utils/playerApis', () => ({
  observeSoundCloudProgress: mocks.observeSoundCloudProgressMock,
}))

describe('Listen SoundCloud engagement wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetEngagementForTests()
    localStorage.clear()
    mocks.getMembershipTierMock.mockResolvedValue('none')
    mocks.observeSoundCloudProgressMock.mockReturnValue(() => {})
  })

  afterEach(() => {
    resetEngagementForTests()
  })

  it('observes the mounted SoundCloud iframe and records progress for the selected track', async () => {
    render(<Listen />)

    fireEvent.click(await screen.findByText('Intro'))

    expect(mocks.observeSoundCloudProgressMock).toHaveBeenCalledTimes(1)
    const options = mocks.observeSoundCloudProgressMock.mock.calls[0][0]
    expect(options.iframe.tagName).toBe('IFRAME')

    // Below the engagement threshold: nothing recorded yet.
    options.onProgress(0.1)
    expect(getEngagementState().songs).toEqual([])

    options.onProgress(0.6)
    expect(getEngagementState().songs).toEqual(['1'])
  })

  it('tears the widget observer down when the selected track changes', async () => {
    const teardown = vi.fn()
    mocks.observeSoundCloudProgressMock.mockReturnValue(teardown)

    render(<Listen />)

    fireEvent.click(await screen.findByText('Intro'))
    expect(teardown).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Baby Mama'))
    expect(teardown).toHaveBeenCalledTimes(1)
    expect(mocks.observeSoundCloudProgressMock).toHaveBeenCalledTimes(2)
  })
})
