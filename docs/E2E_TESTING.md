# E2E Testing

End-to-end tests using Playwright with Chromium.

## Setup

```bash
# Install Playwright and Chromium
npm run playwright:install

# Install system dependencies (Ubuntu/Debian)
npx playwright install-deps chromium
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run a specific spec file
npx playwright test e2e/landing.spec.ts

# Run with UI (headed mode)
npx playwright test --headed

# Run with debug
npx playwright test --debug
```

## Test Structure

```
e2e/
  helpers/
    auth.ts           # Mock session injection utilities
  landing.spec.ts     # Landing page (5 tests)
  auth-flow.spec.ts   # Auth redirects and sign-in page (6 tests)
  api-integration.spec.ts  # API endpoint integration (8 tests)
```

## Auth Mocking

Browser tests use `injectMockSession()` to set a `next-auth.session-token` cookie. This bypasses the middleware auth guard (which checks for cookie presence) without needing real OAuth credentials.

```typescript
import { injectMockSession, clearSession } from "./helpers/auth";

test("authenticated user sees dashboard", async ({ page }) => {
  await injectMockSession(page);
  await page.goto("/dashboard");
  // page loads without redirect to /signin
});
```

## Adding New Tests

1. Create a new `.spec.ts` file in `e2e/`
2. Use `test.describe` for grouping and `test` for individual cases
3. Use `{ timeout: 30_000 }` on `page.goto()` for pages with heavy first-load
4. For authenticated pages, call `injectMockSession(page)` before navigation
5. For API-only tests, use `{ request }` fixture instead of `{ page }`

## Configuration

See `playwright.config.ts`:
- **Single worker**: Prevents memory issues in constrained environments
- **Chromium only**: Sufficient for CI verification
- **WebServer**: Auto-starts `npm run dev`, waits for `/api/health`
- **30s timeout**: Accounts for slow first-page compilation in dev mode
- **Sandbox flags**: `--no-sandbox`, `--disable-dev-shm-usage` for CI/codespace compatibility

## CI Notes

E2E tests require a running Next.js dev server and database connection. They are not included in the default CI pipeline but can be run locally or in environments with database access.
