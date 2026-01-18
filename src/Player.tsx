import { useCallback, useEffect, useRef, useState } from 'react'
import './index.css'
import { checkSubscriptionStatus, type SubscriptionStatus } from './utils/subscription'
import { 
  getDirectAudioUrl, 
  getSoundCloudEmbedUrl
} from './utils/audioHelpers'
import { TRACKS } from './config/tracks'

// Internal navigation helper
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function openPortalPaid(): void {
  window.location.hash = '#/portal/account'
}

export default function Player() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('unknown')
  const [checking, setChecking] = useState(true)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [trackVotes, setTrackVotes] = useState<Record<string, 'up' | 'down' | null>>(() => {
    // Load votes from localStorage on mount
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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const soundcloudIframeRef = useRef<HTMLIFrameElement | null>(null)

  const refreshStatus = useCallback(async () => {
    setChecking(true)
    setSubscriptionError(null)
    try {
      // Add timeout for subscription check
      const timeoutPromise = new Promise<SubscriptionStatus>((_, reject) => {
        setTimeout(() => reject(new Error('Subscription check timeout')), 10000)
      })
      
      const statusPromise = checkSubscriptionStatus()
      const status = await Promise.race([statusPromise, timeoutPromise])
      setSubscriptionStatus(status)
    } catch (error) {
      console.error('Error checking subscription:', error)
      setSubscriptionStatus('not_subscriber')
      setSubscriptionError('Unable to verify subscription status. Showing guest access.')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const isPaid = subscriptionStatus === 'paid_subscriber'

  // Access control:
  // - Non-registered users: first 1 track
  // - Free subscribers: first 2 tracks
  // - Paid subscribers: all 3 tracks
  const getAccessibleTracks = useCallback(() => {
    if (isPaid) {
      return TRACKS // All tracks for paid subscribers
    }
    if (subscriptionStatus === 'free_subscriber') {
      return TRACKS.slice(0, 2) // First 2 tracks for free subscribers
    }
    // Non-registered users get first track only
    return TRACKS.slice(0, 1)
  }, [isPaid, subscriptionStatus])

  const accessibleTracks = getAccessibleTracks()
  const lockedTracks = isPaid ? [] : TRACKS.slice(accessibleTracks.length)

  // Persist votes to localStorage
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

    // Check access
    const trackIndex = TRACKS.findIndex(t => t.id === trackId)
    if (!isPaid) {
      if (subscriptionStatus === 'free_subscriber' && trackIndex >= 2) {
        // Locked track for free subscribers (only first 2 tracks accessible)
        return
      }
      if (subscriptionStatus !== 'free_subscriber' && trackIndex >= 1) {
        // Locked track for non-registered users (only first track accessible)
        return
      }
    }

    setTrackLoadError(null)
    setCurrentTrackId(trackId)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    
    // Handle different audio source types
    if (track.audioSource.type === 'direct') {
      // Direct URL - use HTML5 audio element
      const audioUrl = getDirectAudioUrl(track.audioSource)
      if (audioUrl && audioRef.current) {
        try {
          audioRef.current.src = audioUrl
          audioRef.current.load()
          // Set up error handler for audio element
          audioRef.current.onerror = () => {
            setTrackLoadError('Failed to load audio track')
          }
          audioRef.current.onloadeddata = () => {
            setTrackLoadError(null)
          }
        } catch (error) {
          console.error('Error loading audio:', error)
          setTrackLoadError('Failed to load audio track')
        }
      }
    } else if (track.audioSource.type === 'soundcloud') {
      // SoundCloud - will use iframe widget (handled in render)
      // Reset audio ref when switching to SoundCloud
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [isPaid, subscriptionStatus])

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
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
    setTrackVotes(prev => ({
      ...prev,
      [trackId]: prev[trackId] === vote ? null : vote
    }))
  }, [isPaid])

  const handleSubmitFeedback = useCallback(async (trackId: string) => {
    if (!isPaid || !feedbackText.trim()) return
    
    try {
      // TODO: Send feedback to backend
      console.log('Feedback for track', trackId, ':', feedbackText)
      
      // Show success message
      setFeedbackSubmitted(trackId)
      setFeedbackText('')
      setShowFeedback(null)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setFeedbackSubmitted(null)
      }, 3000)
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
      <div className="app-container">
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.9 }}>
          checking access…
        </div>
      </div>
    )
  }


  const currentTrack = currentTrackId ? TRACKS.find(t => t.id === currentTrackId) : null

  return (
    <div className="app-container">
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          padding: '2rem',
          textAlign: 'left',
          letterSpacing: '0.05em',
          lineHeight: '1.8',
          maxHeight: '100vh',
          overflowY: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            marginBottom: '1.25rem',
            letterSpacing: '0.1em',
            textTransform: 'lowercase',
          }}
        >
          player
        </h1>

        <div style={{ opacity: 0.9, marginBottom: '2rem', fontSize: '0.9rem' }}>
          {isPaid ? (
            <p>paid subscriber — full access to all tracks</p>
          ) : subscriptionStatus === 'free_subscriber' ? (
            <p>free subscriber — access to first 2 tracks</p>
          ) : (
            <p>guest — access to first track only</p>
          )}
          {subscriptionError && (
            <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              {subscriptionError}
            </p>
          )}
        </div>

        {/* Track List */}
        <div style={{ marginBottom: '2rem' }}>
          <h2
            style={{
              fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
              marginBottom: '1rem',
              letterSpacing: '0.1em',
              textTransform: 'lowercase',
            }}
          >
            tracks
          </h2>
          {TRACKS.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
              <p>No tracks available at this time.</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {accessibleTracks.map(track => (
              <div
                key={track.id}
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: currentTrackId === track.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseLeave={(e) => {
                  if (currentTrackId !== track.id) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
                onClick={() => handleTrackSelect(track.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: currentTrackId === track.id ? 'bold' : 'normal' }}>
                      {track.title}
                    </div>
                    {track.version && (
                      <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.25rem' }}>
                        {track.version} {track.date && `• ${track.date}`}
                      </div>
                    )}
                  </div>
                  {isPaid && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVote(track.id, 'up')
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: trackVotes[track.id] === 'up' ? 'var(--color-text)' : 'rgba(255, 255, 255, 0.5)',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          padding: '0.25rem',
                        }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVote(track.id, 'down')
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: trackVotes[track.id] === 'down' ? 'var(--color-text)' : 'rgba(255, 255, 255, 0.5)',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          padding: '0.25rem',
                        }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowFeedback(showFeedback === track.id ? null : track.id)
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          color: 'var(--color-text)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          padding: '0.25rem 0.5rem',
                          textTransform: 'lowercase',
                        }}
                      >
                        feedback
                      </button>
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
                        width: '100%',
                        minHeight: '80px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: 'var(--color-text)',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.5rem',
                        fontSize: '0.9rem',
                        resize: 'vertical',
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSubmitFeedback(track.id)
                      }}
                      style={{
                        marginTop: '0.5rem',
                        background: 'transparent',
                        border: '1px solid var(--color-text)',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0.5rem 1rem',
                        textTransform: 'lowercase',
                      }}
                    >
                      submit
                    </button>
                    {feedbackSubmitted === track.id && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        fontSize: '0.85rem', 
                        opacity: 0.7,
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}>
                        ✓ feedback submitted. thank you!
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {lockedTracks.length > 0 && (
              <>
                {lockedTracks.map(track => (
                  <div
                    key={track.id}
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '1rem',
                      opacity: 0.5,
                      position: 'relative',
                      cursor: 'not-allowed',
                      userSelect: 'none',
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Prevent any interaction with locked tracks
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
                      <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                        locked
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                  <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    {subscriptionStatus === 'free_subscriber' 
                      ? 'upgrade to paid to access all tracks'
                      : 'subscribe to access more tracks'}
                  </p>
                  <button
                    onClick={subscriptionStatus === 'free_subscriber' ? openPortalPaid : () => navigateTo('/follow')}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--color-text)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      padding: '0.5rem 1rem',
                      textTransform: 'lowercase',
                    }}
                  >
                    {subscriptionStatus === 'free_subscriber' ? 'upgrade →' : 'subscribe →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Audio Player */}
        {currentTrack && (
          <div
            style={{
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {currentTrack.title}
              </div>
              {currentTrack.audioSource.type === 'direct' && (
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              )}
              {trackLoadError && (
                <div style={{ 
                  fontSize: '0.85rem', 
                  opacity: 0.7, 
                  marginTop: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  ⚠ {trackLoadError}
                </div>
              )}
            </div>

            {/* Direct audio player (for MP3 files from cloud storage) */}
            {currentTrack.audioSource.type === 'direct' && (
              <>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <button
                    onClick={handlePlayPause}
                    style={{
                      background: 'transparent',
                      border: '2px solid var(--color-text)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                      width: '3rem',
                      height: '3rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textTransform: 'lowercase',
                    }}
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255, 255, 255, 0.2)', position: 'relative' }}>
                    <div
                      style={{
                        height: '100%',
                        background: 'var(--color-text)',
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

            {/* SoundCloud widget (for SoundCloud tracks) */}
            {currentTrack.audioSource.type === 'soundcloud' && (
              <div style={{ marginTop: '1rem' }}>
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
                  style={{
                    border: 'none',
                    borderRadius: '0',
                  }}
                  title={`SoundCloud player for ${currentTrack.title}`}
                />
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem', textAlign: 'center' }}>
                  powered by soundcloud
                </div>
              </div>
            )}
          </div>
        )}

        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigateTo('/')
          }}
          style={{
            position: 'fixed',
            bottom: '1rem',
            left: '1rem',
            color: 'rgba(255, 255, 255, 0.5)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            letterSpacing: '0.05em',
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
          }}
        >
          ← home
        </a>
      </div>
    </div>
  )
}
