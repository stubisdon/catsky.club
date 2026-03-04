import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkSubscriptionStatus } from './subscription'

describe('checkSubscriptionStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('treats empty 200 responses as logged out instead of throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 200 })
    )

    await expect(checkSubscriptionStatus()).resolves.toBe('not_subscriber')
  })

  it('detects free member even when content-type is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ member: { email: 'dmitry@example.com', subscriptions: [] } }), {
        status: 200,
      })
    )

    await expect(checkSubscriptionStatus()).resolves.toBe('free_subscriber')
  })

  it('detects free member when Ghost returns the direct member payload shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ email: 'dmitry@example.com', subscriptions: [] }), {
        status: 200,
      })
    )

    await expect(checkSubscriptionStatus()).resolves.toBe('free_subscriber')
  })
})
