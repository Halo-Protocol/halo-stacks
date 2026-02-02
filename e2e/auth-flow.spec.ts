import { test, expect } from "@playwright/test";
import { injectMockSession, clearSession } from "./helpers/auth";

test.describe("Authentication flow", () => {
  test("unauthenticated user is redirected from /dashboard to /signin", async ({
    page,
  }) => {
    await clearSession(page);
    await page.goto("/dashboard", { timeout: 30_000 });
    await expect(page).toHaveURL(/\/signin/);
  });

  test("unauthenticated user is redirected from /circles/create to /signin", async ({
    page,
  }) => {
    await clearSession(page);
    await page.goto("/circles/create", { timeout: 30_000 });
    await expect(page).toHaveURL(/\/signin/);
  });

  test("unauthenticated user is redirected from /credit to /signin", async ({
    page,
  }) => {
    await clearSession(page);
    await page.goto("/credit", { timeout: 30_000 });
    await expect(page).toHaveURL(/\/signin/);
  });

  test("signin page renders OAuth buttons", async ({ page }) => {
    await page.goto("/signin", { timeout: 30_000 });
    await expect(page.getByText("Continue with Google")).toBeVisible();
    await expect(page.getByText("Continue with GitHub")).toBeVisible();
  });

  test("signin page shows Welcome to Halo title", async ({ page }) => {
    await page.goto("/signin", { timeout: 30_000 });
    await expect(page.getByText("Welcome to Halo")).toBeVisible();
  });

  test("authenticated user can access /dashboard without redirect to signin", async ({
    page,
  }) => {
    await injectMockSession(page);
    await page.goto("/dashboard", { timeout: 30_000 });
    // With a mock cookie, middleware won't redirect to /signin
    expect(page.url()).not.toContain("/signin");
  });
});
