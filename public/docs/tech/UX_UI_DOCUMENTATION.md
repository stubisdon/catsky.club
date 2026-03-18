# UX/UI Documentation (V1.0 Scope)

This document is updated to reflect the current V1.0 product vision.

## Source of Truth
- Primary UX contract: `public/docs/tech/V1_UX_USE_CASES.md`
- If this file conflicts with older flow-based docs, use the V1 use-case contract.

## V1.0 Experience Goals
1. Let any visitor sample public content quickly.
2. Convert interested visitors into registered users.
3. Convert registered users into paid members ($5 or $20).
4. Maintain clear control over newsletter preferences (including unsubscribe).

## Audience States
- Unregistered visitor
- Registered (free)
- Paid member ($5)
- Paid member ($20)

## Core Navigation
- `/listen` — music access by role/tier
- `/watch` — trailer public, unreleased video gated for paid tiers
- `/blog` — public posts
- `/connect` — sign up, sign in, upgrade, unsubscribe/account controls
- `/welcome` — post-signup first/last name collection for new users
- `/welcome` should let a new user type their name and press **continue** immediately; the profile save must be queued in the background and the user should land in the app without waiting for client-side session hydration or Ghost profile writes to finish.

## Required UX Behavior

### Unregistered
- Can play released music without sign-in.
- Can watch trailer without sign-in.
- Can read blog posts without sign-in.
- Can register for free from contextual CTAs.

### Registered (Free)
- Retains all public capabilities.
- Gains access to finished unreleased songs.
- Can unsubscribe from newsletters.
- Can upgrade to $5 or $20.

### $5 Tier
- Retains all free capabilities.
- Gains access to unfinished demos.
- Gains access to unreleased music video.

### $20 Tier
- Includes all $5 capabilities for V1.0.
- Additional differentiation is optional and deferred.

## UX Patterns

### Access gating
- Never gate public discovery content.
- For locked content, show:
  - what is locked
  - why it is locked
  - exact action to unlock (sign up or upgrade)

### Upgrade flow
- Upgrade options: $5 and $20 monthly.
- Upgrade CTA appears on locked-content surfaces and account area.

### Newsletter controls
- Subscription preference visible in account/settings.
- Unsubscribe action available in product and email footer.
- Confirmation state should be explicit after unsubscribe.

## Non-Goals for V1.0
- Social/community feed
- Complex fan dashboards
- Advanced recommendation systems
- Large-scale analytics UI


## UX Change Evidence for Task Execution

For any task that changes user-visible UX/UI behavior, provide a screenshot sequence that covers the full affected journey:

1. Start state before user action.
2. Intermediate interaction states for each major step.
3. End state confirming completion (or locked/error outcome if that is the expected path).

Evidence should be ordered and labeled so reviewers can reconstruct the flow without running the app locally.

## QA Checklist
- Visitor can complete each P0 use case without dead ends.
- Role transitions (unregistered -> registered -> paid) work end-to-end.
- Locked-content copy is consistent across pages.
- Unsubscribe state persists and is reversible through explicit opt-in.
- UX/UI-changing tasks include ordered screenshot evidence for the full affected journey.
