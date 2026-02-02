import type { Page } from "@playwright/test";

/**
 * Injects a mock NextAuth session cookie into the browser context.
 * This bypasses OAuth for E2E tests by setting the session-token cookie
 * that the middleware checks.
 *
 * Note: This only bypasses the middleware auth guard (cookie presence check).
 * API routes that call requireWallet() will still need a real session
 * unless the API is also mocked.
 */
export async function injectMockSession(page: Page) {
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: "e2e-test-session-token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    },
  ]);
}

/**
 * Clears all cookies from the browser context (simulates logged-out state).
 */
export async function clearSession(page: Page) {
  await page.context().clearCookies();
}
