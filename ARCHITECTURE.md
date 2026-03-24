# Catsky Club Architecture (March 18, 2026 refresh)

This document reflects the **current** codebase architecture for `catsky.club` and replaces stale assumptions.

## 1) System overview

Catsky Club is a Vite + React single-page app with a lightweight Express server.

- Frontend: route-based experience pages (`/`, `/listen`, `/watch`, `/connect`, `/welcome`, `/mission`).
- Membership/auth: Ghost Members API + Ghost Portal.
- Runtime API server: Express serves static assets and a small Ghost Admin API bridge.
- Deployment target: production host running PM2 + nginx in front.

## 2) Runtime architecture

### Frontend app shell

- Entry: `index.html` bootstraps the app and Ghost Portal integration.
- React mount: `src/main.tsx` renders `Router` inside `React.StrictMode`.
- Router: `src/router/Router.tsx` maps pathname to views and normalizes trailing slashes.
- Navigation: `src/router/navigation.ts` uses History API and dispatches `popstate`.

### Route map

- `/` → `src/App.tsx` (landing page)
- `/listen` → `src/Listen.tsx` (tier-gated tracks; V1 paid-demo catalog currently unlocks at `$5` with `$20` parity)
- `/watch` → `src/Watch.tsx` (public teaser + plan/perk upgrade prompt for free/guest users + unreleased-video entrypoint for paid tiers)
- `/connect` → `src/Connect.tsx` (magic-link auth UI + free/$5/$20 membership state + plan-name/perk upgrade messaging + account/logout actions)
- `/welcome` → `src/Welcome.tsx` (post-signup profile capture: first/last name)
- `/mission` → `src/Mission.tsx` (hidden poetry/mission page)
- unknown paths → normalized to `/` in router

### Styling model

- Global theme/layout tokens in `src/index.css`.
- Shared reusable style objects in `src/styles/common.ts`.
- Route components mostly use inline style objects for local presentation.
- Reusable primitives in `src/components/` (`Link`, `PageContainer`, `PageTitle`).

## 3) Ghost integration

### 3.1 Members API and session state

Primary member check flow:

- `src/utils/subscription.ts` calls `/members/api/member/` with `credentials: 'include'` and no-store headers.
- Supports two Ghost response shapes:
  - `{ member: {...} }`
  - direct member object.
- Converts member record to:
  - status: `not_subscriber` / `free_subscriber` / `paid_subscriber`
  - tier: `none` / `free` / `paid_5` / `paid_20` (based on active subscription amount).

Dev override support (local only):

- `catsky_dev_member` + `catsky_dev_paid` in localStorage via `setDevMemberOverride()`.

### 3.2 Connect authentication UX

Current behavior in `src/Connect.tsx`:

- Signup/login buttons open an inline email form (not Portal signup UI).
- Form posts to `/members/api/send-magic-link/`.
- Callback robustness:
  - detects `?action=signin|signup&success=true`
  - retries member refresh with backoff
  - on successful `action=signup`, routes to `/welcome` before app entry and persists the resolved Ghost member identity in `sessionStorage` for the onboarding handoff when the callback flows through `Connect`
  - `/welcome` also hydrates the current Ghost member identity itself on mount so router-level signup callback normalization still carries the real Ghost Members payload into `POST /api/member-profile`; in production this payload is typically `uuid` + `email` rather than an Admin API `id`, so the Express bridge must translate that identity back to the canonical Ghost Admin member record before updating `name`/`note`
  - the page normalizes the signup callback straight into `/welcome` (so `/connect` does not flash first), navigates straight into the app, and leaves the Ghost profile update to the Express server so the user does not wait on client-side hydration.
  - the `/welcome` form keeps required/optional indicators visually secondary (`*` and `(optional)` render as note-style helper text) so the onboarding step stays calm and readable while still conveying field requirements.
  - refreshes on `focus`, `pageshow`, `visibilitychange`.
- Logged-in view shows:
  - account link (`#/portal/account`)
  - logout action that **must** call `triggerPortalSignOut()`.

### 3.3 Ghost Portal wiring and hardening

`index.html` contains a large pre-Portal script that:

- patches JSON from Ghost endpoints to normalize signup access and tier visibility,
- hardens `fetch` / `Response.json` / XHR behavior against empty JSON responses,
- only synthesizes `{ member: null }` for empty `/members/api/member/` responses (so account/newsletter mutation endpoints keep their native empty-body semantics),
- rewrites production URLs where needed,
- prefetches and caches Ghost settings,
- dynamically loads patched Portal script from jsDelivr,
- inserts hidden trigger anchors used by `memberSession.ts`.

Important: script order is intentional; this patch script runs before Portal load.

## 4) Listen page and media model

### 4.1 Track source of truth

- Track catalog lives in `src/config/tracks.ts`.
- Access tiers per track: `public`, `free_member`, `paid_5`, `paid_20`.
- Tracks can also define `availableFrom` + `lockedLabel` metadata for date-based embargoes that should stay locked even when the listener's membership tier would otherwise qualify.
- Current track list is SoundCloud-based.

### 4.2 Playback behavior

In `src/Listen.tsx`:

- membership tier is loaded first (`getMembershipTier`) with `none`, `free`, `paid_5`, and `paid_20` resolution.
- accessible vs locked tracks computed client-side from tier plus any track-level embargo date.
- V1 currently keeps paid access parity between `$5` and `$20` on listen demo tracks.
- selecting locked tracks redirects to `/connect`.
- supports:
  - direct audio element path (`audioRef`) for `direct` sources,
  - SoundCloud embed iframe for `soundcloud` sources.
- paid users get local vote/feedback UI (localStorage + in-memory submit acknowledgement).

Helpers:

- `src/utils/audioHelpers.ts` generates SoundCloud embed URLs and supports direct URLs.
- `src/utils/soundcloudTracks.ts` offers parsing utilities for SoundCloud share links.

## 5) Express server architecture (`server.js`)

The Node server is intentionally small:

- Loads `.env.server` then `.env` (without overwriting existing env vars).
- Serves static files from:
  - `dist/` first,
  - `public/` second.
- Provides API routes:
  - `POST /api/submit`:
    - validates `{ name, contact }`
    - creates/reuses Ghost member via Ghost Admin API JWT auth.
  - `POST /api/member-profile`:
    - validates `{ firstName, lastName }` (with optional `memberId`, `memberUuid`, and `email`)
    - returns `202` immediately
    - accepts JSON and `text/plain` onboarding payloads so browser background-delivery APIs are both supported
    - translates Ghost Members identities (`memberUuid`/`email`) into the canonical Ghost Admin member id, falls back to request-cookie session resolution when needed, retries while the session hydrates, and then updates profile `name` + onboarding metadata in `note` asynchronously.
  - `GET /api/signups`:
    - token-protected with `x-signups-token`
    - returns recent Ghost members.
- SPA fallback:
  - unknown extensionless routes return `dist/index.html`
  - unknown file paths with extension return 404.

Ghost routes like `/members/api/*`, `/ghost/*`, `/content/images/*`, and `/r/*` are not normal SPA routes. In production, nginx is the canonical owner for those Ghost prefixes; in local dev, Vite proxies Ghost traffic.

#### Ghost-owned infrastructure route contract

The CAT-34 favicon/email work established this routing contract and it should now be treated as architecture, not as a one-off fix:

- `/ghost/` and `/ghost/api/` must preserve `X-Forwarded-Host`, `X-Forwarded-Proto`, and `X-Forwarded-Port`, and must rewrite localhost/internal absolute redirects with `proxy_redirect`. Ghost Admin uses that public request context when it builds branding/image URLs (including the logo/icon shown inside `/ghost`).
- `/content/images/` serves Ghost-hosted assets used by Ghost Admin branding and Ghost emails. Those nginx blocks also need the same forwarded-host context + redirect rewriting so Ghost does not emit broken localhost/self-loop redirects.
- `/r/` serves Ghost email tracking redirects and must stay Ghost-owned for newsletter links to resolve correctly on the public domain.
- `/unsubscribe` remains a Ghost-owned flow, but Catsky intentionally intercepts tokenized newsletter unsubscribe links in Express so users land on a first-party confirmation page instead of falling through to the SPA shell.

Express now intercepts tokenized `GET /unsubscribe?uuid=...&key=...&newsletter=...` and `GET /unsubscribe/?uuid=...&key=...&newsletter=...` links before SPA fallback, then sends Ghost a `POST` to `/unsubscribe/?...` on `GHOST_INTERNAL_URL` (default `http://127.0.0.1:2368`) before returning a Catsky-hosted confirmation page. That POST matters: in Ghost, `GET /unsubscribe` is only the entry/redirect step, while the actual newsletter opt-out happens on `POST`. Those Express-to-Ghost requests intentionally send the canonical public `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`, and `X-Forwarded-Port` values derived from `GHOST_URL`, because Ghost newsletter unsubscribe handling can fail when the upstream request arrives as bare localhost/internal origin traffic. Non-tokenized `/unsubscribe` routes still proxy through to Ghost as `GET`, and upstream redirects from internal/localhost hosts are rewritten to the public request origin (or `GHOST_URL` fallback). Express also includes defensive pass-through handlers for `/content/images/*` and `/r/*` so Ghost favicon/email paths still resolve if nginx route blocks are accidentally stale; those fallback fetches forward the same canonical public host/proto/port contract so Ghost does not bounce them back to the same public URL in a canonical-host redirect loop. nginx remains the primary owner for these prefixes in production.

The practical result is that Ghost Admin branding, Ghost email logos/assets, email click-tracking redirects, and newsletter unsubscribe flows all depend on the same public-host-aware proxy contract. If one of those surfaces breaks, inspect nginx/Express forwarding behavior before adding compatibility assets or changing frontend routing.

## 6) Local development topology

### Standard mode

- `npm run dev` starts Vite (port 3000).
- `npm run server` starts Express API/static server (port 3001).

### Combined mode

- `npm run dev:full` (`dev.mjs`) runs both processes together.

### Proxy and cookie behavior

`vite.config.ts` proxies:

- `/api` → `http://localhost:3001`
- `/ghost` and `/members` → `VITE_GHOST_API_PROXY` (default `https://catsky.club`)

Proxy response handling strips `Secure`/`Domain` from cookies and rewrites redirects for localhost flow compatibility.

## 7) Delivery and operations

### Build and start

- build: `npm run build` (TypeScript compile + Vite build)
- prod server entry: `npm run server` (`node server.js`)
- convenience: `npm run start` (build then server)

### Deploy workflow

- GitHub Action `.github/workflows/deploy.yml` deploys on `main` push (or manual dispatch) via SSH, then runs `deploy.sh` on server.
- `deploy.sh`:
  - loads `.env.server`,
  - exports `VITE_GHOST_*` values,
  - installs deps,
  - builds,
  - restarts PM2 app.

### Diagnostics

- `.github/workflows/check-ghost.yml` runs scheduled/manual remote Ghost diagnostics via `scripts/check-ghost.sh`.

### Testing status

- unit/integration: Vitest (`npm run test`).
- E2E: Playwright suite in `e2e/` with smoke-vs-matrix commands:
- E2E startup contract now runs through `scripts/playwright-webserver.mjs`, which binds Vite to `127.0.0.1:3000` with `--strictPort` and blocks until the app shell is actually reachable before Playwright begins navigation.
  - `npm run screenshots:journey` captures a reproducible 3-step desktop UI evidence set (`/`, `/listen`, `/connect`) to `artifacts/ui-journey/` by starting Vite on `127.0.0.1:3000` and waiting for app-shell readiness before navigation.
  - `npm run test:e2e:setup` installs Playwright browser binaries plus required Linux host libraries (`--with-deps`) for local and CI-like runs.
  - `npm run test:e2e:landing` is the default smoke command (Chromium-only landing suite excluding `Performance`-tagged checks).
  - `npm run test:e2e` aliases the landing smoke flow for reliable baseline execution.
  - `npm run test:e2e:landing:matrix` and `npm run test:e2e:matrix` run full browser-matrix coverage when the environment is stable.
- CI test workflow currently kept as a manual no-op placeholder (`.github/workflows/test.yml` says tests are temporarily disabled in CI).

## 8) Repository structure (practical map)

- `src/`: app code (routes, components, router, utils, config, styles, tests)
- `public/`: static assets
- `e2e/`: Playwright tests + test planning docs
- `server.js`: Express runtime server
- `vite.config.ts`: frontend tooling + proxy logic
- `deploy.sh`: server-side deployment script
- `.github/workflows/`: deploy/test/diagnostic automation
- root docs: deployment/testing/soundcloud setup references

## 9) Notable current-state caveats

- `src/DocsViewer.tsx` exists but is not wired into current route rendering.
- Unsubscribe reliability is intentionally duplicated: nginx should proxy both `= /unsubscribe` and `/unsubscribe/` directly, and Express now includes a defensive `/unsubscribe` proxy before SPA fallback.
- Membership gating in Listen is client-side UX gating; authoritative member state still comes from Ghost session/cookies.
- Ghost Portal behavior depends heavily on the `index.html` patch script; accidental refactors there can break auth/signup UX.
- `POST /api/submit` remains available for server-side member creation flows even though Connect currently uses client-side magic links.
