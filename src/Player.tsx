import { useCallback, useEffect, useRef, useState } from 'react'
import './index.css'
import { checkSubscriptionStatus, type SubscriptionStatus } from './utils/subscription'
import { 
  type AudioSource, 
  getDirectAudioUrl, 
  getSoundCloudEmbedUrl
} from './utils/audioHelpers'

// Internal navigation helper
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function openPortalPaid(): void {
  window.location.hash = '#/portal/account'
}

// Re-export types from audioHelpers for convenience

interface Track {
  id: string
  title: string
  audioSource: AudioSource
  version?: string
  date?: string
}

// Your SoundCloud tracks from sets
// 
// You have two sets with secret tracks:
// - https://soundcloud.com/catsky_club/sets/soft-and-sound
// - (your other set)
//
// Easiest way: Use the private share link from SoundCloud
// Just copy the full URL (before the ?) and use it as trackUrl

const MOCK_TRACKS: Track[] = [
  // Track 1: Vision v1 from "Soft and Sound" set
  {
    id: '1',
    title: 'Vision v1',
    audioSource: {
      type: 'soundcloud',
      trackUrl: 'https://soundcloud.com/catsky_club/vision-v1/s-L5q3Tw7Jyvp', // Private share link (before ?)
    },
    version: 'v1.0',
    date: '2024-01-15'
  },
  // Add more tracks from your sets...
  // You can use either:
  // 
  // Option A: Full track URL with secret token (easiest)
  // {
  //   id: '2',
  //   title: 'Track Name',
  //   audioSource: {
  //     type: 'soundcloud',
  //     trackUrl: 'https://soundcloud.com/catsky_club/track-name/s-SECRET_TOKEN'
  //   }
  // }
  //
  // Option B: Track ID + secret token separately
  // {
  //   id: '2',
  //   title: 'Track Name',
  //   audioSource: {
  //     type: 'soundcloud',
  //     trackId: '123456789',
  //     secretToken: 's-XXXXX'
  //   }
  // }
]

export default function Player() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('unknown')
  const [checking, setChecking] = useState(true)
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [trackVotes, setTrackVotes] = useState<Record<string, 'up' | 'down' | null>>({})
  const [showFeedback, setShowFeedback] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const soundcloudIframeRef = useRef<HTMLIFrameElement | null>(null)

  const refreshStatus = useCallback(async () => {
    setChecking(true)
    try {
      const status = await checkSubscriptionStatus()
      setSubscriptionStatus(status)
    } catch (error) {
      console.error('Error checking subscription:', error)
      setSubscriptionStatus('not_subscriber')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const isPaid = subscriptionStatus === 'paid_subscriber'
  const isSubscriber = subscriptionStatus === 'free_subscriber' || subscriptionStatus === 'paid_subscriber'

  // Free subscribers can access first track + 2 more (3 total)
  // Paid subscribers can access all tracks
  const getAccessibleTracks = useCallback(() => {
    if (isPaid) {
      return MOCK_TRACKS
    }
    if (subscriptionStatus === 'free_subscriber') {
      return MOCK_TRACKS.slice(0, 3) // First track + 2 more
    }
    return []
  }, [isPaid, subscriptionStatus])

  const accessibleTracks = getAccessibleTracks()
  const lockedTracks = isPaid ? [] : MOCK_TRACKS.slice(3)

  const handleTrackSelect = useCallback((trackId: string) => {
    const track = MOCK_TRACKS.find(t => t.id === trackId)
    if (!track) return

    // Check access
    if (!isPaid && subscriptionStatus === 'free_subscriber') {
      const trackIndex = MOCK_TRACKS.findIndex(t => t.id === trackId)
      if (trackIndex >= 3) {
        // Locked track for free subscribers
        return
      }
    }

    setCurrentTrackId(trackId)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    
    // Handle different audio source types
    if (track.audioSource.type === 'direct') {
      // Direct URL - use HTML5 audio element
      const audioUrl = getDirectAudioUrl(track.audioSource)
      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.load()
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

  const handleSubmitFeedback = useCallback((trackId: string) => {
    if (!isPaid || !feedbackText.trim()) return
    // TODO: Send feedback to backend
    console.log('Feedback for track', trackId, ':', feedbackText)
    setFeedbackText('')
    setShowFeedback(null)
    // Show confirmation
    alert('Feedback submitted. Thank you!')
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

  if (!isSubscriber) {
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

          <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              this player is for subscribers only.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              listen to the latest versions of tracks in progress.
            </p>
            <a
              href="/follow"
              onClick={(e) => {
                e.preventDefault()
                navigateTo('/follow')
              }}
              style={{
                color: 'var(--color-text)',
                textDecoration: 'none',
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                letterSpacing: '0.1em',
                border: '2px solid var(--color-text)',
                padding: '0.9rem 1.5rem',
                display: 'inline-block',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textTransform: 'lowercase',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-text)'
                e.currentTarget.style.color = 'var(--color-bg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
            >
              subscribe →
            </a>
          </div>

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

  const currentTrack = currentTrackId ? MOCK_TRACKS.find(t => t.id === currentTrackId) : null

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
          ) : (
            <p>free subscriber — access to first 3 tracks</p>
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
                    upgrade to paid to access all tracks
                  </p>
                  <button
                    onClick={openPortalPaid}
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
                    upgrade →
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
