export type AuthCallbackAction = 'signup' | 'signin'

export interface AuthCallback {
  action: AuthCallbackAction
  success: boolean
  errorCode?: string
}

declare global {
  interface Window {
    __catskyAuthCallback?: AuthCallback
  }
}

function isAuthCallback(value: unknown): value is AuthCallback {
  return Boolean(
    value &&
    typeof value === 'object' &&
    ((value as AuthCallback).action === 'signup' || (value as AuthCallback).action === 'signin') &&
    typeof (value as AuthCallback).success === 'boolean',
  )
}

export function parseAuthCallback(search: string): AuthCallback | null {
  const params = new URLSearchParams(search)
  const action = params.get('action')

  const success = params.get('success')
  if ((action === 'signup' || action === 'signin') && (success === 'true' || success === 'false')) {
    const errorCode = params.get('errorCode') || undefined
    return { action, success: success === 'true', ...(errorCode ? { errorCode } : {}) }
  }

  return null
}

export function getAuthCallback(search: string): AuthCallback | null {
  return parseAuthCallback(search)
}

export function getCapturedAuthCallback(): AuthCallback | null {
  if (typeof window !== 'undefined' && isAuthCallback(window.__catskyAuthCallback)) {
    return window.__catskyAuthCallback
  }

  return null
}

// A callback still present in the URL is authoritative. The captured value exists only
// because index.html removes callback params before Ghost Portal is allowed to load.
export function readAuthCallback(search = window.location.search): AuthCallback | null {
  return getAuthCallback(search) ?? getCapturedAuthCallback()
}

export function stripAuthCallbackParams(pathname: string, search: string): string {
  const params = new URLSearchParams(search)
  params.delete('action')
  params.delete('success')
  params.delete('errorCode')
  const remaining = params.toString()
  return `${pathname}${remaining ? `?${remaining}` : ''}`
}

export function clearAuthCallback(): void {
  if (typeof window !== 'undefined') delete window.__catskyAuthCallback
}
