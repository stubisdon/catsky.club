# AGENTS.md — Catsky task execution guide

This file gives new LLM task executors immediate project context so they can make **useful, scoped edits** instead of random churn.

## 1) Mission and constraints

- Product goal: make `catsky.club` interesting enough for early adopters.
- Every task should deliver a visible product, reliability, or maintainability outcome.
- Avoid “code motion” that does not change behavior, reduce bugs, or improve clarity.

## 2) Read these first (before any edits)

1. `ARCHITECTURE.md` (runtime map, high-risk areas, deployment/testing flow)
2. `public/docs/tech/V1_UX_USE_CASES.md` (current UX intent and expected user flows)
3. Any docs directly related to the touched area under `public/docs/tech/` and `public/docs/biz/`

## 3) What counts as a useful edit

A useful edit should do **at least one** of these:

- implement requested behavior from the issue/thread,
- fix a confirmed bug or regression,
- add/update tests that cover real behavior,
- improve docs required to keep future tasks accurate after code changes.

Avoid:

- broad refactors not requested by the issue,
- style-only rewrites across unrelated files,
- changing naming/structure with no measurable payoff,
- introducing new dependencies without clear need.

## 4) High-risk files and patterns

Be extra careful in:

- `index.html` Ghost Portal patch/hardening script (script order is intentional),
- `src/utils/subscription.ts` and auth/session flows,
- `src/Connect.tsx` login/signup/callback behavior,
- `vite.config.ts` proxy + cookie/redirect rewriting,
- `server.js` env loading, static serving order, and SPA fallback.
- nginx templates: `catsky.club-ssl.conf`, `nginx.conf.example`, `nginx-ssl-update.txt` (Ghost route ownership must stay intact).

### Ghost asset/routing protection (to prevent favicon/email regressions)

- Treat these URL prefixes as **Ghost-owned infrastructure routes**: `/ghost/`, `/ghost/api/`, `/members/`, `/webhooks/`, `/unsubscribe/`, `/content/images/`, `/r/`.
- Never route those prefixes to the frontend app (`:3001`) and never remove them from nginx templates during frontend work.
- Do not create “documentation” files under runtime asset paths (for example under `public/content/images/**`) as a way to preserve operational behavior.
- Document protection/routing rationale only in canonical docs: `AGENTS.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, and relevant `public/docs/tech/*` docs.
- If a Ghost Admin branding image URL is broken, fix by restoring/proxying the actual asset path and validating the URL directly, not by changing unrelated frontend routing.

For these areas: prefer the smallest valid patch and validate behavior directly.

## 5) Required execution workflow for every task

1. Confirm scope from issue + latest comment thread.
2. Identify minimal file set needed.
3. Implement the smallest complete fix/feature.
4. Update docs as part of the same task (see section 6).
5. Run automated checks (see section 7).
6. If behavior changed, add/update e2e tests and run them.
7. Capture UX/UI journey screenshots when the task changes user-visible behavior (see section 9).
8. Summarize exactly what changed and why.

## 6) Documentation update policy (mandatory)

When a task changes behavior, flows, or architecture, the task executor must update:

- `AGENTS.md` (this file) when guidance or file map assumptions changed,
- `ARCHITECTURE.md` when runtime behavior, integrations, or structure changed,
- all relevant docs under `public/docs/` that describe affected behavior.

If no documentation update is needed, explicitly state why in the task summary.

## 7) Test policy (mandatory)

After implementing a task:

- Run unit/integration tests.
- Run e2e tests.
- Add new relevant e2e tests for newly introduced behavior or fixed regressions.
- Run the new/updated e2e tests and report the exact command and result.

Do not claim completion without test outcomes.

## 8) Definition of done

A task is done only when all are true:

- issue requirements are implemented,
- no unrelated edits are included,
- docs are updated (or explicitly justified as unchanged),
- tests were executed and results reported,
- changes are understandable for the next executor.


## 9) UX/UI screenshot evidence policy (mandatory)

When a task changes a user-facing flow (layout, copy, navigation, forms, gating, account actions, or visible states), the executor must attach screenshots that document the full journey touched by the change.

Minimum screenshot set:

- Entry state before interaction (starting page/view).
- Each key transition step in the path a user takes.
- Final success/confirmation state (or locked/error state when relevant).

Execution requirements:

- Prefer browser automation so screenshots are reproducible.
- Include screenshots in the final task summary with clear labels in journey order.
- If capture is blocked by environment/tooling, explicitly state what was attempted and why evidence could not be collected.
- Do not mark the task done without screenshot evidence for user-visible changes unless a hard blocker is documented.
