import { getAuthCallback, stripAuthCallbackParams, type AuthCallback } from '../utils/authCallback'

export type View = 'home' | 'listen' | 'watch' | 'video' | 'connect' | 'welcome' | 'mission' | 'read' | 'readPost'

export interface ResolvedView {
  view: View
  normalizedPath?: string
  slug?: string
}

const READ_PREFIX = '/read/'

function normalizePathname(pathname: string): string {
  if (pathname.length > 1) return pathname.replace(/\/+$/, '')
  return pathname
}

/** A slug we cannot decode is not worth throwing over; fall back to the feed. */
function decodeSlug(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw)
    return decoded.length > 0 ? decoded : null
  } catch {
    return null
  }
}

export function resolveView(pathnameRaw: string, search = '', callback: AuthCallback | null = getAuthCallback(search)): ResolvedView {
  const pathname = normalizePathname(pathnameRaw)

  if (callback?.action === 'signup') {
    return { view: 'welcome', normalizedPath: stripAuthCallbackParams('/welcome', search) }
  }

  const normalizedPath = callback?.action === 'signin' ? stripAuthCallbackParams(pathname, search) : undefined

  if (pathname === '/') return { view: 'home', normalizedPath }
  if (pathname === '/watch') return { view: 'watch', normalizedPath }
  if (pathname === '/video') return { view: 'video', normalizedPath }
  if (pathname === '/connect') return { view: 'connect', normalizedPath }
  if (pathname === '/listen') return { view: 'listen', normalizedPath }
  if (pathname === '/mission') return { view: 'mission', normalizedPath }
  if (pathname === '/welcome') return { view: 'welcome', normalizedPath }
  if (pathname === '/read') return { view: 'read', normalizedPath }

  if (pathname.startsWith(READ_PREFIX)) {
    const segments = pathname.slice(READ_PREFIX.length).split('/').filter(Boolean)
    if (segments.length === 1) {
      const slug = decodeSlug(segments[0])
      if (slug) return { view: 'readPost', slug, normalizedPath }
    }
    // Nested or unreadable slugs collapse back to the feed; the read section has no nesting.
    return { view: 'read', normalizedPath: '/read' }
  }

  return { view: 'home', normalizedPath: '/' }
}
