/**
 * In-memory sliding-window rate limiter for server actions.
 * For production multi-instance deployments, replace with a Redis-based limiter (e.g. @upstash/ratelimit).
 */

type WindowEntry = { count: number; windowStart: number };

const store = new Map<string, WindowEntry>();

/** Sliding window: windowSizeMs in ms, max count per key in that window */
function check(
  key: string,
  windowSizeMs: number,
  maxCount: number
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  let entry = store.get(key);

  // Slide window: if the last window has expired, start fresh
  if (!entry || now - entry.windowStart >= windowSizeMs) {
    entry = { count: 1, windowStart: now };
    store.set(key, entry);
    return { allowed: true };
  }

  if (entry.count >= maxCount) {
    const retryAfterMs = Math.ceil(windowSizeMs - (now - entry.windowStart));
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  entry.count += 1;
  return { allowed: true };
}

/** Prune old keys periodically to avoid unbounded memory growth */
const PRUNE_INTERVAL_MS = 60_000;
let lastPrune = Date.now();

function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  const cutoff = now - 3600_000; // 1 hour
  for (const [k, v] of store.entries()) {
    if (v.windowStart < cutoff) store.delete(k);
  }
}

/** Place order: max 5 per identifier per hour */
const PLACE_ORDER_WINDOW_MS = 60 * 60 * 1000;
const PLACE_ORDER_MAX = 5;

export function checkPlaceOrderLimit(identifier: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
  maybePrune();
  return check(`placeOrder:${identifier}`, PLACE_ORDER_WINDOW_MS, PLACE_ORDER_MAX);
}

/** Validate promo code: max 10 per IP per minute */
const VALIDATE_PROMO_WINDOW_MS = 60 * 1000;
const VALIDATE_PROMO_MAX = 10;

export function checkValidatePromoLimit(ip: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
  maybePrune();
  return check(`validatePromo:${ip}`, VALIDATE_PROMO_WINDOW_MS, VALIDATE_PROMO_MAX);
}

/** Toggle wishlist: max 30 per user per minute */
const TOGGLE_WISHLIST_WINDOW_MS = 60 * 1000;
const TOGGLE_WISHLIST_MAX = 30;

export function checkToggleWishlistLimit(userId: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
  maybePrune();
  return check(`toggleWishlist:${userId}`, TOGGLE_WISHLIST_WINDOW_MS, TOGGLE_WISHLIST_MAX);
}
