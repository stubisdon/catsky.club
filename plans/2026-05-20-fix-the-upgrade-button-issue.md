# Plan: fix `/connect` paid upgrade Portal crash

Date: 2026-05-20  
Target branch: `fix/deploy-ghost-url-fallback`  
Observed production URL: `https://catsky.club/connect#/portal/account/plans`

## Problem

After the paid-video PR shipped, a logged-in free member can see the new `/connect` CTA:

`upgrade to $5/month to unlock the music video`

Clicking it changes the URL to `#/portal/account/plans`, fetches `/members/api/member/`, and then Ghost Portal throws:

`TypeError: Cannot read properties of undefined (reading 'includes')`

After that crash, the existing `account` Portal button stops opening the popup until the page is reloaded.

## Confirmed symptoms

- The `account` button opens Ghost Portal account home for the same logged-in free member.
- The `$5/month` CTA tries to open `data-portal="account/plans"`.
- The failing network request returns a valid free member object directly from `https://catsky.club/members/api/member/`.
- The member object is not the bad payload. It is enough for account-home rendering.
- The Portal stack maps to `@tryghost/portal` `ProductsSection -> getActiveInterval`.
- In current Portal source, `getActiveInterval({portalPlans})` calls `portalPlans.includes(...)`.
- The crash means Portal is rendering the plan page while `site.portal_plans` is undefined.

## Root cause

Catsky loads a patched inline copy of Ghost Portal from `index.html`.

Portal reads configuration from the first `script[data-ghost]` element:

- `data-ghost` -> Members API site URL
- `data-key` -> Content API key
- `data-api` -> Content API base URL

Catsky currently sets `data-ghost` and `data-key`, but not `data-api`.

That means Portal can fetch the logged-in member from `/members/api/member/`, but its internal Content API helper cannot fetch:

- `/ghost/api/content/settings/`
- `/ghost/api/content/tiers/`
- `/ghost/api/content/newsletters/`

Portal swallows that Content API failure and initializes with `site = {}`. Account home still renders because it mostly needs `member`; account plans crashes because it needs `site.portal_plans`.

This is why the bug only appears on the paid upgrade/plan path.

## Reproduction evidence

I reproduced the broken condition with a free-member mock and current production HTML:

- Click `upgrade to $5/month to unlock the music video`.
- Portal opens `#/portal/account/plans`.
- Console shows `Cannot read properties of undefined (reading 'includes')`.
- Account button remains marked `gh-portal-open`, but the iframe has no usable plan UI.

I then repeated the same browser session while injecting only this missing attribute into the Portal config script before Portal loaded:

```html
data-api="https://catsky.club/ghost/api/content"
```

With that one injected change:

- Portal fetched `settings`, `tiers`, and `newsletters`.
- The same free-member `$5/month` CTA opened the Ghost “Choose a plan” screen.
- Both `curious cats` ($5/month) and `powerful cats` ($20/month) appeared.
- No `includes` TypeError was emitted.

Browser-only proof screenshot:

- `.context/portal-debug/data-api-injected-upgrade-click.png`

## Implementation scope

Only touch Portal configuration and regression tests unless a test reveals another direct dependency.

Expected files:

- `index.html`
- `e2e/auth.spec.ts`
- optionally `ARCHITECTURE.md` or `public/docs/tech/V1_UX_USE_CASES.md` if wording needs to clarify the Portal `data-api` contract

Do not touch:

- `server.js`
- nginx templates
- `/watch`
- `/video` gating
- Ghost-owned route proxy rules

## Implementation steps

1. Patch `index.html` Portal config tag.

   Add `data-api="%VITE_GHOST_CONTENT_API_URL%"` if the repo/deploy already has that env var, otherwise use a computed runtime value.

   Recommended low-risk implementation:

   ```js
   var apiUrl = ghostUrl.replace(/\/$/, '') + '/ghost/api/content';
   config.setAttribute('data-api', apiUrl);
   ```

   Also set the same attribute on the injected Portal script element in both loader branches:

   ```js
   s.setAttribute('data-api', apiUrl);
   ```

   Rationale: Portal uses `document.querySelector('script[data-ghost]')`, so the existing `ghost-portal-config` script must have `data-api`. Setting it on the injected script too keeps the config self-consistent if Portal ever changes from first-match lookup.

2. Keep `openPortalAccountPlans()` behavior unchanged at first.

   Do not replace it with `openPortalAccount()` unless the `data-api` fix fails. The validated root cause is missing Content API config, not the `account/plans` route itself.

3. Add a regression test that fails on the current production bug.

   In `e2e/auth.spec.ts`, extend or add a focused test for logged-in free members:

   - mock `/members/api/member/` as a direct Ghost member object, not `{ member: ... }`;
   - load `/connect`;
   - click `upgrade to $5/month to unlock the music video`;
   - assert the page hash ends in `#/portal/account/plans`;
   - assert no console/page error contains `Cannot read properties of undefined` or `reading 'includes'`;
   - assert a Portal iframe/body contains `Choose a plan` or at minimum one visible Ghost plan name.

   Use real production-like tier names in the test data:

   - `curious cats`
   - `powerful cats`

4. Add a lower-level test if Playwright iframe timing is flaky.

   Acceptable fallback: a unit/static test that parses `index.html` and asserts both the config script and dynamically injected Portal script set `data-api` to `${ghostUrl}/ghost/api/content`.

   This should be secondary. The main regression should be browser-visible because the bug was a runtime Portal crash.

5. Verify no duplicate Portal crash remains.

   Run:

   ```bash
   npm run test
   npm run test:e2e:auth
   npm run test:e2e:video
   npm run build
   ```

   If the auth suite starts multiple webservers or races on port 3000, rerun it alone before marking it failed.

6. Capture screenshot evidence.

   Because this changes a user-visible upgrade flow, capture at least:

   - `/connect` free-member state before click with the `$5/month` CTA visible.
   - Ghost Portal after click showing `Choose a plan`.

   Store under:

   - `artifacts/ui-journey/upgrade-portal-fix/01-connect-free-upgrade-cta.png`
   - `artifacts/ui-journey/upgrade-portal-fix/02-ghost-portal-choose-plan.png`

## Acceptance criteria

- Clicking `upgrade to $5/month to unlock the music video` opens Ghost Portal plan selection for a logged-in free member.
- Console has no `Cannot read properties of undefined (reading 'includes')` error.
- Clicking the CTA first does not poison Portal; closing/reopening with `account` still works.
- `account` still opens account home.
- Logged-out users still get the existing sign-in flow for `#/portal/account/plans`.
- `/video` remains locked for free users and unlocked for `paid_5`/`paid_20`.

## Code review checklist

- Verify `data-api` is derived from the same `ghostUrl` value Portal uses, so local dev still goes through the Vite proxy and production stays on `https://catsky.club`.
- Verify no secret Content API key is hardcoded.
- Verify `openPortalAccountPlans()` still uses the Ghost-managed plans UI and does not bypass Portal/Stripe.
- Verify the regression test would have failed before this fix.
- Verify the patch does not broaden or weaken the existing Ghost route ownership rules.

## QA checklist

1. Local mocked free member:
   - `/connect` shows the `$5/month` CTA.
   - CTA opens Portal `Choose a plan`.
   - Console has no `includes` TypeError.

2. Production real free member after deploy:
   - Log in as a free member.
   - Click `upgrade to $5/month to unlock the music video`.
   - Confirm Ghost Portal shows plan selection.
   - Close Portal, click `account`, confirm account Portal still opens.

3. Optional full checkout:
   - Complete checkout with the cheapest plan only if prepared to cancel/refund.
   - Verify `/` shows `secrets`.
   - Verify `/video` shows the YouTube iframe.

## Rollback note

If this still fails after adding `data-api`, temporarily change only the new `$5/month` CTA to call `openPortalAccount()` instead of `openPortalAccountPlans()` so the button opens a non-crashing Portal surface. Treat that as a stopgap, not the final fix, because it adds friction to the paid upgrade path.
