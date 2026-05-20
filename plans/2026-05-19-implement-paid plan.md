# Plan: $5/month video unlock CTA and `/video` page

## Goal

Add a clear upgrade button on `https://catsky.club/connect` so free members can upgrade to the $5/month plan and unlock a YouTube-hosted music video embedded at `https://catsky.club/video`.

Video source:

- YouTube watch URL: `https://www.youtube.com/watch?v=xRxUcF_wFSQ`
- YouTube embed URL: `https://www.youtube.com/embed/xRxUcF_wFSQ`

## Architectural review

This feature should be implemented entirely in the React app. Do not touch nginx, `server.js`, Ghost-owned route handling, Ghost Portal patching in `index.html`, or the existing `/watch` route behavior.

Key constraints from `ARCHITECTURE.md` and `public/docs/tech/V1_UX_USE_CASES.md`:

- `/watch` stays the public trailer plus existing paid-entrypoint page. It is not an alias for `/video`.
- `/video` is a new route for the embedded unreleased music video.
- Access is based on `MembershipTier`: `paid_5` and `paid_20` can watch; `none` and `free` cannot.
- Upgrade/payment UI remains Ghost-managed. The Catsky CTA can open `#/portal/account/plans`, but it cannot select a specific Ghost tier unless Ghost Portal adds that capability later.
- Public discovery must stay public. Do not hide or delay existing `listen`, `watch`, or `connect` links while membership state loads.

## Product decisions

- `/video` is the canonical React route for the embedded music video.
- The home page remains unchanged for logged-out and free users.
- Paid `$5` and `$20` members see an additional home navigation button labeled `secrets` that links to `/video`.
- Guests and free members on `/video` see a locked placeholder, never the YouTube iframe.
- Logged-out locked copy is exactly: `this page is only for connected cats, go to catsky.club/connect to get connected`.
- Free-member locked copy is exactly: `upgrade to $5/month to unlock the music video`.
- The `/connect` page makes the `$5/month` video-unlock CTA the primary free-member upgrade action while preserving all existing Ghost tier buttons below it.

## Existing code facts

- Router: `src/router/Router.tsx`
- Home page: `src/App.tsx`
- Connect page: `src/Connect.tsx`
- Existing watch page: `src/Watch.tsx`
- Membership helpers: `src/utils/subscription.ts`, re-exported from `src/utils/index.ts`
- Portal plan opener: `openPortalAccountPlans()` from `src/utils/memberSession.ts`
- Current fallback plans in `Connect.tsx`: Supporter at `monthlyAmount: 500`, Backstage at `monthlyAmount: 2000`
- E2E membership mocking pattern already exists in `e2e/watch.spec.ts` and `e2e/auth.spec.ts`

## Implementation specification

### 1. Add `src/Video.tsx`

Create a new route component, separate from `src/Watch.tsx`.

Behavior:

- Import `useEffect`, `useMemo`, `useState`, `PageContainer`, `PageTitle`, `Link`, `getMembershipTier`, and `type MembershipTier`.
- Initialize tier as `null` or a loading sentinel so the page can distinguish "checking" from logged out.
- On mount, call `getMembershipTier()`, cancel state updates after unmount, and treat failures as `none` if needed.
- Compute `isPaid = tier === 'paid_5' || tier === 'paid_20'`.
- Render `<PageTitle>secrets</PageTitle>`.
- Use a stable 16:9 frame for both locked and unlocked states so the page does not shift when tier resolves.
- If `isPaid`, render only the real iframe inside the frame:
  - `src="https://www.youtube.com/embed/xRxUcF_wFSQ"`
  - `title="Catsky unreleased music video"`
  - standard YouTube `allow` attributes and `allowFullScreen`
- If not paid, render a locked placeholder inside the same frame and no iframe.
- If `tier === 'free'`, show the exact free-member locked copy and a `Link` to `/connect` with button treatment.
- If `tier === 'none'`, show the exact logged-out locked copy and a `Link` to `/connect` with button treatment.
- While tier is still loading, show neutral placeholder copy such as `checking access...`; do not render the iframe until paid is known.
- Include a fixed or normal home link consistent with `Watch.tsx`/`Connect.tsx`.

Do not:

- Reuse the `/watch` YouTube teaser ID.
- Link guests directly to Ghost Portal from `/video`; send them to `/connect`.
- Add server authorization. This is V1 client-side UX gating, matching existing listen/watch gating.

### 2. Register `/video` in `src/router/Router.tsx`

Patch the router exactly:

- Import `Video` from `../Video`.
- Extend `View` to include `'video'`.
- Add `if (pathname === '/video') return { view: 'video' }`.
- Add a switch case returning `<Video />`.
- Keep `/watch` and trailing-slash normalization behavior unchanged.

Update `src/router/Router.test.tsx`:

- Add `vi.mock('../Video', () => ({ default: () => <div>video view</div> }))`.
- Add a test that sets `window.history.replaceState({}, '', '/video')`, renders `Router`, and expects `video view`.
- Keep the signup callback normalization test intact.

### 3. Add paid-only `secrets` navigation to `src/App.tsx`

Make the home page membership-aware without changing the public first paint.

Implementation:

- Import `useEffect`, `useMemo`, `useState`, `getMembershipTier`, and `type MembershipTier`.
- Track `membershipTier` with initial value `null`.
- On mount, call `getMembershipTier()` with a cancellation guard.
- Compute `isPaid = membershipTier === 'paid_5' || membershipTier === 'paid_20'`.
- Keep the existing `listen`, `watch`, and `connect` links rendered unconditionally.
- Render `<Link href="/video" variant="button">secrets</Link>` only when `isPaid`.
- Do not show a disabled/loading `secrets` placeholder for logged-out or free users.

Update `src/App.test.tsx`:

- Mock `./utils` so `getMembershipTier` can return `none`, `free`, `paid_5`, or `paid_20`.
- Existing link-click tests should still pass with the mock defaulting to `none`.
- Add assertions:
  - logged-out users do not see `secrets`;
  - free users do not see `secrets`;
  - paid `$5` users see `secrets`;
  - clicking `secrets` calls `pushState({}, '', '/video')`.

### 4. Add primary `$5/month` CTA in `src/Connect.tsx`

Keep the existing plan-list behavior, but add a primary video CTA above it for free members.

Implementation details:

- Reuse the existing `handlePlanUpgrade`.
- After `planOptions`, compute:
  - `const videoUnlockPlan = planOptions.find((plan) => plan.monthlyAmount === 500) ?? defaultPlanOptions[0]`
- In the free-member block, render one primary anchor before the per-plan button list:
  - `href="#/portal/account/plans"`
  - `onClick={handlePlanUpgrade}`
  - `className="connect-portal-btn"`
  - visible copy exactly: `upgrade to $5/month to unlock the music video`
- Keep the existing `upgrade to {plan.name}` buttons below it as secondary choices.
- Use `videoUnlockPlan` only if useful for accessible labels or future-proofing; do not change the required visible copy.
- Do not remove the plan perk summary.

Important limitation:

- `openPortalAccountPlans()` opens the Ghost-managed plan picker. It does not deep-link to only the `$5` tier. The CTA copy can promote $5, but the portal still shows all configured plans.

Update `src/Connect.test.tsx`:

- For free members, assert the new CTA is visible.
- Click the new CTA and assert `openPortalAccountPlansMock` is called once.
- Keep the existing assertions for Ghost tier names and per-plan buttons.

Update `e2e/auth.spec.ts`:

- In the free-member Ghost tier test, assert the new CTA is visible.
- Click it and assert the URL ends with `#/portal/account/plans`, same as the existing Studio Pass click test.

### 5. Add `/video` E2E coverage

Create `e2e/video.spec.ts`.

Use the helper style from `e2e/watch.spec.ts`:

- `mockMember(page)` with no amount returns `{ member: null }`.
- `mockMember(page, 0)` returns a free member.
- `mockMember(page, 500)` returns paid `$5`.
- `mockMember(page, 2000)` returns paid `$20`.

Tests:

- Logged-out users visiting `/video` see the exact connected-cats locked copy and no YouTube iframe.
- Free members visiting `/video` see the exact `$5/month` upgrade copy, a `/connect` link, and no YouTube iframe.
- Paid `$5` members visiting `/video` see an iframe with `src` containing `youtube.com/embed/xRxUcF_wFSQ`.
- Paid `$20` members visiting `/video` also see the iframe.
- Paid `$5` members visiting `/` see the `secrets` link, click it, and land on `/video`.
- Free members visiting `/` do not see the `secrets` link.

Add a package script if useful:

- `"test:e2e:video": "NODE_OPTIONS=\"--import tsx\" playwright test e2e/video.spec.ts --project=chromium --config=playwright.config.cjs"`

### 6. Keep `/watch` regression-safe

Do not edit `src/Watch.tsx` unless a test failure proves it is required.

Existing tests that should remain valid:

- `npm run test:e2e:watch`
- Existing `/watch` navigation tests in `e2e/navigation.spec.ts`, `e2e/pages.spec.ts`, `e2e/landing.spec.ts`, and `e2e/regression.spec.ts`

If any `/watch` assertion has to change, stop and re-check the scope. This plan expects `/watch` to remain behaviorally unchanged.

### 7. Update docs

Because this changes user-visible routes and gating, update docs in the same task:

- `ARCHITECTURE.md`
  - Add `/video` to the route map as `src/Video.tsx` with paid-tier embedded YouTube video gating.
  - Keep `/watch` documented as the public teaser plus existing paid-entrypoint page.
  - In the listen/watch membership section, mention `/video` uses the same client-side tier check and unlocks for `paid_5`/`paid_20`.
- `public/docs/tech/V1_UX_USE_CASES.md`
  - Update implementation notes so `/watch` remains the trailer/upgrade prompt and `/video` is the paid embedded unreleased video route.
  - Keep the $20 parity note.
- `public/docs/tech/UX_UI_DOCUMENTATION.md`
  - Add `/video` to core navigation as paid-only `secrets` access for unreleased video.
  - Clarify `/watch` remains public trailer.
- `public/docs/tech/README_REACT.md`
  - Add `Video.tsx` to project structure.
  - Add `/video` to routes.
  - Adjust `/watch` wording so it is not described as the only video page.

No `AGENTS.md` update is expected unless the implementation discovers a new high-risk area or route invariant.

### 8. Screenshot evidence

This is a user-visible change, so the final implementation must include screenshot evidence.

Minimum acceptable screenshots:

- `artifacts/ui-journey/video-upgrade/01-connect-free-upgrade-cta.png`: free member on `/connect` with the new `$5/month` CTA visible.
- `artifacts/ui-journey/video-upgrade/02-video-free-locked.png`: free member on `/video` with locked upgrade copy.
- `artifacts/ui-journey/video-upgrade/03-home-paid-secrets.png`: paid member on `/` with `secrets` visible.
- `artifacts/ui-journey/video-upgrade/04-video-paid-iframe.png`: paid member on `/video` with the YouTube iframe visible.

Implementation options:

- Preferred: add a small focused Playwright screenshot script or extend the existing screenshot tooling in a narrowly scoped way, then run it.
- Acceptable: capture the four screenshots via Playwright automation during the task without committing a new script.

If Playwright browsers or OS deps are missing, run `npm run test:e2e:setup` and retry before calling it blocked.

### 9. Validation commands

Run these after implementation:

1. `npm run test`
2. `npm run test:e2e:auth`
3. `npm run test:e2e:watch`
4. `npm run test:e2e:video` if the package script is added, otherwise:
   `NODE_OPTIONS="--import tsx" playwright test e2e/video.spec.ts --project=chromium --config=playwright.config.cjs`
5. Screenshot capture for the four states listed above.

Optional but useful if time allows:

- `npm run test:e2e:navigation`
- `npm run test:e2e:pages`

## Executor checklist

- [ ] `src/Video.tsx` added with locked and paid states.
- [ ] `/video` route added without changing `/watch`.
- [ ] Home page shows `secrets` only for `paid_5` and `paid_20`.
- [ ] `/connect` free-member state has primary `$5/month` music video CTA.
- [ ] Unit tests updated for App, Router, Connect, and Video if a Video unit test is added.
- [ ] E2E coverage added for logged-out, free, paid `$5`, paid `$20`, and home `secrets` navigation.
- [ ] Docs updated in all four listed docs.
- [ ] Required tests run and results recorded.
- [ ] Required screenshots captured and paths recorded.

## Open inputs needed

- None.
