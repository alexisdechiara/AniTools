import { createDirectus, readItems, rest } from "@directus/sdk"
import type { GetAiringAnimesQuery } from "#gql/default"

type AiringSchedule = NonNullable<NonNullable<GetAiringAnimesQuery["Page"]>["airingSchedules"]>[number]
type SimuldubItem = Record<string, any>

const AIRING_CACHE_TTL_MS = 5 * 60 * 1000
const SIMULDUB_CACHE_TTL_MS = 5 * 60 * 1000
const MAX_RETRIES = 3
const DEFAULT_DIRECTUS_URL = "https://api.anitools.geekly.blog"

const airingCache = new Map<string, { data: AiringSchedule[], expiresAt: number }>()
const simuldubCache = new Map<string, { data: SimuldubItem[], expiresAt: number }>()

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

	while (hasNextPage && retryCount < MAX_RETRIES) {
		try {
			const response = await GqlGetAiringAnimes({
				page,
				airingAtGreater,
				airingAtLesser
			})

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

	airingCache.set(cacheKey, {
		data: allSchedules,
		expiresAt: Date.now() + AIRING_CACHE_TTL_MS
	})

	return allSchedules
}

async function fetchSimuldubs(rangeStart: string, rangeEnd: string, directusUrl: string) {
	const cacheKey = `${rangeStart}-${rangeEnd}`
	const cached = simuldubCache.get(cacheKey)
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data
	}

	const directus = createDirectus(directusUrl).with(rest())
	const simuldubs = await directus.request(
		readItems("simuldub", {
			filter: {
				status: {
					_neq: "archived"
				},
				start_date: {
					_gte: rangeStart,
					_lte: rangeEnd
				}
			}
		})
	)

	simuldubCache.set(cacheKey, {
		data: simuldubs as SimuldubItem[],
		expiresAt: Date.now() + SIMULDUB_CACHE_TTL_MS
	})

	return simuldubs
}

export default defineEventHandler(async (event) => {
	const runtimeConfig = useRuntimeConfig(event)
	const query = getQuery(event)
	const airingAtGreater = Number(query.airingAtGreater)
	const airingAtLesser = Number(query.airingAtLesser)
	const rangeStart = String(query.rangeStart || "")
	const rangeEnd = String(query.rangeEnd || "")
	const directusUrl = runtimeConfig.public.directusUrl || DEFAULT_DIRECTUS_URL

	if (!Number.isFinite(airingAtGreater) || !Number.isFinite(airingAtLesser) || !rangeStart || !rangeEnd) {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid query params. Required: airingAtGreater, airingAtLesser, rangeStart, rangeEnd"
		})
	}

	const [airingSchedules, simuldubs] = await Promise.all([
		fetchAiringSchedules(airingAtGreater, airingAtLesser),
		fetchSimuldubs(rangeStart, rangeEnd, directusUrl)
	])

	return {
		airingSchedules,
		simuldubs
	}
})
