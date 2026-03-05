import { describe, it, expect, vi } from "vitest";

// Mock prisma before importing the route
vi.mock("../../lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    circleV2: {
      groupBy: vi.fn().mockResolvedValue([
        { status: "active", _count: 2 },
        { status: "completed", _count: 5 },
      ]),
    },
  },
}));

// Mock yield-rates
vi.mock("../../lib/yield-rates", () => ({
  checkVaultPaused: vi.fn().mockResolvedValue(false),
}));

// Mock fetch for Stacks API and deployer balance checks
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ balance: "25000000" }),
});
vi.stubGlobal("fetch", mockFetch);

describe("Health endpoint", () => {
  it("returns status ok with version", async () => {
    const { GET } = await import("../../app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.version).toBe("3.0.0");
  });

  it("includes timestamp in ISO format", async () => {
    const { GET } = await import("../../app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("includes all health checks", async () => {
    const { GET } = await import("../../app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBe("ok");
    expect(body.checks.stacksApi).toBe("ok");
    expect(body.checks.vaultPaused).toBe(false);
    expect(body.checks.deployerBalance).toBeDefined();
  });

  it("sets Cache-Control to no-store", async () => {
    const { GET } = await import("../../app/api/health/route");
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("reports degraded status when database fails", async () => {
    const { prisma } = await import("../../lib/db");
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Connection refused"),
    );

    const { GET } = await import("../../app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("degraded");
    expect(body.checks.database).toBe("error");
  });
});
