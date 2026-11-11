import { createDirectus, readItems, rest } from "@directus/sdk"
import { isError } from "h3"
import type {
	AniListAiringSchedule,
	AniListMediaSummary
} from "~~/shared/types/anilist"
import {
	forwardAniListRateLimit,
	getAniListAiringIds,
	getAniListMediaByIdsBatch
} from "~~/server/utils/anilist-client"
import { createCalendarAiringLoader } from "~~/server/utils/calendar-airing"
import { enforceRateLimit } from "~~/server/utils/rate-limit"
import { parseCalendarQuery } from "~~/server/utils/request-validation"
import { withTimeout } from "~~/server/utils/with-timeout"
import {
	isRetryableAniListError,
	parseSimuldubItems,
	type ValidatedSimuldubItem
} from "~~/server/utils/calendar-data"

const AIRING_CACHE_TTL_MS = 5 * 60 * 1000
const SIMULDUB_CACHE_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 100
const MAX_MISSING_MEDIA_IDS = 100
const MAX_RETRIES = 3
const AIRING_DEADLINE_MS = 25_000
const DEFAULT_DIRECTUS_URL = "https://api.anitools.geekly.blog"

const airingCache = new Map<string, { data: AniListAiringSchedule[], expiresAt: number }>()
const simuldubCache = new Map<string, { data: ValidatedSimuldubItem[], expiresAt: number }>()
// Two AniList requests per cold range (airing ids, then the anime not cached yet), one when warm.
const airingLoader = createCalendarAiringLoader({
	fetchAiringIds: getAniListAiringIds,
	fetchMediaByIds: getAniListMediaByIdsBatch
})

function buildDirectusClient(directusUrl: string) {
	return createDirectus(directusUrl).with(rest())
}

const directusClients = new Map<string, ReturnType<typeof buildDirectusClient>>()

function getDirectusClient(directusUrl: string) {
	let client = directusClients.get(directusUrl)
	if (!client) {
		client = buildDirectusClient(directusUrl)
		directusClients.set(directusUrl, client)
	}
	return client
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function cacheResult<T>(
	cache: Map<string, { data: T, expiresAt: number }>,
	key: string,
	data: T,
	ttl: number
) {
	cache.delete(key)
	cache.set(key, {
		data,
		expiresAt: Date.now() + ttl
	})

	while (cache.size > MAX_CACHE_ENTRIES) {
		const oldestKey = cache.keys().next().value
		if (typeof oldestKey !== "string") break
		cache.delete(oldestKey)
	}
}

async function fetchAiringSchedules(airingAtGreater: number, airingAtLesser: number) {
	const cacheKey = `${airingAtGreater}-${airingAtLesser}`
	const cached = airingCache.get(cacheKey)
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data
	}

	let allSchedules: AniListAiringSchedule[] | undefined
	let retryCount = 0
	const startedAt = Date.now()

	while (!allSchedules) {
		if (Date.now() - startedAt > AIRING_DEADLINE_MS) {
			throw createError({
				statusCode: 504,
				statusMessage: "AniList calendar took too long"
			})
		}

		try {
			allSchedules = await airingLoader.loadAiringSchedules(
				airingAtGreater,
				airingAtLesser,
				{ timeoutMs: 12_000 }
			)
		} catch (error) {
			if (!isRetryableAniListError(error)) {
				throw error
			}

			retryCount++
			if (retryCount >= MAX_RETRIES) {
				throw error
			}
			await wait(1000 * retryCount)
		}
	}

	cacheResult(airingCache, cacheKey, allSchedules, AIRING_CACHE_TTL_MS)

	return allSchedules
}

async function fetchSimuldubs(rangeStart: string, rangeEnd: string, directusUrl: string) {
	const cacheKey = `${rangeStart}-${rangeEnd}`
	const cached = simuldubCache.get(cacheKey)
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data
	}

	const directus = getDirectusClient(directusUrl)
	const simuldubs = await withTimeout(
		directus.request(
			readItems("simuldub", {
				filter: {
					status: {
						_in: ["published", "cancelled"]
					},
					start_date: {
						_gte: rangeStart,
						_lte: rangeEnd
					}
				},
				fields: [
					"id",
					"status",
					"title",
					"start_date",
					"end_date",
					"episode",
					"languages",
					"streaming",
					"anilist_media_id"
				],
				limit: 500,
				sort: ["start_date"]
			})
		),
		12_000,
		"Simuldub request timed out"
	)

	const validatedSimuldubs = parseSimuldubItems(simuldubs)

	cacheResult(simuldubCache, cacheKey, validatedSimuldubs, SIMULDUB_CACHE_TTL_MS)

	return validatedSimuldubs
}

async function fetchMissingSimuldubMedia(
	airingSchedules: readonly AniListAiringSchedule[],
	simuldubs: readonly ValidatedSimuldubItem[]
) {
	const airingMediaIds = new Set(
		airingSchedules.flatMap(schedule => schedule.media ? [schedule.media.id] : [])
	)
	const allMissingIds = [...new Set(simuldubs.flatMap((simuldub) => {
		const mediaId = Number(simuldub.anilist_media_id)
		return Number.isSafeInteger(mediaId)
			&& mediaId > 0
			&& !airingMediaIds.has(mediaId)
			? [mediaId]
			: []
	}))].sort((left, right) => left - right)
	const requestedIds = allMissingIds.slice(0, MAX_MISSING_MEDIA_IDS)

	const media: AniListMediaSummary[] = []
	const errors: unknown[] = []
	try {
		// Shares the per-anime cache with the airing schedules.
		media.push(...await airingLoader.loadMediaByIds(requestedIds, {
			timeoutMs: 12_000
		}))
	} catch (error) {
		errors.push(error)
	}

	return {
		media,
		errors,
		truncated: allMissingIds.length > requestedIds.length
	}
}

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "calendar",
		limit: 30,
		windowMs: 60_000
	})

	const runtimeConfig = useRuntimeConfig(event)
	const {
		airingAtGreater,
		airingAtLesser,
		rangeStart,
		rangeEnd
	} = parseCalendarQuery(getQuery(event))
	const directusUrl = runtimeConfig.public.directusUrl || DEFAULT_DIRECTUS_URL

	const [airingResult, simuldubResult] = await Promise.allSettled([
		fetchAiringSchedules(airingAtGreater, airingAtLesser),
		fetchSimuldubs(rangeStart, rangeEnd, directusUrl)
	])

	if (airingResult.status === "rejected") {
		setResponseHeader(event, "Cache-Control", "private, no-store")
		forwardAniListRateLimit(event, airingResult.reason)
		if (isError(airingResult.reason) && airingResult.reason.statusCode === 504) {
			throw airingResult.reason
		}
		if (isError(airingResult.reason) && airingResult.reason.statusCode === 429) {
			throw airingResult.reason
		}

		throw createError({
			statusCode: 502,
			statusMessage: "AniList calendar is temporarily unavailable"
		})
	}

	const simuldubs = simuldubResult.status === "fulfilled" ? simuldubResult.value : []
	const missingMediaResult = await fetchMissingSimuldubMedia(
		airingResult.value,
		simuldubs
	)

	const warnings = [
		...(simuldubResult.status === "rejected"
			? ["simuldubs_unavailable"] as const
			: []),
		...(missingMediaResult.errors.length
			? ["simuldub_media_unavailable"] as const
			: []),
		...(missingMediaResult.truncated
			? ["simuldub_media_truncated"] as const
			: [])
	]

	setResponseHeader(event, "Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300")
	return {
		airingSchedules: airingResult.value,
		simuldubs,
		missingMedia: missingMediaResult.media,
		warnings
	}
})
