import posthog from 'posthog-js'
import { getCurrentMember, getMembershipTier, type MembershipTier } from './subscription'

type EventProperties = Record<string, unknown>

export interface ButtonClickProperties {
  label?: string
  element_type?: string
  path?: string
  href_type?: 'internal' | 'external' | 'hash' | 'portal' | 'none'
  portal_target?: string
  analytics_id?: string
}

type AnalyticsWindow = Window & {
  __CATSKY_ANALYTICS_CAPTURE__?: (eventName: string, properties?: EventProperties) => void
}

type PortalTarget = 'signup' | 'signin' | 'account' | 'account/plans' | 'unknown'

const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com'
const MAX_LABEL_LENGTH = 80

let initialized = false
let enabled = false
let clickListenerInstalled = false
let clickListener: ((event: MouseEvent) => void) | null = null
let portalHashListenerInstalled = false
let portalHashListener: (() => void) | null = null
let lastPortalTarget: PortalTarget | null = null
let portalMembershipTierBeforeClose: MembershipTier | null = null
let identityState: 'unknown' | 'anonymous' | 'identified' = 'unknown'

function getConfig() {
  const token = import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN?.trim() || ''
  const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_DEFAULT_HOST
  const explicitEnabled = import.meta.env.VITE_PUBLIC_POSTHOG_ENABLED === 'true'
  return { token, host, explicitEnabled }
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

function isDevelopmentRuntime(): boolean {
  return import.meta.env.DEV === true || import.meta.env.MODE === 'development'
}

function callTestHook(eventName: string, properties?: EventProperties) {
  try {
    ;(window as AnalyticsWindow).__CATSKY_ANALYTICS_CAPTURE__?.(eventName, properties)
  } catch {
    // ignore test hook failures
  }
}

function capture(eventName: string, properties?: EventProperties): void {
  if (!enabled || !initialized) return
  callTestHook(eventName, properties)
  try {
    posthog.capture(eventName, properties)
  } catch {
    // analytics must never break the product
  }
}

function safeTextLabel(element: Element): string | undefined {
  const dataLabel = element.getAttribute('data-analytics-label')?.trim()
  const ariaLabel = element.getAttribute('aria-label')?.trim()
  const title = element.getAttribute('title')?.trim()
  const label = dataLabel || ariaLabel || title
  if (label) return label.slice(0, MAX_LABEL_LENGTH)

  const clone = element.cloneNode(true) as Element
  clone.querySelectorAll('input, textarea, select').forEach((node) => node.remove())
  const text = clone.textContent?.replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, MAX_LABEL_LENGTH) : undefined
}

function getElementType(element: Element): string {
  const role = element.getAttribute('role')
  if (role === 'button') return 'role_button'
  return element.tagName.toLowerCase()
}

function getHrefType(element: Element): ButtonClickProperties['href_type'] {
  const portalTarget = element.getAttribute('data-portal')
  if (portalTarget) return 'portal'
  if (!(element instanceof HTMLAnchorElement)) return 'none'

  const href = element.getAttribute('href') || ''
  if (!href) return 'none'
  if (href.startsWith('#')) return href.startsWith('#/portal') ? 'portal' : 'hash'
  if (href.startsWith('/') && !href.startsWith('//')) return 'internal'

  try {
    return new URL(href, window.location.href).origin === window.location.origin ? 'internal' : 'external'
  } catch {
    return 'none'
  }
}

function findClickable(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null
  const element = target.closest('button, a, [role="button"], [data-portal], [data-members-signout], [data-analytics-id]')
  if (!element) return null
  if (element.closest('#ghost-portal-triggers')) return null
  if (element instanceof HTMLButtonElement && element.disabled) return null
  if (element.getAttribute('aria-disabled') === 'true') return null
  return element
}

function buildClickProperties(element: Element): ButtonClickProperties {
  const portalTarget = element.getAttribute('data-portal') || undefined
  const analyticsId = element.getAttribute('data-analytics-id') || undefined

  return {
    label: safeTextLabel(element),
    element_type: getElementType(element),
    path: window.location.pathname,
    href_type: getHrefType(element),
    portal_target: portalTarget,
    analytics_id: analyticsId,
  }
}

function installClickListener(): void {
  if (clickListenerInstalled || typeof document === 'undefined') return

  clickListener = (event: MouseEvent) => {
    const element = findClickable(event.target)
    if (!element) return
    trackButtonClick(buildClickProperties(element))
  }

  document.addEventListener('click', clickListener, true)
  clickListenerInstalled = true
}

function parsePortalHashTarget(hash: string): PortalTarget | null {
  if (!hash.startsWith('#/portal/')) return null
  const target = hash.replace(/^#\/portal\/?/, '').replace(/\/+$/, '')
  if (target === 'signup' || target === 'signin' || target === 'account' || target === 'account/plans') {
    return target
  }
  return 'unknown'
}

async function refreshPortalSessionAnalytics(previousTier: MembershipTier | null, portalTarget: PortalTarget): Promise<void> {
  try {
    const tier = await getMembershipTier()
    const member = tier === 'none' ? null : await getCurrentMember().catch(() => null)
    identifyMember(member, tier)
    trackPortalEvent('ghost_portal_session_refreshed', {
      portal_target: portalTarget,
      previous_membership_tier: previousTier ?? 'unknown',
      membership_tier: tier,
      changed: previousTier !== null && previousTier !== tier,
    })
  } catch {
    trackPortalEvent('ghost_portal_session_refreshed', {
      portal_target: portalTarget,
      previous_membership_tier: previousTier ?? 'unknown',
      membership_tier: 'unknown',
      changed: false,
    })
  } finally {
    portalMembershipTierBeforeClose = null
  }
}

function installPortalHashListener(): void {
  if (portalHashListenerInstalled || typeof window === 'undefined') return

  portalHashListener = () => {
    const target = parsePortalHashTarget(window.location.hash)
    const previousTarget = lastPortalTarget

    if (target) {
      if (previousTarget !== target) {
        trackPortalEvent('ghost_portal_opened', { portal_target: target })
        portalMembershipTierBeforeClose = null
        void getMembershipTier().then((tier) => {
          if (lastPortalTarget === target && portalMembershipTierBeforeClose === null) {
            portalMembershipTierBeforeClose = tier
          }
        }).catch(() => {
          // keep previous tier unknown
        })
      }
      lastPortalTarget = target
      return
    }

    if (previousTarget) {
      trackPortalEvent('ghost_portal_closed', { portal_target: previousTarget })
      lastPortalTarget = null
      const previousTier = portalMembershipTierBeforeClose
      window.setTimeout(() => {
        void refreshPortalSessionAnalytics(previousTier, previousTarget)
      }, 300)
    }
  }

  window.addEventListener('hashchange', portalHashListener)
  portalHashListener()
  portalHashListenerInstalled = true
}

export function initAnalytics(): void {
  const { token, host, explicitEnabled } = getConfig()
  if (!token || ((isDevelopmentRuntime() || isLocalhost()) && !explicitEnabled)) {
    enabled = false
    initialized = false
    return
  }

  try {
    posthog.init(token, {
      api_host: host,
      defaults: '2026-01-30',
      capture_pageview: false,
      autocapture: true,
      disable_session_recording: true,
      loaded: () => {
        try {
          posthog.register({
            app: 'catsky.club',
            environment: import.meta.env.MODE,
          })
        } catch {
          // ignore registration failures
        }
      },
    })
    enabled = true
    initialized = true
    installClickListener()
    installPortalHashListener()
  } catch {
    enabled = false
    initialized = false
  }
}

export function isAnalyticsEnabled(): boolean {
  return enabled && initialized
}

export function trackPageView(properties: EventProperties = {}): void {
  capture('$pageview', properties)
}

export function trackButtonClick(properties: ButtonClickProperties): void {
  capture('button_clicked', properties as EventProperties)
}

export function trackPortalEvent(name: string, properties: EventProperties = {}): void {
  capture(name, properties)
}

export function trackEvent(name: string, properties: EventProperties = {}): void {
  capture(name, properties)
}

export function identifyMember(
  member: { id?: string; uuid?: string; tiers?: unknown[] } | null,
  membershipTier?: MembershipTier,
): void {
  if (!enabled || !initialized) return

  try {
    const distinctId = member?.uuid || member?.id
    if (!distinctId) {
      if (identityState !== 'anonymous') {
        posthog.reset()
        identityState = 'anonymous'
      }
      if (membershipTier) {
        posthog.register({ membership_tier: membershipTier })
      }
      return
    }

    if (membershipTier) {
      posthog.register({ membership_tier: membershipTier })
    }

    posthog.identify(distinctId, membershipTier ? { membership_tier: membershipTier } : undefined)
    identityState = 'identified'
  } catch {
    // ignore identify failures
  }
}

export function resetAnalyticsIdentity(): void {
  if (!enabled || !initialized) return

  try {
    posthog.reset()
    identityState = 'anonymous'
  } catch {
    // ignore reset failures
  }
}

export function resetAnalyticsForTests(): void {
  if (clickListener && typeof document !== 'undefined') {
    document.removeEventListener('click', clickListener, true)
  }
  if (portalHashListener && typeof window !== 'undefined') {
    window.removeEventListener('hashchange', portalHashListener)
  }
  initialized = false
  enabled = false
  clickListenerInstalled = false
  clickListener = null
  portalHashListenerInstalled = false
  portalHashListener = null
  lastPortalTarget = null
  portalMembershipTierBeforeClose = null
  identityState = 'unknown'
}
