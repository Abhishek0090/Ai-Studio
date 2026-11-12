import "server-only";
import { FREE_TIER } from "./pricing";

/**
 * In-memory sliding window per user. Good enough for one server instance;
 * swap for Upstash Redis or similar when running several instances.
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(userId: string, limit: number = FREE_TIER.ratePerMinute, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(userId, recent);
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return { ok: false as const, retryAfter };
  }
  recent.push(now);
  hits.set(userId, recent);
  return { ok: true as const };
}
