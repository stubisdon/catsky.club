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
  // Ghost Portal binds click handlers at load time; use hidden triggers if present.
  if (clickPortalTrigger('ghost-portal-trigger-signin')) return
  window.location.hash = '#/portal/signin'
}

export function openPortalSignUp(): void {
  if (clickPortalTrigger('ghost-portal-trigger-signup')) return
  window.location.hash = '#/portal/signup'
}

export function openPortalAccount(): void {
  if (clickPortalTrigger('ghost-portal-trigger-account')) return
  window.location.hash = '#/portal/account'
}

/** Trigger Ghost Portal sign out (clears member session cookie). Call before clearing local state. */
export function triggerPortalSignOut(): boolean {
  return clickPortalTrigger('ghost-portal-trigger-signout')
}
