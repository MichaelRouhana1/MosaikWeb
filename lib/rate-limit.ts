import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedisEnv =
  typeof url === "string" &&
  url.length > 0 &&
  typeof token === "string" &&
  token.length > 0;
const redis = hasRedisEnv ? new Redis({ url: url!, token: token! }) : null;

// Common limited operations: 5 requests per 10 seconds
const defaultLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 s"),
      prefix: "@upstash/ratelimit",
    })
  : null;

export async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  if (!defaultLimiter) {
    return { allowed: true, retryAfterMs: 0 };
  }
  try {
    const { success, reset } = await defaultLimiter.limit(identifier);
    return { allowed: success, retryAfterMs: Math.max(0, reset - Date.now()) };
  } catch (err) {
    console.error("Rate limit error:", err);
    return { allowed: true, retryAfterMs: 0 };
  }
}

// Keep old exports so we don't break existing references
export async function checkPlaceOrderLimit(identifier: string) {
  return checkRateLimit(`placeOrder:${identifier}`);
}

export async function checkValidatePromoLimit(ip: string) {
  return checkRateLimit(`validatePromo:${ip}`);
}

export async function checkToggleWishlistLimit(userId: string) {
  return checkRateLimit(`toggleWishlist:${userId}`);
}

export async function checkSensitiveOperationLimit(identifier: string) {
  return checkRateLimit(`sensitive:${identifier}`);
}
