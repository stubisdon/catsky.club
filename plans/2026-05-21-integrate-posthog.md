# Plan: PostHog page visit and click tracking

## Goal

Integrate PostHog into `catsky.club` so the site captures:

- all first-party React page visits,
- SPA route changes,
- first-party button/link clicks,
- Ghost Portal trigger clicks,
- observable Ghost Portal open/close/outcome transitions.

PostHog source of truth:

- JavaScript SDK docs: `https://posthog.com/docs/libraries/js`
- React docs: `https://posthog.com/docs/libraries/react`

## Architectural review

This integration should be implemented primarily in the React app with one carefully scoped touch in `index.html` only if needed for pre-React or Ghost Portal DOM coverage.

Key constraints from `ARCHITECTURE.md` and `public/docs/tech/V1_UX_USE_CASES.md`:

- `index.html` contains high-risk Ghost Portal patching. Script order is intentional and must not be reordered.
- Ghost-owned infrastructure routes (`/ghost/`, `/ghost/api/`, `/members/`, `/webhooks/`, `/unsubscribe/`, `/content/images/`, `/r/`) must remain Ghost-owned and must not be routed to the frontend.
- React route changes are handled by `src/router/Router.tsx` and `src/router/navigation.ts`, not by React Router.
- Ghost Portal opens from hidden DOM triggers and hash URLs such as `#/portal/account/plans`.
- Existing auth/session behavior in `src/Connect.tsx`, `src/Welcome.tsx`, and `src/utils/subscription.ts` is high-risk and should not be changed except for passive analytics calls.

Important browser limitation:

- If Ghost Portal renders interactive content inside a cross-origin iframe, the parent Catsky page cannot observe individual clicks inside that iframe. The implementation can track the Catsky-side trigger click, Portal hash/open state, close state, and inferred member/session changes. True inner-Portal button tracking requires PostHog to run inside the Ghost/Portal origin or replacing the relevant flow with first-party UI.

## Product decisions

- PostHog is optional at runtime. If no token is configured, analytics must no-op without errors.
- Pageviews should be manually captured on route resolution so SPA navigation is reliable and duplicate-resistant.
- Autocapture can remain enabled for broad DOM coverage, but Catsky should still capture a normalized `button_clicked` event for product-relevant click analysis.
- Analytics events must not include email addresses, freeform feedback text, magic-link form input, first/last name input, Ghost Admin API keys, or Content API keys.
- Development should not send analytics by default unless explicitly enabled with an env flag.
- Member identity can be identified only with stable non-sensitive Ghost identifiers (`uuid` or `id`) after session resolution; email should not be sent as an event property.

## Existing code facts

- App entry: `src/main.tsx`
- Router: `src/router/Router.tsx`
- SPA navigation helpers: `src/router/navigation.ts`
- Shared first-party link component: `src/components/Link.tsx`
- Ghost Portal hidden triggers: `index.html`
- Portal trigger helpers: `src/utils/memberSession.ts`
- Membership/session helpers: `src/utils/subscription.ts`, re-exported from `src/utils/index.ts`
- Connect/auth surface: `src/Connect.tsx`
- Welcome/onboarding surface: `src/Welcome.tsx`
- Existing env replacement for `index.html`: `vite.config.ts`
- Env docs: `.env.example`, `README.md`, `ENV_SERVER.example`, `DEPLOYMENT.md`
- Test stack: Vitest + Playwright

## Implementation specification

### 1. Add PostHog dependency and env configuration

Install the browser SDK:

- `posthog-js`

Do not add `@posthog/react` unless the implementation needs React context. The current app can use a small local analytics utility more cleanly because tracking is route/document-level and not component-state-driven.

Add frontend env vars:

- `VITE_PUBLIC_POSTHOG_TOKEN`
- `VITE_PUBLIC_POSTHOG_HOST`
- `VITE_PUBLIC_POSTHOG_ENABLED`

Expected defaults:

- token empty means disabled,
- host defaults to `https://us.i.posthog.com` when token is present,
- local dev stays disabled unless `VITE_PUBLIC_POSTHOG_ENABLED=true`.

Update docs/env examples:

- `.env.example`
- `README.md`
- `ENV_SERVER.example` if production deploy docs point operators there for frontend envs
- `DEPLOYMENT.md` if production build env export behavior needs clarification

### 2. Create `src/utils/analytics.ts`

Create one analytics boundary so PostHog calls do not spread through the codebase.

Public API:

- `initAnalytics(): void`
- `trackPageView(properties?: Record<string, unknown>): void`
- `trackButtonClick(properties: ButtonClickProperties): void`
- `trackPortalEvent(name: string, properties?: Record<string, unknown>): void`
- `identifyMember(member: { id?: string; uuid?: string; tiers?: unknown[] } | null, membershipTier?: MembershipTier): void`
- `resetAnalyticsIdentity(): void`
- `isAnalyticsEnabled(): boolean`

Behavior:

- Import `posthog-js` only inside this module.
- Guard all calls behind a module-level initialized/enabled check.
- Avoid throwing if PostHog fails to initialize.
- Disable capture when:
  - token is missing,
  - running on `localhost` or `127.0.0.1` and `VITE_PUBLIC_POSTHOG_ENABLED !== 'true'`.
- Initialize with:
  - `api_host`,
  - `defaults: '2026-01-30'`,
  - `capture_pageview: false` if supported by the current SDK config,
  - `autocapture: true`,
  - conservative session replay settings, or leave session replay off unless explicitly requested.
- Register low-risk super properties:
  - `app: 'catsky.club'`
  - `environment: import.meta.env.MODE`
  - optionally `membership_tier` after it is known
- Never include raw input values.

Event naming:

- Pageviews: `$pageview` or `page_viewed` depending on whether the team wants PostHog Web Analytics compatibility. Prefer `$pageview` for native PostHog pageview dashboards.
- Clicks: `button_clicked`
- Portal events: `ghost_portal_opened`, `ghost_portal_closed`, `ghost_portal_trigger_clicked`, `ghost_portal_session_refreshed`
- Auth flow milestones: `magic_link_requested`, `magic_link_request_succeeded`, `magic_link_request_failed`, `signup_callback_resolved`

### 3. Initialize analytics in `src/main.tsx`

Patch `src/main.tsx`:

- Import `initAnalytics` from `./utils/analytics`.
- Call `initAnalytics()` before `ReactDOM.createRoot(...).render(...)`.
- Keep `React.StrictMode` unchanged.

Do not:

- Wrap the app in new providers unless `@posthog/react` is added for a concrete reason.
- Move CSS imports or router imports in a way that changes app startup behavior.

### 4. Capture SPA pageviews in `src/router/Router.tsx`

Patch route resolution flow:

- Import `trackPageView`.
- After `resolveView(...)` and any path normalization, capture one pageview per final URL.
- Include properties:
  - `path`
  - `search_present: boolean`
  - `hash_present: boolean`
  - `view`
  - `normalized: boolean`
- Deduplicate the initial `React.StrictMode` effect rerun by keeping the last captured URL in a `useRef`.

Expected behavior:

- Initial page load captures the resolved route once.
- `navigateTo('/listen')` captures `/listen`.
- trailing slash normalization captures only the normalized destination.
- unknown paths normalized to `/` capture the final `/` view.
- Ghost Portal hash changes do not count as full route pageviews unless product explicitly wants hash views tracked separately.

Update `src/router/Router.test.tsx`:

- Mock `trackPageView`.
- Assert initial render captures once.
- Assert `navigateTo`/`popstate` captures the next route.
- Assert StrictMode-style rerenders do not duplicate the same URL.
- Assert `/connect?action=signup&success=true` normalization tracks `/welcome`, not stale `/connect?...`.

### 5. Capture normalized first-party clicks

Use two layers:

1. Keep PostHog autocapture on for broad behavioral visibility.
2. Add Catsky-normalized capture for stable product analysis.

Create or extend analytics helpers to install a document-level capture listener:

- listen in capture phase for `click`,
- find closest clickable ancestor:
  - `button`,
  - `a`,
  - `[role="button"]`,
  - `[data-portal]`,
  - `[data-members-signout]`,
  - custom `[data-analytics-id]` if added later.
- ignore disabled elements.
- capture safe properties:
  - `label` from `data-analytics-label`, `aria-label`, `title`, or trimmed visible text capped to a small length,
  - `element_type`,
  - `path`,
  - `href_type` (`internal`, `external`, `hash`, `portal`, `none`),
  - `portal_target` from `data-portal`,
  - `analytics_id` from `data-analytics-id` if present.
- do not capture values from `input`, `textarea`, or form fields.

Implementation location options:

- Preferred: `src/utils/analytics.ts` installs the listener during `initAnalytics()`.
- Acceptable: a small `src/utils/clickAnalytics.ts` module called by `initAnalytics()`.

Do not add `onClick` tracking to every React component unless needed for richer custom events. A document listener covers React and non-React DOM with less churn.

### 6. Add product-specific events where document clicks are not enough

Patch only high-value handlers:

`src/utils/memberSession.ts`

- `openPortalSignIn()` captures `ghost_portal_trigger_clicked` with `portal_target: 'signin'`.
- `openPortalSignUp()` captures `ghost_portal_trigger_clicked` with `portal_target: 'signup'`.
- `openPortalAccount()` captures `ghost_portal_trigger_clicked` with `portal_target: 'account'`.
- `openPortalAccountPlans()` captures `ghost_portal_trigger_clicked` with `portal_target: 'account/plans'`.
- `triggerPortalSignOut()` captures `ghost_portal_trigger_clicked` with `portal_target: 'signout'`.

`src/Connect.tsx`

- Opening inline signup/signin form captures `auth_form_opened`.
- Successful magic-link request captures `magic_link_request_succeeded` with `entry_point`.
- Failed magic-link request captures `magic_link_request_failed` with status only, not email.
- Signup callback handoff to `/welcome` captures `signup_callback_resolved`.
- Portal open/close hash watcher captures inferred `ghost_portal_opened` and `ghost_portal_closed`.

`src/Welcome.tsx`

- Successful continue/onboarding submit captures `welcome_profile_submitted`.
- Failure captures status/error class only, not names.

`src/Listen.tsx`

- Track select captures `track_selected` with `track_id`, `access_state`, and `membership_tier`.
- Locked track click captures `locked_track_clicked`.
- Vote captures `track_vote_clicked`, not feedback text.
- Feedback submit captures `track_feedback_submitted` with `track_id` and maybe text length, not text.

These custom events are optional for the first implementation if scope needs to stay strictly pageviews/buttons/Portal triggers. If deferred, document the deferral in the plan execution summary.

### 7. Track Ghost Portal popup state

Add observable Portal state tracking without modifying Portal internals:

- Track hash transitions matching `#/portal/...`.
- Track opening target from `window.location.hash` and `data-portal`.
- Track close when the hash leaves `#/portal/...`.
- After close, refresh member status already happens in `Connect.tsx`; capture whether membership tier changed.

Implementation details:

- Reuse the existing `portalHashActive` logic in `Connect.tsx`.
- Keep the existing delayed `refreshMemberStatus` behavior intact.
- Add analytics calls around the existing state transitions.
- Add a short helper to parse Portal hash targets:
  - `signup`
  - `signin`
  - `account`
  - `account/plans`
  - `unknown`

Do not:

- Patch the fetched Portal bundle for analytics.
- Inspect cross-origin iframe DOM.
- Add new Ghost route proxies for analytics.

### 8. Identity and membership enrichment

Integrate identity carefully:

- In membership refresh paths that already call `getCurrentMember()` or `getMembershipTier()`, call `identifyMember(...)` only when a stable member id/uuid is available.
- On logout, call `resetAnalyticsIdentity()` after `triggerPortalSignOut()` and local session cleanup.
- Register `membership_tier` as a super property when it changes.

Candidate touch points:

- `src/Connect.tsx` after `refreshMemberStatus()`
- `src/Welcome.tsx` after current member hydration
- `src/App.tsx`, `src/Listen.tsx`, `src/Watch.tsx`, and `src/Video.tsx` should not each identify independently unless a shared membership hook is introduced. Avoid broad refactors for this task.

Privacy constraints:

- Do not call `identify` with email.
- Do not send `firstName`, `lastName`, freeform note, feedback text, or raw form values.
- Do not create person properties from sensitive Ghost payload fields.

### 9. Update tests

Unit tests:

- Add `src/utils/analytics.test.ts`.
- Mock `posthog-js`.
- Cover:
  - missing token no-ops,
  - localhost disabled by default,
  - localhost enabled with explicit env flag,
  - `trackPageView` no-ops before init/disabled,
  - click listener captures safe button metadata,
  - click listener does not capture input values,
  - `identifyMember` skips email and uses id/uuid only,
  - `resetAnalyticsIdentity` calls PostHog reset only when enabled.

Router tests:

- Mock analytics and assert pageview behavior as described above.

Connect/memberSession tests:

- Assert Portal trigger helpers capture the expected Portal target.
- Assert logout resets analytics identity.
- Assert magic-link submit events do not include email.

E2E tests:

- Add `e2e/analytics.spec.ts`.
- Use `page.addInitScript` or route-level stubs to replace `window.posthog`/network capture before app startup.
- Tests:
  - visiting `/` records one pageview,
  - clicking home `listen` records `button_clicked` and a `/listen` pageview,
  - clicking `/connect` signup/log-in buttons records click events,
  - free-member upgrade CTA / Portal plan trigger records a Portal target,
  - opening and closing a Portal hash records open/close events where possible.

Add a package script if useful:

- `"test:e2e:analytics": "NODE_OPTIONS=\"--import tsx\" playwright test e2e/analytics.spec.ts --project=chromium --config=playwright.config.cjs"`

### 10. Update docs

Because this changes runtime behavior and observability, update docs in the same task:

- `ARCHITECTURE.md`
  - Add a short analytics section.
  - Document PostHog env vars.
  - Document that SPA pageviews are manually captured in the router.
  - Document that Portal inner iframe clicks are not observable from the parent page.
- `public/docs/tech/V1_UX_USE_CASES.md`
  - Add implementation note that page visits, CTAs, locked-content attempts, and Ghost Portal entry points are tracked for V1 analytics.
- `public/docs/tech/UX_UI_DOCUMENTATION.md`
  - Add analytics expectations for key user journeys if the doc already covers journey instrumentation.
- `public/docs/tech/README_REACT.md`
  - Add `src/utils/analytics.ts` to the project structure and explain its ownership.
- `AGENTS.md`
  - Add guidance only if analytics becomes a new high-risk area or if future executors need a clear privacy invariant.

No nginx template changes are expected.

### 11. Screenshot evidence

This is not primarily a visual change, so screenshots are not required unless the implementation changes visible UI.

If a visible analytics debug surface or consent UI is added, capture screenshots with:

- `npm run screenshots:journey`

Otherwise, use Playwright assertions and mocked PostHog captures as evidence instead of screenshot artifacts.

### 12. Validation commands

Run these after implementation:

1. `npm run test`
2. `npm run test:e2e:analytics` if the package script is added, otherwise:
   `NODE_OPTIONS="--import tsx" playwright test e2e/analytics.spec.ts --project=chromium --config=playwright.config.cjs`
3. `npm run test:e2e:auth`
4. `npm run test:e2e:landing`
5. `npm run build`

Optional but useful if time allows:

- `npm run test:e2e:navigation`
- `npm run test:e2e:pages`
- `npm run test:e2e:watch`
- `npm run test:e2e:video`

## Executor checklist

- [ ] `posthog-js` dependency added.
- [ ] PostHog env vars documented.
- [ ] `src/utils/analytics.ts` added with no-op guards and privacy-safe capture helpers.
- [ ] Analytics initialized from `src/main.tsx`.
- [ ] Router captures deduplicated SPA pageviews.
- [ ] Document-level click listener captures safe first-party button/link metadata.
- [ ] Ghost Portal trigger helpers capture Portal targets.
- [ ] Portal hash open/close transitions captured from `Connect.tsx`.
- [ ] Logout resets analytics identity.
- [ ] Member identity enrichment uses only id/uuid, not email.
- [ ] Unit tests added/updated for analytics, router, Connect/memberSession.
- [ ] E2E analytics coverage added.
- [ ] Relevant docs updated.
- [ ] Required tests run and results recorded.

## Open inputs needed

- PostHog project token.
- PostHog host (`https://us.i.posthog.com` or EU/self-hosted equivalent).
- Decision: whether local dev analytics should ever be enabled by default. Recommended answer: no.
- Decision: whether session replay is in scope. Recommended answer: no for first pass; add later after privacy review.
