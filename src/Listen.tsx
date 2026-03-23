import { useCallback, useEffect, useRef, useState } from 'react'
import { PageContainer, PageTitle, Link } from './components'
import { navigateTo } from './router'
import {
  getMembershipTier,
  type MembershipTier,
  getDirectAudioUrl,
  getSoundCloudEmbedUrl,
  openPortalAccount,
} from './utils'
import { TRACKS, type Track } from './config/tracks'
import { getLockedTrackLabel, hasTrackAccess } from './utils/trackAccess'

export default function Listen() {
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('none')
  const [checking, setChecking] = useState(true)
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [trackVotes, setTrackVotes] = useState<Record<string, 'up' | 'down' | null>>(() => {
    try {
      const saved = localStorage.getItem('trackVotes')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [showFeedback, setShowFeedback] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<string | null>(null)
  const [trackLoadError, setTrackLoadError] = useState<string | null>(null)
  const [hoveredLockedTrackId, setHoveredLockedTrackId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const soundcloudIframeRef = useRef<HTMLIFrameElement | null>(null)

  const refreshStatus = useCallback(async () => {
    setChecking(true)
    try {
      const timeoutPromise = new Promise<MembershipTier>((_, reject) => {
        setTimeout(() => reject(new Error('Subscription check timeout')), 10000)
      })
      const tierPromise = getMembershipTier()
      const tier = await Promise.race([tierPromise, timeoutPromise])
      setMembershipTier(tier)
    } catch (error) {
      console.error('Error checking subscription:', error)
      setMembershipTier('none')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const hasLocalSignup = (() => {
    try {
      return window.localStorage.getItem('catsky_signed_up') === '1'
    } catch {
      return false
    }
  })()

  const effectiveTier: MembershipTier = membershipTier === 'none' && hasLocalSignup ? 'free' : membershipTier

  const isPaid = effectiveTier === 'paid_5' || effectiveTier === 'paid_20'
  const isGhostMember = effectiveTier !== 'none'

  const canAccessTrack = useCallback((track: Track) => hasTrackAccess(track, effectiveTier), [effectiveTier])

  const accessibleTracks = TRACKS.filter(canAccessTrack)
  const lockedTracks = TRACKS.filter((track) => !canAccessTrack(track))

  useEffect(() => {
    try {
      localStorage.setItem('trackVotes', JSON.stringify(trackVotes))
    } catch (error) {
      console.error('Error saving votes to localStorage:', error)
    }
  }, [trackVotes])

  const handleTrackSelect = useCallback((trackId: string) => {
    const track = TRACKS.find(t => t.id === trackId)
    if (!track) {
      setTrackLoadError('Track not found')
      return
    }
    if (!canAccessTrack(track)) {
      navigateTo('/connect')
      return
    }
    setTrackLoadError(null)
    setCurrentTrackId(trackId)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    if (track.audioSource.type === 'direct') {
      const audioUrl = getDirectAudioUrl(track.audioSource)
      if (audioUrl && audioRef.current) {
        try {
          audioRef.current.src = audioUrl
          audioRef.current.load()
          audioRef.current.onerror = () => setTrackLoadError('Failed to load audio track')
          audioRef.current.onloadeddata = () => setTrackLoadError(null)
        } catch (error) {
          console.error('Error loading audio:', error)
          setTrackLoadError('Failed to load audio track')
        }
      }
    } else if (track.audioSource.type === 'soundcloud') {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [canAccessTrack])

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setDuration(audioRef.current.duration || 0)
    }
  }, [])

  const handleVote = useCallback((trackId: string, vote: 'up' | 'down') => {
    if (!isPaid) return
    setTrackVotes(prev => ({ ...prev, [trackId]: prev[trackId] === vote ? null : vote }))
  }, [isPaid])

  const handleSubmitFeedback = useCallback(async (trackId: string) => {
    if (!isPaid || !feedbackText.trim()) return
    try {
      console.log('Feedback for track', trackId, ':', feedbackText)
      setFeedbackSubmitted(trackId)
      setFeedbackText('')
      setShowFeedback(null)
      setTimeout(() => setFeedbackSubmitted(null), 3000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setTrackLoadError('Failed to submit feedback. Please try again.')
    }
  }, [isPaid, feedbackText])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (checking) {
    return (
      <PageContainer showHomeLink={false}>
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.9 }}>
          checking access…
        </div>
      </PageContainer>
    )
  }

  const currentTrack = currentTrackId ? TRACKS.find(t => t.id === currentTrackId) : null

  return (
    <div className="app-container listen-page-shell">
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          padding: '1rem 1.5rem',
          boxSizing: 'border-box',
          textAlign: 'left',
          letterSpacing: '0.05em',
          lineHeight: '1.8',
          height: '100dvh',
          overflowY: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      >
        <PageTitle style={{ marginBottom: '0.75rem' }}>listen</PageTitle>

        {isGhostMember && (
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', opacity: 0.8 }}>
            <a
              href="#/portal/account"
              data-portal="account"
              onClick={(e) => {
                e.preventDefault()
                openPortalAccount()
              }}
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                textDecoration: 'none',
                fontSize: '0.95rem',
                letterSpacing: '0.05em',
                borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
                paddingBottom: '0.1rem',
                cursor: 'pointer',
                textTransform: 'lowercase',
              }}
            >
              account
            </a>
          </div>
        )}

        {currentTrack && (
          <div style={{ border: '1px solid rgba(255, 255, 255, 0.3)', padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{currentTrack.title}</div>
              {currentTrack.audioSource.type === 'direct' && (
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              )}
              {trackLoadError && (
                <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  ⚠ {trackLoadError}
                </div>
              )}
            </div>

            {currentTrack.audioSource.type === 'direct' && (
              <>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <button
                    onClick={handlePlayPause}
                    style={{
                      background: 'transparent', border: '2px solid var(--color-text)', color: 'var(--color-text)',
                      cursor: 'pointer', fontSize: '1.5rem', width: '3rem', height: '3rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'lowercase',
                    }}
                  >{isPlaying ? '⏸' : '▶'}</button>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255, 255, 255, 0.2)', position: 'relative' }}>
                    <div
                      style={{
                        height: '100%', background: 'var(--color-text)',
                        width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                        transition: 'width 0.1s linear',
                      }}
                    />
                  </div>
                </div>
                <audio
                  ref={audioRef}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  style={{ display: 'none' }}
                />
              </>
            )}

            {currentTrack.audioSource.type === 'soundcloud' && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem', textAlign: 'center', fontStyle: 'italic' }}>
                  click the circle to play
                </div>
                <iframe
                  ref={soundcloudIframeRef}
                  width="100%"
                  height="166"
                  scrolling="no"
                  frameBorder="no"
                  allow="autoplay"
                  src={getSoundCloudEmbedUrl(
                    currentTrack.audioSource.trackId,
                    currentTrack.audioSource.trackUrl,
                    currentTrack.audioSource.setId,
                    currentTrack.audioSource.secretToken
                  )}
                  style={{ border: 'none', borderRadius: '0' }}
                  title={`SoundCloud player for ${currentTrack.title}`}
                />
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem', textAlign: 'center' }}>
                  powered by soundcloud
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          {TRACKS.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
              <p>No tracks available at this time.</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {accessibleTracks.map(track => (
              <div
                key={track.id}
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: currentTrackId === track.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)' }}
                onMouseLeave={(e) => {
                  if (currentTrackId !== track.id) e.currentTarget.style.backgroundColor = 'transparent'
                }}
                onClick={() => handleTrackSelect(track.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: currentTrackId === track.id ? 'bold' : 'normal' }}>{track.title}</div>
                    {track.version && (
                      <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.25rem' }}>
                        {track.version} {track.date && `• ${track.date}`}
                      </div>
                    )}
                  </div>
                  {isPaid && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleVote(track.id, 'up') }}
                        style={{
                          background: 'transparent', border: 'none',
                          color: trackVotes[track.id] === 'up' ? 'var(--color-text)' : 'rgba(255, 255, 255, 0.5)',
                          cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem',
                        }}
                      >↑</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleVote(track.id, 'down') }}
                        style={{
                          background: 'transparent', border: 'none',
                          color: trackVotes[track.id] === 'down' ? 'var(--color-text)' : 'rgba(255, 255, 255, 0.5)',
                          cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem',
                        }}
                      >↓</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowFeedback(showFeedback === track.id ? null : track.id) }}
                        style={{
                          background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.3)',
                          color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.85rem',
                          padding: '0.25rem 0.5rem', textTransform: 'lowercase',
                        }}
                      >feedback</button>
                    </div>
                  )}
                </div>
                {showFeedback === track.id && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="share your thoughts on this track..."
                      style={{
                        width: '100%', minHeight: '80px', background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)', color: 'var(--color-text)',
                        fontFamily: 'var(--font-mono)', padding: '0.5rem', fontSize: '0.9rem', resize: 'vertical',
                      }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSubmitFeedback(track.id) }}
                      style={{
                        marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--color-text)',
                        color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.9rem',
                        padding: '0.5rem 1rem', textTransform: 'lowercase',
                      }}
                    >submit</button>
                    {feedbackSubmitted === track.id && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.7, color: 'rgba(255, 255, 255, 0.8)' }}>
                        ✓ feedback submitted. thank you!
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {lockedTracks.length > 0 && (
              <>
                {lockedTracks.map(track => {
                  const isHovered = hoveredLockedTrackId === track.id
                  return (
                    <div
                      key={track.id}
                      style={{
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '0.85rem 1rem',
                        opacity: 0.6,
                        position: 'relative',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      onMouseEnter={() => setHoveredLockedTrackId(track.id)}
                      onMouseLeave={() => setHoveredLockedTrackId(null)}
                      onFocus={() => setHoveredLockedTrackId(track.id)}
                      onBlur={() => setHoveredLockedTrackId(null)}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        navigateTo('/connect')
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div>{track.title}</div>
                          {track.version && (
                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.25rem' }}>
                              {track.version} {track.date && `• ${track.date}`}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{getLockedTrackLabel(track)}</div>
                      </div>
                      {isHovered && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.9 }}>
                          listen early
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
        <Link
          href="/"
          variant="subtle"
          style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}
        >
          ← home
        </Link>
      </div>
    </div>
  )
}
