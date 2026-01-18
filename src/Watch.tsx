import './index.css'

// Internal navigation helper - ensures all navigation stays within the app
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/* 
 * SHELVED: Original interactive experience with audio and story
 * This can be restored later if needed. The full implementation is commented out below.
 * 
 * import { useState, useEffect, useRef } from 'react'
 * import type { Experience, TimelineEvent, TextEvent, InputEvent, ChoiceEvent, Ending } from './types/experience'
 * 
 * type Stage = 'play' | 'experience' | 'ending'
 * 
 * const EXPERIENCE_DATA: Experience = { ... }
 * 
 * Full implementation with audio player, timeline, text events, choices, etc.
 */

export default function Watch() {
  return (
    <div className="app-container">
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          padding: '2rem',
          textAlign: 'left',
          letterSpacing: '0.05em',
          lineHeight: 1.8,
          maxHeight: '100vh',
          overflowY: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text',
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              marginBottom: '1.25rem',
              letterSpacing: '0.1em',
              textTransform: 'lowercase',
            }}
          >
            watch
          </h1>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              position: 'relative',
              paddingBottom: '56.25%', // 16:9 aspect ratio
              height: 0,
              overflow: 'hidden',
              maxWidth: '800px',
            }}
          >
            <iframe
              src="https://www.youtube.com/embed/1mEIXt3jYmA"
              title="Music Video Teaser"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ opacity: 0.9, marginBottom: '2rem' }}>
          <p style={{ marginBottom: '1.5rem' }}>
            get access to the full music video
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <a
            href="/connect"
            onClick={(e) => {
              e.preventDefault()
              navigateTo('/connect')
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
            get access
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
