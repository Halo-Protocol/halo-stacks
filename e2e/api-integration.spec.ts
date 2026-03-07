import { test, expect } from "@playwright/test";

test.describe("API integration", () => {
  test("health endpoint returns 200 with status ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    // Status may be "degraded" if DB is unavailable in CI
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.version).toBe("3.0.0");
    expect(body.timestamp).toBeDefined();
    expect(body.checks).toBeDefined();
  });

  test("health endpoint has no-store cache header", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("circles GET without auth returns 401", async ({ request }) => {
    const response = await request.get("/api/circles");
    expect(response.status()).toBe(401);
  });

  test("circles POST without auth returns 401", async ({ request }) => {
    const response = await request.post("/api/circles", {
      data: { name: "Test Circle" },
    });
    expect(response.status()).toBe(401);
  });

  test("identity/me without auth returns 401", async ({ request }) => {
    const response = await request.get("/api/identity/me");
    expect(response.status()).toBe(401);
  });

  test("credit/score without auth returns 401", async ({ request }) => {
    const response = await request.get("/api/credit/score");
    expect(response.status()).toBe(401);
  });

  test("nonexistent API route returns 404 or 405", async ({ request }) => {
    const response = await request.get("/api/nonexistent-route");
    expect([404, 405]).toContain(response.status());
  });

  test("security headers are present", async ({ request }) => {
    const response = await request.get("/api/health");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});
