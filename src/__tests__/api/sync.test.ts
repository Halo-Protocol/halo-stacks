import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/db", () => ({
  prisma: {
    circle: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../lib/stacks", () => ({
  getCircleInfo: vi.fn(),
}));

const makeCircleInfo = (overrides: Record<string, unknown> = {}) => ({
  name: "Test",
  creator: "ST1TEST",
  contributionAmount: 100,
  totalMembers: 3,
  currentRound: 0,
  status: 0,
  createdAt: 100,
  startBlock: 200,
  roundDuration: 144,
  gracePeriod: 72,
  totalContributed: 0,
  totalPaidOut: 0,
  tokenType: 0,
  tokenContract: null,
  ...overrides,
});

describe("syncCircleFromChain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when circle has no onChainId", async () => {
    const { prisma } = await import("../../lib/db");
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      onChainId: null,
    });
    const { syncCircleFromChain } = await import("../../lib/sync");
    expect(await syncCircleFromChain("c1")).toBe(false);
  });

  it("returns false when on-chain data not found", async () => {
    const { prisma } = await import("../../lib/db");
    const { getCircleInfo } = await import("../../lib/stacks");
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      onChainId: 1,
    });
    (getCircleInfo as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { syncCircleFromChain } = await import("../../lib/sync");
    expect(await syncCircleFromChain("c1")).toBe(false);
  });

  it("updates DB with on-chain status and round", async () => {
    const { prisma } = await import("../../lib/db");
    const { getCircleInfo } = await import("../../lib/stacks");
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      onChainId: 1,
      status: "forming",
      startedAt: null,
      completedAt: null,
    });
    (getCircleInfo as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeCircleInfo({ currentRound: 2, status: 1 }),
    );
    const { syncCircleFromChain } = await import("../../lib/sync");
    expect(await syncCircleFromChain("c1")).toBe(true);
    expect(prisma.circle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onChainRound: 2,
          onChainStatus: 1,
          status: "active",
        }),
      }),
    );
  });

  it("sets startedAt when circle becomes active", async () => {
    const { prisma } = await import("../../lib/db");
    const { getCircleInfo } = await import("../../lib/stacks");
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      onChainId: 1,
      status: "forming",
      startedAt: null,
      completedAt: null,
    });
    (getCircleInfo as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeCircleInfo({ status: 1 }),
    );
    const { syncCircleFromChain } = await import("../../lib/sync");
    await syncCircleFromChain("c1");
    expect(prisma.circle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("sets completedAt when circle completes", async () => {
    const { prisma } = await import("../../lib/db");
    const { getCircleInfo } = await import("../../lib/stacks");
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      onChainId: 1,
      status: "active",
      startedAt: new Date(),
      completedAt: null,
    });
    (getCircleInfo as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeCircleInfo({ currentRound: 3, status: 3, totalContributed: 900, totalPaidOut: 900 }),
    );
    const { syncCircleFromChain } = await import("../../lib/sync");
    await syncCircleFromChain("c1");
    expect(prisma.circle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "completed",
          completedAt: expect.any(Date),
        }),
      }),
    );
  });
});

describe("syncAllActiveCircles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs all circles with onChainId", async () => {
    const { prisma } = await import("../../lib/db");
    const { getCircleInfo } = await import("../../lib/stacks");
    (prisma.circle.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "c1", onChainId: 1, status: "active", startedAt: new Date(), completedAt: null },
      { id: "c2", onChainId: 2, status: "forming", startedAt: null, completedAt: null },
    ]);
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "c1", onChainId: 1, status: "active", startedAt: new Date(), completedAt: null })
      .mockResolvedValueOnce({ id: "c2", onChainId: 2, status: "forming", startedAt: null, completedAt: null });
    (getCircleInfo as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeCircleInfo({ currentRound: 1, status: 1 }))
      .mockResolvedValueOnce(makeCircleInfo({ status: 0 }));

    const { syncAllActiveCircles } = await import("../../lib/sync");
    const result = await syncAllActiveCircles();
    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("counts failures when getCircleInfo returns null", async () => {
    const { prisma } = await import("../../lib/db");
    const { getCircleInfo } = await import("../../lib/stacks");
    (prisma.circle.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "c1", onChainId: 1, status: "active", startedAt: null, completedAt: null },
    ]);
    (prisma.circle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      onChainId: 1,
      status: "active",
      startedAt: null,
      completedAt: null,
    });
    (getCircleInfo as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { syncAllActiveCircles } = await import("../../lib/sync");
    const result = await syncAllActiveCircles();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
  });
});
