import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../lib/db", () => ({
  prisma: {
    circle: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../lib/middleware", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("../../lib/stacks", () => ({
  getCircleInfo: vi.fn(),
}));

const makeCircleInfo = (overrides: Record<string, unknown> = {}) => ({
  name: "Test",
  creator: "ST1TEST",
  contributionAmount: 100,
  totalMembers: 3,
  currentRound: 2,
  status: 1,
  createdAt: 100,
  startBlock: 200,
  roundDuration: 144,
  gracePeriod: 72,
  totalContributed: 300,
  totalPaidOut: 100,
  tokenType: 0,
  tokenContract: null,
  ...overrides,
});

describe("Circle on-chain endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { requireAuth } = await import("../../lib/middleware");
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { GET } = await import(
      "../../app/api/circles/[id]/on-chain/route"
    );
    const request = new Request("http://localhost/api/circles/c1/on-chain");
    const response = await GET(request as never, {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 when circle not found", async () => {
    const { requireAuth } = await import("../../lib/middleware");
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });

    const { prisma } = await import("../../lib/db");
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );

    const { GET } = await import(
      "../../app/api/circles/[id]/on-chain/route"
    );
    const request = new Request("http://localhost/api/circles/c1/on-chain");
    const response = await GET(request as never, {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("not found");
  });

  it("returns 404 when circle has no onChainId", async () => {
    const { requireAuth } = await import("../../lib/middleware");
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });

    const { prisma } = await import("../../lib/db");
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      onChainId: null,
    });

    const { GET } = await import(
      "../../app/api/circles/[id]/on-chain/route"
    );
    const request = new Request("http://localhost/api/circles/c1/on-chain");
    const response = await GET(request as never, {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns on-chain data and caches to DB", async () => {
    const { requireAuth } = await import("../../lib/middleware");
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });

    const { prisma } = await import("../../lib/db");
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      onChainId: 1,
    });

    const { getCircleInfo } = await import("../../lib/stacks");
    (getCircleInfo as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeCircleInfo(),
    );

    const { GET } = await import(
      "../../app/api/circles/[id]/on-chain/route"
    );
    const request = new Request("http://localhost/api/circles/c1/on-chain");
    const response = await GET(request as never, {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.currentRound).toBe(2);
    expect(body.status).toBe(1);
    expect(body.totalContributed).toBe(300);

    expect(prisma.circle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onChainRound: 2,
          onChainStatus: 1,
          lastSyncedAt: expect.any(Date),
        }),
      }),
    );
  });
});
