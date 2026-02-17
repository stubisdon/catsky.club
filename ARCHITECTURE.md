# Catsky Club – Web App Architecture

Single-page app for membership, music (tracks), and video. Auth and membership are handled by **Ghost** (Members API + Portal). This doc is the primary reference for onboarding or resuming work after a context reset.

---

## 1. Stack & entry

- **Build**: Vite + React 18 + TypeScript
- **Entry**: `index.html` → `src/main.tsx` (creates root, renders `Router`)
- **Routing**: Client-side only. No React Router; a small router in `main.tsx` uses `window.location.pathname` and `popstate`. Links use `navigateTo(path)` (pushState + dispatch popstate).

---

## 2. Routes and views

| Path | View | Component |
|------|------|-----------|
| `/` | home | `App.tsx` |
| `/listen` | listen | `Listen.tsx` (music/tracks, subscription-gated) |
| `/watch` | watch | `Watch.tsx` (video) |
| `/connect` | connect | `Connect.tsx` (sign up / log in / account via Ghost Portal) |
| `/mission` | mission | `Mission.tsx` (hidden but reachable) |
| *any other path* | home | Redirect to `/` (replaceState), render `App` |

- **No `/player`**: Removed; unknown routes go to home.
- **No `/unpublished` or `/unpublished/experience`**: Removed; those pages no longer exist.

---

## 3. Pages (components)

- **App.tsx** – Landing: title, tagline, nav links (listen, watch, connect). Uses `navigateTo` for in-app navigation.
- **Listen.tsx** – Music/tracks page. Uses `TRACKS` from `src/config/tracks.ts`. Subscription tiers: guest (1 track), free (2), paid (all + voting/feedback). Audio: SoundCloud embed and/or direct URL via `src/utils/audioHelpers.ts`. Calls `checkSubscriptionStatus()` and shows log in / account / log out; **logout must call `triggerPortalSignOut()`** so Ghost session is cleared.
- **Watch.tsx** – Video experience (e.g. YouTube).
- **Connect.tsx** – Membership UI: sign up, log in, account (Ghost Portal). When member is logged in, only “account”, “log out”, “continue” (and home) are shown. Uses `isSubscriber()` to decide; **logout uses `triggerPortalSignOut()`** then clears local state and refreshes.
- **Mission.tsx** – Mission statement; no special wiring.

---

## 4. Ghost: Members API + Portal

- **Backend**: Ghost (production at catsky.club) provides:
  - **Members API**: `GET /members/api/member/` (with credentials) → `{ member: {...} | null }`. Used to decide subscription status and whether to show “logged in” UI.
  - **Portal**: Sign up / sign in / account UI. Loaded from CDN in `index.html`; configured via `data-ghost` and `data-key` (Content API key). Portal binds to elements with `data-portal` and `data-members-signout` **at load time**.

### 4.1 index.html – critical before Portal

- **Inline script (before Portal)** patches:
  - **fetch** and **Response.prototype.json** (and XHR) so Ghost API responses are normalized:
    - `site.url` / `settings.url` / firstpromoter_account ensured (avoid Portal `.replace()` on undefined).
    - **replaceProductionUrls**: any string in the response starting with `https://catsky.club` is rewritten to `window.location.origin` so localhost doesn’t redirect to production after login.
    - **ensureSupportAddress**: `members_support_address` defaulted to `support@catsky.club` when missing/blank.
  - **Promise.prototype.then** so nested objects in API responses get the same fixes.
- **Portal load**: Script fetches Portal from CDN, patches `*.url.replace(` in the source so undefined url is guarded, then injects the script. Config comes from `<script id="ghost-portal-config" data-ghost="..." data-key="...">`.
- **On localhost**: Portal API base URL is set to `window.location.origin` so all requests go through the Vite proxy (no CORS).
- **Hidden triggers** (in DOM from load so Portal can bind):
  - `#ghost-portal-trigger-signup`, `#ghost-portal-trigger-signin`, `#ghost-portal-trigger-account`, **`#ghost-portal-trigger-signout`** (data-members-signout). Logout in the app **must** call `triggerPortalSignOut()` so this element is clicked and Ghost clears the session.

### 4.2 Subscription status

- **`src/utils/subscription.ts`**:
  - **checkSubscriptionStatus()**: `fetch('/members/api/member/', { credentials: 'include' })` → returns `'not_subscriber' | 'free_subscriber' | 'paid_subscriber'`.
  - **isSubscriber()**, **isPaidSubscriber()** use that.
  - **Dev only**: `getDevOverride()` reads `localStorage.catsky_dev_member` (and `catsky_dev_paid`); if set, returns status without calling the API. **setDevMemberOverride(loggedIn, paid)** toggles this. Connect page shows “simulate logged in / logged out” buttons in dev.

### 4.3 Member session helpers

- **`src/utils/memberSession.ts`**:
  - **clearLocalSessionFlags()**: removes `catsky_signed_up`, `catsky_activated` from localStorage.
  - **openPortalSignIn()**, **openPortalSignUp()**, **openPortalAccount()**: click the corresponding hidden trigger or set hash `#/portal/signin` etc.
  - **triggerPortalSignOut()**: clicks `#ghost-portal-trigger-signout`. **Must be called on every logout** (Connect, Listen) so the Ghost cookie is cleared; otherwise “log out” only clears local state and the member stays logged in on prod.

---

## 5. Vite dev proxy (localhost)

- **vite.config.ts**:
  - **Proxy** `/ghost` and `/members` to `VITE_GHOST_API_PROXY` (default `https://catsky.club`). So from the browser, requests go to same origin and are proxied to Ghost.
  - **Cookie handling**: In `proxyRes`, `Set-Cookie` headers from Ghost are rewritten: **Domain** and **Secure** are stripped so the session cookie can be set on `http://localhost`.
  - **Redirect rewriting**: If Ghost responds with `Location: https://catsky.club/...`, it’s rewritten to `http://${req.headers.host}/...` so post-login redirect stays on localhost.
- **Env**: `.env.development` can set `VITE_GHOST_URL`, `VITE_GHOST_CONTENT_API_KEY`; these are injected into `index.html` for Portal config. Dev typically points at production Ghost; Portal on localhost uses current origin so requests go through the proxy.

---

## 6. Data and config

- **Tracks**: `src/config/tracks.ts` exports **TRACKS** (array of `{ id, title, audioSource, version?, date? }`). `audioSource` is either `{ type: 'direct', url }` or `{ type: 'soundcloud', trackUrl, ... }`. See `src/utils/audioHelpers.ts` for SoundCloud embed URLs and direct playback.
- **No Join page**: Removed; Connect is the only membership/signup surface. “Get access” from elsewhere should link to `/connect`.

---

## 7. Key files (quick map)

| Concern | Files |
|--------|--------|
| Routing | `src/main.tsx` (Router, resolveView, normalizePathname) |
| Membership UI | `src/Connect.tsx`, `src/Listen.tsx` (log in / account / log out links) |
| Portal + API patches | `index.html` (inline script, hidden triggers, Portal loader) |
| Subscription check | `src/utils/subscription.ts` (checkSubscriptionStatus, isSubscriber, dev override) |
| Portal triggers / logout | `src/utils/memberSession.ts` (triggerPortalSignOut, openPortal*, clearLocalSessionFlags) |
| Tracks & audio | `src/config/tracks.ts`, `src/utils/audioHelpers.ts`, `Listen.tsx` |
| Dev proxy & cookies | `vite.config.ts` (proxy for /ghost, /members; stripCookieForDev; Location rewrite) |

---

## 8. Deprecated / removed (do not reintroduce)

- **/player** – Not a route; unknown paths redirect to `/`.
- **Player.tsx** – Replaced by **Listen.tsx**; the only music/tracks page is at `/listen`.
- **Join.tsx** – Removed; Connect handles sign up and account.
- **Unpublished.tsx**, **UnpublishedExperience.tsx** – Removed; routes `/unpublished` and `/unpublished/experience` no longer exist.

---

## 9. Production vs dev (summary)

- **Production**: Portal and Members API are same origin (catsky.club). Cookies and redirects are normal. No dev override.
- **Dev (localhost)**: Portal uses `window.location.origin`; Vite proxies `/ghost` and `/members` to Ghost; cookies are stripped of Domain/Secure so session works on HTTP localhost; redirect Location is rewritten so post-login stays on localhost. Optional: “simulate logged in” via `setDevMemberOverride(true)` (Connect page buttons or localStorage `catsky_dev_member`).

Use this doc to re-establish routing, Ghost/Portal behavior, subscription checks, logout flow, and dev tricks when context has reset.
