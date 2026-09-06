/**
 * Types for the plain-JS oEmbed module.
 *
 * socialOembed.mjs is JavaScript because server.js is, but the tests and any future TS caller
 * still deserve real types over `any` — this file is what gives them that.
 */

export interface OembedResult {
  url: string
  thumbnailUrl: string
  title: string
}

export const CACHE_TTL_MS: number
export const STALE_MAX_MS: number
export const MAX_CACHE_ENTRIES: number

export function isAllowedOembedUrl(value?: string): boolean

export function resolveOembed(
  url: string,
  options?: {
    fetchImpl?: (url: string) => Promise<unknown>
    cache?: {
      get<T extends object>(key: string, load: () => Promise<T>): Promise<T & { cache: 'hit' | 'miss' | 'stale' }>
      clear(): void
    }
  }
): Promise<OembedResult>

export function createOembedCache(options?: {
  ttlMs?: number
  staleMaxMs?: number
  maxEntries?: number
  now?: () => number
}): {
  get<T extends object>(key: string, load: () => Promise<T>): Promise<T & { cache: 'hit' | 'miss' | 'stale' }>
  clear(): void
}
