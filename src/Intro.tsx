import { useState, useEffect, useRef } from 'react'
import './index.css'
import type { Experience, TimelineEvent, TextEvent, InputEvent, ChoiceEvent, Ending } from './types/experience'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

type Stage = 'play' | 'experience' | 'ending'

// Load experience data
const EXPERIENCE_DATA: Experience = {
  metadata: {
    title: "Interactive Experience",
    duration: 164,
    audioFile: "/audio/knock-knock.mp3"
  },
  timeline: [
    // ACT I — SETUP (2.0s → 42.0s)
    {
      type: "text",
      time: 2.0,
      text: "Catsky"
    },
    {
      type: "text",
      time: 6.0,
      text: "Born in Russia."
    },
    {
      type: "text",
      time: 12.0,
      text: "An environment not built for expressing emotions."
    },
    {
      type: "text",
      time: 18.0,
      text: "Or receiving them. Or validating them."
    },
    {
      type: "text",
      time: 23.0,
      text: "Fourteen years old."
    },
    {
      type: "text",
      time: 29.0,
      text: "Too many emotions. No way to explain them."
    },
    {
      type: "text",
      time: 35.0,
      text: "So I had to find an outlet."
    },
    {
      type: "text",
      time: 42.0,
      text: ""
    },
    // ACT II — CONFRONTATION (42.0s → 158.4s)
    // 42.0 → 72.0: [voicemail plays] [voicemail transcription appears progressively]
    {
      type: "text",
      time: 69.3,
      text: "Silence."
    },
    {
      type: "text",
      time: 77.0,
      text: "Was she mocking me?"
    },
    {
      type: "text",
      time: 84.0,
      text: "Or hearing something I couldn't hear myself?"
    },
    {
      type: "text",
      time: 91.0,
      text: "Because the years before that weren't quiet."
    },
    {
      type: "text",
      time: 98.0,
      text: "They were turbulent."
    },
    {
      type: "text",
      time: 106.0,
      text: "Unexpected turns. Betrayal."
    },
    {
      type: "text",
      time: 114.0,
      text: "Sex. Lies."
    },
    {
      type: "text",
      time: 121.0,
      text: "And moments worth surviving for."
    },
    {
      type: "text",
      time: 127.0,
      text: "Music wasn't a dream."
    },
    {
      type: "text",
      time: 134.0,
      text: "It was a translation."
    },
    {
      type: "text",
      time: 140.0,
      text: "A place where complexity didn't need permission."
    },
    {
      type: "text",
      time: 147.0,
      text: "Where nothing had to be simplified."
    },
    {
      type: "text",
      time: 153.0,
      text: "And then this voicemail changed the question."
    },
    // ACT III — CHOICE (post-song, interactive)
    {
      type: "text",
      time: 158.4,
      text: "What happens next isn't up to me alone."
    },
    {
      type: "choice",
      time: 164.0,
      question: "",
      options: [
        {
          text: "I want you to succeed.",
          value: "support",
          leadsTo: "branch-support"
        },
        {
          text: "I want to keep watching.",
          value: "observe",
          leadsTo: "branch-observe"
        },
        {
          text: "I don't know how I feel.",
          value: "respond",
          leadsTo: "branch-respond"
        }
      ]
    }
  ],
  endings: [
    {
      id: "ending-complete",
      title: "Thank You",
      text: "Thank you for experiencing this journey."
    }
  ]
}

export default function Intro() {
  const [stage, setStage] = useState<Stage>('play')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<TimelineEvent | null>(null)
  const [_userData, setUserData] = useState<Record<string, string>>({})
  const [currentEnding, setCurrentEnding] = useState<Ending | null>(null)
  const [showInputResponse, setShowInputResponse] = useState<string | null>(null)
  const [hoveredMarker, setHoveredMarker] = useState<{ time: number; label: string } | null>(null)
  const [showFlash, setShowFlash] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [showChoiceButtons, setShowChoiceButtons] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeUpdateIntervalRef = useRef<number | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineTrackRef = useRef<HTMLDivElement>(null)
  const flashTriggeredRef = useRef<Set<number>>(new Set())

  // Get text events for timeline markers
  const textEvents = EXPERIENCE_DATA.timeline.filter((e): e is TextEvent => e.type === 'text')
  const inputEvents = EXPERIENCE_DATA.timeline.filter((e): e is InputEvent => e.type === 'input')
  const choiceEvents = EXPERIENCE_DATA.timeline.filter((e): e is ChoiceEvent => e.type === 'choice')
  const allMarkers = [...textEvents, ...inputEvents, ...choiceEvents]

  // Handle timeline seek
  const handleTimelineSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || !timelineTrackRef.current) return
    
    const rect = timelineTrackRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const seekTime = percentage * duration
    
    audioRef.current.currentTime = seekTime
    setCurrentTime(seekTime)
    updateCurrentEvent(seekTime)
  }

  // Update current event based on time
  const updateCurrentEvent = (time: number) => {
    // Find the most recent event that should be active
    const activeEvent = EXPERIENCE_DATA.timeline
      .filter(e => time >= e.time)
      .pop() || null
    
    // For choice events, keep them active once they appear (and persist after audio ends)
    if (activeEvent?.type === 'choice' && !selectedBranch) {
      setCurrentEvent(activeEvent)
    } else if (!selectedBranch) {
      // Only update if no branch is selected (to keep choice visible)
      setCurrentEvent(activeEvent)
    }
    
    // Trigger flash at 13.8 and 20.5 seconds (only once each)
    const flashTimes = [13.8, 20.5]
    for (const flashTime of flashTimes) {
      if (time >= flashTime && !flashTriggeredRef.current.has(flashTime)) {
        flashTriggeredRef.current.add(flashTime)
        setShowFlash(true)
        // Flash stays for 0.1s, then fades over 2s
        setTimeout(() => {
          setShowFlash(false)
        }, 2100) // 0.1s flash + 2s fade
      }
    }
  }

  // Handle play button click
  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.src = EXPERIENCE_DATA.metadata.audioFile || '/audio/knock-knock.mp3'
      audioRef.current.play()
      setStage('experience')
      startTimecodeTracking()
    }
  }

  // Handle pause button click
  const handlePause = () => {
    if (audioRef.current) {
      if (isPaused) {
        audioRef.current.play()
        startTimecodeTracking()
        setIsPaused(false)
      } else {
        audioRef.current.pause()
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current)
        }
        setIsPaused(true)
      }
    }
  }

  // Handle stop button click
  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current)
    }
    setStage('play')
    setCurrentEvent(null)
    setCurrentTime(0)
    setUserData({})
    setCurrentEnding(null)
    setShowInputResponse(null)
    setIsPaused(false)
    setShowFlash(false)
    setSelectedBranch(null)
    setShowChoiceButtons(false)
    flashTriggeredRef.current.clear()
  }

  // Handle input submission
  const handleInputSubmit = (e: React.FormEvent, event: InputEvent) => {
    e.preventDefault()
    const input = e.currentTarget.querySelector('input') as HTMLInputElement
    if (input && input.value.trim()) {
      const userName = input.value.trim()
      setUserData(prev => ({ ...prev, [event.storeAs]: userName }))
      input.value = ''
      
      // Show response if this is the name input
      if (event.storeAs === 'name') {
        setShowInputResponse(`nice to meet you, ${userName}`)
        // Hide the input form
        setCurrentEvent(null)
        // Continue with timeline after 3 seconds
        setTimeout(() => {
          setShowInputResponse(null)
          // Resume timeline tracking
          if (audioRef.current) {
            updateCurrentEvent(audioRef.current.currentTime)
          }
        }, 3000)
      }
    }
  }

  // Handle choice selection
  const handleChoiceSelect = (option: ChoiceEvent['options'][0]) => {
    setUserData(prev => ({ ...prev, choice: option.value }))
    setSelectedBranch(option.value)
    
    // Pause audio when choice is made
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current)
    }
  }

  // Track audio timecode and update events
  const startTimecodeTracking = () => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current)
    }

    timeUpdateIntervalRef.current = window.setInterval(() => {
      if (audioRef.current) {
        const currentTime = audioRef.current.currentTime
        const duration = audioRef.current.duration
        
        setCurrentTime(currentTime)
        if (duration && !isNaN(duration)) {
          setDuration(duration)
        }

        updateCurrentEvent(currentTime)

        // Auto-focus input when input event becomes active
        if (currentEvent?.type === 'input' && inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 100)
        }

        // Check if we've reached the choice event time
        const choiceEvent = EXPERIENCE_DATA.timeline.find(e => e.type === 'choice')
        if (choiceEvent && currentTime >= choiceEvent.time && !selectedBranch) {
          setShowChoiceButtons(true)
        }
      }
    }, 100)
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
      }
    }
  }, [])

  // Get marker label for tooltip
  const getMarkerLabel = (event: TimelineEvent): string => {
    if (event.type === 'text') return event.text
    if (event.type === 'input') return event.label
    if (event.type === 'choice') return event.question
    return ''
  }

  return (
    <div className={`app-container ${showFlash ? 'flash-white' : ''}`}>
      {/* Hidden audio player */}
      <audio
        ref={audioRef}
        src={EXPERIENCE_DATA.metadata.audioFile || '/audio/knock-knock.mp3'}
        preload="auto"
        onEnded={() => {
          // When audio ends, ensure choice buttons are shown
          const choiceEvent = EXPERIENCE_DATA.timeline.find(e => e.type === 'choice')
          if (choiceEvent && !selectedBranch) {
            setShowChoiceButtons(true)
            // Continue tracking time even after audio ends
            setCurrentTime(choiceEvent.time)
          }
        }}
      />

      {/* Play Button Stage */}
      {stage === 'play' && (
        <>
          <button className="play-button" onClick={handlePlay}>
            play
          </button>
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
              transition: 'color 0.3s ease'
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
        </>
      )}

      {/* Experience Stage */}
      {stage === 'experience' && (
        <div className="form-screen">
          <div className="debug-buttons">
            <button className="debug-pause-button" onClick={handlePause} title={isPaused ? "Resume" : "Pause"}>
              {isPaused ? 'resume' : 'pause'}
            </button>
            <button className="debug-stop-button" onClick={handleStop} title="Stop">
              stop
            </button>
          </div>
          <div className="time-counter">
            {currentTime.toFixed(1)}s / {duration ? duration.toFixed(1) : '?'}s
          </div>

          {/* Text Display - always centered at same position */}
          {!selectedBranch && (currentEvent?.type === 'text' || showInputResponse || (currentEvent?.type === 'input')) && (
            <div className="text-display">
              <div className="conversational-text">
                {showInputResponse || 
                 (currentEvent?.type === 'text' ? currentEvent.text : '') ||
                 (currentEvent?.type === 'input' ? currentEvent.label : '')}
              </div>
              {/* Show choice buttons below the "what happens next" text */}
              {showChoiceButtons && !selectedBranch && (
                <div style={{ marginTop: '3rem' }}>
                  <div className="yes-no-buttons" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    {(() => {
                      const choiceEvent = EXPERIENCE_DATA.timeline.find(e => e.type === 'choice')
                      return choiceEvent?.options.map((option, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleChoiceSelect(option)}
                          className="yes-no-button"
                        >
                          {option.text}
                        </button>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input Display - positioned below without affecting text */}
          {currentEvent?.type === 'input' && !showInputResponse && (
            <div className="input-container-below">
              <form onSubmit={(e) => handleInputSubmit(e, currentEvent)} className="name-form">
                <input
                  ref={inputRef}
                  id="dynamic-input"
                  type="text"
                  className="form-input"
                  placeholder={currentEvent.placeholder || ''}
                  autoFocus
                  autoComplete="off"
                />
                <button type="submit" className="submit-button">
                  enter
                </button>
              </form>
            </div>
          )}

          {/* Choice Display - removed, now shown below text */}

          {/* Branch Follow-up Screens */}
          {selectedBranch === 'support' && (
            <div className="form-screen">
              <div className="text-display">
                <div className="conversational-text">
                  Help me make this my full-time life.
                </div>
              </div>
              <div className="input-container-below">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget as HTMLFormElement)
                  const amount = formData.get('amount') as string
                  const frequency = formData.get('frequency') as string
                  console.log('Donation:', { amount, frequency })
                  // TODO: Handle donation submission
                }} className="name-form">
                  <input
                    type="number"
                    name="amount"
                    className="form-input"
                    placeholder="Choose amount"
                    min="1"
                    required
                    autoFocus
                  />
                  <div className="yes-no-buttons" style={{ marginTop: '1rem', flexDirection: 'row', justifyContent: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '2rem' }}>
                      <input
                        type="radio"
                        name="frequency"
                        value="one-time"
                        defaultChecked
                        style={{ marginRight: '0.5rem', cursor: 'pointer', accentColor: 'white' }}
                      />
                      <span>One-time</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="frequency"
                        value="recurring"
                        style={{ marginRight: '0.5rem', cursor: 'pointer', accentColor: 'white' }}
                      />
                      <span>Recurring</span>
                    </label>
                  </div>
                  <button type="submit" className="submit-button" style={{ marginTop: '1rem' }}>
                    Donate
                  </button>
                </form>
              </div>
            </div>
          )}

          {selectedBranch === 'observe' && (
            <div className="form-screen">
              <div className="text-display">
                <div className="conversational-text">
                  No pressure. Just stay close.
                </div>
              </div>
              <div className="input-container-below">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget as HTMLFormElement)
                  const email = formData.get('email') as string
                  const phone = formData.get('phone') as string
                  console.log('Signup:', { email, phone })
                  // TODO: Handle email signup
                }} className="name-form">
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="Email"
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    placeholder="Phone (optional)"
                    style={{ marginTop: '1rem' }}
                  />
                  <button type="submit" className="submit-button">
                    enter
                  </button>
                </form>
              </div>
            </div>
          )}

          {selectedBranch === 'respond' && (
            <div className="form-screen">
              <div className="text-display">
                <div className="conversational-text">
                  That's okay. Say anything.
                </div>
              </div>
              <div className="input-container-below">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget as HTMLFormElement)
                  const message = formData.get('message') as string
                  console.log('Response:', { message })
                  // TODO: Handle message submission
                }} className="name-form">
                  <textarea
                    name="message"
                    className="form-input"
                    placeholder="Say anything..."
                    rows={4}
                    style={{ 
                      resize: 'none',
                      minHeight: '120px',
                      fontFamily: 'inherit'
                    }}
                    required
                  />
                  <button type="submit" className="submit-button">
                    enter
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Timeline */}
          {duration > 0 && (
            <div className="timeline-container" ref={timelineRef}>
              <div 
                className="timeline-track" 
                ref={timelineTrackRef}
                onClick={handleTimelineSeek}
              >
                {/* Timeline markers */}
                {allMarkers.map((event) => (
                  <div
                    key={`${event.type}-${event.time}`}
                    className="timeline-marker"
                    style={{
                      left: `${(event.time / duration) * 100}%`
                    }}
                    onMouseEnter={() => {
                      setHoveredMarker({
                        time: event.time,
                        label: getMarkerLabel(event)
                      })
                    }}
                    onMouseLeave={() => setHoveredMarker(null)}
                  />
                ))}
                
                {/* Tooltip for hovered marker */}
                {hoveredMarker && (
                  <div
                    className="timeline-marker-tooltip"
                    style={{
                      left: `${(hoveredMarker.time / duration) * 100}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="timeline-tooltip-time">{hoveredMarker.time}s</div>
                    <div className="timeline-tooltip-text">{hoveredMarker.label}</div>
                  </div>
                )}
                
                {/* Playhead indicator */}
                <div
                  className="timeline-playhead"
                  style={{
                    left: `${(currentTime / duration) * 100}%`
                  }}
                />
                
                {/* Timeline progress bar */}
                <div
                  className="timeline-progress"
                  style={{
                    width: `${(currentTime / duration) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ending Stage */}
      {stage === 'ending' && currentEnding && (
        <div className="form-screen">
          <div className="text-display">
            <div className="conversational-text">
              <div className="greeting">{currentEnding.title}</div>
              <br />
              {currentEnding.text}
            </div>
          </div>
          <button className="debug-stop-button" onClick={handleStop} style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}>
            restart
          </button>
        </div>
      )}
    </div>
  )
}
