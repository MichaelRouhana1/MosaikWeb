import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Place order: max 5 per identifier per hour
const placeOrderLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "@upstash/ratelimit:placeOrder",
});

export async function checkPlaceOrderLimit(identifier: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  try {
    const { success, reset } = await placeOrderLimit.limit(identifier);
    return { allowed: success, retryAfterMs: Math.max(0, reset - Date.now()) };
  } catch (err) {
    console.error("Rate limit error:", err);
    return { allowed: true, retryAfterMs: 0 };
  }
}

// Validate promo code: max 10 per IP per 10 seconds
const validatePromoLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  prefix: "@upstash/ratelimit:validatePromo",
});

export async function checkValidatePromoLimit(ip: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  try {
    const { success, reset } = await validatePromoLimit.limit(ip);
    return { allowed: success, retryAfterMs: Math.max(0, reset - Date.now()) };
  } catch (err) {
    console.error("Rate limit error:", err);
    return { allowed: true, retryAfterMs: 0 };
  }
}

// Toggle wishlist: max 30 per user per minute
const toggleWishlistLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "@upstash/ratelimit:toggleWishlist",
});

export async function checkToggleWishlistLimit(userId: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  try {
    const { success, reset } = await toggleWishlistLimit.limit(userId);
    return { allowed: success, retryAfterMs: Math.max(0, reset - Date.now()) };
  } catch (err) {
    console.error("Rate limit error:", err);
    return { allowed: true, retryAfterMs: 0 };
  }
}

// Admin / Sensitive operations (10 requests per 10 seconds)
const sensitiveOperationLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  prefix: "@upstash/ratelimit:sensitive",
});

export async function checkSensitiveOperationLimit(identifier: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  try {
    const { success, reset } = await sensitiveOperationLimit.limit(identifier);
    return { allowed: success, retryAfterMs: Math.max(0, reset - Date.now()) };
  } catch (err) {
    console.error("Rate limit error:", err);
    return { allowed: true, retryAfterMs: 0 };
  }
}
