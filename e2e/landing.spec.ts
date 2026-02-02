import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { timeout: 30_000 });
  });

  test("renders the hero headline", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Build Credit Through",
    );
  });

  test("shows 'Built on Stacks' badge", async ({ page }) => {
    await expect(page.getByText("Built on Stacks")).toBeVisible();
  });

  test("has Get Started link in hero pointing to /signin", async ({ page }) => {
    const link = page.getByRole("link", { name: "Get Started" }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/signin");
  });

  test("has Learn More link", async ({ page }) => {
    const link = page.getByRole("link", { name: "Learn More" });
    await expect(link).toBeVisible();
  });

  test("navigates to signin when Get Started is clicked", async ({ page }) => {
    await page.getByRole("link", { name: "Get Started" }).first().click();
    await expect(page).toHaveURL(/\/signin/);
  });
});
