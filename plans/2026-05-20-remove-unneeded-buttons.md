# Plan: remove duplicate `/connect` paid-plan buttons

Date: 2026-05-20  
Target branch: `fix/deploy-ghost-url-fallback`

## Goal

For registered free users on `/connect`, remove the two unneeded Ghost-tier buttons:

- `upgrade to curious cats`
- `upgrade to powerful cats`

Keep the contextual upgrade path that opens Ghost Portal account plans:

- `upgrade to $5/month to unlock the music video`

## Current behavior

`src/Connect.tsx` renders the free-member upgrade area when `membershipTier === 'free'`.

That area currently includes:

1. `your current plan: free member`
2. `unlock more with a paid plan:`
3. the primary `$5/month` video-unlock CTA
4. a mapped `planOptions.map(...)` button group, which creates one button per Ghost tier
5. a text-only tier/perk summary

The unneeded buttons come from the `planOptions.map(...)` block. In production Ghost tier names, they render as `upgrade to curious cats` and `upgrade to powerful cats`.

## Implementation scope

Expected files:

- `src/Connect.tsx`
- `src/Connect.test.tsx`
- `public/docs/tech/V1_UX_USE_CASES.md`
- optionally `public/docs/tech/UX_UI_DOCUMENTATION.md` if the account-area upgrade wording needs to stay precise

Do not touch:

- Ghost Portal loader/hardening in `index.html`
- `server.js`
- nginx templates
- `/watch`, `/video`, or `/listen` gating
- membership tier detection in `src/utils/subscription.ts`

## Implementation steps

1. Remove only the duplicate mapped plan-button group from `src/Connect.tsx`.

   Delete this rendered block from the free-member upgrade area:

   ```tsx
   <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
     {planOptions.map((plan) => (
       <a ...>
         upgrade to {plan.name}
       </a>
     ))}
   </div>
   ```

   Keep `planOptions`, `videoUnlockPlan`, `handlePlanUpgrade`, and the primary `$5/month` CTA because the CTA still needs Ghost tier data and still opens `#/portal/account/plans`.

2. Keep or simplify the tier/perk summary deliberately.

   Preferred first pass: keep the non-clickable tier/perk summary so free users can still see what paid plans include without seeing duplicate action buttons.

   If the resulting section feels cluttered in screenshot review, reduce the summary copy in the same patch, but do not remove the main upgrade CTA.

3. Update unit tests in `src/Connect.test.tsx`.

   Change the free-member test so it asserts:

   - `your current plan: free member` is visible
   - `upgrade to $5/month to unlock the music video` is visible
   - `upgrade to Studio Pass` is absent
   - `upgrade to Backstage Circle` is absent
   - the tier/perk summary remains visible if the implementation keeps it

   Keep the click test for the primary `$5/month` CTA opening `openPortalAccountPlans()`.

4. Update docs that describe `/connect`.

   In `public/docs/tech/V1_UX_USE_CASES.md`, replace the note that `/connect` shows explicit paid-plan upgrade actions for free members with wording that says `/connect` shows a single contextual paid-upgrade CTA and may show non-clickable backend tier/perk context.

   In `public/docs/tech/UX_UI_DOCUMENTATION.md`, update the upgrade-flow wording only if needed so it does not imply multiple account-area upgrade buttons are required.

5. Run checks.

   Required commands:

   ```bash
   npm run test -- src/Connect.test.tsx
   npm run test
   npm run build
   npm run test:e2e:auth
   ```

   If `npm run test:e2e:auth` is blocked by Playwright install or host deps, run `npm run test:e2e:setup` first and retry.

6. Capture UI evidence because this changes visible `/connect` behavior.

   Preferred command:

   ```bash
   npm run screenshots:journey
   ```

   Also capture or inspect a free-member `/connect` state if the default journey does not simulate a free user. Evidence must show:

   - the free-member `/connect` start state
   - the primary `$5/month` CTA still present
   - no `upgrade to curious cats` or `upgrade to powerful cats` buttons

## Acceptance criteria

- Registered free users on `/connect` no longer see separate `upgrade to curious cats` or `upgrade to powerful cats` buttons.
- Registered free users still see a clear paid-upgrade CTA that opens Ghost Portal account plans.
- The account and logout controls for logged-in users are unchanged.
- Paid users still see `paid access active`.
- Logged-out users still see the existing sign-up/log-in flow.
- Tests and screenshot evidence document the changed visible behavior.

## Review checklist

- Confirm the removed buttons are only the mapped Ghost-tier buttons, not the main `$5/month` CTA.
- Confirm Ghost tier loading is not removed if it is still used for plan naming/perk context.
- Confirm docs no longer promise explicit per-plan upgrade buttons on `/connect`.
- Confirm no unrelated routing, Portal, Ghost proxy, or gating behavior changed.
