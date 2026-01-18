/**
 * Subscription checking utilities
 * 
 * This file handles checking if a user is a subscriber (free or paid).
 * It uses the Ghost Members API to check subscription status.
 * 
 * Note: This is separate from auth/portal/payment work being done in another tab.
 */

export type SubscriptionStatus = 'unknown' | 'not_subscriber' | 'free_subscriber' | 'paid_subscriber'

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

/**
 * Checks subscription status via Ghost Members API
 * Returns:
 * - 'not_subscriber': Not in the system (no name/email/phone)
 * - 'free_subscriber': In the system but no paid subscription
 * - 'paid_subscriber': In the system with active paid subscription
 */
export async function checkSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    const res = await fetch('/members/api/member/', { 
      credentials: 'include' 
    })
    
    if (!res.ok) {
      return 'not_subscriber'
    }
    
    const data = (await res.json()) as unknown
    
    // Ghost returns { member: {...} } when logged in, or { member: null } otherwise
    if (typeof data === 'object' && data !== null && 'member' in data) {
      const member = (data as { member: GhostMember | null }).member
      
      if (!member) {
        return 'not_subscriber'
      }
      
      // Check if member has active paid subscriptions
      const subscriptions = member.subscriptions || []
      const hasActivePaidSubscription = subscriptions.some(
        sub => sub.status === 'active' && sub.price && sub.price.amount > 0
      )
      
      if (hasActivePaidSubscription) {
        return 'paid_subscriber'
      }
      
      // Member exists (has name/email) but no paid subscription = free subscriber
      return 'free_subscriber'
    }
    
    return 'not_subscriber'
  } catch (error) {
    console.error('Error checking subscription status:', error)
    return 'not_subscriber'
  }
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
