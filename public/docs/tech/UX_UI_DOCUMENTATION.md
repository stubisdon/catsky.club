# UX/UI Documentation

This document describes the user experience, interaction patterns, and expected behaviors for the Ghost Headless Frontend Starter website. Use this documentation when:
- Writing automated tests
- Migrating to a different tech stack
- Onboarding new developers
- Making UX/UI changes

## Table of Contents
1. [Overview](#overview)
2. [User Journey](#user-journey)
3. [Stage Definitions](#stage-definitions)
4. [Interaction Patterns](#interaction-patterns)
5. [Visual Specifications](#visual-specifications)
6. [Expected Behaviors](#expected-behaviors)
7. [Test Scenarios](#test-scenarios)

---

## Overview

### Purpose
The website is an immersive, interactive experience that guides users through a multi-stage journey:
1. Initial introduction with audio
2. Video background playback
3. Name collection
4. Contact information collection
5. Confirmation message

### Key Features
- **Immersive black screen experience** with minimal UI
- **Background video** that plays continuously after initial interaction
- **Audio feedback** (knock-knock sound) on initial load
- **Progressive disclosure** - content revealed step by step
- **Mobile-responsive** design with touch-optimized interactions

---

## User Journey

### Flow Diagram
```
[Page Load]
    ↓
[Intro Stage] → User sees "knock knock 🐾" + audio plays
    ↓
[User Clicks Anywhere]
    ↓
[Video Stage] → Video starts playing in background, "knock knock" text remains visible
    ↓
[Video Ends OR Auto-transition]
    ↓
[Name Stage] → Form appears asking "who are you?"
    ↓
[User Enters Name + Submits]
    ↓
[Contact Stage] → Form appears with greeting "hello, {name}" + "how can i reach you?"
    ↓
[User Enters Contact + Submits]
    ↓
[Message Stage] → Confirmation message with collected data
```

---

## Stage Definitions

### Stage 1: Intro (`stage: 'intro'`)

**Visual State:**
- Black background (`#000000`)
- Centered "knock knock 🐾" text
- Text size: `clamp(1.5rem, 4vw, 3rem)` (responsive)
- Optional hint text: "Click anywhere to begin" (shown if audio not playing)
- Paw emoji (🐾) with pulse animation

**Audio:**
- Knock-knock sound (`/audio/knock-knock.mp3`) attempts to auto-play
- Loops continuously
- May be blocked by browser autoplay policies

**Interactions:**
- **Click anywhere** → Transitions to Video Stage
- Cursor: `pointer` (indicates clickable)

**Expected Behavior:**
- Page loads with intro screen visible
- Audio attempts to play automatically
- If audio fails to play, hint text appears
- Clicking anywhere on screen triggers next stage

---

### Stage 2: Video (`stage: 'video'`)

**Visual State:**
- **Background Layer:** YouTube video playing fullscreen
  - Video ID: `8wU8k2kDaTo`
  - Muted, looping, no controls
  - Covers entire viewport
  - Z-index: 0 (behind all content)
- **Foreground Layer:** "knock knock 🐾" text remains visible
  - Same styling as Intro stage
  - Z-index: 2 (above video)
  - Text shadow for readability: `2px 2px 4px rgba(0, 0, 0, 0.8)`

**Video Configuration:**
- Autoplay: No (starts on user interaction)
- Controls: Hidden
- Loop: Yes
- Muted: Yes
- Modest branding: Yes
- Plays inline: Yes

**Interactions:**
- Video plays automatically when stage transitions
- Video continues playing through all subsequent stages
- No user interaction required (auto-transitions)

**Expected Behavior:**
- Video starts playing when user clicks from Intro stage
- Video remains as background for all remaining stages
- "knock knock" text stays visible during video playback
- Video loops continuously
- After video ends (or timeout), transitions to Name stage

---

### Stage 3: Name (`stage: 'name'`)

**Visual State:**
- **Background:** Video continues playing (same as Video stage)
- **Foreground:** Form overlay
  - Label: "who are you?" (centered, large text)
  - Input field: 
    - Transparent background
    - Bottom border (2px solid white)
    - Centered text
    - Auto-focused on stage load
    - No placeholder text
  - Submit button: "enter" (desktop) or "→" (mobile)
    - Transparent with white border
    - Hover: inverts colors (white bg, black text)

**Interactions:**
- Input field is auto-focused
- User types name
- Submit via:
  - Enter key
  - Clicking submit button
- Form validation: Name must be non-empty (trimmed)

**Expected Behavior:**
- Form appears with fade-in animation
- Input field receives focus automatically
- Video continues playing in background
- Empty submissions are ignored
- Valid submission transitions to Contact stage

---

### Stage 4: Contact (`stage: 'contact'`)

**Visual State:**
- **Background:** Video continues playing
- **Foreground:** Form overlay
  - Greeting: "hello, {name}" (personalized with entered name)
  - Label: "how can i reach you?" (centered, large text)
  - Input field: Same styling as Name stage
    - Placeholder: "email or phone"
  - Submit button: Same styling as Name stage

**Interactions:**
- Input field is auto-focused
- User types contact information (email or phone)
- Submit via Enter key or button click
- Form validation: Contact must be non-empty (trimmed)

**Expected Behavior:**
- Form appears with fade-in animation
- Greeting displays the name from previous stage
- Input field receives focus automatically
- Video continues playing in background
- On submit:
  - Data is sent to `/api/submit` endpoint (POST request)
  - Transitions to Message stage

**API Call:**
```json
POST /api/submit
Content-Type: application/json

{
  "name": "User's entered name",
  "contact": "User's entered contact info"
}
```

---

### Stage 5: Message (`stage: 'message'`)

**Visual State:**
- **Background:** Video continues playing
- **Foreground:** Confirmation message
  - Main text: "do you want me to message you back?"
  - Details section:
    - "name: {name}"
    - "contact: {contact}"
  - All text with text shadow for readability

**Interactions:**
- No user interactions required
- This is the final stage

**Expected Behavior:**
- Message appears with fade-in animation
- Displays collected information
- Video continues playing in background
- No further transitions

---

## Interaction Patterns

### Click/Tap Behavior

**Intro Stage:**
- Entire viewport is clickable
- Cursor changes to pointer
- Click anywhere triggers stage transition

**Other Stages:**
- Cursor: default
- No click-to-advance (form submissions required)

### Form Submission

**Pattern:**
1. User enters text
2. User presses Enter OR clicks submit button
3. Form validates (non-empty, trimmed)
4. If valid: Submit → API call → Next stage
5. If invalid: No action (form remains)

**Keyboard Navigation:**
- Tab: Not applicable (single input per form)
- Enter: Submits form
- Escape: No action defined

### Audio Behavior

**Initial Load:**
- Audio attempts to auto-play
- May be blocked by browser policies
- If blocked: Hint text appears

**After Initial Load:**
- Audio continues looping
- No user control over audio playback

### Video Behavior

**Initialization:**
- Video player initializes when YouTube API loads
- Video does NOT play until user clicks (Intro → Video transition)

**Playback:**
- Starts when user clicks from Intro stage
- Continues playing through all subsequent stages
- Loops automatically when video ends
- Muted (no audio from video)
- No user controls visible

**Positioning:**
- Always in background (z-index: 0)
- Covers entire viewport
- All content appears above video (z-index: 1-2)

---

## Visual Specifications

### Color Palette

```css
--color-bg: #000000      /* Black background */
--color-text: #ffffff    /* White text */
--color-accent: #ffffff  /* White accent (same as text) */
```

### Typography

**Font Family:**
- `'Courier New', Courier, 'Lucida Console', Monaco, monospace`
- Monospace font for consistent character width

**Font Sizes:**
- Knock knock text: `clamp(1.5rem, 4vw, 3rem)`
- Form labels: `clamp(1.5rem, 4vw, 2.5rem)`
- Form inputs: `clamp(1.25rem, 3vw, 2rem)`
- Submit buttons: `clamp(1rem, 2.5vw, 1.5rem)`
- Message text: `clamp(1.5rem, 4vw, 3rem)`
- Details text: `clamp(1rem, 2.5vw, 1.5rem)`

**Letter Spacing:**
- Headers/labels: `0.1em`
- Inputs/details: `0.05em`

### Layout

**Viewport:**
- Full viewport width and height (`100vw`, `100vh`)
- Fixed positioning for app container
- No scrolling (overflow: hidden)

**Centering:**
- All content centered using flexbox
- `align-items: center`
- `justify-content: center`

**Z-Index Layers:**
- Video background: `0`
- Content overlay: `1`
- Text/forms: `2`

### Animations

**Fade In:**
- Duration: `1s` (intro), `0.5s` (forms/messages)
- Easing: `ease-in`
- Applied to: All stage transitions

**Pulse (Paw Emoji):**
- Duration: `2s`
- Easing: `ease-in-out`
- Infinite loop
- Scale: `1` → `1.1` → `1`

### Responsive Breakpoints

**Mobile (< 768px):**
- Submit button becomes circular (60px × 60px)
- Button text: "→" instead of "enter"
- Adjusted font sizes for smaller screens

**Landscape Mobile:**
- Font sizes use `vh` units instead of `vw`
- Optimized for horizontal orientation

---

## Expected Behaviors

### Page Load

1. **HTML renders** with all stages in DOM (React conditional rendering)
2. **CSS loads** - black background appears
3. **JavaScript loads** - React hydrates
4. **Audio attempts to play** - may be blocked
5. **YouTube API loads** - video player initializes (not playing)
6. **Initial state:** Intro stage visible

### Stage Transitions

**Intro → Video:**
- User clicks anywhere
- Video starts playing
- "knock knock" text remains visible
- Audio continues playing

**Video → Name:**
- Automatic transition (after video ends or timeout)
- Video continues playing
- Form fades in
- Input field receives focus

**Name → Contact:**
- User submits valid name
- Form validates
- API call made (optional, non-blocking)
- Greeting appears with name
- Contact form fades in
- Input field receives focus

**Contact → Message:**
- User submits valid contact
- Form validates
- API call made to `/api/submit`
- Message fades in
- Collected data displayed

### Error Handling

**Audio Autoplay Blocked:**
- Hint text appears: "Click anywhere to begin"
- Audio may start after user interaction

**Form Validation:**
- Empty submissions: No action
- Whitespace-only: Treated as empty (trimmed)

**API Submission Failure:**
- Error logged to console
- Stage transition continues (non-blocking)
- User experience not interrupted

**Video Loading Failure:**
- Video container remains empty
- Content still displays normally
- No error message shown to user

### Browser Compatibility

**Required Features:**
- ES6+ JavaScript
- CSS Flexbox
- CSS `clamp()` function
- YouTube IFrame API

**Progressive Enhancement:**
- Works without JavaScript (static content only)
- Graceful degradation if video fails
- Audio autoplay is optional (hint text fallback)

---

## Test Scenarios

### Manual Test Cases

#### TC-001: Initial Page Load
**Steps:**
1. Navigate to homepage
2. Observe initial state

**Expected:**
- Black screen with "knock knock 🐾" text
- Audio attempts to play
- Cursor is pointer
- Hint text may appear if audio blocked

#### TC-002: Intro to Video Transition
**Steps:**
1. Click anywhere on intro screen
2. Observe video behavior

**Expected:**
- Video starts playing in background
- "knock knock" text remains visible
- Video is muted and looping
- Video covers entire viewport

#### TC-003: Name Form Submission
**Steps:**
1. Wait for name form to appear
2. Enter name: "Test User"
3. Press Enter or click submit

**Expected:**
- Form validates (non-empty)
- Transitions to contact form
- Greeting shows: "hello, Test User"

#### TC-004: Empty Name Submission
**Steps:**
1. Wait for name form
2. Leave field empty
3. Attempt to submit

**Expected:**
- No action occurs
- Form remains on name stage
- No error message (silent validation)

#### TC-005: Contact Form Submission
**Steps:**
1. Complete name form
2. Enter contact: "test@example.com"
3. Submit contact form

**Expected:**
- API call made to `/api/submit`
- Request body contains name and contact
- Transitions to message stage
- Message displays collected data

#### TC-006: Video Background Persistence
**Steps:**
1. Click to start video
2. Complete name form
3. Complete contact form
4. View message stage

**Expected:**
- Video plays continuously through all stages
- Video remains in background (z-index: 0)
- All content appears above video

#### TC-007: Mobile Responsiveness
**Steps:**
1. Open on mobile device (< 768px width)
2. Navigate through all stages

**Expected:**
- Text sizes adjust appropriately
- Submit button is circular with arrow icon
- Touch interactions work
- Video plays correctly

### Automated Test Scenarios

#### AT-001: Stage State Management
```javascript
// Test that stage transitions work correctly
expect(getStage()).toBe('intro')
clickAnywhere()
expect(getStage()).toBe('video')
submitName('Test')
expect(getStage()).toBe('contact')
submitContact('test@example.com')
expect(getStage()).toBe('message')
```

#### AT-002: Form Validation
```javascript
// Test empty submission handling
submitName('')
expect(getStage()).toBe('name') // Should not advance

submitName('   ') // Whitespace only
expect(getStage()).toBe('name') // Should not advance

submitName('Valid Name')
expect(getStage()).toBe('contact') // Should advance
```

#### AT-003: API Integration
```javascript
// Test API call on contact submission
const mockFetch = jest.fn()
global.fetch = mockFetch

submitContact('test@example.com')

expect(mockFetch).toHaveBeenCalledWith('/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Name',
    contact: 'test@example.com'
  })
})
```

#### AT-004: Video Player Initialization
```javascript
// Test video player setup
expect(youtubePlayerRef.current).toBeNull()
// Simulate YouTube API ready
simulateYouTubeAPIReady()
expect(youtubePlayerRef.current).not.toBeNull()
expect(youtubePlayerRef.current.getVideoData().video_id).toBe('8wU8k2kDaTo')
```

#### AT-005: Responsive Design
```javascript
// Test mobile breakpoint
setViewport({ width: 600, height: 800 })
expect(getSubmitButtonText()).toBe('→')
expect(getSubmitButtonShape()).toBe('circle')

// Test desktop breakpoint
setViewport({ width: 1200, height: 800 })
expect(getSubmitButtonText()).toBe('enter')
expect(getSubmitButtonShape()).toBe('rectangle')
```

---

## Accessibility Considerations

### Current State
- **Keyboard Navigation:** Limited (Enter key for forms)
- **Screen Readers:** Not optimized (minimal semantic HTML)
- **Color Contrast:** High (white on black)
- **Focus Indicators:** Browser default (may need enhancement)

### Recommendations for Future
- Add ARIA labels to form inputs
- Add skip navigation for keyboard users
- Ensure all interactive elements are keyboard accessible
- Add focus visible indicators
- Provide audio controls for users who need them

---

## Performance Expectations

### Load Times
- **Initial HTML:** < 100ms
- **CSS:** < 50ms
- **JavaScript:** < 500ms
- **YouTube API:** < 1s
- **Audio File:** < 200ms

### Runtime Performance
- **Stage Transitions:** < 300ms (CSS animations)
- **Form Submissions:** < 100ms (local validation)
- **API Calls:** < 2s (network dependent)
- **Video Playback:** 30fps (YouTube player dependent)

---

## Technical Dependencies

### External Services
- **YouTube IFrame API:** Required for video playback
- **Ghost CMS API:** Required for site settings (optional, has fallback)

### Browser APIs Used
- `fetch()` - API calls
- `requestFullscreen()` - Video fullscreen (not currently used)
- `Audio.play()` - Audio playback

### React Hooks Used
- `useState` - Stage and form state management
- `useEffect` - Side effects (audio, video, API)
- `useRef` - DOM element references

---

## Future Enhancements

### Potential Additions
1. **Video Controls:** Allow user to pause/play video
2. **Audio Controls:** Volume control, mute toggle
3. **Skip Option:** Allow users to skip video
4. **Progress Indicators:** Show user progress through stages
5. **Error Messages:** Display validation errors to users
6. **Loading States:** Show spinners during API calls
7. **Accessibility:** Full keyboard navigation, screen reader support
8. **Analytics:** Track user journey through stages

---

## Change Log

### Version 1.0 (Current)
- Initial implementation
- 5-stage user journey
- Background video support
- Mobile responsive design
- Form validation
- API integration

---

## Notes for Developers

### When Changing Tech Stack

**Key Behaviors to Preserve:**
1. Stage-based state management
2. Video background layer (z-index: 0)
3. Content overlay layer (z-index: 1-2)
4. Form validation (non-empty, trimmed)
5. API submission on contact form
6. Responsive breakpoints (768px)

**Critical CSS:**
- Full viewport layout (`100vw`, `100vh`)
- Z-index layering
- Flexbox centering
- Responsive font sizes (`clamp()`)

**Critical JavaScript:**
- Stage state transitions
- YouTube API integration
- Form validation logic
- API call on contact submission

### When Writing Tests

**Test These Core Behaviors:**
1. Stage transitions
2. Form validation
3. API integration
4. Video initialization
5. Responsive design
6. Error handling

**Mock These Dependencies:**
- YouTube IFrame API
- Fetch API (for `/api/submit`)
- Audio API (for autoplay)

---

*Last Updated: [Current Date]*
*Document Version: 1.0*


