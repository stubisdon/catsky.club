# Review fixes — pass 3

> Created: 2026-08-16 · For execution by: Codex (gpt-5.6-terra, medium effort)
> Follows `plans/2026-08-16-magic-link-ux-three-fixes.md` and
> `plans/2026-08-16-magic-link-ux-root-cause-addendum.md`, both already implemented in the
> working tree. Fix the defects below in that existing code. Do not revert prior work.

## 1) BLOCKER — `resolveView` skips name capture for real new signups

`src/router/resolveView.ts`:

```ts
if (callback?.action === 'signup') {
  if (memberName === null || memberName?.trim()) {
    return { view: 'listen', normalizedPath: stripAuthCallbackParams('/listen', search) }
  }
  return { view: 'welcome', ... }
}
```

`memberName === null` currently means "skip the name form". That is backwards. `null` is
what you get when the member could not be resolved (401, empty body, network failure) —
and it is also what `Router.tsx` passes for a brand-new Ghost member, because
`member?.name ?? null` collapses Ghost's `name: null` to `null`. Ghost returns `null`
(not `''`) for an unset member name, so **the common new-signup path routes straight to
`/listen` and the first/last name is never collected**. That is the exact regression the
2026-08-14 plan was written to fix.

Required: only skip `/welcome` when we **positively** have a non-empty name. Anything
else — `null`, `undefined`, `''`, unresolved — must show the name form.

- Make the parameter's meaning explicit (e.g. `memberName?: string | null` where the
  contract is "the member's name if known"), and gate on `typeof memberName === 'string'
  && memberName.trim().length > 0`.
- In `Router.tsx`, stop collapsing with `?? null`; pass `member?.name` through as-is.
- Add unit cases to `src/router/resolveView.test.ts` (or `Router.test.tsx`) covering
  `null`, `undefined`, `''`, `'   '` → **welcome**; `'Ada'` → **listen**.

## 2) BLOCKER — the `connecting…` gate can hang forever

`src/router/Router.tsx` now sets `view` to `null` and renders `connecting…` while
awaiting `getCurrentMember()`. That promise has no timeout and no `.catch()`. If the
member endpoint hangs or rejects, the user sits on a near-blank screen indefinitely —
functionally the same failure we are trying to remove.

Required:
- Race the fetch against a timeout (~2500 ms). On timeout **or** rejection, fall through
  to the `welcome` view (safe default: worst case we ask a returning member for a name
  they can skip) rather than staying on `connecting…`.
- Add `.catch()` so a rejected promise can never leave `view === null`.
- Test: `**/members/api/member**` aborted/never-resolving → the app reaches a real view,
  `#root` is non-empty, and no `connecting…` remains after the timeout.

## 3) Failed callbacks are never cleared

`applyResolvedView` only calls `clearAuthCallback()` when `callback?.success` is true. A
failed callback therefore stays on `window.__catskyAuthCallback` for the life of the
page, so every later `popstate` re-resolves it and bounces the user back to `/connect`.

Required: clear the captured callback once it has been consumed, success or failure.
Test: after landing on `/connect` from a failed callback, navigating to `/listen` and
pressing back must not force the user back to `/connect`.

## 4) Button label flickers

`src/Connect.tsx` renders `resendSeconds === 30 ? 'link sent' : \`resend in ${n}s\``, so
`link sent` is visible for roughly one second before jumping to `resend in 29s`.

Required: keep the button label stable at `link sent` (disabled, gray) for the whole
cooldown, and surface the countdown as a quiet line inside the
`connect-auth-confirmation` block instead (e.g. `you can send another in 24s`). When the
cooldown ends, the button becomes `send again` and re-enables. Update
`src/Connect.test.tsx` to match.

## Verification

```bash
npm run lint
npm test
npm run build
```

Same constraints as the previous plans: no nginx edits, no `.env*`, no `.context/`, no
commit/push/deploy. Report files changed, the reasoning for each fix, and real test output.
