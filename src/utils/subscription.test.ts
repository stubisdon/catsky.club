import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkSubscriptionStatus, getMembershipTier } from './subscription'

describe('subscription utilities', () => {
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

  it('returns paid_5 for active $5 subscriptions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        member: {
          email: 'tier@example.com',
          subscriptions: [{ status: 'active', price: { amount: 500 } }],
        },
      }), {
        status: 200,
      })
    )

    await expect(getMembershipTier()).resolves.toBe('paid_5')
  })
})
