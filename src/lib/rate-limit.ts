/**
 * Minimal in-memory fixed-window rate limiter.
 * Good enough for a single Vercel instance / low traffic. For multi-region
 * scale, swap the Map for Upstash Redis with the same function signature.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult = {
	ok: boolean
	remaining: number
	retryAfterSeconds: number
}

export function rateLimit(
	key: string,
	options: { limit: number; windowMs: number },
): RateLimitResult {
	const now = Date.now()
	const existing = buckets.get(key)

	if (!existing || existing.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + options.windowMs })
		return { ok: true, remaining: options.limit - 1, retryAfterSeconds: 0 }
	}

	existing.count += 1
	const remaining = Math.max(0, options.limit - existing.count)
	const ok = existing.count <= options.limit
	return {
		ok,
		remaining,
		retryAfterSeconds: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
	}
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
	const forwarded = headers.get('x-forwarded-for')
	if (forwarded) return forwarded.split(',')[0].trim()
	return headers.get('x-real-ip') ?? '0.0.0.0'
}

/** Periodic cleanup so the Map cannot grow without bound. */
if (typeof setInterval === 'function') {
	setInterval(() => {
		const now = Date.now()
		for (const [key, bucket] of buckets) {
			if (bucket.resetAt <= now) buckets.delete(key)
		}
	}, 60_000).unref?.()
}
