/**
 * Types for the plain-JS social feed module.
 *
 * socialFeeds.mjs is JavaScript because server.js is, but the tests and any future TS caller
 * still deserve real types over `any` — this file is what gives them that.
 */

export interface SocialPost {
  platform: 'instagram' | 'tiktok' | 'youtube'
  id: string
  url: string
  thumbnailUrl: string
  caption: string
  publishedAt: string
}

export interface SocialFeedConfig {
  instagramAccessToken: string
  tiktokAccessToken: string
  youtubeApiKey: string
  youtubeChannelId: string
}

export interface SocialPostsPayload {
  posts: Record<string, SocialPost[]>
  errors: Record<string, string>
  fetchedAt: string
  cache?: 'hit' | 'miss' | 'stale'
}

export const CACHE_TTL_MS: number
export const STALE_MAX_MS: number

export function uploadsPlaylistId(channelId?: string): string
export function tidyCaption(value?: string, maxLength?: number): string

export function normalizeInstagramPosts(payload: unknown, limit?: number): SocialPost[]
export function normalizeTikTokPosts(payload: unknown, limit?: number): SocialPost[]
export function normalizeYouTubePosts(payload: unknown, limit?: number): SocialPost[]
export function parseYouTubeFeed(xml: unknown, limit?: number): SocialPost[]

export function fetchInstagramPosts(args: {
  accessToken: string
  limit?: number
  fetchImpl?: (url: string, init?: unknown) => Promise<unknown>
}): Promise<SocialPost[]>

export function fetchTikTokPosts(args: {
  accessToken: string
  limit?: number
  fetchImpl?: (url: string, init?: unknown) => Promise<unknown>
}): Promise<SocialPost[]>

export function fetchYouTubePosts(args: {
  apiKey: string
  channelId: string
  limit?: number
  fetchImpl?: (url: string, init?: unknown) => Promise<unknown>
}): Promise<SocialPost[]>

export function createSocialPostsCache(options?: {
  ttlMs?: number
  staleMaxMs?: number
  now?: () => number
}): {
  get<T extends object>(load: () => Promise<T>): Promise<T & { cache: 'hit' | 'miss' | 'stale' }>
  clear(): void
}

export function loadSocialPosts(args: {
  config: SocialFeedConfig
  limit?: number
  fetchers?: Partial<{
    instagram: (args: unknown) => Promise<unknown>
    tiktok: (args: unknown) => Promise<unknown>
    youtube: (args: unknown) => Promise<unknown>
  }>
}): Promise<SocialPostsPayload>
