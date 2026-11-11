import {
	createError,
	isError,
	setResponseHeader,
	type H3Event
} from "h3"
import * as z from "zod"
import { ANILIST_CACHE_TTL } from "./anilist-request-cache"
import {
	ANILIST_LIST_STATUSES,
	type AniListAccessMode,
	type AniListActivitiesResponse,
	type AniListActivity,
	type AniListAiringSchedulesPage,
	type AniListAnimeCollectionResponse,
	type AniListAnimeListEntry,
	type AniListAnimeListIdsResponse,
	type AniListAnimeListResponse,
	type AniListMediaResponse,
	type AniListMediaSummary,
	type AniListProfile,
	type AniListProfileResponse,
	type AniListRecommendationsResponse,
	type AniListSaveMediaListEntryResponse,
	type AniListSearchResponse,
	type AniListStudioMediaResponse,
	type AniListStatistics,
	type AniListStatisticsResponse
} from "~~/shared/types/anilist"
import {
	MAX_LIST_PAGE_SIZE,
	MAX_LIST_ID_CHUNKS,
	FULL_LIST_PER_CHUNK,
	MAX_FULL_LIST_CHUNKS,
	LIST_IDS_PER_CHUNK,
	MAX_ACTIVITY_PAGE_SIZE,
	MAX_EXPLORE_PAGE_SIZE,
	MAX_AIRING_PAGE_SIZE,
	MAX_MEDIA_BATCH_SIZE,
	AIRING_ID_PAGES_PER_REQUEST,
	MAX_AIRING_ID_PAGE_SIZE,
	MAX_SEARCH_RESULTS,
	MAX_STATISTIC_GROUPS,
	MAX_MEDIA_IDS_PER_STATISTIC,
	GRAPHQL_INT_MAX
} from "./anilist/constants"
import {
	PROFILE_QUERY,
	VIEWER_PROFILE_QUERY,
	ANIME_LIST_QUERY,
	ANIME_COLLECTION_QUERY,
	ANIME_LIST_IDS_QUERY,
	STATISTICS_QUERY,
	ACTIVITIES_QUERY,
	RECOMMENDATIONS_QUERY,
	STUDIO_MEDIA_QUERY,
	SEARCH_QUERY,
	MEDIA_QUERY,
	AIRING_SCHEDULES_QUERY,
	MEDIA_BY_IDS_QUERY,
	buildAiringIdsQuery,
	buildMediaByIdsBatchQuery,
	MEDIA_LIST_ENTRY_QUERY,
	SAVE_MEDIA_LIST_ENTRY_MUTATION
} from "./anilist/documents"
import {
	usernameSchema,
	mediaIdSchema,
	animeListQuerySchema,
	activitiesQuerySchema,
	recommendationsQuerySchema,
	studioMediaQuerySchema,
	searchTextSchema,
	mediaQuerySchema,
	saveMediaListEntryBodySchema,
	airingSchedulesQuerySchema,
	mediaIdsSchema,
	airingIdsQuerySchema,
	airingIdsPageCountSchema,
	mediaIdsBatchSchema,
	accessSchema,
	type AniListAccess,
	type AniListAnimeListQuery,
	type AniListActivitiesQuery,
	type AniListRecommendationsQuery,
	type AniListStudioMediaQuery,
	type AniListMediaQuery,
	type AniListSaveMediaListEntryBody,
	type AniListRequestOptions,
	profileSchema,
	searchMediaSchema,
	mediaSchema,
	airingScheduleSchema,
	nullablePageInfoSchema,
	animeListEntrySchema,
	type statisticStaffSchema,
	statisticsSchema,
	activitySchema,
	recommendationSchema,
	studioSchema,
	listSortMap,
	activityTypeMap,
	invalidQuery,
	parseQuery
} from "./anilist/schemas"
import {
	sourceFromAccess,
	normalizePageInfo,
	normalizeMedia,
	normalizeListMedia
} from "./anilist/normalize"
import {
	upstreamError,
	requestAniList
} from "./anilist/transport"

export * from "./anilist/constants"
export * from "./anilist/schemas"

export async function resolveAniListAccess(
	event: H3Event,
	publicUsername?: string
): Promise<AniListAccess> {
	if (publicUsername !== undefined) {
		const username = usernameSchema.safeParse(publicUsername)
		if (!username.success) throw invalidQuery(username.error)

		return {
			mode: "public",
			username: username.data
		}
	}

	const { getAniListSession } = await import("~~/server/utils/anilist-auth")
	const session = getAniListSession(event)
	if (!session) {
		throw createError({
			statusCode: 401,
			statusMessage: "Sign in with AniList or provide a public username"
		})
	}

	return accessSchema.parse({
		mode: "oauth",
		username: session.user.name,
		userId: session.user.id,
		accessToken: session.accessToken
	})
}

export function setAniListResponseCache(
	event: H3Event,
	mode: AniListAccessMode,
	publicMaxAge = 60
) {
	setResponseHeader(
		event,
		"Cache-Control",
		mode === "oauth"
			? "private, no-store"
			: `public, max-age=${publicMaxAge}, stale-while-revalidate=${publicMaxAge * 5}`
	)
}

export function forwardAniListRateLimit(event: H3Event, error: unknown) {
	if (!isError(error) || error.statusCode !== 429) return

	const data = typeof error.data === "object" && error.data !== null
		? error.data as Record<string, unknown>
		: null
	const retryAfter = data?.retryAfter
	if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) {
		setResponseHeader(event, "Retry-After", Math.max(1, Math.ceil(retryAfter)))
	}
}

/**
 * Error path shared by every AniList route. A failure must never keep the public cache
 * header set for the success path, and a rejected token means the session is dead.
 */
export async function handleAniListRouteError(
	event: H3Event,
	error: unknown,
	access?: AniListAccess | null
) {
	setResponseHeader(event, "Cache-Control", "private, no-store")
	forwardAniListRateLimit(event, error)

	const code = isError(error) && typeof error.data === "object" && error.data !== null
		? (error.data as Record<string, unknown>).code
		: undefined
	if (code === "ANILIST_UNAUTHORIZED" && access?.mode === "oauth") {
		const { clearAniListSession } = await import("~~/server/utils/anilist-auth")
		clearAniListSession(event)
	}
}

export async function getAniListSearchResponse(
	search: string,
	options: AniListRequestOptions = {}
): Promise<AniListSearchResponse> {
	const normalizedSearch = searchTextSchema.parse(search)
	const data = await requestAniList(
		SEARCH_QUERY,
		{ search: normalizedSearch },
		z.object({
			Page: z.object({
				media: z.array(searchMediaSchema.nullable())
					.max(MAX_SEARCH_RESULTS)
					.nullable()
			}).nullable()
		}),
		null,
		{ ...options, cacheTtlMs: options.cacheTtlMs ?? ANILIST_CACHE_TTL.catalogue }
	)

	if (!data.Page) {
		throw upstreamError(
			502,
			"AniList search returned no page",
			"ANILIST_SEARCH_FAILED"
		)
	}

	return {
		result: {
			predictions: (data.Page.media ?? [])
				.filter((media): media is NonNullable<typeof media> => media !== null)
				.map(media => ({
					id: media.id,
					title: media.title?.english
						|| media.title?.romaji
						|| media.title?.native
						|| media.title?.userPreferred
						|| `Anime #${media.id}`
				}))
		}
	}
}

export async function getAniListMediaResponse(
	query: Pick<AniListMediaQuery, "id">,
	options: AniListRequestOptions = {}
): Promise<AniListMediaResponse> {
	const validatedQuery = mediaQuerySchema.parse(query)
	const data = await requestAniList(
		MEDIA_QUERY,
		{ mediaId: validatedQuery.id },
		z.object({
			Media: mediaSchema.nullable()
		}),
		null,
		{ ...options, cacheTtlMs: options.cacheTtlMs ?? ANILIST_CACHE_TTL.catalogue }
	)

	if (!data.Media || data.Media.type !== "ANIME" || data.Media.isAdult === true) {
		throw upstreamError(
			404,
			"AniList anime was not found",
			"ANILIST_MEDIA_NOT_FOUND"
		)
	}

	return {
		media: normalizeMedia(data.Media)
	}
}

export async function saveAniListMediaListEntry(
	access: AniListAccess,
	body: AniListSaveMediaListEntryBody,
	options: AniListRequestOptions = {}
): Promise<AniListSaveMediaListEntryResponse> {
	const validatedAccess = accessSchema.parse(access)
	if (validatedAccess.mode !== "oauth") {
		throw createError({
			statusCode: 403,
			statusMessage: "An AniList session is required to update a list"
		})
	}

	const validatedBody = saveMediaListEntryBodySchema.parse(body)

	// SaveMediaListEntry updates an existing entry, so it would move a Completed or Watching
	// anime back to Planning. Look the entry up first and refuse to overwrite it.
	const entryLookupSchema = z.object({
		MediaList: z.object({
			id: z.number().int().positive(),
			status: z.enum(ANILIST_LIST_STATUSES).nullable()
		}).nullable()
	})
	let existingEntry: z.infer<typeof entryLookupSchema>["MediaList"] = null
	try {
		const lookup = await requestAniList(
			MEDIA_LIST_ENTRY_QUERY,
			{ userId: validatedAccess.userId, mediaId: validatedBody.mediaId },
			entryLookupSchema,
			validatedAccess,
			// A safety check must see AniList's current answer, never a cached one.
			{ ...options, skipCache: true }
		)
		existingEntry = lookup.MediaList
	} catch (error) {
		// AniList answers a lookup for an entry that does not exist with a 404 GraphQL error.
		// Only that miss means "safe to add"; every other failure must stop the write.
		if (!isError(error) || error.statusCode !== 404) throw error
	}

	if (existingEntry) {
		throw upstreamError(
			409,
			"This anime is already in your AniList list",
			"ANILIST_ENTRY_EXISTS",
			{ status: existingEntry.status }
		)
	}

	const data = await requestAniList(
		SAVE_MEDIA_LIST_ENTRY_MUTATION,
		{ mediaId: validatedBody.mediaId },
		z.object({
			SaveMediaListEntry: z.object({
				id: z.number().int().positive(),
				mediaId: mediaIdSchema,
				status: z.enum(ANILIST_LIST_STATUSES)
			}).nullable()
		}),
		validatedAccess,
		options
	)

	if (!data.SaveMediaListEntry) {
		throw upstreamError(
			502,
			"AniList did not update the anime list",
			"ANILIST_LIST_UPDATE_FAILED"
		)
	}

	return { entry: data.SaveMediaListEntry }
}

export async function getAniListAiringSchedulesPage(
	query: {
		page: number
		perPage?: number
		airingAtGreater: number
		airingAtLesser: number
	},
	options: AniListRequestOptions = {}
): Promise<AniListAiringSchedulesPage> {
	const validatedQuery = airingSchedulesQuerySchema.parse(query)
	const data = await requestAniList(
		AIRING_SCHEDULES_QUERY,
		{
			...validatedQuery,
			// AniList's airingAt_greater is exclusive; the calendar range start is inclusive.
			airingAtGreater: Math.max(0, validatedQuery.airingAtGreater - 1)
		},
		z.object({
			Page: z.object({
				pageInfo: z.object({
					hasNextPage: z.boolean().nullable()
				}).nullable(),
				airingSchedules: z.array(airingScheduleSchema.nullable())
					.max(MAX_AIRING_PAGE_SIZE)
					.nullable()
			}).nullable()
		}),
		null,
		{ ...options, cacheTtlMs: options.cacheTtlMs ?? ANILIST_CACHE_TTL.catalogue }
	)

	if (!data.Page) {
		throw upstreamError(
			502,
			"AniList airing schedule returned no page",
			"ANILIST_AIRING_FAILED"
		)
	}

	const airingSchedules = (data.Page.airingSchedules ?? []).flatMap((schedule) => {
		if (
			!schedule?.media
			|| schedule.media.type !== "ANIME"
			|| schedule.media.isAdult === true
		) {
			return []
		}

		return [{
			airingAt: schedule.airingAt,
			episode: schedule.episode,
			timeUntilAiring: schedule.timeUntilAiring,
			media: normalizeListMedia(schedule.media)
		}]
	})

	return {
		hasNextPage: data.Page.pageInfo?.hasNextPage ?? false,
		airingSchedules
	}
}

export async function getAniListMediaByIds(
	mediaIds: readonly number[],
	options: AniListRequestOptions = {}
): Promise<AniListMediaSummary[]> {
	const validatedMediaIds = mediaIdsSchema.parse(mediaIds)
	const data = await requestAniList(
		MEDIA_BY_IDS_QUERY,
		{
			mediaIds: validatedMediaIds,
			perPage: validatedMediaIds.length
		},
		z.object({
			Page: z.object({
				media: z.array(mediaSchema.nullable())
					.max(MAX_MEDIA_BATCH_SIZE)
					.nullable()
			}).nullable()
		}),
		null,
		{ ...options, cacheTtlMs: options.cacheTtlMs ?? ANILIST_CACHE_TTL.catalogue }
	)

	if (!data.Page) {
		throw upstreamError(
			502,
			"AniList media lookup returned no page",
			"ANILIST_MEDIA_LOOKUP_FAILED"
		)
	}

	const requestedIds = new Set(validatedMediaIds)
	return (data.Page.media ?? []).flatMap((media) => {
		if (
			!media
			|| !requestedIds.has(media.id)
			|| media.type !== "ANIME"
			|| media.isAdult === true
		) {
			return []
		}

		return [normalizeMedia(media)]
	})
}

export interface AniListAiringId {
	airingAt: number
	episode: number
	timeUntilAiring: number | null
	mediaId: number
}

const airingIdRowSchema = z.object({
	airingAt: z.number().int().positive().max(GRAPHQL_INT_MAX),
	episode: z.number().int().positive(),
	timeUntilAiring: z.number().int().nullable(),
	mediaId: z.number().int().positive()
})

const airingIdsPageSchema = z.object({
	pageInfo: z.object({
		hasNextPage: z.boolean().nullable()
	}).nullable(),
	airingSchedules: z.array(airingIdRowSchema.nullable())
		.max(MAX_AIRING_ID_PAGE_SIZE)
		.nullable()
}).nullable()

const airingIdsResponseSchema = z.object(Object.fromEntries(
	Array.from({ length: AIRING_ID_PAGES_PER_REQUEST }, (_, index) => [`p${index}`, airingIdsPageSchema])
))

/**
 * Airing rows of a range, AIRING_ID_PAGES_PER_REQUEST pages of ids at a time in one request.
 * The media are loaded separately (getAniListMediaByIdsBatch), once per anime.
 */
export async function getAniListAiringIds(
	query: { airingAtGreater: number, airingAtLesser: number, firstPage?: number },
	options: AniListRequestOptions = {}
): Promise<{ airings: AniListAiringId[], hasNextPage: boolean, nextPage: number }> {
	const validatedQuery = parseQuery(airingIdsQuerySchema, query)
	const pageCount = parseQuery(airingIdsPageCountSchema, AIRING_ID_PAGES_PER_REQUEST)
	const data = await requestAniList(
		buildAiringIdsQuery(pageCount, validatedQuery.firstPage),
		{
			// AniList's airingAt_greater is exclusive; the calendar range start is inclusive.
			airingAtGreater: Math.max(0, validatedQuery.airingAtGreater - 1),
			airingAtLesser: validatedQuery.airingAtLesser
		},
		airingIdsResponseSchema,
		null,
		{ ...options, cacheTtlMs: options.cacheTtlMs ?? ANILIST_CACHE_TTL.catalogue }
	)

	const pages = Array.from({ length: pageCount }, (_, index) => data[`p${index}`] ?? null)
	const airings = pages.flatMap(page => (page?.airingSchedules ?? []).flatMap(row => row
		? [{
				airingAt: row.airingAt,
				episode: row.episode,
				timeUntilAiring: row.timeUntilAiring,
				mediaId: row.mediaId
			}]
		: []))

	return {
		airings,
		hasNextPage: pages[pages.length - 1]?.pageInfo?.hasNextPage ?? false,
		nextPage: validatedQuery.firstPage + pageCount
	}
}

const mediaBatchPageSchema = z.object({
	media: z.array(mediaSchema.nullable())
		.max(MAX_MEDIA_BATCH_SIZE)
		.nullable()
}).nullable()

/**
 * Up to MEDIA_BATCH_PAGES_PER_REQUEST × 50 anime by id in one request, with the full media
 * selection of getAniListMediaByIds. An empty list never reaches AniList.
 */
export async function getAniListMediaByIdsBatch(
	mediaIds: readonly number[],
	options: AniListRequestOptions = {}
): Promise<AniListMediaSummary[]> {
	const validatedMediaIds = parseQuery(mediaIdsBatchSchema, mediaIds)
	if (validatedMediaIds.length === 0) return []

	const chunks: number[][] = []
	for (let index = 0; index < validatedMediaIds.length; index += MAX_MEDIA_BATCH_SIZE) {
		chunks.push(validatedMediaIds.slice(index, index + MAX_MEDIA_BATCH_SIZE))
	}

	const data = await requestAniList(
		buildMediaByIdsBatchQuery(chunks.length),
		Object.fromEntries(chunks.map((chunk, index) => [`ids${index}`, chunk])),
		z.object(Object.fromEntries(
			chunks.map((_, index) => [`m${index}`, mediaBatchPageSchema])
		)),
		null,
		{ ...options, cacheTtlMs: options.cacheTtlMs ?? ANILIST_CACHE_TTL.catalogue }
	)

	const requestedIds = new Set(validatedMediaIds)
	return chunks.flatMap((_, index) => {
		const page = data[`m${index}`]
		if (!page) {
			throw upstreamError(
				502,
				"AniList media lookup returned no page",
				"ANILIST_MEDIA_LOOKUP_FAILED"
			)
		}

		return (page.media ?? []).flatMap((media) => {
			if (
				!media
				|| !requestedIds.has(media.id)
				|| media.type !== "ANIME"
				|| media.isAdult === true
			) {
				return []
			}

			return [normalizeMedia(media)]
		})
	})
}

export async function fetchAniListProfile(
	access: AniListAccess,
	options: AniListRequestOptions = {}
): Promise<AniListProfile> {
	const validatedAccess = accessSchema.parse(access)
	const data = validatedAccess.mode === "oauth"
		? await requestAniList(
			VIEWER_PROFILE_QUERY,
			{},
			z.object({ Viewer: profileSchema.nullable() }),
			validatedAccess,
			options
		)
		: await requestAniList(
			PROFILE_QUERY,
			{ username: validatedAccess.username },
			z.object({ User: profileSchema.nullable() }),
			validatedAccess,
			options
		)
	const profile = "Viewer" in data ? data.Viewer : data.User

	if (!profile) {
		throw upstreamError(
			404,
			"AniList user was not found",
			"ANILIST_USER_NOT_FOUND"
		)
	}

	return profile as AniListProfile
}

export async function getAniListProfileResponse(
	access: AniListAccess,
	options: AniListRequestOptions = {}
): Promise<AniListProfileResponse> {
	return {
		source: sourceFromAccess(access),
		profile: await fetchAniListProfile(access, options)
	}
}

export async function getAniListAnimeListResponse(
	access: AniListAccess,
	query: AniListAnimeListQuery,
	options: AniListRequestOptions = {}
): Promise<AniListAnimeListResponse> {
	const validatedAccess = accessSchema.parse(access)
	const { username: _username, ...listQuery } = query
	const validatedQuery = animeListQuerySchema.omit({ username: true }).parse(listQuery)
	const data = await requestAniList(
		ANIME_LIST_QUERY,
		{
			userId: validatedAccess.mode === "oauth" ? validatedAccess.userId : undefined,
			username: validatedAccess.mode === "public" ? validatedAccess.username : undefined,
			status: validatedQuery.status,
			sort: [listSortMap[validatedQuery.sort]],
			page: validatedQuery.page,
			perPage: validatedQuery.perPage
		},
		z.object({
			Page: z.object({
				pageInfo: nullablePageInfoSchema,
				mediaList: z.array(animeListEntrySchema.nullable())
					.max(MAX_LIST_PAGE_SIZE)
					.nullable()
			}).nullable()
		}),
		validatedAccess,
		options
	)

	if (!data.Page) {
		throw upstreamError(
			404,
			"AniList user or anime list was not found",
			"ANILIST_LIST_NOT_FOUND"
		)
	}

	return {
		source: sourceFromAccess(validatedAccess),
		pageInfo: normalizePageInfo(
			data.Page.pageInfo,
			validatedQuery.page,
			validatedQuery.perPage
		),
		entries: (data.Page.mediaList ?? [])
			.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
			.map(entry => ({
				...entry,
				media: entry.media ? normalizeListMedia(entry.media) : null
			}))
	}
}

export async function getAniListAnimeCollectionResponse(
	access: AniListAccess,
	options: AniListRequestOptions = {}
): Promise<AniListAnimeCollectionResponse> {
	const validatedAccess = accessSchema.parse(access)
	// Custom lists repeat entries that also sit in a status list: keep one per entry id.
	const entries = new Map<number, AniListAnimeListEntry>()
	const responseSchema = z.object({
		MediaListCollection: z.object({
			hasNextChunk: z.boolean().nullable(),
			lists: z.array(z.object({
				entries: z.array(animeListEntrySchema.nullable())
					.max(FULL_LIST_PER_CHUNK)
					.nullable()
			}).nullable()).max(100).nullable()
		}).nullable()
	})
	let chunk = 1
	let hasNextChunk = true

	while (hasNextChunk && chunk <= MAX_FULL_LIST_CHUNKS) {
		const data = await requestAniList(
			ANIME_COLLECTION_QUERY,
			{
				userId: validatedAccess.mode === "oauth" ? validatedAccess.userId : undefined,
				username: validatedAccess.mode === "public" ? validatedAccess.username : undefined,
				chunk,
				perChunk: FULL_LIST_PER_CHUNK
			},
			responseSchema,
			validatedAccess,
			options
		)

		if (!data.MediaListCollection) {
			throw upstreamError(
				404,
				"AniList user or anime list was not found",
				"ANILIST_LIST_NOT_FOUND"
			)
		}

		for (const list of data.MediaListCollection.lists ?? []) {
			for (const entry of list?.entries ?? []) {
				if (!entry || entries.has(entry.id)) continue
				entries.set(entry.id, {
					...entry,
					media: entry.media ? normalizeListMedia(entry.media) : null
				})
			}
		}

		hasNextChunk = data.MediaListCollection.hasNextChunk ?? false
		chunk += 1
	}

	return {
		source: sourceFromAccess(validatedAccess),
		entries: [...entries.values()],
		truncated: hasNextChunk
	}
}

export async function getAniListAnimeListIdsResponse(
	access: AniListAccess,
	options: AniListRequestOptions = {}
): Promise<AniListAnimeListIdsResponse> {
	const validatedAccess = accessSchema.parse(access)
	const mediaIds = new Set<number>()
	const responseSchema = z.object({
		MediaListCollection: z.object({
			hasNextChunk: z.boolean(),
			lists: z.array(z.object({
				entries: z.array(z.object({ mediaId: mediaIdSchema }).nullable())
					.max(LIST_IDS_PER_CHUNK)
					.nullable()
			}).nullable()).max(100).nullable()
		}).nullable()
	})
	let chunk = 1
	let hasNextChunk = true

	while (hasNextChunk && chunk <= MAX_LIST_ID_CHUNKS) {
		const data = await requestAniList(
			ANIME_LIST_IDS_QUERY,
			{
				userId: validatedAccess.mode === "oauth" ? validatedAccess.userId : undefined,
				username: validatedAccess.mode === "public" ? validatedAccess.username : undefined,
				chunk,
				perChunk: LIST_IDS_PER_CHUNK
			},
			responseSchema,
			validatedAccess,
			options
		)

		if (!data.MediaListCollection) {
			throw upstreamError(
				404,
				"AniList user or anime list was not found",
				"ANILIST_LIST_NOT_FOUND"
			)
		}

		for (const list of data.MediaListCollection.lists ?? []) {
			for (const entry of list?.entries ?? []) {
				if (entry) mediaIds.add(entry.mediaId)
			}
		}

		hasNextChunk = data.MediaListCollection.hasNextChunk
		chunk += 1
	}

	if (hasNextChunk) {
		throw upstreamError(
			502,
			"AniList anime list exceeds the safe exclusion limit",
			"ANILIST_LIST_EXCLUSION_LIMIT"
		)
	}

	return {
		source: sourceFromAccess(validatedAccess),
		mediaIds: [...mediaIds].toSorted((left, right) => left - right)
	}
}

function boundedGroup<T extends { mediaIds: Array<number | null> }>(
	items: Array<T | null> | null
) {
	return (items ?? [])
		.filter((item): item is T => item !== null)
		.slice(0, MAX_STATISTIC_GROUPS)
		.map(item => ({
			...item,
			mediaIds: item.mediaIds
				.filter((mediaId): mediaId is number => mediaId !== null)
				.slice(0, MAX_MEDIA_IDS_PER_STATISTIC)
		}))
}

function normalizeStatistics(
	statistics: z.infer<typeof statisticsSchema>
): AniListStatistics {
	const normalizePerson = (person: z.infer<typeof statisticStaffSchema>) => ({
		id: person.id,
		name: person.name,
		language: person.languageV2,
		image: person.image,
		primaryOccupations: (person.primaryOccupations ?? [])
			.filter((occupation): occupation is string => occupation !== null),
		siteUrl: person.siteUrl
	})
	const voiceActors = boundedGroup(statistics.voiceActors).map(item => ({
		...item,
		voiceActor: item.voiceActor ? normalizePerson(item.voiceActor) : null,
		characterIds: item.characterIds
			.filter((characterId): characterId is number => characterId !== null)
			.slice(0, MAX_MEDIA_IDS_PER_STATISTIC)
	}))
	const staff = boundedGroup(statistics.staff).map(item => ({
		...item,
		staff: item.staff ? normalizePerson(item.staff) : null
	}))

	return {
		...statistics,
		statuses: boundedGroup(statistics.statuses),
		scores: boundedGroup(statistics.scores),
		formats: boundedGroup(statistics.formats),
		countries: boundedGroup(statistics.countries),
		genres: boundedGroup(statistics.genres),
		tags: boundedGroup(statistics.tags),
		startYears: boundedGroup(statistics.startYears),
		releaseYears: boundedGroup(statistics.releaseYears),
		studios: boundedGroup(statistics.studios),
		voiceActors,
		staff,
		lengths: boundedGroup(statistics.lengths)
	}
}

export async function getAniListStatisticsResponse(
	access: AniListAccess,
	options: AniListRequestOptions = {}
): Promise<AniListStatisticsResponse> {
	const validatedAccess = accessSchema.parse(access)
	const data = await requestAniList(
		STATISTICS_QUERY,
		{
			userId: validatedAccess.mode === "oauth" ? validatedAccess.userId : undefined,
			username: validatedAccess.mode === "public" ? validatedAccess.username : undefined
		},
		z.object({
			User: z.object({
				statistics: z.object({
					anime: statisticsSchema.nullable()
				}).nullable()
			}).nullable()
		}),
		validatedAccess,
		options
	)
	const statistics = data.User?.statistics?.anime

	if (!statistics) {
		throw upstreamError(
			404,
			"AniList user statistics were not found",
			"ANILIST_STATISTICS_NOT_FOUND"
		)
	}

	return {
		source: sourceFromAccess(validatedAccess),
		statistics: normalizeStatistics(statistics)
	}
}

function normalizeActivity(
	activity: z.infer<typeof activitySchema>
): AniListActivity {
	switch (activity.__typename) {
		case "ListActivity":
			return {
				kind: "anime",
				id: activity.id,
				type: activity.type,
				status: activity.status,
				progress: activity.progress,
				createdAt: activity.createdAt,
				replyCount: activity.replyCount,
				user: activity.user,
				media: activity.media
			}
		case "TextActivity":
			return {
				kind: "text",
				id: activity.id,
				type: activity.type,
				text: activity.text ?? "",
				createdAt: activity.createdAt,
				replyCount: activity.replyCount,
				user: activity.user
			}
		case "MessageActivity":
			return {
				kind: "message",
				id: activity.id,
				type: activity.type,
				message: activity.message ?? "",
				createdAt: activity.createdAt,
				replyCount: activity.replyCount,
				user: activity.user,
				messenger: activity.messenger
			}
	}
}

export function resolveAniListActivityRange(
	query: Pick<AniListActivitiesQuery, "from" | "to" | "year">
): { from: number, to: number } | null {
	if (query.year !== undefined) {
		return {
			from: Math.floor(Date.UTC(query.year, 0, 1) / 1_000),
			to: Math.floor(Date.UTC(query.year + 1, 0, 1) / 1_000)
		}
	}

	if (query.from !== undefined && query.to !== undefined) {
		return {
			from: query.from,
			to: query.to
		}
	}

	return null
}

export async function getAniListActivitiesResponse(
	access: AniListAccess,
	query: Pick<
		AniListActivitiesQuery,
		"from" | "kind" | "page" | "perPage" | "to" | "year"
	>,
	options: AniListRequestOptions = {}
): Promise<AniListActivitiesResponse> {
	const validatedAccess = accessSchema.parse(access)
	const validatedQuery = activitiesQuerySchema.parse(query)
	const activityRange = resolveAniListActivityRange(validatedQuery)
	const userId = validatedAccess.mode === "oauth"
		? validatedAccess.userId
		: (await fetchAniListProfile(validatedAccess, options)).id
	const data = await requestAniList(
		ACTIVITIES_QUERY,
		{
			userId,
			type: validatedQuery.kind === "all"
				? undefined
				: activityTypeMap[validatedQuery.kind],
			createdAtGreater: activityRange ? activityRange.from - 1 : undefined,
			createdAtLesser: activityRange?.to,
			page: validatedQuery.page,
			perPage: validatedQuery.perPage
		},
		z.object({
			Page: z.object({
				pageInfo: nullablePageInfoSchema,
				activities: z.array(activitySchema.nullable())
					.max(MAX_ACTIVITY_PAGE_SIZE)
					.nullable()
			}).nullable()
		}),
		validatedAccess,
		options
	)

	if (!data.Page) {
		throw upstreamError(
			404,
			"AniList activities were not found",
			"ANILIST_ACTIVITIES_NOT_FOUND"
		)
	}

	return {
		source: sourceFromAccess(validatedAccess),
		pageInfo: normalizePageInfo(
			data.Page.pageInfo,
			validatedQuery.page,
			validatedQuery.perPage
		),
		activities: (data.Page.activities ?? [])
			.filter((activity): activity is NonNullable<typeof activity> => activity !== null)
			.map(normalizeActivity)
	}
}

export async function getAniListRecommendationsResponse(
	access: AniListAccess,
	query: Pick<AniListRecommendationsQuery, "mediaId" | "page" | "perPage">,
	options: AniListRequestOptions = {}
): Promise<AniListRecommendationsResponse> {
	const validatedAccess = accessSchema.parse(access)
	const validatedQuery = recommendationsQuerySchema.parse(query)
	const data = await requestAniList(
		RECOMMENDATIONS_QUERY,
		{
			mediaId: validatedQuery.mediaId,
			page: validatedQuery.page,
			perPage: validatedQuery.perPage,
			onList: validatedAccess.mode === "oauth" ? false : undefined
		},
		z.object({
			Page: z.object({
				pageInfo: nullablePageInfoSchema,
				recommendations: z.array(recommendationSchema.nullable())
					.max(MAX_EXPLORE_PAGE_SIZE)
					.nullable()
			}).nullable()
		}),
		validatedAccess,
		{ ...options, cacheTtlMs: options.cacheTtlMs ?? ANILIST_CACHE_TTL.catalogue }
	)

	if (!data.Page) {
		throw upstreamError(
			404,
			"AniList recommendations were not found",
			"ANILIST_RECOMMENDATIONS_NOT_FOUND"
		)
	}

	return {
		source: sourceFromAccess(validatedAccess),
		seedMediaId: validatedQuery.mediaId,
		pageInfo: normalizePageInfo(
			data.Page.pageInfo,
			validatedQuery.page,
			validatedQuery.perPage
		),
		recommendations: (data.Page.recommendations ?? [])
			.flatMap((recommendation) => {
				const media = recommendation?.mediaRecommendation
				? normalizeMedia(recommendation.mediaRecommendation)
				: null

				if (!recommendation || !media || media.type !== "ANIME" || media.isAdult === true) {
					return []
				}

				return [{
					id: recommendation.id,
					rating: recommendation.rating ?? 0,
					media
				}]
			})
	}
}

export async function getAniListStudioMediaResponse(
	access: AniListAccess,
	query: Pick<AniListStudioMediaQuery, "page" | "perPage" | "studioId">,
	options: AniListRequestOptions = {}
): Promise<AniListStudioMediaResponse> {
	const validatedAccess = accessSchema.parse(access)
	const validatedQuery = studioMediaQuerySchema.parse(query)
	const data = await requestAniList(
		STUDIO_MEDIA_QUERY,
		{
			studioId: validatedQuery.studioId,
			page: validatedQuery.page,
			perPage: validatedQuery.perPage,
			onList: validatedAccess.mode === "oauth" ? false : undefined
		},
		z.object({
			Studio: studioSchema.nullable()
		}),
		validatedAccess,
		{ ...options, cacheTtlMs: options.cacheTtlMs ?? ANILIST_CACHE_TTL.catalogue }
	)

	if (!data.Studio?.media) {
		throw upstreamError(
			404,
			"AniList studio was not found",
			"ANILIST_STUDIO_NOT_FOUND"
		)
	}

	return {
		source: sourceFromAccess(validatedAccess),
		studio: {
			id: data.Studio.id,
			name: data.Studio.name,
			isAnimationStudio: data.Studio.isAnimationStudio,
			siteUrl: data.Studio.siteUrl
		},
		pageInfo: normalizePageInfo(
			data.Studio.media.pageInfo,
			validatedQuery.page,
			validatedQuery.perPage
		),
		media: (data.Studio.media.nodes ?? [])
			.flatMap((node) => {
				if (!node || node.type !== "ANIME" || node.isAdult === true) return []
				return [normalizeMedia(node)]
			})
	}
}
