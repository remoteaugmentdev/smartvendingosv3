// ponytail: in-memory, single server only; move to a DB/Redis table when running
// more than one instance.

const WINDOW_MS = 60_000
const buckets = new Map<string, { count: number; resetAt: number }>()

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}

/** Fixed-window limiter. Returns true when the request is allowed. */
export function rateLimit(bucket: string, ip: string, limit: number, windowMs = WINDOW_MS): boolean {
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || entry.resetAt <= now) {
    // Bound memory against many distinct IPs: sweep expired windows once the map is large.
    if (buckets.size > 10_000) for (const [k, e] of buckets) if (e.resetAt <= now) buckets.delete(k)
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count += 1
  return true
}
