import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};

export const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
};

export const AUTH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 20,
};

// ============================================
// Redis-backed rate limiting (production)
// ============================================

const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

let redisLimiters: Map<string, Ratelimit> | null = null;

function getRedisLimiter(config: RateLimitConfig): Ratelimit {
  if (!redisLimiters) redisLimiters = new Map();
  const configKey = `${config.maxRequests}:${config.windowMs}`;
  let limiter = redisLimiters.get(configKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
      prefix: "halo-rl",
    });
    redisLimiters.set(configKey, limiter);
  }
  return limiter;
}

// ============================================
// In-memory fallback (dev/test)
// ============================================

const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

// ============================================
// Unified interface
// ============================================

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): { allowed: boolean; remaining: number; resetAt: number } {
  // Redis rate limiting is async — for the sync interface, fall back to memory
  // The async version is used by applyRateLimit in api-helpers.ts
  return checkMemoryRateLimit(key, config);
}

/**
 * Async rate limit check. Uses Redis if available, memory fallback otherwise.
 */
export async function checkRateLimitAsync(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (USE_REDIS) {
    try {
      const limiter = getRedisLimiter(config);
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch {
      // Fallback to memory on Redis error
      return checkMemoryRateLimit(key, config);
    }
  }
  return checkMemoryRateLimit(key, config);
}

/** Reset the store (for testing) */
export function resetRateLimitStore() {
  store.clear();
  lastCleanup = Date.now();
}
