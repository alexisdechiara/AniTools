import type {
	AniListActivitiesResponse,
	AniListAnimeActivity,
	AniListAnimeListEntry,
	AniListSource
} from "~~/shared/types/anilist"

export const MIN_REWIND_YEAR = 2000
export const MAX_REWIND_ACTIVITY_PAGES = 20

export interface RewindBreakdown {
	name: string
	count: number
	meanScore: number
	minutesWatched: number
	entries: AniListAnimeListEntry[]
}

export interface RewindAnimeMetric {
	entry: AniListAnimeListEntry
	episodes: number
	minutesWatched: number
}

export interface RewindSummary {
	activityCount: number
	animeCount: number
	episodesWatched: number
	minutesWatched: number
	activityCounts: Record<string, number>
	statuses: RewindBreakdown[]
	genres: RewindBreakdown[]
	tags: RewindBreakdown[]
	seasons: RewindBreakdown[]
	topAnime: RewindAnimeMetric[]
	flopAnime: RewindAnimeMetric[]
	selection: RewindAnimeMetric | null
	longestAnime: RewindAnimeMetric | null
	matchedAnimeCount: number
}

export interface CollectedRewindActivities {
	activities: AniListAnimeActivity[]
	source: AniListSource | null
	truncated: boolean
}

interface ParsedProgress {
	end: number
	increment: number | null
}

interface AnimeAccumulator {
	entry: AniListAnimeListEntry
	episodes: number
	minutesWatched: number
}

type FetchActivityPage = (page: number) => Promise<AniListActivitiesResponse>

export function normalizeRewindYear(
	value: unknown,
	currentYear = new Date().getUTCFullYear()
): number | null {
	const normalized = typeof value === "number"
		? value
		: typeof value === "string" && /^\d{4}$/.test(value)
			? Number(value)
			: Number.NaN

	return Number.isInteger(normalized)
		&& normalized >= MIN_REWIND_YEAR
		&& normalized <= currentYear
		? normalized
		: null
}

export function getRewindYears(
	currentYear = new Date().getUTCFullYear()
): number[] {
	return Array.from(
		{ length: Math.max(0, currentYear - MIN_REWIND_YEAR + 1) },
		(_, index) => currentYear - index
	)
}

function parseProgress(progress: string | null): ParsedProgress | null {
	if (!progress) return null

	const values = progress
		.match(/\d+/g)
		?.map(Number)
		.filter(value => Number.isSafeInteger(value) && value >= 0)

	if (!values?.length) return null

	const start = values[0] ?? 0
	const end = values[1] ?? start
	if (end < start) return { end: start, increment: null }

	return {
		end,
		increment: values.length >= 2 ? end - start + 1 : null
	}
}

export function getActivityEpisodeIncrement(
	activity: Pick<AniListAnimeActivity, "progress" | "status">,
	previousProgress?: number
): { episodes: number, progress?: number } {
	const status = activity.status?.toLocaleLowerCase("en") ?? ""
	if (!status.includes("episode")) {
		return { episodes: 0, progress: previousProgress }
	}

	const parsed = parseProgress(activity.progress)
	if (!parsed) return { episodes: 0, progress: previousProgress }

	if (parsed.increment !== null) {
		return {
			episodes: Math.min(10_000, parsed.increment),
			progress: parsed.end
		}
	}

	if (previousProgress === undefined || parsed.end < previousProgress) {
		return { episodes: 1, progress: parsed.end }
	}

	return {
		episodes: Math.min(10_000, Math.max(0, parsed.end - previousProgress)),
		progress: parsed.end
	}
}

function getDateKey(timestamp: number): string {
	return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function isWatchRelatedActivity(activity: AniListAnimeActivity): boolean {
	const status = activity.status?.toLocaleLowerCase("en") ?? ""
	return !status.includes("plan to watch")
		&& !status.includes("plans to watch")
		&& !status.includes("planning")
}

function getTitle(entry: AniListAnimeListEntry): string {
	return entry.media?.title?.userPreferred
		|| entry.media?.title?.english
		|| entry.media?.title?.romaji
		|| `Anime #${entry.media?.id ?? entry.id}`
}

function getMeanScore(entries: readonly AniListAnimeListEntry[]): number {
	const scores = entries
		.map(entry => entry.score ?? 0)
		.filter(score => score > 0)

	if (!scores.length) return 0
	return scores.reduce((total, score) => total + score, 0) / scores.length
}

function createBreakdowns(
	accumulators: readonly AnimeAccumulator[],
	getKeys: (entry: AniListAnimeListEntry) => readonly string[]
): RewindBreakdown[] {
	const groups = new Map<string, AnimeAccumulator[]>()

	for (const accumulator of accumulators) {
		for (const key of new Set(getKeys(accumulator.entry).filter(Boolean))) {
			const group = groups.get(key) ?? []
			group.push(accumulator)
			groups.set(key, group)
		}
	}

	return [...groups.entries()]
		.map(([name, items]) => {
			const entries = items.map(item => item.entry)
			return {
				name,
				count: entries.length,
				meanScore: getMeanScore(entries),
				minutesWatched: items.reduce(
					(total, item) => total + item.minutesWatched,
					0
				),
				entries
			}
		})
		.toSorted((left, right) =>
			right.count - left.count
			|| right.minutesWatched - left.minutesWatched
			|| left.name.localeCompare(right.name)
		)
}

function toAnimeMetric(accumulator: AnimeAccumulator): RewindAnimeMetric {
	return {
		entry: accumulator.entry,
		episodes: accumulator.episodes,
		minutesWatched: accumulator.minutesWatched
	}
}

export function buildRewindSummary(
	year: number,
	activities: readonly AniListAnimeActivity[],
	entries: readonly AniListAnimeListEntry[]
): RewindSummary {
	const normalizedYear = normalizeRewindYear(year)
	if (normalizedYear === null) {
		throw new RangeError("The Rewind year is outside the supported range.")
	}

	const yearlyActivities = activities
		.filter(activity =>
			new Date(activity.createdAt * 1000).getUTCFullYear() === normalizedYear
		)
		.toSorted((left, right) => left.createdAt - right.createdAt || left.id - right.id)
	const entryByMediaId = new Map(
		entries
			.filter(entry => entry.media)
			.map(entry => [entry.media!.id, entry])
	)
	const activeMediaIds = new Set<number>()
	const episodesByMediaId = new Map<number, number>()
	const progressByMediaId = new Map<number, number>()
	const activityCounts: Record<string, number> = {}

	for (const activity of yearlyActivities) {
		activityCounts[getDateKey(activity.createdAt)]
			= (activityCounts[getDateKey(activity.createdAt)] ?? 0) + 1

		const mediaId = activity.media?.id
		if (!mediaId) continue
		if (isWatchRelatedActivity(activity)) {
			activeMediaIds.add(mediaId)
		}

		const result = getActivityEpisodeIncrement(
			activity,
			progressByMediaId.get(mediaId)
		)
		if (result.progress !== undefined) {
			progressByMediaId.set(mediaId, result.progress)
		}
		episodesByMediaId.set(
			mediaId,
			(episodesByMediaId.get(mediaId) ?? 0) + result.episodes
		)
	}

	const accumulators = [...activeMediaIds]
		.map((mediaId): AnimeAccumulator | null => {
			const entry = entryByMediaId.get(mediaId)
			if (!entry) return null

			const episodes = episodesByMediaId.get(mediaId) ?? 0
			return {
				entry,
				episodes,
				minutesWatched: episodes * Math.max(0, entry.media?.duration ?? 0)
			}
		})
		.filter((item): item is AnimeAccumulator => item !== null)

	const ranked = accumulators
		.filter(item => (item.entry.score ?? 0) > 0)
		.toSorted((left, right) =>
			(right.entry.score ?? 0) - (left.entry.score ?? 0)
			|| right.minutesWatched - left.minutesWatched
			|| getTitle(left.entry).localeCompare(getTitle(right.entry))
		)
	const longest = accumulators
		.filter(item => item.minutesWatched > 0)
		.toSorted((left, right) =>
			right.minutesWatched - left.minutesWatched
			|| right.episodes - left.episodes
			|| getTitle(left.entry).localeCompare(getTitle(right.entry))
		)[0] ?? null
	const topAnime = ranked.slice(0, 3).map(toAnimeMetric)
	const flopAnime = ranked
		.toSorted((left, right) =>
			(left.entry.score ?? 0) - (right.entry.score ?? 0)
			|| right.minutesWatched - left.minutesWatched
			|| getTitle(left.entry).localeCompare(getTitle(right.entry))
		)
		.slice(0, 3)
		.map(toAnimeMetric)

	return {
		activityCount: yearlyActivities.length,
		animeCount: activeMediaIds.size,
		episodesWatched: [...episodesByMediaId.values()]
			.reduce((total, count) => total + count, 0),
		minutesWatched: accumulators
			.reduce((total, item) => total + item.minutesWatched, 0),
		activityCounts,
		statuses: createBreakdowns(accumulators, entry =>
			entry.status ? [entry.status] : []
		),
		genres: createBreakdowns(accumulators, entry => entry.media?.genres ?? []),
		tags: createBreakdowns(accumulators, entry =>
			entry.media?.tags.map(tag => tag.name) ?? []
		),
		seasons: createBreakdowns(accumulators, entry =>
			entry.media?.season ? [entry.media.season] : []
		),
		topAnime,
		flopAnime,
		selection: topAnime[0] ?? (longest ? toAnimeMetric(longest) : null),
		longestAnime: longest ? toAnimeMetric(longest) : null,
		matchedAnimeCount: accumulators.length
	}
}

export async function collectRewindActivities(
	fetchPage: FetchActivityPage,
	maxPages = MAX_REWIND_ACTIVITY_PAGES
): Promise<CollectedRewindActivities> {
	const activitiesById = new Map<number, AniListAnimeActivity>()
	let source: AniListSource | null = null
	let page = 1
	let hasNextPage = true

	while (hasNextPage && page <= Math.max(1, maxPages)) {
		const response = await fetchPage(page)
		source = response.source

		for (const activity of response.activities) {
			if (activity.kind === "anime") {
				activitiesById.set(activity.id, activity)
			}
		}

		hasNextPage = response.pageInfo.hasNextPage
		page += 1
	}

	return {
		activities: [...activitiesById.values()]
			.toSorted((left, right) => right.createdAt - left.createdAt || right.id - left.id),
		source,
		truncated: hasNextPage
	}
}
