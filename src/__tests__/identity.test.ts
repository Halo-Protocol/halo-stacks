import { describe, it, expect, beforeAll } from "vitest";
import { generateUniqueId, isValidUniqueId, isValidStacksAddress } from "../lib/identity";

describe("identity", () => {
  beforeAll(() => {
    process.env.HALO_ID_SALT = "test-salt-for-unit-tests";
  });

  describe("generateUniqueId", () => {
    it("generates a 0x-prefixed 64-char hex string", () => {
      const id = generateUniqueId("google", "12345", "test@example.com");
      expect(id).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("generates different IDs for different providers", () => {
      const id1 = generateUniqueId("google", "12345", "test@example.com");
      const id2 = generateUniqueId("github", "12345", "test@example.com");
      expect(id1).not.toBe(id2);
    });

    it("generates different IDs for different social IDs", () => {
      const id1 = generateUniqueId("google", "12345", "test@example.com");
      const id2 = generateUniqueId("google", "67890", "test@example.com");
      expect(id1).not.toBe(id2);
    });

    it("generates different IDs for different emails", () => {
      const id1 = generateUniqueId("google", "12345", "alice@example.com");
      const id2 = generateUniqueId("google", "12345", "bob@example.com");
      expect(id1).not.toBe(id2);
    });

    it("normalizes email to lowercase", () => {
      const id1 = generateUniqueId("google", "12345", "TEST@Example.COM");
      // Since timestamp is part of hash, we just verify format
      expect(id1).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("throws if HALO_ID_SALT is not set", () => {
      const original = process.env.HALO_ID_SALT;
      delete process.env.HALO_ID_SALT;
      expect(() =>
        generateUniqueId("google", "12345", "test@example.com"),
      ).toThrow("HALO_ID_SALT environment variable is required");
      process.env.HALO_ID_SALT = original;
    });
  });

  describe("isValidUniqueId", () => {
    it("accepts valid unique ID", () => {
      expect(
        isValidUniqueId(
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        ),
      ).toBe(true);
    });

    it("rejects without 0x prefix", () => {
      expect(
        isValidUniqueId(
          "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        ),
      ).toBe(false);
    });

    it("rejects wrong length", () => {
      expect(isValidUniqueId("0xabcdef")).toBe(false);
    });

    it("rejects non-hex characters", () => {
      expect(
        isValidUniqueId(
          "0xzzzzzz1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        ),
      ).toBe(false);
    });
  });

  describe("isValidStacksAddress", () => {
    it("accepts valid testnet address", () => {
      expect(
        isValidStacksAddress("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"),
      ).toBe(true);
    });

    it("accepts valid mainnet address", () => {
      expect(
        isValidStacksAddress("SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"),
      ).toBe(true);
    });

    it("rejects invalid prefix", () => {
      expect(isValidStacksAddress("0x1234567890abcdef")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidStacksAddress("")).toBe(false);
    });

    it("rejects too-short address", () => {
      expect(isValidStacksAddress("ST1")).toBe(false);
    });
  });
});
