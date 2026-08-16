# Pass 4 — rescue browsers that already cached the broken HTML shell

> Created: 2026-08-16 · For execution by: Codex (gpt-5.6-terra, medium effort)
> Follows the three earlier 2026-08-16 plans, all already implemented in the working tree.
> Do not revert prior work.

## The gap this closes

The addendum fixed the cause (`Cache-Control` on `/` is now `no-cache, must-revalidate`
— verified locally: `/` and `/welcome` return `no-cache`, `/assets/*.js` returns
`max-age=31536000, immutable`). It also added a self-heal reload to `index.html`.

**But the self-heal ships inside the new `index.html`, and the affected browsers are
exactly the ones that will not fetch the new `index.html` for a year.** It protects
future visitors and does nothing for the people broken today. Verify this reasoning
yourself before implementing; if you think it is wrong, say so.

Who is affected: every browser that loaded `https://catsky.club/` (or the magic-link
landing URL `https://catsky.club/?action=signup&success=true`, which is a byte-identical
URL on every signup and therefore its own long-lived cache entry) while the `max-age=1y`
header was live. Their cached shell references `/assets/index-<oldhash>.js`, which the
next deploy deletes, so they get a 404 and an empty `#root` — a black page.

Note the blast radius is limited to the root URL: the SPA fallback (`server.js:836`) has
always sent `max-age=0`, so `/listen`, `/connect`, `/welcome` etc. serve fresh HTML.

## The fix — retain previously deployed asset bundles

If the old hashed bundles still exist on disk, a stale shell **boots**. The user runs
slightly old code (no toast fix, no `/welcome` routing) instead of staring at a black
screen, and they self-heal the moment they hit any non-root path or their cache entry
expires. This is the only lever that reaches an already-poisoned browser without asking
the user to hard-refresh.

**File: `deploy.sh`** (the build step around `npm run build`).

1. Before `npm run build`, if `dist/assets` exists, copy its contents to a retention
   directory outside `dist` (e.g. `.deploy-cache/assets/`). Vite's `emptyOutDir` wipes
   `dist` on every build, which is why the copy must happen first.
2. After a successful build, copy retained files **back into** `dist/assets/` **without
   overwriting** anything the new build produced (`cp -n`, or check existence per file).
   Content-hashed filenames make collisions impossible in practice, but do not overwrite.
3. Prune the retention directory: delete entries older than 90 days so it cannot grow
   without bound. Use `find … -mtime +90 -delete`.
4. Guard the whole thing so a missing/empty `dist` or `.deploy-cache` never aborts the
   deploy (`set -e` is active — use `|| true` where appropriate).
5. Add `.deploy-cache/` to `.gitignore`.
6. Echo what was retained and pruned, matching the script's existing emoji log style.

## Also

7. **Strip the recovery marker.** The self-heal in `index.html` adds
   `?__catsky_reload=<timestamp>` and never removes it, so it sticks in the address bar
   and in any URL the user copies or shares. After the app boots successfully, remove
   that one param via `history.replaceState`, preserving every other param and the hash.
   Do this in the same place the app confirms it mounted (or in `src/main.tsx` after
   render) — not in the pre-boot script.

8. **Document it.** `DEPLOYMENT.md` should gain a short subsection explaining why HTML is
   `no-cache`, why hashed assets are `immutable`, and why `deploy.sh` retains old asset
   bundles — so nobody "optimizes" the 1-year header back onto `/`. Cross-reference from
   `ARCHITECTURE.md` if that is where the static-serving section lives (`ARCHITECTURE.md:141`).

## Verification

```bash
npm run lint
npm test
npm run build
```

Plus, for the retention logic specifically: `bash -n deploy.sh` to syntax-check, and a
manual dry-run description of the copy/restore/prune sequence in your report. Do not run
`deploy.sh` itself — it restarts PM2 and deploys.

Same constraints as before: no nginx edits, no `.env*`, no `.context/`, no commit, push,
or deploy.

## Report back

1. Whether you agree the self-heal cannot reach already-poisoned browsers, with reasoning.
2. Files changed and why.
3. Test + `bash -n` output.
4. Anything about the retention scheme you think is wrong or risky.
