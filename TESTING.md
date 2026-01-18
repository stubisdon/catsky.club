# Testing Guide

This project includes automated tests to catch regressions and ensure code quality.

## Test Types

### Unit Tests (Vitest)
- **Location**: `src/**/*.test.tsx`
- **Framework**: Vitest + React Testing Library
- **Purpose**: Test individual components and functions in isolation

### E2E Tests (Playwright)
- **Location**: `e2e/**/*.spec.ts`
- **Framework**: Playwright
- **Purpose**: Test full user flows and page interactions in real browsers

## Manual Test Execution

Tests are configured to run **manually only** to avoid slowing down development. It's recommended to run tests once per working day to catch any regressions.

### Quick Test Commands

```bash
# Run all tests (unit + E2E) - takes ~40 seconds
npm run test:all

# Or run them separately:
npm run test          # Unit tests only (~1 second)
npm run test:e2e      # E2E tests only (~40 seconds)
```

## Running Tests Locally

### Unit Tests
```bash
# Run all unit tests once
npm run test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

### Run All Tests
```bash
# Run both unit and E2E tests
npm run test:all
```

## Running Tests on Production Server

After deployment, you can run the post-deployment test script:

```bash
# On production server
cd /opt/catsky-club
./test-production.sh
```

Or with custom URLs:
```bash
TEST_URL=http://localhost:3001 PROD_URL=https://catsky.club ./test-production.sh
```

## CI/CD Integration

### GitHub Actions

**Tests are now manual-only** - they no longer run automatically on push/PR to avoid slowing down development.

To run tests manually:
1. Go to the "Actions" tab in GitHub
2. Select "Run Tests" workflow
3. Click "Run workflow" button
4. Choose the branch and click "Run workflow"

**Recommended**: Run tests once per working day to ensure nothing broke.

Workflows:
- **`.github/workflows/test.yml`**: Manual trigger only (workflow_dispatch)
- **`.github/workflows/deploy.yml`**: Deployment workflow (does not run tests)

## Test Coverage

Current test coverage includes:

### Unit Tests
- ✅ App component rendering
- ✅ Navigation link clicks
- ✅ Route handling

### E2E Tests
- ✅ Home page loads correctly
- ✅ Navigation between pages
- ✅ All routes are accessible
- ✅ No JavaScript errors
- ✅ Responsive design
- ✅ Regression checks

## Adding New Tests

### Adding a Unit Test
1. Create a file: `src/ComponentName.test.tsx`
2. Import testing utilities:
   ```tsx
   import { describe, it, expect } from 'vitest'
   import { render, screen } from '@testing-library/react'
   ```
3. Write your test cases

### Adding an E2E Test
1. Create or edit a file in `e2e/` directory
2. Use Playwright's test API:
   ```ts
   import { test, expect } from '@playwright/test'
   
   test('my test', async ({ page }) => {
     await page.goto('/')
     // ... test code
   })
   ```

## Debugging Tests

### Unit Tests
- Use `console.log()` in tests
- Use `test.only()` to run a single test
- Use `test.skip()` to skip a test
- Open the UI with `npm run test:ui`

### E2E Tests
- Use `page.pause()` to pause execution
- Use `--headed` flag to see the browser
- Use `--debug` flag for Playwright inspector
- Check `playwright-report/` for detailed reports

## Best Practices

1. **Run tests before committing**: `npm run test:all`
2. **Keep tests fast**: Unit tests should be < 100ms each
3. **Test user behavior**: Focus on what users do, not implementation details
4. **Keep tests independent**: Each test should work in isolation
5. **Use descriptive test names**: "should navigate to listen page when clicking listen link"

## Troubleshooting

### Tests fail locally but pass in CI
- Make sure you're using the same Node version (20+)
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Make sure Playwright browsers are installed: `npx playwright install`

### E2E tests timeout
- Check if the dev server is running on port 3000
- Increase timeout in `playwright.config.ts`
- Check for slow network requests

### Post-deployment tests fail
- Verify the server is running: `pm2 status`
- Check server logs: `pm2 logs catsky-club`
- Verify the port matches: `TEST_URL=http://localhost:3001`
