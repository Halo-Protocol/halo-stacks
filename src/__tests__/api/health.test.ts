import { describe, it, expect, vi } from "vitest";

// Mock prisma before importing the route
vi.mock("../../lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

describe("Health endpoint", () => {
  it("returns status ok with version", async () => {
    const { GET } = await import("../../app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.version).toBe("2.0.0");
  });

  it("includes timestamp in ISO format", async () => {
    const { GET } = await import("../../app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("includes database check", async () => {
    const { GET } = await import("../../app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBe("ok");
  });

  it("sets Cache-Control to no-store", async () => {
    const { GET } = await import("../../app/api/health/route");
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("reports database error when query fails", async () => {
    // Re-mock with failure
    const { prisma } = await import("../../lib/db");
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Connection refused"),
    );

    const { GET } = await import("../../app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("ok");
    expect(body.checks.database).toBe("error");
  });
});
