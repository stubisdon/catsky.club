import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, PageTitle } from './components'
import { navigateTo } from './router/navigation'
import { getCurrentMember } from './utils'

interface MemberProfilePayload {
  memberId?: string
  memberUuid?: string
  email?: string
  firstName: string
  lastName: string
}

const WELCOME_MEMBER_STORAGE_KEY = 'catsky_welcome_member'

function readWelcomeMemberIdentity() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(WELCOME_MEMBER_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { memberId?: string; memberUuid?: string; email?: string } | null
    const memberId = typeof parsed?.memberId === 'string' ? parsed.memberId.trim() : ''
    const memberUuid = typeof parsed?.memberUuid === 'string' ? parsed.memberUuid.trim() : ''
    const email = typeof parsed?.email === 'string' ? parsed.email.trim().toLowerCase() : ''

    if ((!memberId && !memberUuid) || !email) return null
    return { memberId, memberUuid, email }
  } catch {
    return null
  }
}

function storeWelcomeMemberIdentity(member: { id?: string; uuid?: string; email?: string } | null) {
  const memberId = typeof member?.id === 'string' ? member.id.trim() : ''
  const memberUuid = typeof member?.uuid === 'string' ? member.uuid.trim() : ''
  const email = typeof member?.email === 'string' ? member.email.trim().toLowerCase() : ''

  if ((!memberId && !memberUuid) || !email) return null

  try {
    window.sessionStorage.setItem(WELCOME_MEMBER_STORAGE_KEY, JSON.stringify({ memberId, memberUuid, email }))
  } catch {
    // ignore storage failures
  }

  return { memberId, memberUuid, email }
}

function queueMemberProfileSave(payload: MemberProfilePayload) {
  const body = JSON.stringify(payload)

  try {
    window.sessionStorage.removeItem(WELCOME_MEMBER_STORAGE_KEY)
  } catch {
    // ignore storage failures
  }

  try {
    void fetch('/api/member-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body,
    }).catch((err) => {
      console.error('[welcome profile save failed after navigation]', err)
    })
    return
  } catch (fetchError) {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const queued = navigator.sendBeacon(
          '/api/member-profile',
          new Blob([body], { type: 'application/json' }),
        )
        if (queued) return
      } catch {
        // fall through to error logging below
      }
    }

    console.error('[welcome profile save could not be queued]', fetchError)
  }
}

export default function Welcome() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void getCurrentMember()
      .then((member) => {
        storeWelcomeMemberIdentity(member)
      })
      .catch(() => {
        // ignore background identity hydration failures
      })
  }, [])

  const canSubmit = useMemo(() => firstName.trim().length > 0, [firstName])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const safeFirstName = firstName.trim()
    const safeLastName = lastName.trim()

    if (!safeFirstName) {
      setError('First name is required.')
      return
    }

    setError('')

    const profilePayload = {
      firstName: safeFirstName,
      lastName: safeLastName,
    }

    const storedIdentity = readWelcomeMemberIdentity()
    if (storedIdentity) {
      queueMemberProfileSave({
        ...storedIdentity,
        ...profilePayload,
      })
    } else {
      void getCurrentMember()
        .then((member) => {
          queueMemberProfileSave({
            ...storeWelcomeMemberIdentity(member),
            ...profilePayload,
          })
        })
        .catch(() => {
          queueMemberProfileSave(profilePayload)
        })
    }

    navigateTo('/listen')
  }

  return (
    <div className="app-container">
      <div className="connect-content">
        <PageTitle>welcome</PageTitle>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>one quick step before you continue.</p>
        <p className="connect-auth-message" style={{ marginBottom: '1rem' }}>
          we&apos;ll save this in the background while you keep browsing.
        </p>

        <form onSubmit={onSubmit} className="connect-auth-form" noValidate>
          <label htmlFor="firstName" style={{ opacity: 0.9 }}>first name *</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="connect-auth-input"
            autoComplete="given-name"
            required
          />

          <label htmlFor="lastName" style={{ opacity: 0.9 }}>last name (optional)</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="connect-auth-input"
            autoComplete="family-name"
          />

          <div className="connect-auth-actions" style={{ marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="connect-portal-btn"
              disabled={!canSubmit}
            >
              continue →
            </button>
          </div>

          {error && <p className="connect-auth-error">{error}</p>}
        </form>

        <Link href="/" variant="subtle" style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}>
          ← home
        </Link>
      </div>
    </div>
  )
}
