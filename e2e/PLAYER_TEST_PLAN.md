# Player Page Test Plan

This document outlines the comprehensive test cases for the `/player` page, including broken cases that need to be fixed.

## Test Coverage

### ✅ Access Control Tests
1. **Guest User Access** (`not_subscriber`)
   - Should see only first track (Vision)
   - Should see "guest — access to first track only" message
   - Should see locked tracks section with upgrade prompt
   - Should NOT see voting/feedback buttons

2. **Free Subscriber Access** (`free_subscriber`)
   - Should see first 2 tracks (Vision, Overpriced Airbnb)
   - Should see "free subscriber — access to first 2 tracks" message
   - Should see third track (Nova) as locked
   - Should NOT see voting/feedback buttons
   - Should see upgrade button

3. **Paid Subscriber Access** (`paid_subscriber`)
   - Should see all 3 tracks (Vision, Overpriced Airbnb, Nova)
   - Should see "paid subscriber — full access to all tracks" message
   - Should NOT see locked tracks section
   - Should see voting buttons (↑ ↓) on all tracks
   - Should see feedback buttons on all tracks

4. **Subscription Check Error Handling**
   - API failure should default to guest access
   - Timeout should not crash the page
   - Invalid response should handle gracefully

### ✅ Track Selection Tests
1. **Accessible Track Selection**
   - Clicking accessible track should highlight it
   - Player section should show track title
   - SoundCloud iframe should load
   - Switching between tracks should update player

2. **Locked Track Prevention**
   - Clicking locked track (for free subscriber) should do nothing
   - Clicking locked track (for guest) should do nothing
   - Locked tracks should be visually distinct (opacity 0.5)

3. **Track State Management**
   - Selected track should have bold font weight
   - Selected track should have highlighted background
   - Switching tracks should reset previous selection

### ✅ SoundCloud Integration Tests
1. **Iframe Loading**
   - Iframe should load with correct SoundCloud embed URL
   - Iframe should have proper attributes (allow, scrolling, frameBorder)
   - Iframe src should contain track-specific URL

2. **Track-Specific URLs**
   - Vision track should load correct SoundCloud URL
   - Overpriced Airbnb should load correct SoundCloud URL
   - Nova should load correct SoundCloud URL
   - Secret tokens should be preserved in URLs

3. **Widget Functionality**
   - Widget should be playable
   - Widget should show "powered by soundcloud" text
   - Widget should handle private tracks correctly

### ✅ Voting and Feedback Tests
1. **Voting Buttons Visibility**
   - Should only be visible for paid subscribers
   - Should NOT be visible for free subscribers
   - Should NOT be visible for guests

2. **Voting Functionality**
   - Clicking upvote should toggle vote state
   - Clicking downvote should toggle vote state
   - Clicking same vote again should clear vote
   - Vote state should persist during session

3. **Feedback Form**
   - Should only be visible for paid subscribers
   - Clicking feedback button should open form
   - Clicking again should close form
   - Textarea should be editable
   - Submit button should be present
   - Form should clear after submission

### ✅ Error Cases
1. **Subscription API Errors**
   - 500 error should default to guest access
   - Network timeout should not crash
   - Invalid JSON response should handle gracefully

2. **Track Loading Errors**
   - Missing track config should not crash
   - Invalid SoundCloud URL should handle gracefully
   - Iframe load failure should show error

3. **UI Error States**
   - "checking access..." should show during load
   - Error messages should be user-friendly
   - Page should never show blank screen

### ✅ UI Elements Tests
1. **Navigation**
   - Home link should be present (bottom-left)
   - Home link should navigate to "/"
   - Home link should have correct styling

2. **Upgrade Flow**
   - Upgrade button should be visible for free subscribers
   - Upgrade button should navigate to portal
   - Subscribe button should be visible for guests

3. **Status Messages**
   - Status message should match subscription level
   - Status message should be visible and readable

## Potential Issues Found

### 🔴 Critical Issues

1. **Access Control Logic**
   - Current implementation allows guests to see first track
   - Need to verify this matches requirements
   - Locked tracks should prevent selection, not just visual

2. **SoundCloud Iframe Loading**
   - Need to verify iframe actually loads and plays
   - Secret tokens might expire - need handling
   - Cross-origin restrictions might affect functionality

3. **Subscription Status Check**
   - API endpoint `/members/api/member/` might not be available in test environment
   - Need to mock properly in tests
   - Error handling might not cover all edge cases

### 🟡 Medium Priority Issues

1. **Vote State Persistence**
   - Votes are stored in component state only
   - Should persist across page refreshes (needs backend)
   - Multiple votes on same track might have issues

2. **Feedback Submission**
   - Currently just logs to console
   - Needs backend integration
   - No confirmation or error handling

3. **Track Selection State**
   - No visual feedback if track fails to load
   - No error message if SoundCloud widget fails
   - Switching tracks might not properly clean up previous track

### 🟢 Low Priority Issues

1. **UI Polish**
   - Loading states could be improved
   - Error messages could be more user-friendly
   - Responsive design on mobile might need testing

2. **Performance**
   - Multiple iframes might impact performance
   - Track list rendering could be optimized
   - Subscription check happens on every render

## Test Implementation Status

- ✅ Test file created: `e2e/player.spec.ts`
- ✅ Access control tests written
- ✅ Track selection tests written
- ✅ SoundCloud integration tests written
- ✅ Voting and feedback tests written
- ✅ Error case tests written
- ✅ UI element tests written

## Running Tests

```bash
# Run all player tests
npm run test:e2e -- e2e/player.spec.ts

# Run specific test suite
npm run test:e2e -- e2e/player.spec.ts -g "Access Control"

# Run with UI (headed mode)
npm run test:e2e -- e2e/player.spec.ts --headed

# Generate test report
npm run test:e2e -- e2e/player.spec.ts --reporter=html
```

## Next Steps

1. **Fix Node.js Version Issue**
   - Tests require Node.js 18.19+
   - Update local environment or CI configuration

2. **Run Tests and Fix Failures**
   - Execute test suite
   - Identify actual broken cases
   - Fix issues one by one

3. **Add Integration Tests**
   - Test actual SoundCloud API interaction
   - Test subscription status with real API
   - Test error scenarios in production-like environment

4. **Add Visual Regression Tests**
   - Screenshot comparison for UI changes
   - Responsive design testing
   - Cross-browser compatibility

5. **Performance Testing**
   - Load time measurements
   - Memory leak detection
   - Iframe performance impact

## Known Issues Fixed

### Issue 1: SoundCloud Invalid URL Error
**Problem:** When clicking on "Vision" track, SoundCloud shows error: "You have not provided a valid SoundCloud URL"

**Root Cause:** SoundCloud embed widget requires secret tokens to be passed as query parameters (`?secret_token=s-XXXXX`) rather than in the URL path (`/s-XXXXX`)

**Fix:** Updated `getSoundCloudEmbedUrl()` in `src/utils/audioHelpers.ts` to:
- Extract secret token from path format (`/s-XXXXX`)
- Convert to query parameter format (`?secret_token=s-XXXXX`)
- Properly encode the URL for the embed widget

**Test Case:** `SoundCloud iframe does not show invalid URL error` - Verifies that clicking a track does not show the SoundCloud error message

### Issue 2: Page Not Scrollable Vertically
**Problem:** Player page content cannot be scrolled vertically, making some content inaccessible

**Root Cause:** Player component's content div was missing `overflowY: 'auto'` and `maxHeight: '100vh'` styles that other pages (Listen, App) have

**Fix:** Added scrolling styles to Player component's content container:
- `maxHeight: '100vh'`
- `overflowY: 'auto'`
- `userSelect: 'text'` (for text selection)

**Test Cases:**
- `page is scrollable vertically` - Verifies overflow-y is set to auto and scrolling works
- `page content is accessible when scrolling` - Verifies all content is accessible via scrolling

### Issue 3: SoundCloud Play Button Not Visible
**Problem:** SoundCloud player shows a white circle play button, but the play icon (triangle) is not visible until hover, making it unclear that it's clickable

**Root Cause:** SoundCloud's embed widget has a default design where the play button icon is only visible on hover. This is a limitation of SoundCloud's widget design that cannot be overridden due to iframe cross-origin restrictions.

**Fix:** Added hint text above the SoundCloud player:
- "click the circle to play" message to guide users
- Changed embed color to SoundCloud orange (#ff5500) for better visibility
- Added test case to verify hint text is present

**Test Case:** `SoundCloud player has hint text for play button` - Verifies the hint text is visible above the player

## Notes

- All tests use route mocking for subscription API
- Tests assume 3 tracks are configured (Vision, Overpriced Airbnb, Nova)
- SoundCloud iframe tests verify URL format and error handling
- Scrolling tests verify vertical scroll functionality
- Some tests might need adjustment based on actual UI implementation
