import { getAuthCallback, stripAuthCallbackParams, type AuthCallback } from '../utils/authCallback'

export type View = 'home' | 'listen' | 'watch' | 'video' | 'connect' | 'welcome' | 'mission' | 'subscribe' | 'news' | 'newsPost'

export interface ResolvedView {
  view: View
  normalizedPath?: string
  slug?: string
}

const NEWS_PREFIX = '/news/'

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
  if (pathname === '/subscribe') return { view: 'subscribe', normalizedPath }

  if (pathname === '/news') return { view: 'news', normalizedPath }

  if (pathname.startsWith(NEWS_PREFIX)) {
    const segments = pathname.slice(NEWS_PREFIX.length).split('/').filter(Boolean)
    if (segments.length === 1) {
      const slug = decodeSlug(segments[0])
      if (slug) return { view: 'newsPost', slug, normalizedPath }
    }
    // Nested or unreadable slugs collapse back to the feed; the news section has no nesting.
    return { view: 'news', normalizedPath: '/news' }
  }

  return { view: 'home', normalizedPath: '/' }
}
