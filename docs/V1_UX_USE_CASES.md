# Catsky.club Version 1.0 UX Use Cases

## Purpose
This document defines the **authoritative V1.0 user experience scope**. If any other technical document conflicts with this file, this file wins.

## Product Boundaries
- V1.0 is a focused fan experience, not a full platform.
- Access is role/tier based.
- Core monetization is recurring membership with two paid tiers: **$5** and **$20**.

## Experience Matrix (V1.0)

| Experience | Unregistered | Registered (Free) | $5 Tier | $20 Tier |
|---|---:|---:|---:|---:|
| Listen to released music | ✅ | ✅ | ✅ | ✅ |
| Watch trailer for music video | ✅ | ✅ | ✅ | ✅ |
| Read blog posts | ✅ | ✅ | ✅ | ✅ |
| Sign up for free account/newsletter | ✅ | n/a | n/a | n/a |
| Listen to finished unreleased songs | ❌ | ✅ | ✅ | ✅ |
| Unsubscribe from newsletters | ❌ | ✅ | ✅ | ✅ |
| Upgrade to paid tier | ❌ | ✅ | n/a | n/a |
| Listen to unfinished demos | ❌ | ❌ | ✅ | ✅ |
| Watch unreleased music video | ❌ | ❌ | ✅ | ✅ |

## Use Cases by Audience

### A. Unregistered users
1. As an unregistered visitor, I can listen to released music.
2. As an unregistered visitor, I can watch a trailer to the music video.
3. As an unregistered visitor, I can read blog posts.
4. As an unregistered visitor, I can sign up for free to access finished unreleased songs.

### B. Registered users (free)
5. As a registered user, I can do everything from the unregistered section.
6. As a registered user, I can listen to finished unreleased songs.
7. As a registered user, I can unsubscribe from newsletters.
8. As a registered user, I can upgrade to $5 or $20 monthly tiers.

### C. $5 tier users
10. As a $5 tier member, I can do everything above.
11. As a $5 tier member, I can listen to unfinished demos.
12. As a $5 tier member, I can watch unreleased music videos.

### D. $20 tier users
- In V1.0, $20 includes all $5 capabilities.
- Differentiation beyond $5 is intentionally deferred unless explicitly documented in business docs.


## Current implementation notes (March 24, 2026)
- `/connect` shows explicit paid-plan upgrade actions for free members using plan names/perks hydrated from Ghost backend tiers (no price text in CTA copy).
- `/connect` also surfaces a primary free-member CTA, `upgrade to $5/month to unlock the music video`, which still opens Ghost-managed account plans.
- `/connect` plan upgrade clicks open Ghost Portal account plans via the dedicated `account/plans` portal trigger.
- `/watch` remains the public trailer surface and paid-entry prompt.
- `/video` is the paid-gated embedded unreleased video route (`paid_5` + `paid_20` unlock; guests/free see lock messaging + `/connect` path).
- `/listen` lets registered free users play songs with announced release dates while keeping in-progress/no-date demos locked to paid tiers.
- `$5` and `$20` both unlock current V1 paid listen demos and the unreleased video entry point; higher-tier differentiation remains deferred.

## Priority Rules
- **P0 (must ship):** all use cases 1–8, 10–12.
- **P1 (if time allows):** polish, personalization, advanced analytics.
- **Out of scope:** community features, comments, social feed mechanics, creator platform tooling.

## UX Acceptance Criteria
- Visitors can complete each use case in <= 3 primary clicks from relevant entry points.
- Permission messaging is clear when content is locked.
- Upgrade and unsubscribe flows are obvious, reversible, and available from account area.
- Free account creation does not require payment details.

## Information Architecture (recommended)
- `/listen` → released + gated tracks based on role
- `/watch` → trailer public, unreleased video gated by paid tier
- `/blog` → public posts
- `/connect` → auth, free signup, tier upgrade/downgrade, unsubscribe
- `/account` (or section under `/connect`) → membership + newsletter preferences

## Operational UX invariants for Ghost-managed flows
These are not new product features, but they are required for the V1 experience to feel trustworthy and complete:

- Ghost Admin at `/ghost/` must render Catsky branding assets using the public `catsky.club` host, not localhost/internal Ghost URLs.
- Ghost email assets under `/content/images/...` must resolve on the public site because Ghost newsletters and admin previews depend on them.
- Ghost email tracking links under `/r/...` must resolve on the public site and must never bounce users through localhost/127.0.0.1 URLs.
- Newsletter unsubscribe links must stay public-hosted and end in a clear Catsky confirmation state.

If any of those paths regress, treat the bug as a release-blocking Ghost infrastructure regression rather than as a cosmetic frontend issue.

## Guardrails for V1.0
- Do not block public discovery content (released music, trailer, blog).
- Do not require registration before users can sample public content.
- Keep upgrade prompts contextual to locked content.
