import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  openPortalAccount,
  openPortalAccountPlans,
  openPortalSignIn,
  openPortalSignUp,
  triggerPortalSignOut,
} from './memberSession'

const analytics = vi.hoisted(() => ({
  trackPortalEvent: vi.fn(),
}))

vi.mock('./analytics', () => ({
  trackPortalEvent: analytics.trackPortalEvent,
}))

describe('memberSession analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = `
      <button id="ghost-portal-trigger-signin"></button>
      <button id="ghost-portal-trigger-signup"></button>
      <button id="ghost-portal-trigger-account"></button>
      <button id="ghost-portal-trigger-account-plans"></button>
      <button id="ghost-portal-trigger-signout"></button>
    `
    window.history.replaceState({}, '', '/connect')
  })

  it('tracks signin Portal trigger clicks', () => {
    openPortalSignIn()

    expect(analytics.trackPortalEvent).toHaveBeenCalledWith('ghost_portal_trigger_clicked', {
      portal_target: 'signin',
    })
  })

  it('tracks signup Portal trigger clicks', () => {
    openPortalSignUp()

    expect(analytics.trackPortalEvent).toHaveBeenCalledWith('ghost_portal_trigger_clicked', {
      portal_target: 'signup',
    })
  })

  it('tracks account and plan Portal trigger clicks', () => {
    openPortalAccount()
    openPortalAccountPlans()

    expect(analytics.trackPortalEvent).toHaveBeenCalledWith('ghost_portal_trigger_clicked', {
      portal_target: 'account',
    })
    expect(analytics.trackPortalEvent).toHaveBeenCalledWith('ghost_portal_trigger_clicked', {
      portal_target: 'account/plans',
    })
  })

  it('tracks signout trigger clicks', () => {
    expect(triggerPortalSignOut()).toBe(true)

    expect(analytics.trackPortalEvent).toHaveBeenCalledWith('ghost_portal_trigger_clicked', {
      portal_target: 'signout',
    })
  })
})
