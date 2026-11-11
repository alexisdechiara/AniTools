import {
	createError,
	isError,
	setResponseHeader,
	type H3Event
} from "h3"
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
} from "./anilist-request-cache"
import {
	ANILIST_ACTIVITY_KINDS,
	ANILIST_LIST_SORTS,
	ANILIST_LIST_STATUSES,
	ANILIST_SCORE_FORMATS,
	ANILIST_TITLE_LANGUAGES,
	type AniListAccessMode,
	type AniListActivitiesResponse,
	type AniListActivity,
	type AniListActivityKind,
	type AniListAiringSchedulesPage,
	type AniListAnimeCollectionResponse,
	type AniListAnimeListEntry,
	type AniListAnimeListIdsResponse,
	type AniListAnimeListResponse,
	type AniListListSort,
	type AniListMediaListSummary,
	type AniListMediaResponse,
	type AniListMediaSummary,
	type AniListPageInfo,
	type AniListProfile,
	type AniListProfileResponse,
	type AniListRecommendationsResponse,
	type AniListSaveMediaListEntryResponse,
	type AniListSearchResponse,
	type AniListSource,
	type AniListStudioMediaResponse,
	type AniListStatistics,
	type AniListStatisticsResponse
} from "~~/shared/types/anilist"
import { checkUpstreamBudget } from "~~/server/utils/rate-limit"

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co"
const DEFAULT_TIMEOUT_MS = 10_000
const MAX_PAGE = 100
const MAX_LIST_PAGE_SIZE = 50
const MAX_LIST_ID_CHUNKS = 20
const FULL_LIST_PER_CHUNK = 500
const MAX_FULL_LIST_CHUNKS = 10
const LIST_IDS_PER_CHUNK = 500
const MAX_ACTIVITY_PAGE_SIZE = 50
const MAX_EXPLORE_PAGE_SIZE = 20
const MAX_AIRING_PAGE_SIZE = 50
const MAX_MEDIA_BATCH_SIZE = 50
const MAX_MEDIA_RELATION_EDGES = 500
const MAX_SEARCH_RESULTS = 10
const MAX_SEARCH_LENGTH = 100
const MAX_STATISTIC_GROUPS = 100
const MAX_MEDIA_IDS_PER_STATISTIC = 250
const MAX_UPSTREAM_STATISTIC_GROUPS = 5_000
const UPSTREAM_REQUEST_LIMIT = 28
const UPSTREAM_REQUEST_WINDOW_MS = 60_000
const MIN_ACTIVITY_TIMESTAMP = 946_684_800
const MAX_ACTIVITY_TIMESTAMP = 4_102_444_800
const MAX_ACTIVITY_RANGE_SECONDS = 370 * 24 * 60 * 60
const GRAPHQL_INT_MAX = 2_147_483_647

export const ANILIST_ALLOWED_OPERATIONS = [
	"profile",
	"anime-list",
	"anime-list-ids",
	"statistics",
	"activities",
	"recommendations",
	"studio-media",
	"search",
	"media",
	"airing-schedules",
	"media-by-ids",
	"media-list-entry",
	"save-media-list-entry"
] as const

const PROFILE_FIELDS = `
	id
	name
	about
	avatar { large medium }
	bannerImage
	createdAt
	siteUrl
	updatedAt
	options {
		titleLanguage
		displayAdultContent
		profileColor
		timezone
	}
	mediaListOptions {
		scoreFormat
		rowOrder
	}
`

const MEDIA_SUMMARY_FIELDS = `
	id
	idMal
	type
	title { romaji english native userPreferred }
	coverImage { extraLarge large medium color }
	bannerImage
	description
	format
	status
	episodes
	duration
	genres
	countryOfOrigin
	season
	seasonYear
	startDate { year month day }
	endDate { year month day }
	averageScore
	meanScore
	popularity
	favourites
	isFavourite
	isAdult
	tags {
		id
		name
		category
		rank
		isAdult
		isGeneralSpoiler
		isMediaSpoiler
	}
	nextAiringEpisode { airingAt episode timeUntilAiring }
	siteUrl
	studios(isMain: true) {
		edges {
			isMain
			node { id name isAnimationStudio siteUrl }
		}
	}
	rankings { allTime context rank season type year }
	externalLinks { color language site url }
	trailer { id site thumbnail }
	relations {
		edges {
			relationType
			node {
				id
				format
				title { romaji english native userPreferred }
			}
		}
	}
`

// What a list row needs: MEDIA_SUMMARY_FIELDS without the details-view fields (idMal, rankings,
// external links, trailer), the tag spoiler/adult flags and the relation titles and formats.
// The description stays: previews show it without a details request. Tier-list franchise
// grouping only reads relation types and ids. A field a card or a calculation needs goes in
// both sets; one only a details view needs goes in the full set, and the details popover
// fetches it on demand (see app/utils/media-details.ts).
const MEDIA_LIST_FIELDS = `
	id
	type
	title { romaji english native userPreferred }
	coverImage { extraLarge large medium color }
	bannerImage
	description
	format
	status
	episodes
	duration
	genres
	countryOfOrigin
	season
	seasonYear
	startDate { year month day }
	endDate { year month day }
	averageScore
	meanScore
	popularity
	favourites
	isFavourite
	isAdult
	tags { id name category rank }
	nextAiringEpisode { airingAt episode timeUntilAiring }
	siteUrl
	studios(isMain: true) {
		edges {
			isMain
			node { id name isAnimationStudio siteUrl }
		}
	}
	relations { edges { relationType node { id } } }
`

const PROFILE_QUERY = `
	query AniToolsPublicProfile($username: String!) {
		User(name: $username) {
			${PROFILE_FIELDS}
		}
	}
`

const VIEWER_PROFILE_QUERY = `
	query AniToolsViewerProfile {
		Viewer {
			${PROFILE_FIELDS}
		}
	}
`

const ANIME_LIST_QUERY = `
	query AniToolsAnimeList(
		$userId: Int
		$username: String
		$status: MediaListStatus
		$sort: [MediaListSort]
		$page: Int!
		$perPage: Int!
	) {
		Page(page: $page, perPage: $perPage) {
			pageInfo {
				currentPage
				hasNextPage
				lastPage
				perPage
				total
			}
			mediaList(
				userId: $userId
				userName: $username
				type: ANIME
				status: $status
				sort: $sort
			) {
				id
				status
				score
				progress
				repeat
				priority
				updatedAt
				startedAt { year month day }
				completedAt { year month day }
				media {
					${MEDIA_LIST_FIELDS}
				}
			}
		}
	}
`

// One request returns up to FULL_LIST_PER_CHUNK entries, where Page caps at 50: loading a
// 433-entry list drops from nine upstream requests to one.
const ANIME_COLLECTION_QUERY = `
	query AniToolsAnimeCollection(
		$userId: Int
		$username: String
		$chunk: Int!
		$perChunk: Int!
	) {
		MediaListCollection(
			userId: $userId
			userName: $username
			type: ANIME
			chunk: $chunk
			perChunk: $perChunk
			forceSingleCompletedList: true
		) {
			hasNextChunk
			lists {
				entries {
					id
					status
					score
					progress
					repeat
					priority
					updatedAt
					startedAt { year month day }
					completedAt { year month day }
					media {
						${MEDIA_LIST_FIELDS}
					}
				}
			}
		}
	}
`

const ANIME_LIST_IDS_QUERY = `
	query AniToolsAnimeListIds(
		$userId: Int
		$username: String
		$chunk: Int!
		$perChunk: Int!
	) {
		MediaListCollection(
			userId: $userId
			userName: $username
			type: ANIME
			chunk: $chunk
			perChunk: $perChunk
		) {
			hasNextChunk
			lists {
				entries {
					mediaId
				}
			}
		}
	}
`

const STATISTICS_QUERY = `
	query AniToolsAnimeStatistics($userId: Int, $username: String) {
		User(id: $userId, name: $username) {
			statistics {
				anime {
					count
					meanScore
					minutesWatched
					episodesWatched
					statuses { status count meanScore minutesWatched mediaIds }
					scores { score count meanScore minutesWatched mediaIds }
					formats { format count meanScore minutesWatched mediaIds }
					countries { country count meanScore minutesWatched mediaIds }
					genres { genre count meanScore minutesWatched mediaIds }
					tags {
						count
						meanScore
						minutesWatched
						mediaIds
						tag { id name category isAdult }
					}
					startYears { startYear count meanScore minutesWatched mediaIds }
					releaseYears { releaseYear count meanScore minutesWatched mediaIds }
					studios {
						count
						meanScore
						minutesWatched
						mediaIds
						studio { id name isAnimationStudio }
					}
					voiceActors(limit: 100, sort: COUNT_DESC) {
						count
						meanScore
						minutesWatched
						mediaIds
						characterIds
						voiceActor {
							id
							name { full native userPreferred }
							languageV2
							image { large medium }
							primaryOccupations
							siteUrl
						}
					}
					staff(limit: 100, sort: COUNT_DESC) {
						count
						meanScore
						minutesWatched
						mediaIds
						staff {
							id
							name { full native userPreferred }
							languageV2
							image { large medium }
							primaryOccupations
							siteUrl
						}
					}
					lengths { length count meanScore minutesWatched mediaIds }
				}
			}
		}
	}
`

const ACTIVITIES_QUERY = `
	query AniToolsActivities(
		$userId: Int!
		$type: ActivityType
		$createdAtGreater: Int
		$createdAtLesser: Int
		$page: Int!
		$perPage: Int!
	) {
		Page(page: $page, perPage: $perPage) {
			pageInfo {
				currentPage
				hasNextPage
				lastPage
				perPage
				total
			}
			activities(
				userId: $userId
				type: $type
				createdAt_greater: $createdAtGreater
				createdAt_lesser: $createdAtLesser
				sort: ID_DESC
			) {
				__typename
				... on ListActivity {
					id
					type
					status
					progress
					createdAt
					replyCount
					user { id name avatar { large medium } }
					media {
						id
						title { romaji english native userPreferred }
						coverImage { large medium color }
						format
						siteUrl
					}
				}
				... on TextActivity {
					id
					type
					text
					createdAt
					replyCount
					user { id name avatar { large medium } }
				}
				... on MessageActivity {
					id
					type
					message
					createdAt
					replyCount
					user: recipient { id name avatar { large medium } }
					messenger { id name avatar { large medium } }
				}
			}
		}
	}
`

const RECOMMENDATIONS_QUERY = `
	query AniToolsRecommendations(
		$mediaId: Int!
		$page: Int!
		$perPage: Int!
		$onList: Boolean
	) {
		Page(page: $page, perPage: $perPage) {
			pageInfo {
				currentPage
				hasNextPage
				lastPage
				perPage
				total
			}
			recommendations(mediaId: $mediaId, onList: $onList, sort: RATING_DESC) {
				id
				rating
				mediaRecommendation {
					${MEDIA_SUMMARY_FIELDS}
				}
			}
		}
	}
`

const STUDIO_MEDIA_QUERY = `
	query AniToolsStudioMedia(
		$studioId: Int!
		$page: Int!
		$perPage: Int!
		$onList: Boolean
	) {
		Studio(id: $studioId) {
			id
			name
			isAnimationStudio
			siteUrl
			media(
				page: $page
				perPage: $perPage
				isMain: true
				onList: $onList
				sort: [SCORE_DESC, POPULARITY_DESC]
			) {
				pageInfo {
					currentPage
					hasNextPage
					lastPage
					perPage
					total
				}
				nodes {
					${MEDIA_SUMMARY_FIELDS}
				}
			}
		}
	}
`

const SEARCH_QUERY = `
	query AniToolsSearch($search: String!) {
		Page(page: 1, perPage: ${MAX_SEARCH_RESULTS}) {
			media(type: ANIME, isAdult: false, search: $search) {
				id
				title { romaji english native userPreferred }
			}
		}
	}
`

const MEDIA_QUERY = `
	query AniToolsMedia($mediaId: Int!) {
		Media(id: $mediaId, type: ANIME) {
			${MEDIA_SUMMARY_FIELDS}
		}
	}
`

const AIRING_SCHEDULES_QUERY = `
	query AniToolsAiringSchedules(
		$page: Int!
		$perPage: Int!
		$airingAtGreater: Int!
		$airingAtLesser: Int!
	) {
		Page(page: $page, perPage: $perPage) {
			pageInfo { hasNextPage }
			airingSchedules(
				airingAt_greater: $airingAtGreater
				airingAt_lesser: $airingAtLesser
			) {
				airingAt
				episode
				timeUntilAiring
				media {
					${MEDIA_LIST_FIELDS}
				}
			}
		}
	}
`

const MEDIA_BY_IDS_QUERY = `
	query AniToolsMediaByIds($mediaIds: [Int!]!, $perPage: Int!) {
		Page(page: 1, perPage: $perPage) {
			media(id_in: $mediaIds, type: ANIME, isAdult: false) {
				${MEDIA_SUMMARY_FIELDS}
			}
		}
	}
`

const MEDIA_LIST_ENTRY_QUERY = `
	query AniToolsMediaListEntry($userId: Int!, $mediaId: Int!) {
		MediaList(userId: $userId, mediaId: $mediaId, type: ANIME) {
			id
			status
		}
	}
`

const SAVE_MEDIA_LIST_ENTRY_MUTATION = `
	mutation AniToolsSaveMediaListEntry($mediaId: Int!) {
		SaveMediaListEntry(mediaId: $mediaId, status: PLANNING) {
			id
			mediaId
			status
		}
	}
`

const usernameSchema = z.string()
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
const mediaIdSchema = z.coerce.number().int().positive().max(10_000_000)
const activityTimestampSchema = z.coerce.number()
	.int()
	.min(MIN_ACTIVITY_TIMESTAMP)
	.max(MAX_ACTIVITY_TIMESTAMP)

const profileQuerySchema = z.object({
	username: optionalUsernameSchema
}).strict()

const animeListQuerySchema = z.object({
	username: optionalUsernameSchema,
	page: pageSchema,
	perPage: listPageSizeSchema,
	status: z.enum(ANILIST_LIST_STATUSES).optional(),
	sort: z.enum(ANILIST_LIST_SORTS).default("updated")
}).strict()

const statisticsQuerySchema = z.object({
	username: optionalUsernameSchema
}).strict()

const activitiesQuerySchema = z.object({
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

const recommendationsQuerySchema = z.object({
	username: optionalUsernameSchema,
	mediaId: mediaIdSchema,
	page: pageSchema,
	perPage: explorePageSizeSchema
}).strict()

const studioMediaQuerySchema = z.object({
	username: optionalUsernameSchema,
	studioId: mediaIdSchema,
	page: pageSchema,
	perPage: explorePageSizeSchema
}).strict()

const searchTextSchema = z.string().trim().min(1).max(MAX_SEARCH_LENGTH)

const mediaQuerySchema = z.object({
	id: mediaIdSchema
}).strict()

const saveMediaListEntryBodySchema = z.object({
	mediaId: mediaIdSchema
}).strict()

const airingSchedulesQuerySchema = z.object({
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

const mediaIdsSchema = z.array(mediaIdSchema)
	.min(1)
	.max(MAX_MEDIA_BATCH_SIZE)
	.transform(mediaIds => [...new Set(mediaIds)])

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

const accessSchema = z.discriminatedUnion("mode", [
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

const graphQLResponseSchema = z.object({
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

const profileSchema = z.object({
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

const searchMediaSchema = z.object({
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

const mediaSchema = z.object({
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
const mediaListSchema = mediaSchema.partial({
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

const airingScheduleSchema = z.object({
	airingAt: z.number().int().positive().max(GRAPHQL_INT_MAX),
	episode: z.number().int().positive(),
	timeUntilAiring: z.number().int().nullable(),
	media: mediaListSchema.nullable()
})

const nullablePageInfoSchema = z.object({
	currentPage: z.number().int().positive().nullable(),
	hasNextPage: z.boolean().nullable(),
	lastPage: z.number().int().positive().nullable(),
	perPage: z.number().int().positive().nullable(),
	total: z.number().int().nonnegative().nullable()
})

const animeListEntrySchema = z.object({
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

const statisticStaffSchema = z.object({
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

const statisticsSchema = z.object({
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

const activitySchema = z.discriminatedUnion("__typename", [
	listActivitySchema,
	textActivitySchema,
	messageActivitySchema
])

const recommendationSchema = z.object({
	id: z.number().int().positive(),
	rating: z.number().int().min(-1_000_000).max(10_000_000).nullable(),
	mediaRecommendation: mediaSchema.nullable()
})

const studioSchema = z.object({
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

const listSortMap: Record<AniListListSort, string> = {
	updated: "UPDATED_TIME_DESC",
	score: "SCORE_DESC",
	title: "MEDIA_TITLE_ROMAJI",
	progress: "PROGRESS_DESC"
}

const activityTypeMap: Record<Exclude<AniListActivityKind, "all">, string> = {
	anime: "ANIME_LIST",
	text: "TEXT",
	message: "MESSAGE"
}

function invalidQuery(result: z.ZodError) {
	return createError({
		statusCode: 400,
		statusMessage: result.issues[0]?.message || "Invalid AniList query"
	})
}

function parseQuery<T>(schema: z.ZodType<T>, query: unknown): T {
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

function sourceFromAccess(access: AniListAccess): AniListSource {
	return {
		mode: access.mode,
		username: access.username
	}
}

function normalizePageInfo(
	pageInfo: z.infer<typeof nullablePageInfoSchema>,
	page: number,
	perPage: number
): AniListPageInfo {
	return {
		currentPage: pageInfo.currentPage ?? page,
		hasNextPage: pageInfo.hasNextPage ?? false,
		lastPage: pageInfo.lastPage,
		perPage: pageInfo.perPage ?? perPage,
		total: pageInfo.total ?? 0
	}
}

function withoutNulls<T>(items: ReadonlyArray<T | null> | null): T[] {
	return (items ?? []).filter((item): item is T => item !== null)
}

function normalizeStudios(
	studios: z.infer<typeof mediaSchema>["studios"]
): AniListMediaSummary["studios"] {
	return studios
		? {
				edges: (studios.edges ?? [])
					.flatMap(edge => edge?.node
						? [{ isMain: edge.isMain, node: edge.node }]
						: [])
			}
		: null
}

function normalizeRelations<Edge>(
	relations: { edges: ReadonlyArray<Edge | null> | null } | null
): { edges: Edge[] } | null {
	return relations ? { edges: withoutNulls(relations.edges) } : null
}

function normalizeMedia(
	media: z.infer<typeof mediaSchema>
): AniListMediaSummary {
	return {
		...media,
		genres: withoutNulls(media.genres),
		tags: withoutNulls(media.tags),
		studios: normalizeStudios(media.studios),
		rankings: withoutNulls(media.rankings),
		externalLinks: withoutNulls(media.externalLinks),
		relations: normalizeRelations(media.relations)
	}
}

/**
 * List media: the details-view fields MEDIA_LIST_FIELDS does not select stay absent rather than
 * becoming `null` or `[]`, because `hasMediaDetails` reads `undefined` as "not fetched yet".
 */
function normalizeListMedia(
	media: z.infer<typeof mediaListSchema>
): AniListMediaListSummary {
	const { rankings, externalLinks, ...rest } = media
	return {
		...rest,
		genres: withoutNulls(media.genres),
		tags: withoutNulls(media.tags),
		studios: normalizeStudios(media.studios),
		...(rankings === undefined ? {} : { rankings: withoutNulls(rankings) }),
		...(externalLinks === undefined ? {} : { externalLinks: withoutNulls(externalLinks) }),
		relations: normalizeRelations(media.relations)
	}
}

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

function upstreamError(
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

async function requestAniList<T>(
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
