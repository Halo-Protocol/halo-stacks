import { NextResponse, type NextRequest } from "next/server";
import {
  checkRateLimit,
  DEFAULT_RATE_LIMIT,
  STRICT_RATE_LIMIT,
} from "./rate-limit";

type RateLimitConfig = Parameters<typeof checkRateLimit>[1];

/**
 * Extract client IP from request headers for rate limiting.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check rate limit for an API request. Returns a 429 response if exceeded, or null if allowed.
 */
export function applyRateLimit(
  request: NextRequest,
  prefix: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): NextResponse | null {
  const ip = getClientIp(request);
  const key = `${prefix}:${ip}`;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  return null;
}

/**
 * Verify a transaction exists and has succeeded on-chain.
 * Returns null if verified, or an error message if not.
 */
export async function verifyTransaction(txId: string): Promise<string | null> {
  if (!/^0x[0-9a-f]{64}$/i.test(txId)) {
    return "Invalid transaction ID format";
  }

  const apiUrl = process.env.STACKS_API_URL || "https://api.hiro.so";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${apiUrl}/extended/v1/tx/${txId}`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      // Transaction may not be indexed yet — allow pending
      if (res.status === 404) return null;
      return `Failed to verify transaction: ${res.status}`;
    }

    const data = await res.json();
    if (data.tx_status === "abort_by_response" || data.tx_status === "abort_by_post_condition") {
      return `Transaction failed on-chain: ${data.tx_status}`;
    }

    // Accept success and pending (mempool) transactions
    return null;
  } catch (err) {
    // Network errors should not block the user — allow through
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export { DEFAULT_RATE_LIMIT, STRICT_RATE_LIMIT };
export { AUTH_RATE_LIMIT } from "./rate-limit";
