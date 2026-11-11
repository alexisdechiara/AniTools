import { createError } from "h3"
import * as z from "zod"
import {
	ANILIST_ACTIVITY_KINDS,
	ANILIST_LIST_SORTS,
	ANILIST_LIST_STATUSES,
	ANILIST_SCORE_FORMATS,
	ANILIST_TITLE_LANGUAGES,
	type AniListActivityKind,
	type AniListListSort
} from "~~/shared/types/anilist"
import {
	MAX_PAGE,
	MAX_LIST_PAGE_SIZE,
	MAX_ACTIVITY_PAGE_SIZE,
	MAX_EXPLORE_PAGE_SIZE,
	MAX_AIRING_PAGE_SIZE,
	MAX_MEDIA_BATCH_SIZE,
	AIRING_ID_PAGES_PER_REQUEST,
	MAX_AIRING_ID_FIRST_PAGE,
	MEDIA_BATCH_PAGES_PER_REQUEST,
	MAX_MEDIA_RELATION_EDGES,
	MAX_SEARCH_LENGTH,
	MAX_UPSTREAM_STATISTIC_GROUPS,
	MIN_ACTIVITY_TIMESTAMP,
	MAX_ACTIVITY_TIMESTAMP,
	MAX_ACTIVITY_RANGE_SECONDS,
	GRAPHQL_INT_MAX
} from "./constants"

export const usernameSchema = z.string()
	.trim()
	.min(2)
	.max(30)
	.regex(/^[A-Za-z0-9_-]+$/, "username contains unsupported characters")
const sessionUsernameSchema = z.string().trim().min(1).max(100)

const optionalUsernameSchema = usernameSchema.optional()
const pageSchema = z.coerce.number().int().min(1).max(MAX_PAGE).default(1)
const listPageSizeSchema = z.coerce.number().int().min(1).max(MAX_LIST_PAGE_SIZE).default(25)
const activityPageSizeSchema = z.coerce.number().int().min(1).max(MAX_ACTIVITY_PAGE_SIZE).default(20)
const explorePageSizeSchema = z.coerce.number().int().min(1).max(MAX_EXPLORE_PAGE_SIZE).default(12)
export const mediaIdSchema = z.coerce.number().int().positive().max(10_000_000)
const activityTimestampSchema = z.coerce.number()
	.int()
	.min(MIN_ACTIVITY_TIMESTAMP)
	.max(MAX_ACTIVITY_TIMESTAMP)

const profileQuerySchema = z.object({
	username: optionalUsernameSchema
}).strict()

export const animeListQuerySchema = z.object({
	username: optionalUsernameSchema,
	page: pageSchema,
	perPage: listPageSizeSchema,
	status: z.enum(ANILIST_LIST_STATUSES).optional(),
	sort: z.enum(ANILIST_LIST_SORTS).default("updated")
}).strict()

const statisticsQuerySchema = z.object({
	username: optionalUsernameSchema
}).strict()

export const activitiesQuerySchema = z.object({
	username: optionalUsernameSchema,
	page: pageSchema,
	perPage: activityPageSizeSchema,
	kind: z.enum(ANILIST_ACTIVITY_KINDS).default("anime"),
	year: z.coerce.number().int().min(2000)
		.refine(year => year <= new Date().getUTCFullYear(), "year cannot be in the future")
		.optional(),
	from: activityTimestampSchema.optional(),
	to: activityTimestampSchema.optional()
}).strict().superRefine((query, context) => {
	const hasYear = query.year !== undefined
	const hasFrom = query.from !== undefined
	const hasTo = query.to !== undefined

	if (hasYear && (hasFrom || hasTo)) {
		context.addIssue({
			code: "custom",
			message: "year cannot be combined with from or to",
			path: ["year"]
		})
	}

	if (hasFrom !== hasTo) {
		context.addIssue({
			code: "custom",
			message: "from and to must be provided together",
			path: [hasFrom ? "to" : "from"]
		})
	}

	if (query.from !== undefined && query.to !== undefined) {
		if (query.from >= query.to) {
			context.addIssue({
				code: "custom",
				message: "from must be earlier than to",
				path: ["from"]
			})
		} else if (query.to - query.from > MAX_ACTIVITY_RANGE_SECONDS) {
			context.addIssue({
				code: "custom",
				message: "activity range cannot exceed 370 days",
				path: ["to"]
			})
		}
	}
})

export const recommendationsQuerySchema = z.object({
	username: optionalUsernameSchema,
	mediaId: mediaIdSchema,
	page: pageSchema,
	perPage: explorePageSizeSchema
}).strict()

export const studioMediaQuerySchema = z.object({
	username: optionalUsernameSchema,
	studioId: mediaIdSchema,
	page: pageSchema,
	perPage: explorePageSizeSchema
}).strict()

export const searchTextSchema = z.string().trim().min(1).max(MAX_SEARCH_LENGTH)

export const mediaQuerySchema = z.object({
	id: mediaIdSchema
}).strict()

export const saveMediaListEntryBodySchema = z.object({
	mediaId: mediaIdSchema
}).strict()

export const airingSchedulesQuerySchema = z.object({
	page: pageSchema,
	perPage: z.coerce.number().int().min(1).max(MAX_AIRING_PAGE_SIZE)
		.default(MAX_AIRING_PAGE_SIZE),
	airingAtGreater: z.coerce.number().int().nonnegative().max(GRAPHQL_INT_MAX),
	airingAtLesser: z.coerce.number().int().nonnegative().max(GRAPHQL_INT_MAX)
}).strict().refine(
	query => query.airingAtGreater < query.airingAtLesser,
	{
		message: "airingAtGreater must be earlier than airingAtLesser",
		path: ["airingAtLesser"]
	}
)

export const mediaIdsSchema = z.array(mediaIdSchema)
	.min(1)
	.max(MAX_MEDIA_BATCH_SIZE)
	.transform(mediaIds => [...new Set(mediaIds)])

export const airingIdsQuerySchema = z.object({
	airingAtGreater: z.coerce.number().int().nonnegative().max(GRAPHQL_INT_MAX),
	airingAtLesser: z.coerce.number().int().nonnegative().max(GRAPHQL_INT_MAX),
	firstPage: z.number().int().min(1).max(MAX_AIRING_ID_FIRST_PAGE).default(1)
}).strict().refine(
	query => query.airingAtGreater < query.airingAtLesser,
	{
		message: "airingAtGreater must be earlier than airingAtLesser",
		path: ["airingAtLesser"]
	}
)

export const airingIdsPageCountSchema = z.number().int().min(1).max(AIRING_ID_PAGES_PER_REQUEST)

export const mediaIdsBatchSchema = z.array(mediaIdSchema)
	.transform(mediaIds => [...new Set(mediaIds)].sort((left, right) => left - right))
	.refine(
		mediaIds => mediaIds.length <= MEDIA_BATCH_PAGES_PER_REQUEST * MAX_MEDIA_BATCH_SIZE,
		{ message: `At most ${MEDIA_BATCH_PAGES_PER_REQUEST * MAX_MEDIA_BATCH_SIZE} media ids per request` }
	)

const publicAccessSchema = z.object({
	mode: z.literal("public"),
	username: usernameSchema
})

const oauthAccessSchema = z.object({
	mode: z.literal("oauth"),
	username: sessionUsernameSchema,
	userId: z.number().int().positive(),
	accessToken: z.string().min(1)
})

export const accessSchema = z.discriminatedUnion("mode", [
	publicAccessSchema,
	oauthAccessSchema
])

export type AniListAccess = z.infer<typeof accessSchema>
export type AniListProfileQuery = z.infer<typeof profileQuerySchema>
export type AniListAnimeListQuery = z.infer<typeof animeListQuerySchema>
export type AniListStatisticsQuery = z.infer<typeof statisticsQuerySchema>
export type AniListActivitiesQuery = z.infer<typeof activitiesQuerySchema>
export type AniListRecommendationsQuery = z.infer<typeof recommendationsQuerySchema>
export type AniListStudioMediaQuery = z.infer<typeof studioMediaQuerySchema>
export type AniListMediaQuery = z.infer<typeof mediaQuerySchema>
export type AniListSaveMediaListEntryBody = z.infer<typeof saveMediaListEntryBodySchema>

export interface AniListRequestOptions {
	fetch?: typeof globalThis.fetch
	timeoutMs?: number
	/** How long an identical read is served from memory; see ANILIST_CACHE_TTL. */
	cacheTtlMs?: number
	/** Always reach AniList: no memory, in-flight or development disk cache, read or write. */
	skipCache?: boolean
}

const graphQLErrorSchema = z.object({
	message: z.string().max(2_000).optional(),
	status: z.number().int().optional()
})

export const graphQLResponseSchema = z.object({
	data: z.unknown().optional(),
	errors: z.array(graphQLErrorSchema).max(20).optional()
})

const httpUrlSchema = z.string().url().max(2_048).refine((value) => {
	const protocol = new URL(value).protocol
	return protocol === "http:" || protocol === "https:"
})

const imageSchema = z.object({
	large: httpUrlSchema.nullable(),
	medium: httpUrlSchema.nullable()
})

const fuzzyDateSchema = z.object({
	day: z.number().int().nullable(),
	month: z.number().int().nullable(),
	year: z.number().int().nullable()
})

export const profileSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1).max(100),
	about: z.string().max(100_000).nullable(),
	avatar: imageSchema.nullable(),
	bannerImage: httpUrlSchema.nullable(),
	createdAt: z.number().int().nonnegative().nullable(),
	siteUrl: z.string().url().nullable(),
	updatedAt: z.number().int().nonnegative().nullable(),
	options: z.object({
		displayAdultContent: z.boolean().nullable(),
		profileColor: z.string().max(128).nullable(),
		timezone: z.string().max(128).nullable(),
		titleLanguage: z.enum(ANILIST_TITLE_LANGUAGES).nullable()
	}).nullable(),
	mediaListOptions: z.object({
		rowOrder: z.string().max(128).nullable(),
		scoreFormat: z.enum(ANILIST_SCORE_FORMATS).nullable()
	}).nullable()
})

const titleSchema = z.object({
	english: z.string().max(500).nullable(),
	native: z.string().max(500).nullable(),
	romaji: z.string().max(500).nullable(),
	userPreferred: z.string().max(500).nullable()
})

export const searchMediaSchema = z.object({
	id: z.number().int().positive(),
	title: titleSchema.nullable()
})

const mediaTagSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1).max(200),
	category: z.string().max(200).nullable(),
	rank: z.number().int().nullable(),
	isAdult: z.boolean(),
	isGeneralSpoiler: z.boolean(),
	isMediaSpoiler: z.boolean()
})

const mediaRelationNodeSchema = z.object({
	id: z.number().int().positive(),
	format: z.string().max(64).nullable(),
	title: titleSchema.nullable()
})

export const mediaSchema = z.object({
	id: z.number().int().positive(),
	idMal: z.number().int().positive().nullable(),
	type: z.string().max(32).nullable(),
	title: titleSchema.nullable(),
	coverImage: z.object({
		color: z.string().max(64).nullable(),
		extraLarge: httpUrlSchema.nullable(),
		large: httpUrlSchema.nullable(),
		medium: httpUrlSchema.nullable()
	}).nullable(),
	bannerImage: httpUrlSchema.nullable(),
	description: z.string().max(100_000).nullable(),
	format: z.string().max(64).nullable(),
	status: z.string().max(64).nullable(),
	episodes: z.number().int().nonnegative().nullable(),
	duration: z.number().int().nonnegative().nullable(),
	genres: z.array(z.string().max(100).nullable()).max(50).nullable(),
	countryOfOrigin: z.string().max(8).nullable(),
	season: z.string().max(32).nullable(),
	seasonYear: z.number().int().nullable(),
	startDate: fuzzyDateSchema.nullable(),
	endDate: fuzzyDateSchema.nullable(),
	averageScore: z.number().min(0).max(100).nullable(),
	meanScore: z.number().min(0).max(100).nullable(),
	popularity: z.number().int().nonnegative().nullable(),
	favourites: z.number().int().nonnegative().nullable(),
	isFavourite: z.boolean(),
	isAdult: z.boolean().nullable(),
	tags: z.array(mediaTagSchema.nullable()).max(100).nullable(),
	nextAiringEpisode: z.object({
		airingAt: z.number().int().nonnegative(),
		episode: z.number().int().positive(),
		timeUntilAiring: z.number().int()
	}).nullable(),
	siteUrl: httpUrlSchema.nullable(),
	studios: z.object({
		edges: z.array(z.object({
			isMain: z.boolean(),
			node: z.object({
				id: z.number().int().positive(),
				name: z.string().min(1).max(200),
				isAnimationStudio: z.boolean(),
				siteUrl: httpUrlSchema.nullable()
			}).nullable()
		}).nullable()).max(50).nullable()
	}).nullable(),
	rankings: z.array(z.object({
		allTime: z.boolean().nullable(),
		context: z.string().max(500),
		rank: z.number().int().positive(),
		season: z.string().max(32).nullable(),
		type: z.string().max(64),
		year: z.number().int().nullable()
	}).nullable()).max(100).nullable(),
	externalLinks: z.array(z.object({
		color: z.string().max(64).nullable(),
		language: z.string().max(64).nullable(),
		site: z.string().min(1).max(200),
		url: httpUrlSchema.nullable()
	}).nullable()).max(100).nullable(),
	trailer: z.object({
		id: z.string().max(200).nullable(),
		site: z.string().max(100).nullable(),
		thumbnail: httpUrlSchema.nullable()
	}).nullable(),
	relations: z.object({
		edges: z.array(z.object({
			relationType: z.string().max(64).nullable(),
			node: mediaRelationNodeSchema.nullable()
		}).nullable()).max(MAX_MEDIA_RELATION_EDGES).nullable()
	}).nullable()
})

// The shape MEDIA_LIST_FIELDS returns: the details-view fields, the tag flags and the relation
// node titles and formats are optional, and stay absent (undefined, never null) once normalised.
export const mediaListSchema = mediaSchema.partial({
	idMal: true,
	rankings: true,
	externalLinks: true,
	trailer: true
}).extend({
	tags: z.array(mediaTagSchema.partial({
		isAdult: true,
		isGeneralSpoiler: true,
		isMediaSpoiler: true
	}).nullable()).max(100).nullable(),
	relations: z.object({
		edges: z.array(z.object({
			relationType: z.string().max(64).nullable(),
			node: mediaRelationNodeSchema.partial({
				format: true,
				title: true
			}).nullable()
		}).nullable()).max(MAX_MEDIA_RELATION_EDGES).nullable()
	}).nullable()
})

export const airingScheduleSchema = z.object({
	airingAt: z.number().int().positive().max(GRAPHQL_INT_MAX),
	episode: z.number().int().positive(),
	timeUntilAiring: z.number().int().nullable(),
	media: mediaListSchema.nullable()
})

export const nullablePageInfoSchema = z.object({
	currentPage: z.number().int().positive().nullable(),
	hasNextPage: z.boolean().nullable(),
	lastPage: z.number().int().positive().nullable(),
	perPage: z.number().int().positive().nullable(),
	total: z.number().int().nonnegative().nullable()
})

export const animeListEntrySchema = z.object({
	id: z.number().int().positive(),
	status: z.enum(ANILIST_LIST_STATUSES).nullable(),
	score: z.number().min(0).nullable(),
	progress: z.number().int().nonnegative().nullable(),
	repeat: z.number().int().nonnegative().nullable(),
	priority: z.number().int().nullable(),
	updatedAt: z.number().int().nonnegative().nullable(),
	startedAt: fuzzyDateSchema.nullable(),
	completedAt: fuzzyDateSchema.nullable(),
	media: mediaListSchema.nullable()
})

const metricSchema = z.object({
	count: z.number().int().nonnegative(),
	meanScore: z.number(),
	minutesWatched: z.number().int().nonnegative(),
	mediaIds: z.array(z.number().int().positive().nullable()).max(50_000)
})

function statisticGroupSchema<T extends z.ZodRawShape>(shape: T) {
	return z.array(metricSchema.extend(shape).nullable())
		.max(MAX_UPSTREAM_STATISTIC_GROUPS)
		.nullable()
}

export const statisticStaffSchema = z.object({
	id: z.number().int().positive(),
	name: z.object({
		full: z.string().min(1).max(300).nullable(),
		native: z.string().min(1).max(300).nullable(),
		userPreferred: z.string().min(1).max(300).nullable()
	}).nullable(),
	languageV2: z.string().max(100).nullable(),
	image: imageSchema.nullable(),
	primaryOccupations: z.array(z.string().max(200).nullable()).max(100).nullable(),
	siteUrl: httpUrlSchema.nullable()
})

export const statisticsSchema = z.object({
	count: z.number().int().nonnegative(),
	meanScore: z.number(),
	minutesWatched: z.number().int().nonnegative(),
	episodesWatched: z.number().int().nonnegative(),
	statuses: statisticGroupSchema({ status: z.string().max(64).nullable() }),
	scores: statisticGroupSchema({ score: z.number().nullable() }),
	formats: statisticGroupSchema({ format: z.string().max(64).nullable() }),
	countries: statisticGroupSchema({ country: z.string().max(8).nullable() }),
	genres: statisticGroupSchema({ genre: z.string().max(100).nullable() }),
	tags: statisticGroupSchema({
		tag: z.object({
			id: z.number().int().positive(),
			name: z.string().min(1).max(200),
			category: z.string().max(200).nullable(),
			isAdult: z.boolean()
		}).nullable()
	}),
	startYears: statisticGroupSchema({ startYear: z.number().int().nullable() }),
	releaseYears: statisticGroupSchema({ releaseYear: z.number().int().nullable() }),
	studios: statisticGroupSchema({
		studio: z.object({
			id: z.number().int().positive(),
			name: z.string().min(1).max(200),
			isAnimationStudio: z.boolean()
		}).nullable()
	}),
	voiceActors: statisticGroupSchema({
		voiceActor: statisticStaffSchema.nullable(),
		characterIds: z.array(z.number().int().positive().nullable()).max(50_000)
	}),
	staff: statisticGroupSchema({
		staff: statisticStaffSchema.nullable()
	}),
	lengths: statisticGroupSchema({ length: z.string().max(100).nullable() })
})

const actorSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1).max(100),
	avatar: imageSchema.nullable()
})

const activityMediaSchema = z.object({
	id: z.number().int().positive(),
	title: titleSchema.nullable(),
	coverImage: z.object({
		color: z.string().max(64).nullable(),
		large: httpUrlSchema.nullable(),
		medium: httpUrlSchema.nullable()
	}).nullable(),
	format: z.string().max(64).nullable(),
	siteUrl: httpUrlSchema.nullable()
})

const listActivitySchema = z.object({
	__typename: z.literal("ListActivity"),
	id: z.number().int().positive(),
	type: z.string().max(64).nullable(),
	status: z.string().max(500).nullable(),
	progress: z.string().max(100).nullable(),
	createdAt: z.number().int().nonnegative(),
	replyCount: z.number().int().nonnegative(),
	user: actorSchema.nullable(),
	media: activityMediaSchema.nullable()
})

const textActivitySchema = z.object({
	__typename: z.literal("TextActivity"),
	id: z.number().int().positive(),
	type: z.string().max(64).nullable(),
	text: z.string().max(100_000).nullable(),
	createdAt: z.number().int().nonnegative(),
	replyCount: z.number().int().nonnegative(),
	user: actorSchema.nullable()
})

const messageActivitySchema = z.object({
	__typename: z.literal("MessageActivity"),
	id: z.number().int().positive(),
	type: z.string().max(64).nullable(),
	message: z.string().max(100_000).nullable(),
	createdAt: z.number().int().nonnegative(),
	replyCount: z.number().int().nonnegative(),
	user: actorSchema.nullable(),
	messenger: actorSchema.nullable()
})

export const activitySchema = z.discriminatedUnion("__typename", [
	listActivitySchema,
	textActivitySchema,
	messageActivitySchema
])

export const recommendationSchema = z.object({
	id: z.number().int().positive(),
	rating: z.number().int().min(-1_000_000).max(10_000_000).nullable(),
	mediaRecommendation: mediaSchema.nullable()
})

export const studioSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1).max(200),
	isAnimationStudio: z.boolean(),
	siteUrl: httpUrlSchema.nullable(),
	media: z.object({
		pageInfo: nullablePageInfoSchema,
		nodes: z.array(mediaSchema.nullable())
			.max(MAX_EXPLORE_PAGE_SIZE)
			.nullable()
	}).nullable()
})

export const listSortMap: Record<AniListListSort, string> = {
	updated: "UPDATED_TIME_DESC",
	score: "SCORE_DESC",
	title: "MEDIA_TITLE_ROMAJI",
	progress: "PROGRESS_DESC"
}

export const activityTypeMap: Record<Exclude<AniListActivityKind, "all">, string> = {
	anime: "ANIME_LIST",
	text: "TEXT",
	message: "MESSAGE"
}

export function invalidQuery(result: z.ZodError) {
	return createError({
		statusCode: 400,
		statusMessage: result.issues[0]?.message || "Invalid AniList query"
	})
}

export function parseQuery<T>(schema: z.ZodType<T>, query: unknown): T {
	const result = schema.safeParse(query)
	if (!result.success) throw invalidQuery(result.error)
	return result.data
}

export function parseAniListProfileQuery(query: unknown) {
	return parseQuery(profileQuerySchema, query)
}

export function parseAniListAnimeListQuery(query: unknown) {
	return parseQuery(animeListQuerySchema, query)
}

export function parseAniListStatisticsQuery(query: unknown) {
	return parseQuery(statisticsQuerySchema, query)
}

export function parseAniListActivitiesQuery(query: unknown) {
	return parseQuery(activitiesQuerySchema, query)
}

export function parseAniListRecommendationsQuery(query: unknown) {
	return parseQuery(recommendationsQuerySchema, query)
}

export function parseAniListStudioMediaQuery(query: unknown) {
	return parseQuery(studioMediaQuerySchema, query)
}

export function parseAniListMediaQuery(query: unknown) {
	return parseQuery(mediaQuerySchema, query)
}

export function parseAniListSaveMediaListEntryBody(body: unknown) {
	return parseQuery(saveMediaListEntryBodySchema, body)
}
