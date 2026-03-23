import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkSubscriptionStatus, getMembershipTier, setDevMemberOverride } from './subscription'

describe('checkSubscriptionStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
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

  it('maps a $5 subscription to the paid_5 tier', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        member: {
          email: 'dmitry@example.com',
          subscriptions: [{ status: 'active', price: { amount: 500 } }],
        },
      }), {
        status: 200,
      })
    )

    await expect(getMembershipTier()).resolves.toBe('paid_5')
  })

  it('keeps the exact dev override tier for local testing', async () => {
    setDevMemberOverride(true, 'paid_5')

    await expect(getMembershipTier()).resolves.toBe('paid_5')
  })
})
