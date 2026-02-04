import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNextNonce, resetNonce } from "../../lib/nonce-manager";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Nonce manager", () => {
  beforeEach(() => {
    resetNonce();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nonce: 5 }),
    });
  });

  it("fetches initial nonce from chain", async () => {
    const nonce = await getNextNonce("ST1TEST");
    expect(nonce).toBe(5n);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v2/accounts/ST1TEST?proof=0"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("increments nonce for sequential calls without re-fetching", async () => {
    const n1 = await getNextNonce("ST1TEST");
    const n2 = await getNextNonce("ST1TEST");
    const n3 = await getNextNonce("ST1TEST");
    expect(n1).toBe(5n);
    expect(n2).toBe(6n);
    expect(n3).toBe(7n);
    // Only one fetch call (for the initial nonce)
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("resets nonce state on resetNonce()", async () => {
    await getNextNonce("ST1TEST");
    resetNonce();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nonce: 10 }),
    });
    const nonce = await getNextNonce("ST1TEST");
    expect(nonce).toBe(10n);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(getNextNonce("ST1TEST")).rejects.toThrow(
      "Failed to fetch nonce",
    );
  });
});
