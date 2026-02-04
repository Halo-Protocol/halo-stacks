import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../lib/db", () => ({
  prisma: {
    faucetRequest: {
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: "req-1" }),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../lib/middleware", () => ({
  requireWallet: vi.fn(),
}));

vi.mock("../../lib/nonce-manager", () => ({
  getNextNonce: vi.fn().mockResolvedValue(0n),
  resetNonce: vi.fn(),
}));

vi.mock("@stacks/transactions", () => ({
  makeContractCall: vi.fn().mockResolvedValue({}),
  broadcastTransaction: vi
    .fn()
    .mockResolvedValue({ txid: "0x" + "a".repeat(64) }),
  PostConditionMode: { Allow: 2 },
  uintCV: vi.fn(),
  standardPrincipalCV: vi.fn(),
}));

vi.mock("@stacks/network", () => ({
  networkFromName: vi.fn().mockReturnValue("testnet"),
}));

const activeUser = {
  id: "u1",
  email: "test@test.com",
  name: "Test",
  uniqueId: "0xabc",
  walletAddress: "ST1WALLET",
  status: "active",
};

describe("Faucet endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEPLOYER_PRIVATE_KEY = "test-key";
    process.env.DEPLOYER_ADDRESS = "ST1TEST";
  });

  it("returns 401 when not authenticated", async () => {
    const { requireWallet } = await import("../../lib/middleware");
    (requireWallet as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { POST } = await import("../../app/api/faucet/route");
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("returns 503 when DEPLOYER_PRIVATE_KEY not set", async () => {
    delete process.env.DEPLOYER_PRIVATE_KEY;
    const { requireWallet } = await import("../../lib/middleware");
    (requireWallet as ReturnType<typeof vi.fn>).mockResolvedValue(activeUser);

    const { POST } = await import("../../app/api/faucet/route");
    const response = await POST();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toContain("not configured");
  });

  it("returns 429 when rate limited (request within 24h)", async () => {
    const { requireWallet } = await import("../../lib/middleware");
    (requireWallet as ReturnType<typeof vi.fn>).mockResolvedValue(activeUser);

    const { prisma } = await import("../../lib/db");
    (prisma.faucetRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      requestedAt: new Date(),
    });

    const { POST } = await import("../../app/api/faucet/route");
    const response = await POST();
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toContain("rate limit");
  });

  it("returns 200 with tx IDs on success", async () => {
    const { requireWallet } = await import("../../lib/middleware");
    (requireWallet as ReturnType<typeof vi.fn>).mockResolvedValue(activeUser);

    const { prisma } = await import("../../lib/db");
    (prisma.faucetRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import("../../app/api/faucet/route");
    const response = await POST();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.hUsdTxId).toBeDefined();
    expect(body.sbtcTxId).toBeDefined();
    expect(body.message).toContain("confirmation");
  });

  it("persists faucet request to database", async () => {
    const { requireWallet } = await import("../../lib/middleware");
    (requireWallet as ReturnType<typeof vi.fn>).mockResolvedValue(activeUser);

    const { prisma } = await import("../../lib/db");
    (prisma.faucetRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import("../../app/api/faucet/route");
    await POST();

    expect(prisma.faucetRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          walletAddress: "ST1WALLET",
          status: "pending",
        }),
      }),
    );
    expect(prisma.faucetRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "success",
        }),
      }),
    );
  });
});
