import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchApi } from "../../hooks/use-api";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("fetchApi", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("makes a request with credentials included", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    await fetchApi("/api/test");

    expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      credentials: "include",
    }));
  });

  it("sets Content-Type header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await fetchApi("/api/test");

    expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      headers: expect.objectContaining({
        "Content-Type": "application/json",
      }),
    }));
  });

  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ score: 750 }),
    });

    const result = await fetchApi<{ score: number }>("/api/credit/score");
    expect(result).toEqual({ score: 750 });
  });

  it("throws error with message from response body", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Invalid input" }),
    });

    await expect(fetchApi("/api/test")).rejects.toThrow("Invalid input");
  });

  it("throws fallback error when body has no error field", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(fetchApi("/api/test")).rejects.toThrow("HTTP 500");
  });

  it("throws fallback error when body is not JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(fetchApi("/api/test")).rejects.toThrow("Request failed");
  });

  it("passes custom options through", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await fetchApi("/api/test", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    }));
  });

  it("passes custom headers via options spread", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await fetchApi("/api/test", {
      headers: { "X-Custom": "value" },
    });

    // options spread overrides the headers key entirely
    expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      headers: { "X-Custom": "value" },
    }));
  });
});
