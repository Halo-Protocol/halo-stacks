import { test, expect } from "@playwright/test";

test.describe("Faucet API", () => {
  test("faucet POST without auth returns 401", async ({ request }) => {
    const response = await request.post("/api/faucet");
    expect(response.status()).toBe(401);
  });

  test("faucet GET returns 405 (method not allowed)", async ({ request }) => {
    const response = await request.get("/api/faucet");
    expect(response.status()).toBe(405);
  });
});
