# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Catsky Club is a React + TypeScript + Vite SPA with an Express.js API backend, serving as a headless frontend for Ghost CMS. Single `package.json` at root (not a monorepo).

### Services

| Service | Port | Command | Notes |
|---------|------|---------|-------|
| Vite dev server | 3000 | `npm run dev` | Serves SPA with HMR; proxies `/api` to Express, `/ghost` and `/members` to production Ghost |
| Express API | 3001 | `npm run server` | Serves `/api/submit` and `/api/signups`; requires `GHOST_ADMIN_API_KEY` in `.env.server` for full functionality |
| Both together | 3000 + 3001 | `npm run dev:full` | Starts both concurrently via `dev.mjs` |

Ghost CMS is external (proxied to `https://catsky.club`). No local Ghost instance is needed.

### Commands

Standard commands are in `package.json` scripts. Key ones:

- **Lint:** `npm run lint`
- **Unit tests:** `npm run test` (Vitest, ~1s)
- **E2E tests:** `npm run test:e2e` (Playwright, ~8 min across 5 browser projects; auto-starts Vite)
- **Build:** `npm run build` (runs `tsc` then `vite build`)

### Gotchas

- The `VITE_GHOST_CONTENT_API_KEY` warning in dev/build is expected when the key is not set in `.env.development.local`. The app functions without it; only Ghost Portal login/account modals need this key.
- E2E tests on WebKit/Safari have pre-existing failures related to text selectability and JS console error detection. All Chromium tests pass.
- Playwright browsers must be installed via `npx playwright install --with-deps` after `npm install`. The update script handles this.
- The Express server (`server.js`) needs `GHOST_ADMIN_API_KEY` set in `.env.server` for the `/api/submit` endpoint to actually create Ghost members. Without it, sign-up form submissions return a 500 with a helpful error message.
