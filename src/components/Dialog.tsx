import { useCallback, useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  /** Announced as the dialog's accessible name. */
  label: string
  children: ReactNode
  /** Widest the panel grows to. Album detail needs more room than the email prompt. */
  maxWidth?: string
  'data-testid'?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

/**
 * Modal shell for the landing page overlays.
 *
 * Handles the accessibility work the two callers would otherwise each reimplement: Escape to
 * close, backdrop click to close, focus moved in on open and restored to the trigger on close,
 * and Tab wrapped inside the panel. Body scroll is locked while open so the page behind does
 * not drift under the overlay on trackpads.
 */
export default function Dialog({
  open,
  onClose,
  label,
  children,
  maxWidth = '46rem',
  'data-testid': dataTestId,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const pressedBackdrop = useRef(false)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    // Move focus into the panel so screen readers and keyboard users land inside the overlay.
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel).focus()
    }, 0)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose]
  )

  if (!open) return null

  return (
    <div
      className="dialog-backdrop"
      // Dismiss only when the press *and* the release both land on the backdrop. Closing on
      // mousedown alone would dismiss the dialog when a text selection that started inside
      // the panel happens to end outside it.
      onMouseDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onClose()
        pressedBackdrop.current = false
      }}
      onKeyDown={handleKeyDown}
      data-testid={dataTestId}
    >
      <div
        ref={panelRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ maxWidth }}
      >
        <button
          type="button"
          className="dialog-close"
          onClick={onClose}
          aria-label="close"
          data-testid="dialog-close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
