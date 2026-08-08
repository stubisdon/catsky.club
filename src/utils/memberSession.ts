import { trackPortalEvent } from './analytics'

export function clearLocalSessionFlags(): void {
  try {
    window.localStorage.removeItem('catsky_signed_up')
    window.localStorage.removeItem('catsky_activated')
  } catch {
    // ignore
  }
}

function clickPortalTrigger(id: string): boolean {
  const el = document.getElementById(id) as HTMLElement | null
  if (!el) return false
  el.click()
  return true
}

export function openPortalSignIn(): void {
  trackPortalEvent('ghost_portal_trigger_clicked', { portal_target: 'signin' })
  window.location.hash = '#/portal/signin'
  // Ghost Portal binds click handlers at load time; use hidden triggers if present.
  clickPortalTrigger('ghost-portal-trigger-signin')
}

export function openPortalSignUp(): void {
  trackPortalEvent('ghost_portal_trigger_clicked', { portal_target: 'signup' })
  window.location.hash = '#/portal/signup'
  clickPortalTrigger('ghost-portal-trigger-signup')
}

export function openPortalAccount(): void {
  trackPortalEvent('ghost_portal_trigger_clicked', { portal_target: 'account' })
  window.location.hash = '#/portal/account'
  clickPortalTrigger('ghost-portal-trigger-account')
}

export function openPortalAccountPlans(): void {
  trackPortalEvent('ghost_portal_trigger_clicked', { portal_target: 'account/plans' })
  window.location.hash = '#/portal/account/plans'
  clickPortalTrigger('ghost-portal-trigger-account-plans')
}

/** Trigger Ghost Portal sign out (clears member session cookie). Call before clearing local state. */
export function triggerPortalSignOut(): boolean {
  trackPortalEvent('ghost_portal_trigger_clicked', { portal_target: 'signout' })
  return clickPortalTrigger('ghost-portal-trigger-signout')
}
