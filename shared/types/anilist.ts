export const ANILIST_LIST_STATUSES = [
	"CURRENT",
	"PLANNING",
	"COMPLETED",
	"DROPPED",
	"PAUSED",
	"REPEATING"
] as const

export const ANILIST_LIST_SORTS = [
	"updated",
	"score",
	"title",
	"progress"
] as const

export const ANILIST_ACTIVITY_KINDS = [
	"anime",
	"text",
	"message",
	"all"
] as const

export type AniListAccessMode = "oauth" | "public"
export type AniListListStatus = typeof ANILIST_LIST_STATUSES[number]
export type AniListListSort = typeof ANILIST_LIST_SORTS[number]
export type AniListActivityKind = typeof ANILIST_ACTIVITY_KINDS[number]

export interface AniListSource {
	mode: AniListAccessMode
	username: string
}

export interface AniListPageInfo {
	currentPage: number
	hasNextPage: boolean
	lastPage: number | null
	perPage: number
	total: number
}

export interface AniListFuzzyDate {
	day: number | null
	month: number | null
	year: number | null
}

export interface AniListImage {
	large: string | null
	medium: string | null
}

export interface AniListProfile {
	id: number
	name: string
	about: string | null
	avatar: AniListImage | null
	bannerImage: string | null
	createdAt: number | null
	siteUrl: string | null
	updatedAt: number | null
	options: {
		displayAdultContent: boolean | null
		profileColor: string | null
		timezone: string | null
		titleLanguage: string | null
	} | null
	mediaListOptions: {
		rowOrder: string | null
		scoreFormat: string | null
	} | null
}

export interface AniListMediaSummary {
	id: number
	idMal: number | null
	title: {
		english: string | null
		native: string | null
		romaji: string | null
		userPreferred: string | null
	} | null
	coverImage: {
		color: string | null
		extraLarge: string | null
		large: string | null
		medium: string | null
	} | null
	bannerImage: string | null
	description: string | null
	format: string | null
	status: string | null
	episodes: number | null
	duration: number | null
	genres: string[]
	countryOfOrigin: string | null
	season: string | null
	seasonYear: number | null
	startDate: AniListFuzzyDate | null
	endDate: AniListFuzzyDate | null
	averageScore: number | null
	meanScore: number | null
	popularity: number | null
	favourites: number | null
	isFavourite: boolean
	isAdult: boolean | null
	tags: Array<{
		id: number
		name: string
		category: string | null
		rank: number | null
		isAdult: boolean
		isGeneralSpoiler: boolean
		isMediaSpoiler: boolean
	}>
	nextAiringEpisode: {
		airingAt: number
		episode: number
		timeUntilAiring: number
	} | null
	siteUrl: string | null
	studios: {
		edges: Array<{
			isMain: boolean
			node: {
				id: number
				isAnimationStudio: boolean
				name: string
				siteUrl: string | null
			}
		}>
	} | null
	rankings: Array<{
		allTime: boolean | null
		context: string
		rank: number
		season: string | null
		type: string
		year: number | null
	}>
	externalLinks: Array<{
		color: string | null
		language: string | null
		site: string
		url: string | null
	}>
	trailer: {
		id: string | null
		site: string | null
		thumbnail: string | null
	} | null
	relations: {
		edges: Array<{
			relationType: string | null
			node: {
				id: number
				format: string | null
				title: AniListMediaSummary["title"]
			} | null
		}>
	} | null
}

export interface AniListAnimeListEntry {
	id: number
	status: AniListListStatus | null
	score: number | null
	progress: number | null
	repeat: number | null
	priority: number | null
	updatedAt: number | null
	startedAt: AniListFuzzyDate | null
	completedAt: AniListFuzzyDate | null
	media: AniListMediaSummary | null
}

export interface AniListProfileResponse {
	source: AniListSource
	profile: AniListProfile
}

export interface AniListAnimeListResponse {
	source: AniListSource
	pageInfo: AniListPageInfo
	entries: AniListAnimeListEntry[]
}

export interface AniListStatisticMetric {
	count: number
	meanScore: number
	minutesWatched: number
	mediaIds: number[]
}

export interface AniListStatistics {
	count: number
	meanScore: number
	minutesWatched: number
	episodesWatched: number
	statuses: Array<AniListStatisticMetric & { status: string | null }>
	scores: Array<AniListStatisticMetric & { score: number | null }>
	formats: Array<AniListStatisticMetric & { format: string | null }>
	countries: Array<AniListStatisticMetric & { country: string | null }>
	genres: Array<AniListStatisticMetric & { genre: string | null }>
	tags: Array<AniListStatisticMetric & {
		tag: {
			id: number
			name: string
			category: string | null
			isAdult: boolean
		} | null
	}>
	startYears: Array<AniListStatisticMetric & { startYear: number | null }>
	releaseYears: Array<AniListStatisticMetric & { releaseYear: number | null }>
	studios: Array<AniListStatisticMetric & {
		studio: {
			id: number
			name: string
			isAnimationStudio: boolean
		} | null
	}>
	lengths: Array<AniListStatisticMetric & { length: string | null }>
}

export interface AniListStatisticsResponse {
	source: AniListSource
	statistics: AniListStatistics
}

export interface AniListActivityMedia {
	id: number
	title: AniListMediaSummary["title"]
	coverImage: Pick<NonNullable<AniListMediaSummary["coverImage"]>, "color" | "large" | "medium"> | null
	format: string | null
	siteUrl: string | null
}

export interface AniListActivityActor {
	id: number
	name: string
	avatar: AniListImage | null
}

export interface AniListActivityBase {
	id: number
	createdAt: number
	replyCount: number
	type: string | null
	user: AniListActivityActor | null
}

export interface AniListAnimeActivity extends AniListActivityBase {
	kind: "anime"
	status: string | null
	progress: string | null
	media: AniListActivityMedia | null
}

export interface AniListTextActivity extends AniListActivityBase {
	kind: "text"
	text: string
}

export interface AniListMessageActivity extends AniListActivityBase {
	kind: "message"
	message: string
	messenger: AniListActivityActor | null
}

export type AniListActivity =
	| AniListAnimeActivity
	| AniListTextActivity
	| AniListMessageActivity

export interface AniListActivitiesResponse {
	source: AniListSource
	pageInfo: AniListPageInfo
	activities: AniListActivity[]
}
