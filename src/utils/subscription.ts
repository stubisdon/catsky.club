/**
 * Subscription checking utilities
 * 
 * This file handles checking if a user is a subscriber (free or paid).
 * It uses the Ghost Members API to check subscription status.
 * 
 * Note: This is separate from auth/portal/payment work being done in another tab.
 */

export type SubscriptionStatus = 'unknown' | 'not_subscriber' | 'free_subscriber' | 'paid_subscriber'
export type MembershipTier = 'none' | 'free' | 'paid_5' | 'paid_20'

const MEMBER_ENDPOINT = '/members/api/member/'

interface GhostMember {
  id?: string
  email?: string
  name?: string
  subscriptions?: Array<{
    id?: string
    status?: string
    price?: {
      amount?: number
      currency?: string
    }
  }>
}

interface GhostMemberResponse {
  member?: GhostMember | null
}

function looksLikeGhostMember(value: unknown): value is GhostMember {
  if (!value || typeof value !== 'object') return false
  const candidate = value as GhostMember
  return (
    typeof candidate.id === 'string' ||
    typeof candidate.email === 'string' ||
    typeof candidate.name === 'string' ||
    Array.isArray(candidate.subscriptions)
  )
}

const DEV_MEMBER_KEY = 'catsky_dev_member'
const DEV_PAID_KEY = 'catsky_dev_paid'
const DEV_TIER_KEY = 'catsky_dev_tier'

/** Only in Vite dev: allow simulating logged-in state for localhost testing (cookie is on prod domain). */
function getDevOverride(): SubscriptionStatus | null {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    try {
      const member = window.localStorage?.getItem(DEV_MEMBER_KEY)
      if (member === '1' || member === 'true') {
        const tier = window.localStorage?.getItem(DEV_TIER_KEY)
        if (tier === 'paid_5' || tier === 'paid_20') return 'paid_subscriber'
        if (tier === 'free') return 'free_subscriber'
        const paid = window.localStorage?.getItem(DEV_PAID_KEY)
        return paid === '1' || paid === 'true' ? 'paid_subscriber' : 'free_subscriber'
      }
    } catch {
      // ignore
    }
  }
  return null
}

function getHighestPaidTier(member: GhostMember): MembershipTier {
  const subscriptions = member.subscriptions || []
  let highestAmount = 0

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue
    const amount = sub.price?.amount
    if (typeof amount === 'number' && amount > highestAmount) {
      highestAmount = amount
    }
  }

  if (highestAmount >= 2000) return 'paid_20'
  if (highestAmount >= 500) return 'paid_5'
  if (highestAmount > 0) return 'paid_5'
  return 'free'
}

export function setDevMemberOverride(loggedIn: boolean, tier: 'free' | 'paid_5' | 'paid_20' = 'free'): void {
  try {
    if (loggedIn) {
      window.localStorage.setItem(DEV_MEMBER_KEY, '1')
      window.localStorage.setItem(DEV_PAID_KEY, tier === 'paid_5' || tier === 'paid_20' ? '1' : '0')
      window.localStorage.setItem(DEV_TIER_KEY, tier)
    } else {
      window.localStorage.removeItem(DEV_MEMBER_KEY)
      window.localStorage.removeItem(DEV_PAID_KEY)
      window.localStorage.removeItem(DEV_TIER_KEY)
    }
  } catch {
    // ignore
  }
}

/**
 * Checks subscription status via Ghost Members API
 * Returns:
 * - 'not_subscriber': Not in the system (no name/email/phone)
 * - 'free_subscriber': In the system but no paid subscription
 * - 'paid_subscriber': In the system with active paid subscription
 */
export async function checkSubscriptionStatus(): Promise<SubscriptionStatus> {
  const devOverride = getDevOverride()
  if (devOverride !== null) return devOverride

  try {
    const member = await fetchMember()
    if (!member) return 'not_subscriber'

    // Check if member has active paid subscriptions
    const subscriptions = member.subscriptions || []
    const hasActivePaidSubscription = subscriptions.some(
      sub => sub.status === 'active' && sub.price && sub.price.amount !== undefined && sub.price.amount > 0
    )

    if (hasActivePaidSubscription) {
      return 'paid_subscriber'
    }

    // Member exists (has name/email) but no paid subscription = free subscriber
    return 'free_subscriber'
  } catch (error) {
    console.error('Error checking subscription status:', error)
    return 'not_subscriber'
  }
}

export async function getMembershipTier(): Promise<MembershipTier> {
  const devOverride = getDevOverride()
  if (devOverride === 'paid_subscriber' || devOverride === 'free_subscriber') {
    try {
      const tier = window.localStorage?.getItem(DEV_TIER_KEY)
      if (tier === 'paid_5' || tier === 'paid_20' || tier === 'free') return tier
    } catch {
      // ignore
    }
    if (devOverride === 'paid_subscriber') return 'paid_20'
    return 'free'
  }

  try {
    const member = await fetchMember()
    if (!member) return 'none'
    return getHighestPaidTier(member)
  } catch (error) {
    console.error('Error checking membership tier:', error)
  }

  return 'none'
}

/**
 * Returns true if user is a paid subscriber
 */
export async function isPaidSubscriber(): Promise<boolean> {
  const status = await checkSubscriptionStatus()
  return status === 'paid_subscriber'
}

/**
 * Returns true if user is a subscriber (free or paid)
 */
export async function isSubscriber(): Promise<boolean> {
  const status = await checkSubscriptionStatus()
  return status === 'free_subscriber' || status === 'paid_subscriber'
}

export async function getCurrentMember(): Promise<GhostMember | null> {
  const devOverride = getDevOverride()
  if (devOverride === 'free_subscriber' || devOverride === 'paid_subscriber') {
    let amount = 0
    try {
      const tier = window.localStorage?.getItem(DEV_TIER_KEY)
      if (tier === 'paid_20') amount = 2000
      else if (tier === 'paid_5') amount = 500
      else if (devOverride === 'paid_subscriber') amount = 2000
    } catch {
      amount = devOverride === 'paid_subscriber' ? 2000 : 0
    }
    return {
      id: 'dev-member',
      email: 'dev@localhost',
      name: 'Dev Member',
      subscriptions: amount > 0 ? [{ status: 'active', price: { amount } }] : [],
    }
  }

  try {
    return await fetchMember()
  } catch {
    return null
  }
}

async function fetchMember(): Promise<GhostMember | null> {
  const res = await fetch(`${MEMBER_ENDPOINT}?_=${Date.now()}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  })

  if (!res.ok) {
    return null
  }

  // Ghost can occasionally return 200 with an empty body and/or missing JSON content-type.
  // Parse defensively so auth state can still recover after magic-link callbacks.
  const raw = await res.text()
  if (!raw || !raw.trim()) return null

  try {
    const data = JSON.parse(raw) as GhostMemberResponse | GhostMember

    // Ghost has returned both shapes depending on version/config:
    // 1) { member: { ... } }
    // 2) { ...memberFields }
    if (typeof data === 'object' && data !== null && 'member' in data) {
      return data.member ?? null
    }

    if (looksLikeGhostMember(data)) {
      return data
    }
  } catch {
    return null
  }

  return null
}
