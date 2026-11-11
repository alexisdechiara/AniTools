import { createError } from "h3"
import * as z from "zod"
import {
	ANILIST_CACHE_TTL,
	ANILIST_DEV_CACHE_STORAGE,
	aniListInFlightRequests,
	aniListMemoryCache,
	buildAniListCacheKey,
	getAniListWriteEpoch,
	invalidateAniListViewer,
	isAniListMutation,
	resolveAniListDevCacheMode
} from "../anilist-request-cache"
import { checkUpstreamBudget } from "~~/server/utils/rate-limit"
import {
	ANILIST_GRAPHQL_URL,
	DEFAULT_TIMEOUT_MS,
	UPSTREAM_REQUEST_LIMIT,
	UPSTREAM_REQUEST_WINDOW_MS
} from "./constants"
import {
	accessSchema,
	type AniListAccess,
	type AniListRequestOptions,
	graphQLResponseSchema
} from "./schemas"

function getRetryAfter(response: Response) {
	const seconds = Number(response.headers.get("retry-after"))
	if (Number.isFinite(seconds) && seconds > 0) {
		return Math.min(3_600, Math.ceil(seconds))
	}

	const resetAt = Number(response.headers.get("x-ratelimit-reset"))
	if (Number.isFinite(resetAt) && resetAt > 0) {
		return Math.min(3_600, Math.max(1, Math.ceil(resetAt - Date.now() / 1_000)))
	}

	return 60
}

export function upstreamError(
	statusCode: number,
	statusMessage: string,
	code: string,
	extraData: Record<string, unknown> = {}
) {
	return createError({
		statusCode,
		statusMessage,
		data: {
			code,
			...extraData
		}
	})
}

function enforceUpstreamBudget(access: AniListAccess | null) {
	const key = access?.mode === "oauth"
		? `oauth-user:${access.userId}`
		: "public"
	const result = checkUpstreamBudget(key, {
		namespace: "anilist-upstream",
		limit: UPSTREAM_REQUEST_LIMIT,
		windowMs: UPSTREAM_REQUEST_WINDOW_MS
	})

	if (!result.allowed) {
		throw upstreamError(
			429,
			"AniList request budget reached",
			"ANILIST_RATE_LIMITED",
			{ retryAfter: result.retryAfter }
		)
	}
}

export async function requestAniList<T>(
	query: string,
	variables: Record<string, unknown>,
	dataSchema: z.ZodType<T>,
	access: AniListAccess | null,
	options: AniListRequestOptions = {}
): Promise<T> {
	const validatedAccess = access === null ? null : accessSchema.parse(access)

	// Injected fetchers (unit tests), uncached safety checks and mutations always reach AniList.
	if (options.fetch) {
		return requestAniListUpstream(query, variables, dataSchema, validatedAccess, options)
	}
	if (options.skipCache) {
		return requestAniListUpstream(query, variables, dataSchema, validatedAccess, options)
	}
	const viewer = validatedAccess?.mode === "oauth" ? `oauth:${validatedAccess.userId}` : "public"

	if (isAniListMutation(query)) {
		const result = await requestAniListUpstream(query, variables, dataSchema, validatedAccess, options)
		// Only the writer's own list changed: drop their cached reads and keep everyone else's,
		// so one write does not send every visitor back to the shared upstream budget.
		invalidateAniListViewer(viewer)
		return result
	}

	const key = buildAniListCacheKey(query, variables, viewer)
	const devCacheMode = resolveAniListDevCacheMode(
		Boolean(import.meta.dev),
		process.env.NUXT_ANILIST_DEV_CACHE
	)

	if (devCacheMode !== "off") {
		const recorded = await useStorage(ANILIST_DEV_CACHE_STORAGE).getItem(key)
		if (recorded !== null) return recorded as T
		if (devCacheMode === "replay") {
			throw upstreamError(
				503,
				"This AniList response is not in the development cache",
				"ANILIST_DEV_CACHE_MISS"
			)
		}
	}

	const cached = aniListMemoryCache.get(key)
	if (cached !== undefined) return cached as T

	const pending = aniListInFlightRequests.get(key)
	if (pending) return pending as Promise<T>

	// A write that lands while this read is in flight makes its answer possibly stale.
	const epoch = getAniListWriteEpoch()
	const request = requestAniListUpstream(query, variables, dataSchema, validatedAccess, options)
		.then(async (data) => {
			if (getAniListWriteEpoch() === epoch) {
				aniListMemoryCache.set(key, data, options.cacheTtlMs ?? ANILIST_CACHE_TTL.user)
			}
			if (devCacheMode === "record") {
				// Stored as JSON text: unstorage parses it back into the same object on read.
				await useStorage(ANILIST_DEV_CACHE_STORAGE).setItem(key, JSON.stringify(data))
			}
			return data
		})
		.finally(() => {
			// A write may have dropped this promise and a newer read may own the key by now.
			if (aniListInFlightRequests.get(key) === request) aniListInFlightRequests.delete(key)
		})

	aniListInFlightRequests.set(key, request)
	return request
}

async function requestAniListUpstream<T>(
	query: string,
	variables: Record<string, unknown>,
	dataSchema: z.ZodType<T>,
	validatedAccess: AniListAccess | null,
	options: AniListRequestOptions
): Promise<T> {
	enforceUpstreamBudget(validatedAccess)
	const timeoutMs = z.number().int().min(1).max(30_000)
		.parse(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
	const fetcher = options.fetch ?? globalThis.fetch
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), timeoutMs)
	let response: Response
	let payload: unknown

	// One timeout covers both the headers and the body: a stalled body must not hang the request.
	try {
		try {
			response = await fetcher(ANILIST_GRAPHQL_URL, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					...(validatedAccess?.mode === "oauth"
						? { Authorization: `Bearer ${validatedAccess.accessToken}` }
						: {})
				},
				body: JSON.stringify({
					query,
					variables
				}),
				signal: controller.signal
			})
		} catch (error) {
			if (controller.signal.aborted) {
				throw upstreamError(
					504,
					"AniList request timed out",
					"ANILIST_TIMEOUT"
				)
			}

			throw createError({
				statusCode: 502,
				statusMessage: "Unable to reach AniList",
				data: { code: "ANILIST_UNAVAILABLE" },
				cause: error
			})
		}

		// Checked before the body is parsed: AniList's edge can answer these with HTML or nothing.
		if (response.status === 429) {
			throw upstreamError(
				429,
				"AniList rate limit reached",
				"ANILIST_RATE_LIMITED",
				{ retryAfter: getRetryAfter(response) }
			)
		}

		if (response.status === 401 || response.status === 403) {
			throw upstreamError(
				401,
				"AniList authorization is no longer valid",
				"ANILIST_UNAUTHORIZED"
			)
		}

		try {
			payload = await response.json()
		} catch (error) {
			if (controller.signal.aborted) {
				throw upstreamError(
					504,
					"AniList request timed out",
					"ANILIST_TIMEOUT"
				)
			}

			throw createError({
				statusCode: 502,
				statusMessage: "AniList returned an invalid response",
				data: { code: "ANILIST_INVALID_RESPONSE" },
				cause: error
			})
		}
	} finally {
		clearTimeout(timeout)
	}

	const envelope = graphQLResponseSchema.safeParse(payload)

	// AniList answers non-2xx codes (404 for unknown users, for one) with a valid
	// GraphQL error envelope, so let those reach the mapping below.
	const hasGraphQLErrors = envelope.success && (envelope.data.errors?.length ?? 0) > 0

	if (!response.ok && !hasGraphQLErrors) {
		throw upstreamError(
			502,
			"AniList request failed",
			"ANILIST_UPSTREAM_ERROR"
		)
	}

	if (!envelope.success) {
		throw upstreamError(
			502,
			"AniList returned an invalid response",
			"ANILIST_INVALID_RESPONSE"
		)
	}

	if (envelope.data.errors?.length) {
		const firstError = envelope.data.errors[0]
		const message = firstError?.message?.toLowerCase() || ""

		if (firstError?.status === 429 || message.includes("rate limit")) {
			throw upstreamError(
				429,
				"AniList rate limit reached",
				"ANILIST_RATE_LIMITED",
				{ retryAfter: getRetryAfter(response) }
			)
		}

		if (firstError?.status === 404 || message.includes("not found")) {
			throw upstreamError(
				404,
				"AniList user was not found",
				"ANILIST_USER_NOT_FOUND"
			)
		}

		if (firstError?.status === 401 || firstError?.status === 403) {
			throw upstreamError(
				401,
				"AniList authorization is no longer valid",
				"ANILIST_UNAUTHORIZED"
			)
		}

		throw upstreamError(
			502,
			"AniList rejected the request",
			"ANILIST_GRAPHQL_ERROR"
		)
	}

	const parsedData = dataSchema.safeParse(envelope.data.data)
	if (!parsedData.success) {
		throw upstreamError(
			502,
			"AniList returned an unexpected data shape",
			"ANILIST_INVALID_DATA"
		)
	}

	return parsedData.data
}
