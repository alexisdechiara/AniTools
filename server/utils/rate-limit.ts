import {
	createError,
	getRequestIP,
	setResponseHeader,
	type H3Event
} from "h3"

interface RateLimitBucket {
	count: number
	resetAt: number
}

export interface RateLimitOptions {
	limit: number
	namespace: string
	windowMs: number
}

export interface RateLimitResult {
	allowed: boolean
	limit: number
	remaining: number
	resetAt: number
	retryAfter: number
}

const MAX_BUCKETS = 5_000
const buckets = new Map<string, RateLimitBucket>()
const upstreamBudgets = new Map<string, RateLimitBucket>()

function removeExpiredBuckets(now: number, store: Map<string, RateLimitBucket>) {
	for (const [key, bucket] of store) {
		if (bucket.resetAt <= now) {
			store.delete(key)
		}
	}

	while (store.size > MAX_BUCKETS) {
		const oldestKey = store.keys().next().value
		if (typeof oldestKey !== "string") break
		store.delete(oldestKey)
	}
}

export function checkRateLimit(
	key: string,
	options: RateLimitOptions,
	now = Date.now(),
	store: Map<string, RateLimitBucket> = buckets
): RateLimitResult {
	if (store.size >= MAX_BUCKETS) {
		removeExpiredBuckets(now, store)
	}

	const bucketKey = `${options.namespace}:${key}`
	const current = store.get(bucketKey)
	const bucket = !current || current.resetAt <= now
		? { count: 0, resetAt: now + options.windowMs }
		: current

	bucket.count += 1
	store.delete(bucketKey)
	store.set(bucketKey, bucket)

	const allowed = bucket.count <= options.limit
	const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000))

	return {
		allowed,
		limit: options.limit,
		remaining: Math.max(0, options.limit - bucket.count),
		resetAt: bucket.resetAt,
		retryAfter
	}
}

/**
 * The AniList budget lives apart from per-visitor buckets: a flood of client addresses must
 * never be able to evict it. Its keys are one per signed-in user plus "public".
 */
export function checkUpstreamBudget(key: string, options: RateLimitOptions, now = Date.now()) {
	return checkRateLimit(key, options, now, upstreamBudgets)
}

export function enforceRateLimit(event: H3Event, options: RateLimitOptions) {
	const address = getRequestIP(event, { xForwardedFor: true }) || "unknown"
	const result = checkRateLimit(address, options)

	setResponseHeader(event, "RateLimit-Limit", result.limit)
	setResponseHeader(event, "RateLimit-Remaining", result.remaining)
	setResponseHeader(event, "RateLimit-Reset", Math.ceil(result.resetAt / 1_000))

	if (!result.allowed) {
		setResponseHeader(event, "Retry-After", result.retryAfter)
		throw createError({
			statusCode: 429,
			statusMessage: "Too many requests"
		})
	}

	return result
}

export function resetRateLimitBuckets() {
	buckets.clear()
	upstreamBudgets.clear()
}
