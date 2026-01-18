# Running Tests Manually

Tests are currently **disabled in CI/deploy** to avoid slowing down development and deployments.
You can still run them locally when you want.

## Quick Start

Run all tests (recommended once per working day):
```bash
npm run test:all
```

This takes approximately **40-45 seconds** and runs:
- Unit tests (~1 second)
- E2E tests (~40 seconds)

## Test Commands

### Local Development

```bash
# Run all tests
npm run test:all

# Unit tests only (fast - ~1 second)
npm run test

# E2E tests only (~40 seconds)
npm run test:e2e

# E2E tests with UI (interactive)
npm run test:e2e:ui

# E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

### Production Build Tests

To test against production build:
```bash
# Build first
npm run build

# Run E2E tests against production
NODE_OPTIONS="--loader tsx/esm" npx playwright test --config=playwright.config.prod.cjs --project=chromium
```

### GitHub Actions (Remote)

The `Run Tests` workflow is temporarily a **no-op** (tests disabled).
Re-enable later by restoring the jobs in `.github/workflows/test.yml`.

## When to Run Tests

**Recommended schedule:**
- ✅ Once per working day (end of day check)
- ✅ Before major releases
- ✅ After significant refactoring
- ✅ When you suspect something might be broken

**You don't need to run tests:**
- ❌ On every commit
- ❌ On every small change
- ❌ During active development (unless debugging)

## Test Timing

See `TEST_TIMING.md` for detailed timing information:
- Dev build: ~40.8 seconds
- Prod build: ~44.4 seconds (includes 2.8s build time)

## Troubleshooting

If tests fail:
1. Check the error output
2. Run with `--headed` flag to see what's happening: `npm run test:e2e:headed`
3. Check browser console for errors
4. Review test screenshots in `test-results/` directory
