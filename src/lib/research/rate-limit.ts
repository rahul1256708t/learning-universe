/**
 * Lightweight in-memory rate limiter (per user, sliding window).
 *
 * This guards the expensive /api/agent route against accidental loops or abuse.
 * It lives in the server process memory — good enough for a single Vercel
 * instance and free of extra infrastructure. For multi-region scale, swap the
 * Map for Upstash Redis (same interface).
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * @param key      Usually the user id.
 * @param limit    Max requests allowed within the window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit = 12, windowMs = 60_000): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count += 1
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 }
}

// Opportunistically prune expired buckets so the Map doesn't grow forever.
let lastSweep = Date.now()
export function sweepRateLimiter() {
  const now = Date.now()
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}
