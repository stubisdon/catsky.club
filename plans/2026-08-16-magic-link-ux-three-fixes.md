# Magic-link UX: three fixes (button state, post-link destination, Portal toast)

> Created: 2026-08-16 · For execution by: Codex (gpt-5.6-terra, medium effort)
> Repo: `/Users/stub/conductor/workspaces/catsky.club/lome`
> Branch: `stubisdon/lome` · PR base: `fix/deploy-ghost-url-fallback`

Read `AGENTS.md` before editing. §3 (smallest useful edit), §4 (high-risk files —
`index.html` script order is intentional), §7 (test policy), §9 (screenshot evidence)
all apply.

---

## Context

The previous fix shipped in `3870c5d` (plan:
`plans/2026-08-14-fix-magic-link-welcome-and-portal-notification.md`). It is live on
production. Three user-reported problems remain.

### What I already verified against live production (headless Chromium, 2026-08-16)

Do **not** redo this blindly, but do re-verify anything you intend to change.

| URL | Result today |
|---|---|
| `/?action=signup&success=true` | → `/welcome`, name form renders, **no** Portal toast |
| `/?action=signin&success=true` | → `/` home, **no** Portal toast |
| `/?action=signup&errorCode=INVALID_TOKEN&success=false` | → stays on `/`, **Portal toast DOES render**: iframe `data-testid="portal-notification-frame"`, text `"Signup error: Invalid link / Click here to retry"` |
| `/?action=subscribe|checkout|updateEmail&success=true` | no toast |
| `/connect#/portal/account` (member mocked) | Portal account modal renders correctly |
| `curl -I /members/?token=fake&action=signup` | `302 → /?action=signup&errorCode=INVALID_TOKEN&success=false` |

Key takeaways:

1. The **success** toast is suppressed, but the inline capture script in `index.html`
   only strips params when `success === 'true'`. Every **failure** callback still hands
   Portal a chance to render its own Ghost-branded toast. Email link scanners (Gmail,
   Outlook, corporate mail filters) routinely consume magic-link tokens before the human
   clicks, so `success=false&errorCode=INVALID_TOKEN` is a **common** real-world path,
   not an edge case. That is the most likely source of the remaining "pop-up with a
   Ghost message and nothing else" report.
2. `Welcome` renders fine in a clean desktop browser, so the reported black screen is
   **not** reproducible from the URL alone. Treat it as "the post-magic-link destination
   is not deterministic and can end up showing nothing useful" and fix it structurally
   (see Problem 2). Reproduce first; report what you find either way.

---

## Problem 1 — "send magic link" button stays lit after sending

**File:** `src/Connect.tsx` (`handleAuthSubmit`, the `<form className="connect-auth-form">`
block around lines 368–407), `src/index.css` (`.connect-portal-btn`,
`.connect-auth-message`).

**Current behavior:** on `authStatus === 'success'` the submit button reverts to its
normal enabled style with the label `send magic link`, full-strength white border, and
live `:hover` invert. The confirmation copy is a small low-contrast line *below* the
button. The visual hierarchy tells the user to click again; the actual message is the
quietest thing on screen.

**Required behavior:**

1. On success, the request UI **recedes**:
   - Email input becomes `readOnly` (keep it visible so the user can see which address
     it went to) and visually dimmed.
   - Submit button becomes `disabled`, label changes to `link sent`, and it renders in a
     clearly de-emphasised gray state (no white border, no hover invert). `.connect-portal-btn:disabled`
     already sets `opacity: 0.45; cursor: not-allowed` and `:hover` is already guarded by
     `:not(:disabled)` — extend the disabled rule so the border/text are visibly gray
     rather than just faded, and confirm no hover/focus highlight remains.
2. The confirmation becomes the **focal point**:
   - Promote it to a distinct block (suggested class `connect-auth-confirmation`) with
     larger type than the current `.connect-auth-message`, a visible border or left rule,
     and normal opacity.
   - Copy must name the inbox and the address, e.g.
     `check your inbox — we sent a sign-up link to ada@example.com` (and
     `log-in link` for the signin entry point). Add a second, quieter line:
     `it can take a minute. check spam if it isn't there.`
   - Mark it `role="status"` with `aria-live="polite"`, give it `tabIndex={-1}` and move
     focus to it on success so screen readers and keyboard users land on the message,
     not the dead button.
3. A **cooldown pause** before re-sending is possible:
   - 30-second countdown. While counting: button stays disabled, label reads
     `resend in 30s` → `resend in 29s` … (a single interval, cleared on unmount).
   - When it hits zero: button re-enables with the label `send again`, and the input
     becomes editable again. Re-submitting re-runs `handleAuthSubmit` (reset Turnstile
     first via the existing `resetTurnstile`, since a used token will not verify twice).
   - Track a resend with `trackEvent('magic_link_resend_clicked', { entry_point })`.
     Analytics privacy boundary from `src/utils/analytics.ts` still applies: **never**
     send the email address or any raw form value to PostHog.
4. `cancel` stays available and still resets state via `closeAuthForm` (make sure it
   clears the cooldown timer too).
5. Changing the email address after success (once editable) resets `authStatus` to
   `idle` so the user is not looking at a confirmation for a different address.

Keep the change inside the existing form; do not restructure `Connect.tsx` or introduce
a component library.

---

## Problem 2 — black screen after clicking the magic link; must land on the music page

**Files:** `src/router/resolveView.ts`, `src/router/Router.tsx`, `src/Connect.tsx`
(the callback `useEffect` at ~lines 132–169), `src/Welcome.tsx`, `src/utils/authCallback.ts`.

**Step 2a — reproduce first.** Before changing anything, try to reproduce the blank
render. Suggested attempts, each on `/` and `/welcome`:

- `/?action=signup&success=true` with `**/members/api/member**` returning `401`, an
  empty `200` body, and a hang (never resolving) — three separate runs.
- Same with the Portal CDN script (`cdn.jsdelivr.net/npm/@tryghost/portal@latest/...`)
  blocked/aborted, since `index.html` monkey-patches `Promise.prototype.then`,
  `Response.prototype.json`, `window.fetch` and `XMLHttpRequest` **before** the React
  bundle loads — a throw in that layer takes the whole app down and leaves `#root` empty
  on a `#000` body, which is exactly a "black screen".
- A second click of an already-used link: `/?action=signup&errorCode=INVALID_TOKEN&success=false`.
- Mobile viewport + `webkit` project, in case it is Safari-specific.

Report what you found. If you cannot reproduce it, say so plainly — the structural fix
below still stands on its own and is what the user asked for.

**Step 2b — make the destination deterministic. The music page is `/listen`
(`src/Listen.tsx`).** Required end state:

1. **signin** callback (`action=signin&success=true`, any path) → navigate to `/listen`,
   params stripped. Today it leaves the user on whatever path Ghost redirected to
   (usually `/` home). This is the single clearest instance of "should have gone to the
   music page".
2. **signup** callback → `/welcome` name form, and submitting it already goes to
   `/listen` (keep the existing non-blocking save — do not make navigation wait on
   `POST /api/member-profile`).
3. **signup callback for a member who already has a name** → skip `/welcome` entirely
   and go straight to `/listen`. `getCurrentMember()` returns a `name` field
   (`src/utils/subscription.ts:272`); a non-empty trimmed `name` means we already
   collected it. Do not show the name form twice to the same person.
4. **Any failure to resolve the member** — 401, empty body, network error, or the
   retry ladder in `Connect.tsx` exhausting all six delays — must still land the user on
   `/listen`. Never leave them on a view that renders nothing. Today that loop simply
   falls out of `run()` and does nothing.
5. **Failed callback** (`success=false`, e.g. `errorCode=INVALID_TOKEN`) → send the user
   to `/connect` with the auth form open and our own in-brand copy, e.g.
   `that link has expired or was already used. request a new one.` (See Problem 3 —
   the Ghost toast for this case gets suppressed, so we must replace it with our own.)
   Pass the state through the same `window.__catskyAuthCallback` handoff rather than
   inventing a second mechanism.

**Step 2c — no route may ever render an empty `#root`.**

- Add a small error boundary around the router in `src/main.tsx` that renders a minimal
  in-brand fallback (`something went wrong. → listen / → home`) instead of an empty tree.
  Do not pull in a dependency; a ~30-line class component is enough.
- `Router`'s `default:` case already falls back to `<App />`; keep it.
- Add a `skip for now →` link on `src/Welcome.tsx` pointing at `/listen`, so nobody is
  ever trapped on the name form.

---

## Problem 3 — Ghost Portal toast still appears with a bare/truncated message

**Files:** `index.html` (the auth-capture IIFE at lines 256–269), `src/index.css`.

We own 100% of our auth messaging. No Ghost Portal *notification* should ever render on
this site — not on success, not on failure. (Portal **popups** — `#/portal/account`,
`#/portal/signup`, the plans modal — must keep working. Only kill notifications.)

1. **Widen the capture in `index.html`.** Currently it only fires on
   `success === 'true'`. Change it to capture **any** `action ∈ {signup, signin}`
   regardless of `success`, recording `{ action, success: <boolean>, errorCode }` on
   `window.__catskyAuthCallback`, and strip `action`, `success`, and `errorCode` from the
   URL before Portal loads.
   - Keep this snippet exactly where it is: **after** the Portal-hardening IIFE and
     **before** the Portal loader `<script>`. `AGENTS.md` §4 flags `index.html` as
     high-risk and the order is deliberate. Do not reorder anything else.
   - Do not touch unrelated params (`stripe=success`, `#/portal/*`, `?ref=`, UTM tags) —
     preserve them when rewriting the URL.
2. **Belt and braces: hide the notification frame outright.** Add a CSS rule in
   `src/index.css` (and mirror it in the critical `<style>` block in `index.html` so it
   applies before the app CSS loads):
   ```css
   #ghost-portal-root iframe[data-testid="portal-notification-frame"],
   #ghost-portal-root iframe.gh-portal-notification-iframe { display: none !important; }
   ```
   This catches any notification path we have not enumerated (Stripe returns, email
   change confirmations, future Portal versions) without touching the popup frame.
   Verify the popup frame (`data-testid="portal-popup-frame"`) is unaffected.
3. **Update `src/utils/authCallback.ts`** for the widened shape: `AuthCallback` gains
   `success: boolean` and optional `errorCode: string`. `parseAuthCallback` must return a
   failed callback for `success=false`. Update `isAuthCallback`, `stripAuthCallbackParams`
   (also delete `errorCode`), and every consumer (`resolveView.ts`, `Router.tsx`,
   `Connect.tsx`). Existing call sites currently assume `success: true` — audit them all;
   a failed callback must not route anyone to `/welcome`.

---

## Testing (mandatory — `AGENTS.md` §7)

The user's standing requirement is that this UX does not regress again. Every one of the
three problems needs a test that fails on today's code.

**Unit (vitest, `npm test`):**

- `src/utils/authCallback.test.ts` — table over `action` × `success` × `errorCode`,
  including `success=false`; unrelated params preserved; `window.__catskyAuthCallback`
  handoff and the fallback when the global is absent.
- `src/router/resolveView.test.ts` (or the existing `Router.test.tsx`) — signin callback
  resolves to `listen`; failed callback resolves to `connect` and never `welcome`;
  signup with a named member skips `welcome`.
- `src/Connect.test.tsx` — after a successful magic-link POST: submit button is
  `disabled`, its label is `link sent`, the confirmation block is present with
  `role="status"` and contains the submitted email, the input is `readOnly`; after the
  cooldown elapses (fake timers) the button re-enables with `send again`. Do not weaken
  the existing assertions in this file.
- `src/Welcome.test.tsx` — `skip for now` link points at `/listen`.

**e2e (Playwright, chromium at minimum):** extend `e2e/magic-link-callback.spec.ts`.

1. `/?action=signin&success=true` → ends on `/listen`.
2. `/?action=signup&success=true` with a member whose `name` is set → ends on `/listen`,
   **never** shows the welcome heading.
3. `/?action=signup&success=true` with `**/members/api/member**` returning 401 → still
   ends on `/listen`; `#root` is non-empty.
4. `/?action=signup&errorCode=INVALID_TOKEN&success=false` → ends on `/connect` with our
   own expired-link copy visible, and **no** frame anywhere on the page contains
   `successfully subscribed`, `Signup error`, or `Click here to retry`. Assert against
   `page.frames()`, not just the main document — the existing spec's
   `portalNotificationStub` shows the pattern.
5. Existing signup-callback and profile-payload cases keep passing unchanged.
6. `/connect` form: fill email → submit (intercept `POST /members/api/send-magic-link/`)
   → assert disabled gray button, `link sent` label, confirmation text visible, and that
   the button is still disabled 2s later (cooldown holding).

**Verification commands — run each to completion and paste the real output:**

```bash
npm run lint
npm test
npm run build
npm run test:e2e:auth
NODE_OPTIONS="--import tsx" npx playwright test e2e/magic-link-callback.spec.ts --project=chromium --config=playwright.config.cjs
```

`node_modules` is already installed in this workspace.

**Screenshot evidence (`AGENTS.md` §9):** capture and save under `artifacts/` (or the
path §9 specifies) at least: (a) the auth form right after a successful send, showing the
grayed button + confirmation block; (b) the same view after the cooldown expires; (c) the
expired-link state on `/connect`. Reference the file paths in your report.

---

## Constraints

- Smallest valid patch (`AGENTS.md` §3). No refactors beyond what these fixes need. No
  new runtime dependencies.
- Do **not** modify: nginx templates (`catsky.club-ssl.conf`, `nginx.conf.example`),
  `server.js` routing order, Ghost-owned route prefixes, `.env*`, anything under
  `.context/`.
- `index.html` is high-risk: only the auth-capture IIFE and the critical `<style>` block
  change. Script order stays as-is.
- Privacy: never send names, emails, or raw form values to PostHog.
- Do **not** commit, push, open a PR, or deploy. Leave everything in the working tree.
- Update docs per `AGENTS.md` §6 if the flow description in `ARCHITECTURE.md` or
  `docs/V1_UX_USE_CASES.md` becomes stale.

## Report back

1. Whether you reproduced the black screen, and the exact trigger if so. Disagree with
   the analysis above if the evidence says otherwise — say so explicitly.
2. Files changed and why, one line each.
3. Every test command run with its real pass/fail output.
4. Screenshot paths.
5. Anything you could not verify locally (e.g. behavior against real Ghost tokens) and
   what would be needed to confirm it in production.
