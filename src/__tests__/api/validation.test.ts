import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test the Zod validation schemas used in API routes

const createCircleSchema = z.object({
  name: z.string().min(3).max(30),
  contributionAmount: z.number().int().positive(),
  totalMembers: z.number().int().min(3).max(10),
  roundDurationDays: z.number().int().refine((v) => [7, 14, 30].includes(v), {
    message: "Round duration must be 7, 14, or 30 days",
  }),
  gracePeriodDays: z.number().int().min(1).max(7).default(1),
  tokenType: z.number().int().min(0).max(1).default(0),
  tokenContract: z.string().optional(),
});

const contributeSchema = z.object({
  txId: z.string().min(1, "Transaction ID is required"),
  round: z.number().int().min(0),
  amount: z.number().int().positive(),
  onTime: z.boolean().default(true),
});

const bindWalletSchema = z.object({
  walletAddress: z.string().min(1),
});

const confirmBindingSchema = z.object({
  txId: z.string().min(1, "Transaction ID is required"),
  walletAddress: z.string().min(1, "Wallet address is required"),
});

describe("API validation schemas", () => {
  describe("createCircleSchema", () => {
    it("accepts valid circle creation params", () => {
      const result = createCircleSchema.safeParse({
        name: "Office Fund",
        contributionAmount: 100000000,
        totalMembers: 5,
        roundDurationDays: 30,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gracePeriodDays).toBe(1);
        expect(result.data.tokenType).toBe(0);
      }
    });

    it("rejects name too short", () => {
      const result = createCircleSchema.safeParse({
        name: "AB",
        contributionAmount: 100,
        totalMembers: 5,
        roundDurationDays: 30,
      });
      expect(result.success).toBe(false);
    });

    it("rejects name too long", () => {
      const result = createCircleSchema.safeParse({
        name: "A".repeat(31),
        contributionAmount: 100,
        totalMembers: 5,
        roundDurationDays: 30,
      });
      expect(result.success).toBe(false);
    });

    it("rejects members below 3", () => {
      const result = createCircleSchema.safeParse({
        name: "Valid Name",
        contributionAmount: 100,
        totalMembers: 2,
        roundDurationDays: 30,
      });
      expect(result.success).toBe(false);
    });

    it("rejects members above 10", () => {
      const result = createCircleSchema.safeParse({
        name: "Valid Name",
        contributionAmount: 100,
        totalMembers: 11,
        roundDurationDays: 30,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid round duration", () => {
      const result = createCircleSchema.safeParse({
        name: "Valid Name",
        contributionAmount: 100,
        totalMembers: 5,
        roundDurationDays: 10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero contribution amount", () => {
      const result = createCircleSchema.safeParse({
        name: "Valid Name",
        contributionAmount: 0,
        totalMembers: 5,
        roundDurationDays: 30,
      });
      expect(result.success).toBe(false);
    });

    it("accepts SIP-010 circle with tokenContract", () => {
      const result = createCircleSchema.safeParse({
        name: "hUSD Circle",
        contributionAmount: 50000000,
        totalMembers: 3,
        roundDurationDays: 14,
        tokenType: 1,
        tokenContract: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.halo-mock-token",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokenType).toBe(1);
      }
    });

    it("accepts all valid round durations", () => {
      for (const days of [7, 14, 30]) {
        const result = createCircleSchema.safeParse({
          name: "Valid Name",
          contributionAmount: 100,
          totalMembers: 5,
          roundDurationDays: days,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("contributeSchema", () => {
    it("accepts valid contribution", () => {
      const result = contributeSchema.safeParse({
        txId: "0xabc123",
        round: 0,
        amount: 100000000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.onTime).toBe(true); // default
      }
    });

    it("rejects empty txId", () => {
      const result = contributeSchema.safeParse({
        txId: "",
        round: 0,
        amount: 100,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative round", () => {
      const result = contributeSchema.safeParse({
        txId: "0xabc",
        round: -1,
        amount: 100,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero amount", () => {
      const result = contributeSchema.safeParse({
        txId: "0xabc",
        round: 0,
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("accepts explicit onTime false", () => {
      const result = contributeSchema.safeParse({
        txId: "0xabc",
        round: 2,
        amount: 100,
        onTime: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.onTime).toBe(false);
      }
    });
  });

  describe("bindWalletSchema", () => {
    it("accepts valid wallet address", () => {
      const result = bindWalletSchema.safeParse({
        walletAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty wallet address", () => {
      const result = bindWalletSchema.safeParse({
        walletAddress: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing wallet address", () => {
      const result = bindWalletSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("confirmBindingSchema", () => {
    it("accepts valid binding confirmation", () => {
      const result = confirmBindingSchema.safeParse({
        txId: "0xabc123def456",
        walletAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing txId", () => {
      const result = confirmBindingSchema.safeParse({
        walletAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing walletAddress", () => {
      const result = confirmBindingSchema.safeParse({
        txId: "0xabc123",
      });
      expect(result.success).toBe(false);
    });
  });
});
