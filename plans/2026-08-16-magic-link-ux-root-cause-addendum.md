# ADDENDUM — the actual root cause of the toast + black screen

> Created: 2026-08-16 · For execution by: Codex (gpt-5.6-terra, medium effort)
> Companion to `plans/2026-08-16-magic-link-ux-three-fixes.md` (already implemented).
> This is a **separate, server-side** fix. Do it as a second pass.

## The finding

`index.html` is served to browsers with a **one-year cache**:

```
$ curl -sI https://catsky.club/
content-type: text/html; charset=UTF-8
cache-control: public, max-age=31536000      <-- one year, on the HTML entry point
etag: W/"3ee4-1a00cb246b1"
```

Source — `server.js:605`:

```js
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y', // Cache static assets for 1 year
  etag: true,
  setHeaders: (res, filePath) => { /* only sets MIME types */ }
}))
```

`express.static` serves `dist/index.html` for `GET /`, so the HTML document inherits the
`1y` max-age meant for hashed assets. (The SPA fallback at `server.js:836` uses
`res.sendFile`, which is why `/welcome` correctly returns `max-age=0` — only `/` and any
directly-hit static file are poisoned.)

## Why this produces exactly the two reported symptoms

A returning visitor's browser holds a **pre-fix `index.html`** and will not revalidate it
for a year. That single stale document causes both bugs:

1. **The Ghost toast is back.** The cached HTML predates the auth-callback capture IIFE
   (`index.html:256-269`), so `action=signup&success=true` survives in the URL and Portal
   renders its own notification. Confirmed against the Portal bundle — the string is
   emitted by `action === 'signup' && status === 'success'`:
   `You've successfully subscribed to <strong>{siteTitle}</strong>` with
   `siteTitle: r.site.title`. When `site.title` resolves empty (which our Portal-hardening
   layer can cause), it renders as "You've successfully subscribed to" **and nothing
   else** — the user's exact description.

2. **Black screen after a successful signup.** Vite emits content-hashed bundles. The
   stale HTML points at `/assets/index-<oldhash>.js`, which no longer exists after a
   deploy, so it 404s, React never mounts, and `#root` stays empty over the `#000` body
   set by the critical inline `<style>` at `index.html:9-12`. A blank black page.

This also means **every future deploy silently breaks returning users the same way**, so
it must be fixed regardless of the UX work.

Fresh/incognito sessions do not reproduce it, which is why the live probes in the main
plan came back clean.

## Required fix

**File: `server.js`, the two `express.static` blocks at lines 605-628.**

1. Never long-cache HTML. In the `dist` static handler's `setHeaders`, force
   `Cache-Control: no-cache` (revalidate every time; the ETag still gives a cheap 304)
   for any `.html` file:

   ```js
   if (filePath.endsWith('.html')) {
     res.setHeader('Cache-Control', 'no-cache, must-revalidate')
   }
   ```

   Keep `maxAge: '1y'` for everything else — hashed assets under `/assets/` are
   content-addressed and should stay immutable. Consider adding
   `Cache-Control: public, max-age=31536000, immutable` explicitly for `/assets/`.

2. Do the same in the SPA fallback (`server.js:836-845`) so `res.sendFile` also sends
   `no-cache` — it currently emits `max-age=0`, which is fine but should be explicit and
   consistent.

3. Apply the same treatment to the `public` static handler for `.html`.

4. **Recovery for already-poisoned browsers.** Users who cached the bad HTML will not
   revalidate for a year — the header fix alone does not reach them. Add a client-side
   self-heal to `index.html`: if the module script fails to load (`window.addEventListener('error', …)`
   catching a `<script type="module">` load failure, or a timeout with `#root` still
   empty after ~5s), call `location.reload(true)`-equivalent — i.e. reload once with a
   cache-busting query param, guarded by a `sessionStorage` flag so it can never loop.
   Render a minimal in-brand message if the second attempt also fails.
   This is the only thing that rescues existing affected users; it matters more than the
   header fix for the people complaining today.

5. If nginx also sets caching headers for `/` (check `catsky.club-ssl.conf` `location /`),
   note it in your report — but **do not edit nginx config**, it is out of scope per
   `AGENTS.md` §4 and the main plan's constraints.

## Tests

- Extend or add `src/server.*.test.ts` style coverage (see `src/server.member-profile.test.ts`,
  `src/server.unsubscribe.test.ts` for the existing pattern) asserting:
  - `GET /` responds with a `Cache-Control` containing `no-cache` and **not**
    `max-age=31536000`.
  - `GET /assets/<some-hashed-file>.js` still responds with a long max-age.
  - The SPA fallback (`GET /welcome`) responds with `no-cache`.
- E2E/unit for the self-heal: with `#root` empty and the flag unset, one reload is
  triggered; with the flag set, no reload (no infinite loop).

Run to completion and paste real output:

```bash
npm run lint
npm test
npm run build
```

## Constraints

Same as the main plan. Do **not** edit nginx config, `.env*`, or `.context/`. Do **not**
commit, push, or deploy.

## Report back

1. Confirm the `max-age=31536000` on `/` reproduces locally (`npm run build && npm run server`,
   then `curl -sI localhost:3001/`), and that it is gone after your fix.
2. Files changed and why.
3. Test output.
4. Whether the self-heal reload works and how you verified it.
