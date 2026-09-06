# Pass 5 — failed magic-link callbacks are consumed by the wrong component

> Created: 2026-08-16 · For execution by: Codex (gpt-5.6-terra, medium effort)
> Fifth pass on the four earlier 2026-08-16 plans, all implemented in the working tree.
> Do not revert prior work.

## Housekeeping first

A previous pass renamed the git branch from `stubisdon/lome` to
`stubisdon/magic-link-ux-fixes`. I have renamed it back. **Do not rename, create, or
switch branches.** Leave the branch exactly as you find it.

## The defect (reproduced in a real browser)

Failing test: `e2e/magic-link-callback.spec.ts:128` —
*"owns expired-link messaging and suppresses Portal notification frames"*.

```
await page.goto('/?action=signup&errorCode=INVALID_TOKEN&success=false')
await expect(page).toHaveURL(/\/connect$/)     // FAILS — actual: "/"
```

Live debug against the dev server confirms: the URL ends up at `/`, the **home** view
renders, and `window.__catskyAuthCallback` is `undefined` (already consumed).

### Root cause — React effect ordering

`window.__catskyAuthCallback` is a one-shot global, and **two** components race to
consume it. Child effects run before parent effects in React, so:

1. `Router` renders. Its `useState` initializer resolves the failed callback to
   `view: 'connect'`, so `<Connect />` mounts. The URL has not been normalized yet —
   that happens in `Router`'s effect.
2. `Connect`'s callback effect (`src/Connect.tsx`, the `useEffect` that calls
   `readAuthCallback()`) runs **first**, because it is the child. It reads the callback,
   calls `clearAuthCallback()`, sets the expired-link error state, and returns.
3. `Router`'s effect runs **second**. `readAuthCallback()` now returns `null`, so
   `resolveView('/', '', null)` yields `{ view: 'home', normalizedPath: '/' }`. `Router`
   calls `setView('home')`.
4. `Connect` unmounts, taking the expired-link message with it. The user lands on the
   home page instead of `/connect`.

Verify this yourself before fixing — do not take it on faith.

## Required fix

Make callback consumption single-owner. `Router` owns it; `Connect` must not race for it.

Suggested shape (use your judgement, but keep it small):

- In `Router`, capture the callback **during render** (it already computes
  `initialCallback`) into a ref, and have the effect's first invocation use that captured
  value instead of re-reading the global. That makes `Connect`'s clearing irrelevant to
  routing.
- Hand the failed-callback state to `Connect` explicitly rather than via the global —
  e.g. `Router` passes a prop, or stores the consumed callback in a module-level
  accessor that `Connect` reads without a mount-order dependency.
- `Connect` must stop calling `clearAuthCallback()` for a callback it did not own, and
  must still render `that link has expired or was already used. request a new one.` when
  it is the destination of a failed callback.
- Keep the successful-signup path working: `Router` still awaits the member name (2.5 s
  timeout) and routes to `/welcome` or `/listen`.

Whatever shape you choose, it must be robust to mount order — a future component reading
the same global must not be able to break routing again.

## Also verify (do not necessarily fix)

Dev console shows repeated `Failed to set the 'default' property on 'Module': Cannot
assign to read only property 'default' of object '[object Module]'`. This comes from the
`Promise.prototype.then` monkey-patch in `index.html` (`fixSiteInObject` /
`replaceProductionUrls`) trying to mutate frozen ES module namespace objects returned by
Vite's native-ESM dynamic imports. It appears **pre-existing** and dev-only (the
production build is a single chunk), and pass 4's new
`src/components/AppShellRecoveryMarkerCleaner.tsx` is simply one more module it hits.

Confirm whether it is truly pre-existing and dev-only. If the production bundle does any
dynamic `import()`, this is a real production crash risk and needs a guard in
`fixSiteInObject` (skip objects whose `Symbol.toStringTag === 'Module'`, or wrap the
mutation in try/catch). Report your conclusion either way; only fix it if it can reach
production.

## Verification

Run all of these to completion and paste real output:

```bash
npm run lint
npm test
npm run build
NODE_OPTIONS="--import tsx" npx playwright test e2e/magic-link-callback.spec.ts e2e/app-shell-recovery.spec.ts --project=chromium --config=playwright.config.cjs
```

**Important:** kill any dev server already listening on `127.0.0.1:3000` before running
Playwright. `playwright.config.cjs` sets `reuseExistingServer: !process.env.CI`, and a
stale Vite server from an earlier run serves the **old** `index.html`, producing five
bogus failures. Check with `lsof -ti :3000` first.

Known-unrelated: `e2e/navigation.spec.ts` and much of `e2e/auth.spec.ts` fail on
`waitForLoadState('networkidle')` timeouts. I confirmed these fail identically on the
unmodified tree (stashed working tree, same command) — they are pre-existing and out of
scope. Do not try to fix them.

## Constraints

Same as before: no nginx edits, no `.env*`, no `.context/`, no branch operations, no
commit, push, or deploy.

## Report back

1. Confirmation (or refutation) of the effect-ordering root cause.
2. Files changed and why.
3. Full output of the four commands above.
4. Your conclusion on the Module-mutation console errors.
