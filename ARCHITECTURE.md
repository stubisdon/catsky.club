# Catsky Club – Architecture (for fresh context)

Single-page app for membership, music (tracks), and video. **Auth and membership are handled by Ghost** (Members API + Portal). This doc is the primary reference so an agent or developer with fresh context can understand the system quickly.

---

## 1. Stack and entry

- **Build:** Vite + React 18 + TypeScript
- **Entry:** `index.html` → `src/main.tsx` (creates root, renders `Router`)
- **Routing:** Client-side only. No React Router; a small router in `main.tsx` uses `window.location.pathname` and `popstate`. Links use `navigateTo(path)` (pushState + dispatch popstate).
- **Production server:** Express in `server.js` (port 3001): serves `dist/` and `public/`, plus API routes under `/api/`. Nginx in front proxies `/ghost` and `/members` to Ghost.

---

## 2. Routes and views

| Path       | View     | Component   |
|-----------|----------|-------------|
| `/`       | home     | `App.tsx`   |
| `/listen` | listen   | `Listen.tsx` (tracks, subscription-gated) |
| `/watch`  | watch    | `Watch.tsx` |
| `/connect`| connect  | `Connect.tsx` (sign up, log in, account) |
| `/mission`| mission  | `Mission.tsx` (hidden but reachable) |
| *other*   | home     | Redirect to `/`, render `App` |

- **Connect** is the only membership/signup surface. “Get access” from elsewhere should link to `/connect`.

---

## 3. Ghost: Members API + Portal

### 3.1 Backend (Ghost at catsky.club)

- **Members API:** `GET /members/api/member/` (with credentials) → `{ member: {...} | null }`. Used to decide subscription status and whether to show “logged in” UI.
- **Magic link:** `POST /members/api/send-magic-link/` with `{ email }` sends the sign-in/signup email. No Admin API needed for this; it’s the public Members API.
- **Portal:** Ghost’s embeddable UI for sign-in, account, and (when not invite-only) sign-up. Loaded from CDN in `index.html`; configured via `data-ghost` and `data-key` (Content API key).

### 3.2 Sign-up flow (current design)

- **New users:** On `/connect`, “sign up →” opens an **inline form** (email + “Send magic link”). Submit POSTs to **`/members/api/send-magic-link/`** (Ghost). This **bypasses Ghost Portal** so we avoid Portal’s “invite-only” screen. See `Connect.tsx`: `showSignupForm`, `handleSignupSubmit`, `MAGIC_LINK_API`.
- **Existing users:** “log in →” and “account” still use **Ghost Portal** (hash `#/portal/signin`, `#/portal/account`). Portal is still used for login and account management.
- **Logout:** Every logout must call **`triggerPortalSignOut()`** (in `memberSession.ts`) so Ghost clears the member cookie; otherwise the user stays logged in on prod.

### 3.3 Subscription status

- **`src/utils/subscription.ts`:** `checkSubscriptionStatus()` → `fetch('/members/api/member/', { credentials: 'include' })` → returns `'not_subscriber' | 'free_subscriber' | 'paid_subscriber'`. `isSubscriber()`, `isPaidSubscriber()` use that.
- **Dev only:** `getDevOverride()` / `setDevMemberOverride()` use `localStorage.catsky_dev_member` and `catsky_dev_paid` to simulate logged-in state on localhost (no prod cookie).

### 3.4 Member session helpers (`src/utils/memberSession.ts`)

- **`triggerPortalSignOut()`** – clicks `#ghost-portal-trigger-signout`. Must be called on every logout (Connect, Listen).
- **`openPortalSignIn()`**, **`openPortalSignUp()`**, **`openPortalAccount()`** – click the corresponding hidden trigger or set hash `#/portal/signin` etc.
- **`clearLocalSessionFlags()`** – removes `catsky_signed_up`, `catsky_activated` from localStorage.

---

## 4. index.html – critical before Portal

The **inline script at the top of `index.html`** runs before the Portal script and patches all Ghost API responses and the Portal script itself. Do not remove or reorder without understanding the flow.

### 4.1 Response patches (fetch + Response.json + XHR)

- **fixPortalSettings(data):** Forces `members_signup_access = 'all'` (and `data.site.members_signup_access`), ensures `url` and `members_support_address`, and recursively forces any `members_signup_access` / `signup_access` to `'all'` (including array-shaped settings).
- **fixPortalTiers(data):** For any `data.tiers` array, sets each tier’s `visibility = 'public'` and `invite_only = false`.
- **fixJsonResponse:** For Ghost/members URLs, parses JSON, runs `fixIfNeeded` (which calls the above), returns a new `Response` with the patched JSON. For empty body on `/member`, returns `{"member":null}` to avoid JSON parse errors.
- **Response.prototype.json:** Wraps so that `fixIfNeeded` is applied to parsed JSON; on SyntaxError returns `fixIfNeeded({})` so subscription check doesn’t throw.
- **replaceProductionUrls:** Rewrites `https://catsky.club` to `window.location.origin` in responses so localhost doesn’t redirect to prod after login.

### 4.2 Settings preload and cache

- Before loading the Portal script, the app **preloads** `GET /ghost/api/content/settings/?key=...`. The response is patched (above) and stored in **`window.__PORTAL_SETTINGS_CACHE__`**.
- When any request matches the Ghost **settings** URL, the fetch wrapper returns the cached patched response (so Portal always gets open signup in settings). Only 2xx responses are cached; 401 is not cached.

### 4.3 Portal script patch

- When loading `portal.min.js` from the CDN, the script body is patched: **`==="invite"`** is replaced with **`==="\u200binvite"`** (zero-width space) so the invite-only branch in the Portal script never matches. (In practice we still rely on the **inline signup form** on Connect to bypass Portal for sign-up.)

### 4.4 Hidden Portal triggers

- In the DOM: `#ghost-portal-trigger-signup`, `#ghost-portal-trigger-signin`, `#ghost-portal-trigger-account`, **`#ghost-portal-trigger-signout`** (data-members-signout). Portal binds to these at load time. Logout in the app must call `triggerPortalSignOut()` so this element is clicked.

---

## 5. Our API (server.js)

- **POST /api/submit** – Body: `{ name, contact }`. Creates a Ghost member via Admin API (or returns existing). Used for forms that create members server-side; not used by the inline signup form (that uses Ghost’s magic-link API from the client).
- **GET /api/signups** – Protected by `x-signups-token`. Returns recent Ghost members (for admin/tools). Requires `SIGNUPS_API_TOKEN` and `GHOST_ADMIN_API_KEY` in env.

Ghost’s own routes (`/members/api/*`, `/ghost/*`) are **not** implemented in server.js; they are served by Ghost (or nginx proxies them to Ghost). The frontend calls `/members/api/send-magic-link/` and `/members/api/member/` directly (same origin on prod; in dev, Vite proxies `/members` and `/ghost` to Ghost).

---

## 6. Key files (quick map)

| Concern              | File(s) |
|----------------------|--------|
| Routes, views        | `src/main.tsx` (Router, resolveView) |
| Home                 | `src/App.tsx` |
| Connect (sign up / login) | `src/Connect.tsx` (inline signup form, Portal for login/account) |
| Listen (tracks)      | `src/Listen.tsx`, `src/config/tracks.ts` |
| Subscription status  | `src/utils/subscription.ts` |
| Portal triggers, logout | `src/utils/memberSession.ts` |
| Portal + API patches | `index.html` (inline script, then Portal loader; hidden triggers in body) |
| Our API + static     | `server.js` |
| Deploy               | `deploy.sh`, `.github/workflows/deploy.yml` |
| Env (prod build)     | `VITE_GHOST_URL`, `VITE_GHOST_CONTENT_API_KEY` in `.env.server` on server; baked into `dist/index.html` at build time. |

---

## 7. Environment and deployment

- **Production:** `./deploy.sh` on the server. Sources `.env.server`, exports `VITE_GHOST_URL` and `VITE_GHOST_CONTENT_API_KEY`, runs `npm run build`, then PM2. The Content API key is baked into the built `index.html`; if it’s wrong or missing, settings request returns 401 and Portal can show invite-only (we bypass that for sign-up with the inline form).
- **Dev:** `npm run dev` (Vite). Uses `.env.development`; override with `.env.development.local` (gitignored) for the Content API key. Vite proxies `/ghost` and `/members` to Ghost; cookie/redirect handling in `vite.config.ts` so Portal works on localhost.
- **Secrets:** Only the **Content API key** is in the client (by design). **Admin API key** and **SIGNUPS_API_TOKEN** are server-only (`.env.server`). Never commit keys.

---

## 8. Gotchas for future agents

1. **Logout:** Always use **`triggerPortalSignOut()`** from `memberSession.ts` before clearing local state; otherwise the Ghost cookie remains and the user stays logged in on prod.
2. **Sign-up:** New users use the **inline form** on Connect (POST to `/members/api/send-magic-link/`). Do not rely on Portal for sign-up; Portal can still show “invite-only” despite our patches. Log-in and account continue to use Portal.
3. **Empty /members/api/member/:** Ghost can return 200 with an empty body when not logged in. Our fetch patch in `index.html` turns that into `{"member":null}` so `subscription.ts` doesn’t throw on `.json()`.
4. **index.html order:** The patch script must run before the Portal script. Preload runs first, then Portal is loaded; when Portal fetches settings, the cache is returned.
5. **deploy.sh:** It `cd`s into the script directory so `.env.server` is found next to it. Run with `bash deploy.sh` (or `./deploy.sh`); ensure `.env.server` exists on the server with `VITE_GHOST_CONTENT_API_KEY` for the build.

Use this doc to re-establish routing, Ghost/Portal behavior, subscription checks, logout flow, and the sign-up bypass when context has reset.
