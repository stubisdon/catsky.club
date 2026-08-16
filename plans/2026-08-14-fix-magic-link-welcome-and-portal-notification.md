# Fix: magic-link name capture lost + abrupt Ghost Portal notification

Date: 2026-08-14
Branch: `stubisdon/buenos-aires` (base for PR: `fix/deploy-ghost-url-fallback`)
Repo: `/Users/stub/conductor/workspaces/catsky.club/buenos-aires`

## Context

Two UX regressions after the last deployment:

1. **Name capture is gone.** Clicking the magic link no longer lands the member on
   `/welcome`, so first/last name are never collected and never written to Ghost.
2. **Ghost Portal shows a dangling popup** that reads like "you've successfully
   subscribed to" with nothing after it.

## Verified evidence (already gathered — do not redo, but DO re-verify before editing)

### Bug 1 — root cause

`src/Connect.tsx:207` posts to `/members/api/send-magic-link/` with **only**
`{ email }`. No `emailType`, no `redirect`/`referrer`. Ghost therefore falls back to
the site root when it redirects after token verification, so the callback lands on:

```
https://catsky.club/?action=signup&success=true
```

But `src/router/Router.tsx:27` only maps the callback when the path is exactly
`/connect`:

```ts
if (pathname === '/connect' && params.get('action') === 'signup' && params.get('success') === 'true') {
  return { view: 'welcome', normalizedPath: '/welcome' }
}
```

Everything else falls through to `{ view: 'home', normalizedPath: '/' }` (line 39),
which `replaceState`s the query string away. The signup callback is silently
swallowed → `Welcome` never renders → no name, no `POST /api/member-profile`.

Reproduced live against production with headless Chromium:
`https://catsky.club/?action=signup&success=true` → final URL `https://catsky.club/`,
home page rendered, no welcome form.

### Bug 2 — root cause

The Ghost Portal bundle (`@tryghost/portal@latest`) contains exactly:

```
You've successfully subscribed to <strong>{siteTitle}</strong>
```

Portal renders this notification purely from the `action=signup&success=true` query
params. The message reads as truncated/abrupt when `siteTitle` resolves empty, and it
is off-brand regardless (the site is all-lowercase minimal; Portal renders a Ghost-styled
toast we do not control). We own the post-signup UX — the member should go to
`/welcome`, not be greeted by a Ghost toast.

Note: `https://catsky.club/members/api/site/` currently returns `title: "Catsky.Club"`,
so confirm whether the emptiness comes from the Portal-hardening script in `index.html`
(`fixPortalSettings` / `replaceProductionUrls` / the `Promise.prototype.then` hook) before
assuming. Either way the chosen fix (suppression) resolves it.

## Required outcome

- A member clicking a magic link **always** ends up on `/welcome` (signup) with the
  first/last-name form, regardless of which path Ghost redirects to.
- Name submission still posts to `/api/member-profile` and still navigates to `/listen`
  without waiting for the save (existing non-blocking behavior — keep it).
- No Ghost Portal toast on our own signin/signup callbacks.
- Signin callbacks do **not** go to `/welcome`.
- Everything covered by e2e tests that would have caught both regressions.

## Implementation plan

### Step 1 — request the magic link with an explicit redirect and email type

`src/Connect.tsx`, `handleAuthSubmit`:

```ts
body: JSON.stringify({
  email,
  emailType: authEntryPoint,                     // 'signup' | 'signin'
  redirect: `${window.location.origin}/connect`, // same-origin; Ghost validates this
})
```

Verify Ghost 6.42 accepts these keys and does not 400. If `redirect` is rejected,
fall back to `referrer` (Ghost has used both across versions) — determine empirically,
do not guess. If Ghost rejects both, Step 2 alone still fixes the flow; say so explicitly
in your report rather than shipping a silently-ignored field.

### Step 2 — make the callback path-independent (this is the real fix)

Old magic links already sitting in inboxes point at the site root, so Step 1 cannot be
the only fix.

Add a single shared helper (suggested: `src/utils/authCallback.ts`) that reads the
signin/signup success callback **once**, and have both `Router.tsx` and `Connect.tsx`
consume it:

- Detect `action` ∈ {`signup`, `signin`} **and** `success === 'true'` on **any** pathname.
- `signup` → render `Welcome`, normalize URL to `/welcome`.
- `signin` → stay on the current view (or `/connect`), strip the params, no `/welcome`.
- Preserve any unrelated query params when rewriting the URL.
- Leave all other Portal params untouched (`stripe=success`, `#/portal/*`, etc.).

Keep `/connect?action=signup&success=true` working — it is covered by existing tests
(`src/router/Router.test.tsx:77`, `src/Connect.test.tsx:138`, `e2e/auth.spec.ts`).

Watch the ordering trap: `Router`'s normalization currently `replaceState`s the query
away before anything else can read it. Whatever reads the callback must run before the
params are stripped.

### Step 3 — suppress the Ghost Portal notification

Portal binds and reads the URL at load time, and it is loaded from the inline script in
`index.html` (which runs **before** the React bundle). So the params must be captured and
stripped in that inline script, before `loadPortal()`:

```js
// capture our own auth callback before Portal can render its toast
var _p = new URLSearchParams(window.location.search);
var _a = _p.get('action');
if ((_a === 'signup' || _a === 'signin') && _p.get('success') === 'true') {
  window.__catskyAuthCallback = { action: _a, success: true };
  _p.delete('action'); _p.delete('success');
  var _q = _p.toString();
  history.replaceState({}, '', location.pathname + (_q ? '?' + _q : '') + location.hash);
}
```

Then `src/utils/authCallback.ts` reads `window.__catskyAuthCallback` first and falls back
to parsing `window.location.search` (so vitest/dev/direct navigation still work).

`index.html` is flagged high-risk in `AGENTS.md` — script order is intentional. Insert the
snippet **after** the existing Portal-hardening IIFE and **before** the Portal loader
`<script>`; do not reorder anything else.

If suppression turns out to break something in Portal (it should not — the session cookie
is already set by the time Ghost redirects), the fallback is to keep the params but ensure
`site.title` is always populated in the hardening script. Suppression is preferred.

### Step 4 — tests (this is the part that matters most)

The user's explicit requirement: **do not break this UX again**. Both regressions must be
caught by tests. New e2e in `e2e/auth.spec.ts` (or a new `e2e/magic-link-callback.spec.ts`),
plus unit tests.

**e2e (Playwright, chromium at minimum) — required cases:**

1. `/?action=signup&success=true` with `**/members/api/member**` mocked to return a member
   → URL becomes `/welcome`, welcome heading visible, first-name field present.
2. Same for `/connect?action=signup&success=true` (back-compat) and one other path,
   e.g. `/listen?action=signup&success=true`.
3. Full happy path: fill first + last name → `POST /api/member-profile` body matches
   `{ memberUuid, email, firstName, lastName }` → navigates to `/listen` **without**
   waiting for the profile response (mirror the existing 1500 ms-delay assertion at
   `e2e/auth.spec.ts:~955`).
4. First name only (last name empty) → still posts, `lastName: ''`.
5. `/?action=signin&success=true` → does **not** land on `/welcome`; params stripped.
6. **Notification regression guard:** after any callback, assert no frame/element on the
   page contains `successfully subscribed` (check the Portal iframe/`#ghost-portal-root`
   too, not just the main document). This is the test that catches Bug 2.
7. **Query-param safety:** `/?stripe=success` and `#/portal/signup` are untouched.
8. Magic-link request contract: intercept `POST /members/api/send-magic-link/` from the
   `/connect` form and assert the body carries `emailType` and the same-origin `redirect`
   (whatever Step 1 settles on). This is the test that catches Bug 1 at the source.

**unit (vitest):**

- `resolveView` / the new callback helper: table-driven over paths `/`, `/connect`,
  `/listen`, `/watch` × `signup` / `signin` / no-params / `success=false`.
- Preserved unrelated query params.
- `Connect.tsx` magic-link body contents.
- The `window.__catskyAuthCallback` handoff, including the fallback path when the global
  is absent.

Do not weaken or delete existing assertions in `src/Connect.test.tsx`,
`src/Welcome.test.tsx`, `src/router/Router.test.tsx`, or `e2e/auth.spec.ts` to make new
code pass. If an existing test genuinely encodes the broken behavior, call it out
explicitly in your report and explain the change.

### Step 5 — verify

Run and paste real output for:

```bash
npm run lint
npm test
npm run test:e2e:auth
NODE_OPTIONS="--import tsx" npx playwright test e2e/<new-spec>.ts --project=chromium --config=playwright.config.cjs
npm run build
```

Do not report success on a suite you did not actually run to completion.

## Constraints

- Smallest valid patch. No refactors beyond what the fix needs (see `AGENTS.md` §3).
- Do not touch nginx templates, Ghost-owned route prefixes, or `server.js` routing order.
- `src/utils/analytics.ts` privacy boundary: never send names/emails/raw form values to
  PostHog. Existing `trackEvent('welcome_profile_submitted', { has_last_name })` is the
  correct shape — match it.
- Do not commit, push, open a PR, or deploy. Leave changes in the working tree.
- Do not modify `.env*` files or anything under `.context/`.

## Report back

1. One-line summary of each root cause **as you verified it** (agree or disagree with the
   analysis above — push back if the evidence says otherwise).
2. Files changed and why.
3. Exact test commands run + their real pass/fail output.
4. Anything you could not verify locally (e.g. whether real Ghost accepts `redirect`) and
   what you would need to confirm it in production.
