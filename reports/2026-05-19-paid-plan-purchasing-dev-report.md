# Paid Plan Purchasing Dev Report

Date: May 19, 2026  
Workspace: `/Users/stub/conductor/workspaces/catsky.club/zagreb-v1`  
Base branch for diff/review: `origin/fix/deploy-ghost-url-fallback`

## Scope Implemented

Implemented the paid-video unlock flow from `plans/2026-05-19-implement-paid plan.md`:

- New paid-only `/video` route with embedded YouTube video for `paid_5`/`paid_20`.
- Locked states on `/video` for `none` and `free` with required copy and `/connect` path.
- Home page shows `secrets` button only for paid users.
- `/connect` free-member state adds primary CTA: `upgrade to $5/month to unlock the music video`.
- Existing `/watch` behavior preserved.

## Files Changed

Code:

- `src/Video.tsx` (new)
- `src/router/Router.tsx`
- `src/App.tsx`
- `src/Connect.tsx`

Unit tests:

- `src/router/Router.test.tsx`
- `src/App.test.tsx`
- `src/Connect.test.tsx`

E2E tests:

- `e2e/video.spec.ts` (new)
- `e2e/auth.spec.ts`
- `package.json` (added `test:e2e:video`)

Docs:

- `ARCHITECTURE.md`
- `public/docs/tech/V1_UX_USE_CASES.md`
- `public/docs/tech/UX_UI_DOCUMENTATION.md`
- `public/docs/tech/README_REACT.md`

Artifacts:

- `artifacts/ui-journey/video-upgrade/01-connect-free-upgrade-cta.png`
- `artifacts/ui-journey/video-upgrade/02-video-free-locked.png`
- `artifacts/ui-journey/video-upgrade/03-home-paid-secrets.png`
- `artifacts/ui-journey/video-upgrade/04-video-paid-iframe.png`

## Validation Run + Results

Executed in this workspace:

1. `npm run test` -> passed (43/43)
2. `npm run test:e2e:auth` -> passed (37/37)
3. `npm run test:e2e:watch` -> passed (10/10)
4. `npm run test:e2e:video` -> passed (6/6)

Notes:

- `npm install` was required first because local deps were not present (`vitest: command not found` before install).
- `/watch` code path was not modified; regression check is covered by `test:e2e:watch`.

## QA Agent Review Request

Please run a QA-focused review with emphasis on user-visible behavior and regressions.

Review checklist:

1. Verify exact locked copy on `/video`:
   - Logged out: `this page is only for connected cats, go to catsky.club/connect to get connected`
   - Free member: `upgrade to $5/month to unlock the music video`
2. Verify paid gating:
   - `paid_5` and `paid_20` can view iframe (`xRxUcF_wFSQ` embed).
   - `none` and `free` cannot see iframe.
3. Verify navigation behavior:
   - Home `secrets` link appears only for paid tiers.
   - Free/logged-out users do not see `secrets`.
4. Verify `/connect` free-member CTA:
   - Primary CTA appears with exact text.
   - Click opens `#/portal/account/plans`.
5. Confirm `/watch` remains unchanged in behavior.
6. Compare screenshot evidence in `artifacts/ui-journey/video-upgrade/`.

## SWE Agent Review Request

Please run an SWE/code-review pass for correctness, maintainability, and contract adherence.

Review checklist:

1. Confirm route handling:
   - `/video` added without altering signup callback normalization and trailing-slash behavior.
2. Confirm gating logic:
   - `getMembershipTier` usage is consistent with existing patterns.
   - No unintended exposure of iframe before paid tier resolution.
3. Confirm `/connect` integration:
   - CTA reuses `openPortalAccountPlans` path and does not bypass Ghost-managed plans.
4. Confirm test coverage quality:
   - Unit tests cover new route/nav visibility.
   - E2E tests cover `none`, `free`, `paid_5`, `paid_20`, and home-to-video navigation.
5. Confirm docs stay in sync with runtime behavior.
6. Check for unintended side effects outside scoped files.

## Suggested Prompt for Each Agent

Use this prompt as-is:

> Review `reports/2026-05-19-paid-plan-purchasing-dev-report.md` and the current git diff against `origin/fix/deploy-ghost-url-fallback`.  
> Provide findings ordered by severity with file/line references, then open questions/assumptions, then a brief summary.  
> Focus on regressions, spec mismatches, and missing test coverage.
