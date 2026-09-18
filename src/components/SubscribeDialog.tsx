import Dialog from './Dialog'
import SubscribeForm from './SubscribeForm'

interface SubscribeDialogProps {
  open: boolean
  onClose: () => void
  /** Printed above the heading, e.g. the album title the prompt was opened from. */
  eyebrow?: string
  heading?: string
  body?: string
  /** Distinguishes this entry point from /connect in analytics. */
  source?: string
}

/**
 * Email capture prompt behind the upcoming album's cover.
 *
 * The form itself (input, Turnstile, submit, error/confirmation states) lives in
 * SubscribeForm, shared with the /sugar-daddy landing page's inline signup section. This
 * component is just the dialog chrome around it.
 */
export default function SubscribeDialog({
  open,
  onClose,
  eyebrow,
  heading = 'subscribe for updates about upcoming releases',
  body = 'one email when something new lands. nothing else.',
  source = 'album_cover',
}: SubscribeDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="subscribe for release updates"
      maxWidth="32rem"
      data-testid="subscribe-dialog"
    >
      <div className="subscribe-dialog">
        {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
        <h2 className="t-display subscribe-heading">{heading}</h2>

        <SubscribeForm source={source} body={body} active={open} />
      </div>
    </Dialog>
  )
}
