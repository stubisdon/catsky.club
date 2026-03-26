import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkSubscriptionStatus, getMembershipTier, getPaidPlanOptions, getPlanOptions } from './subscription'

describe('subscription utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as Window & { __PORTAL_SETTINGS_CACHE__?: unknown }).__PORTAL_SETTINGS_CACHE__
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

  it('returns paid plan names/perks from cached Ghost tier settings', async () => {
    (window as Window & { __PORTAL_SETTINGS_CACHE__?: unknown }).__PORTAL_SETTINGS_CACHE__ = {
      tiers: [
        { name: 'Free', type: 'free', monthly_price: { amount: 0 } },
        { name: 'Supporter', type: 'paid', monthly_price: { amount: 500 }, benefits: ['unfinished demos'] },
        { name: 'Backstage', type: 'paid', monthly_price: { amount: 2000 }, benefits: [{ name: 'unreleased videos' }] },
      ],
    }

    await expect(getPaidPlanOptions()).resolves.toEqual([
      { name: 'Supporter', monthlyAmount: 500, perks: ['unfinished demos'] },
      { name: 'Backstage', monthlyAmount: 2000, perks: ['unreleased videos'] },
    ])
  })

  it('returns free tier name together with paid plan options from Ghost tiers', async () => {
    (window as Window & { __PORTAL_SETTINGS_CACHE__?: unknown }).__PORTAL_SETTINGS_CACHE__ = {
      tiers: [
        { name: 'Community', type: 'free', monthly_price: { amount: 0 } },
        { name: 'Supporter', type: 'paid', monthly_price: { amount: 500 }, benefits: ['unfinished demos'] },
      ],
    }

    await expect(getPlanOptions()).resolves.toEqual({
      freePlanName: 'Community',
      paidPlans: [{ name: 'Supporter', monthlyAmount: 500, perks: ['unfinished demos'] }],
    })
  })
})
