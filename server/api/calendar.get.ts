import { createDirectus, readItems, rest } from "@directus/sdk"
import type { GetAiringAnimesQuery } from "#gql/default"
import { isError } from "h3"
import { enforceRateLimit } from "~~/server/utils/rate-limit"
import { parseCalendarQuery } from "~~/server/utils/request-validation"
import { withTimeout } from "~~/server/utils/with-timeout"
import {
	parseSimuldubItems,
	type ValidatedSimuldubItem
} from "~~/server/utils/calendar-data"

type AiringSchedule = NonNullable<NonNullable<GetAiringAnimesQuery["Page"]>["airingSchedules"]>[number]

const AIRING_CACHE_TTL_MS = 5 * 60 * 1000
const SIMULDUB_CACHE_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 100
const MAX_ANILIST_PAGES = 12
const MAX_RETRIES = 3
const DEFAULT_DIRECTUS_URL = "https://api.anitools.geekly.blog"

const airingCache = new Map<string, { data: AiringSchedule[], expiresAt: number }>()
const simuldubCache = new Map<string, { data: ValidatedSimuldubItem[], expiresAt: number }>()

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

	let allSchedules: AiringSchedule[] = []
	let hasNextPage = true
	let page = 1
	let retryCount = 0

	while (hasNextPage && page <= MAX_ANILIST_PAGES && retryCount < MAX_RETRIES) {
		try {
			const response = await withTimeout<GetAiringAnimesQuery>(
				GqlGetAiringAnimes({
					page,
					airingAtGreater,
					airingAtLesser
				}),
				12_000,
				"AniList calendar request timed out"
			)

			const pageData = response.Page
			const schedules = pageData?.airingSchedules ?? []
			allSchedules = [...allSchedules, ...schedules]
			hasNextPage = pageData?.pageInfo?.hasNextPage ?? false
			page++
			retryCount = 0
		} catch (error) {
			retryCount++
			if (retryCount >= MAX_RETRIES) {
				throw error
			}
			await wait(1000 * retryCount)
		}
	}

	if (hasNextPage) {
		throw createError({
			statusCode: 502,
			statusMessage: "AniList calendar response exceeded the page limit"
		})
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

	const directus = createDirectus(directusUrl).with(rest())
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
		if (isError(airingResult.reason) && airingResult.reason.statusCode === 504) {
			throw airingResult.reason
		}

		throw createError({
			statusCode: 502,
			statusMessage: "AniList calendar is temporarily unavailable"
		})
	}

	return {
		airingSchedules: airingResult.value,
		simuldubs: simuldubResult.status === "fulfilled" ? simuldubResult.value : [],
		warnings: simuldubResult.status === "rejected"
			? ["simuldubs_unavailable"] as const
			: []
	}
})
