# QA Report: remove duplicate `/connect` paid-plan buttons

Date: 2026-05-20
Scope: `plans/2026-05-20-remove-unneeded-buttons.md`
Mode: diff-scoped QA review
Health score: 100/100 for scoped behavior

## Findings

No issues found in the scoped change.

## Evidence

- `npm run test -- src/Connect.test.tsx`: passed, 4 tests.
- `npm run test`: passed, 43 tests across 9 files.
- `npm run build`: passed. Local build still prints Vite warnings for missing `%VITE_GHOST_URL%` and `%VITE_GHOST_CONTENT_API_KEY%` placeholders.
- `npm run test:e2e:auth`: passed, 37 Chromium tests.
- `npm run screenshots:journey`: passed; refreshed `artifacts/ui-journey/01-home-entry.png`, `02-listen-state.png`, and `03-connect-state.png`.
- Free-member browser check: regenerated `artifacts/ui-journey/04-connect-free-member.png`; verified one `upgrade to $5/month to unlock the music video` link, zero `upgrade to curious cats` links, and zero `upgrade to powerful cats` links.

## Notes

The direct free-member screenshot uses local dev fallback tier context, so the non-clickable tier summary text differs from the mocked E2E perk wording. The acceptance-critical behavior is covered by E2E and screenshot evidence: duplicate per-tier upgrade links are absent and the main Portal plans CTA remains present.
