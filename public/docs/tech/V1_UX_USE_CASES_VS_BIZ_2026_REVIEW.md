# Review: V1.0 UX Use Cases vs 2026 Business Plan

## Scope
This review compares the V1.0 UX use cases to business documents in `public/docs/biz/`.

Business sources reviewed:
- `mission.md`
- `strategy.md`
- `offer.md`
- `tiers.md`
- `music.md`
- `branding.md`
- `todo.md`

## Executive Summary
The V1.0 use-case list is largely compatible with the 2026 phase-1 business direction (small, focused, depth-first). The main gap is that UX cases define capability by access level, while business docs emphasize emotional framing and depth. This is not a conflict, but it requires messaging discipline in implementation.

## Alignment Check

### Strong alignment
1. **Public discovery + private proximity model**
   - UX includes public content for non-registered users and deeper access for registered/paid members.
   - This matches business positioning: listeners can observe, fans/superfans choose proximity.

2. **Recurring paid support path**
   - UX includes upgrade path to paid tiers.
   - Matches business requirement for recurring fan revenue.

3. **Simple phase-1 scope**
   - UX remains narrow and does not require platform/community features.
   - Matches strategy constraints to avoid overbuilding.

4. **Member-only early/private content**
   - Finished unreleased songs and unreleased video for paid levels align with member-only access intent.

### Partial alignment / watch items
1. **Two paid tiers in UX vs simpler phase-1 framing in biz docs**
   - Some business docs emphasize a single paid membership narrative.
   - UX explicitly requires $5 and $20 options.
   - Recommendation: keep two price points but preserve one narrative voice (“proximity”), avoiding feature-bloat framing.

2. **$20 differentiation is undefined in use cases**
   - UX list specifies capability for $5 but not unique $20 value.
   - Recommendation: for V1.0, allow parity ($20 includes $5), and treat $20 as support-forward until future scope is approved.

3. **Newsletter unsubscribe is operational but under-documented in business docs**
   - UX requires unsubscribe flow.
   - Recommendation: include unsubscribe UX and lifecycle messaging in operational checklists.

## Risks if not handled
- Drift into “content subscription utility” tone instead of “supporting artist proximity.”
- Confusion between free registered and paid value if gating copy is weak.
- Overbuilding $20-only features before proving phase-1 traction.

## Implementation Recommendations
1. Ship exactly the listed use cases as V1.0 contract.
2. Keep copy emotionally aligned with mission (no guilt, no exaggerated promises).
3. Use locked-content prompts that explain *why* membership exists (support + closeness).
4. Treat $20 as support-forward in V1.0, with optional future differentiation.
5. Add monthly review of conversion and retention signals tied to `todo.md` checkpoints.

## Verdict
**Proceed with this UX scope for V1.0.** It supports the 2026 business plan when implemented with strict narrative discipline and restrained feature scope.
