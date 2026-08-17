import { getAuthCallback, stripAuthCallbackParams, type AuthCallback } from '../utils/authCallback'

export type View = 'home' | 'listen' | 'watch' | 'video' | 'connect' | 'welcome' | 'mission'

export interface ResolvedView {
  view: View
  normalizedPath?: string
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1) return pathname.replace(/\/+$/, '')
  return pathname
}

export function resolveView(
  pathnameRaw: string,
  search = '',
  callback: AuthCallback | null = getAuthCallback(search),
  memberName?: string | null,
): ResolvedView {
  const pathname = normalizePathname(pathnameRaw)

  if (callback && !callback.success) {
    return { view: 'connect', normalizedPath: stripAuthCallbackParams('/connect', search) }
  }

  if (callback?.action === 'signup') {
    if (typeof memberName === 'string' && memberName.trim().length > 0) {
      return { view: 'listen', normalizedPath: stripAuthCallbackParams('/listen', search) }
    }
    return { view: 'welcome', normalizedPath: stripAuthCallbackParams('/welcome', search) }
  }

  const normalizedPath = callback?.action === 'signin' ? stripAuthCallbackParams('/listen', search) : undefined

  if (callback?.action === 'signin') return { view: 'listen', normalizedPath }

  if (pathname === '/') return { view: 'home', normalizedPath }
  if (pathname === '/watch') return { view: 'watch', normalizedPath }
  if (pathname === '/video') return { view: 'video', normalizedPath }
  if (pathname === '/connect') return { view: 'connect', normalizedPath }
  if (pathname === '/listen') return { view: 'listen', normalizedPath }
  if (pathname === '/mission') return { view: 'mission', normalizedPath }
  if (pathname === '/welcome') return { view: 'welcome', normalizedPath }

  return { view: 'home', normalizedPath: '/' }
}
