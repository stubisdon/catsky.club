import { useEffect, useRef, useState } from 'react'
import SubscribeDialog from './SubscribeDialog'
import { initEngagementTracking, onEngagementTrigger, type EngagementTrigger } from '../utils/engagement'
import { getMembershipTier } from '../utils/subscription'
import { trackEvent } from '../utils/analytics'

// Exported so tests can assert on the exact persistence contract.
export const ENGAGEMENT_PROMPT_DISMISSED_AT_KEY = 'catsky_email_capture_dismissed_at'
export const ENGAGEMENT_PROMPT_DONE_KEY = 'catsky_email_capture_done'
export const ENGAGEMENT_PROMPT_SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(ENGAGEMENT_PROMPT_DISMISSED_AT_KEY)
    if (!raw) return false
    const timestamp = Number(raw)
    if (!Number.isFinite(timestamp)) return false
    return Date.now() - timestamp < ENGAGEMENT_PROMPT_SUPPRESS_MS
  } catch {
    return false
  }
}

function isDone(): boolean {
  try {
    return localStorage.getItem(ENGAGEMENT_PROMPT_DONE_KEY) === '1'
  } catch {
    return false
  }
}

function markDismissedNow(): void {
  try {
    localStorage.setItem(ENGAGEMENT_PROMPT_DISMISSED_AT_KEY, String(Date.now()))
  } catch {
    // ignore storage failures (e.g. Safari private mode)
  }
}

function markDone(): void {
  try {
    localStorage.setItem(ENGAGEMENT_PROMPT_DONE_KEY, '1')
  } catch {
    // ignore storage failures
  }
}

/**
 * Shows the existing SubscribeDialog once a logged-out visitor has actually engaged:
 * finished a video, spent real active time on the site, or played several songs.
 *
 * Deliberately reuses SubscribeDialog rather than introducing a second email-capture UI, so
 * there is one prompt, one set of copy, and one Turnstile-verified request path.
 */
export default function EngagementSubscribePrompt() {
  const [open, setOpen] = useState(false)
  const [trigger, setTrigger] = useState<EngagementTrigger | null>(null)

  const hasShownRef = useRef(false)
  const openRef = useRef(false)
  const processingRef = useRef(false)

  const handleTriggerRef = useRef<(t: EngagementTrigger) => void>(() => {})
  handleTriggerRef.current = (t: EngagementTrigger) => {
    if (hasShownRef.current || openRef.current || processingRef.current) return
    if (isDone() || isDismissedRecently()) return

    processingRef.current = true
    getMembershipTier()
      .then((tier) => {
        if (tier !== 'none') {
          // Already a member on this browser — never prompt them again.
          markDone()
          hasShownRef.current = true
          return
        }
        if (hasShownRef.current || openRef.current) return
        hasShownRef.current = true
        openRef.current = true
        setTrigger(t)
        setOpen(true)
        trackEvent('email_capture_shown', { trigger: t })
      })
      .catch(() => {
        // Fail closed: a network blip must never nag a possible member.
      })
      .finally(() => {
        processingRef.current = false
      })
  }

  useEffect(() => {
    const teardownTracking = initEngagementTracking()
    const unsubscribe = onEngagementTrigger((t) => handleTriggerRef.current(t))
    return () => {
      unsubscribe()
      teardownTracking()
    }
  }, [])

  function handleClose() {
    openRef.current = false
    setOpen(false)
    markDismissedNow()
    trackEvent('email_capture_dismissed', trigger ? { trigger } : {})
  }

  if (!open) return null

  return (
    <SubscribeDialog
      open={open}
      onClose={handleClose}
      heading="hear it first"
      body="you've been listening. leave an email and hear new music before anyone else."
      source="engagement_prompt"
    />
  )
}
