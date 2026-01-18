# Test Execution Timing

This document shows how long it takes to run all tests against both development and production builds.

## Test Suite Overview

- **Unit Tests**: 13 tests (Vitest)
- **E2E Tests**: 44 tests total (22 player tests × 2 runs, plus other tests)
- **Browser**: Chromium (single browser for timing tests)

## Development Build

Running tests against the dev server (`npm run dev`):

| Test Type | Duration | Notes |
|-----------|----------|-------|
| Unit Tests | ~1.1 seconds | Fast, no server needed |
| E2E Tests (Chromium) | ~39.7 seconds | Includes dev server startup |
| **Total** | **~40.8 seconds** | Complete test suite |

### Dev Build Details
- Dev server starts automatically via Playwright's `webServer` config
- No build step required
- Hot reload enabled (not used in tests)

## Production Build

Running tests against the production build (`npm run build && npm run server`):

| Step | Duration | Notes |
|------|----------|-------|
| Build | ~2.8 seconds | TypeScript compilation + Vite build |
| Unit Tests | ~1.2 seconds | Same as dev (no difference) |
| E2E Tests (Chromium) | ~40.4 seconds | Includes prod server startup |
| **Total** | **~44.4 seconds** | Complete test suite with build |

### Production Build Details
- Build step: TypeScript compilation + Vite bundling
- Production server runs on port 3001
- Optimized/minified assets
- Slightly slower server startup due to build process

## Comparison

| Metric | Dev Build | Prod Build | Difference |
|--------|-----------|------------|------------|
| Unit Tests | 1.1s | 1.2s | +0.1s (negligible) |
| E2E Tests | 39.7s | 40.4s | +0.7s (negligible) |
| Build Time | 0s | 2.8s | +2.8s |
| **Total** | **40.8s** | **44.4s** | **+3.6s** |

## Running Tests

### Development Build
```bash
# Unit tests only
npm run test

# E2E tests only (dev server)
npm run test:e2e -- --project=chromium

# All tests
npm run test:all
```

### Production Build
```bash
# Build first
npm run build

# Run tests against production
NODE_OPTIONS="--loader tsx/esm" npx playwright test --config=playwright.config.prod.cjs --project=chromium
```

## Notes

- Times are approximate and may vary based on:
  - System performance
  - Network conditions (for API mocks)
  - First run vs cached runs
  - Number of parallel workers

- E2E test times include:
  - Server startup time (~2-3 seconds)
  - Browser launch time (~1-2 seconds)
  - Test execution time (~35-36 seconds)

- Unit tests are very fast and don't require a server, so they're the same for both builds.

- For CI/CD, production build tests are recommended to catch production-specific issues.

## CI/CD Considerations

In CI environments:
- Tests typically run in parallel across multiple workers
- Build cache can speed up subsequent runs
- Network latency may affect API mock responses
- Expect 10-20% slower times in CI due to virtualization overhead
