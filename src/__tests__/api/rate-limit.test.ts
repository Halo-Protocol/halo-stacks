import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  resetRateLimitStore,
  DEFAULT_RATE_LIMIT,
  STRICT_RATE_LIMIT,
  AUTH_RATE_LIMIT,
} from "../../lib/rate-limit";

describe("Rate limiter", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests within the limit", () => {
    const result = checkRateLimit("test-key", { windowMs: 60_000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks remaining count correctly", () => {
    const config = { windowMs: 60_000, maxRequests: 3 };
    expect(checkRateLimit("key1", config).remaining).toBe(2);
    expect(checkRateLimit("key1", config).remaining).toBe(1);
    expect(checkRateLimit("key1", config).remaining).toBe(0);
  });

  it("denies requests exceeding the limit", () => {
    const config = { windowMs: 60_000, maxRequests: 2 };
    checkRateLimit("key2", config);
    checkRateLimit("key2", config);
    const result = checkRateLimit("key2", config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("uses independent counters per key", () => {
    const config = { windowMs: 60_000, maxRequests: 1 };
    expect(checkRateLimit("a", config).allowed).toBe(true);
    expect(checkRateLimit("b", config).allowed).toBe(true);
    // a is now exhausted, b is also exhausted
    expect(checkRateLimit("a", config).allowed).toBe(false);
    expect(checkRateLimit("b", config).allowed).toBe(false);
  });

  it("resets after window expires", () => {
    const config = { windowMs: 100, maxRequests: 1 };
    checkRateLimit("expire-key", config);
    expect(checkRateLimit("expire-key", config).allowed).toBe(false);

    // Simulate time passing beyond the window
    vi.useFakeTimers();
    vi.advanceTimersByTime(150);
    const result = checkRateLimit("expire-key", config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    vi.useRealTimers();
  });

  it("returns resetAt timestamp in the future", () => {
    const now = Date.now();
    const result = checkRateLimit("ts-key", { windowMs: 60_000, maxRequests: 10 });
    expect(result.resetAt).toBeGreaterThan(now);
    expect(result.resetAt).toBeLessThanOrEqual(now + 60_000 + 100);
  });

  describe("tier configs", () => {
    it("DEFAULT_RATE_LIMIT allows 60 requests per minute", () => {
      expect(DEFAULT_RATE_LIMIT.maxRequests).toBe(60);
      expect(DEFAULT_RATE_LIMIT.windowMs).toBe(60_000);
    });

    it("STRICT_RATE_LIMIT allows 10 requests per minute", () => {
      expect(STRICT_RATE_LIMIT.maxRequests).toBe(10);
      expect(STRICT_RATE_LIMIT.windowMs).toBe(60_000);
    });

    it("AUTH_RATE_LIMIT allows 20 requests per minute", () => {
      expect(AUTH_RATE_LIMIT.maxRequests).toBe(20);
      expect(AUTH_RATE_LIMIT.windowMs).toBe(60_000);
    });
  });

  it("uses DEFAULT_RATE_LIMIT when no config provided", () => {
    // Make 60 requests — all should succeed
    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit("default-key").allowed).toBe(true);
    }
    // 61st should fail
    expect(checkRateLimit("default-key").allowed).toBe(false);
  });
});
