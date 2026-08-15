import type { AniListAnimeListEntry } from "~~/shared/types/anilist"
import type { RewindAnimeMetric, RewindBreakdown } from "~/utils/rewind"
import { getEntryWatchMinutes } from "~/utils/statistics"

export interface AllTimeRewindSummary {
	flopAnime: RewindAnimeMetric[]
	highlight: RewindAnimeMetric | null
	longestAnime: RewindAnimeMetric | null
	seasons: RewindBreakdown[]
	topAnime: RewindAnimeMetric[]
}

function getTitle(entry: AniListAnimeListEntry): string {
	return entry.media?.title?.userPreferred
		?? entry.media?.title?.english
		?? entry.media?.title?.romaji
		?? `Anime #${entry.media?.id ?? entry.id}`
}

function toMetric(entry: AniListAnimeListEntry): RewindAnimeMetric {
	const progress = Math.max(0, entry.progress ?? 0)
	const episodesPerRun = Math.max(progress, entry.media?.episodes ?? 0)
	const episodes = progress + (Math.max(0, entry.repeat ?? 0) * episodesPerRun)

	return {
		entry,
		episodes,
		minutesWatched: getEntryWatchMinutes(entry)
	}
}

export function buildAllTimeRewindSummary(
	entries: readonly AniListAnimeListEntry[]
): AllTimeRewindSummary {
	const metrics = entries
		.filter(entry => entry.media && entry.status !== "PLANNING")
		.map(toMetric)
	const ranked = metrics
		.filter(item => (item.entry.score ?? 0) > 0)
		.toSorted((left, right) =>
			(right.entry.score ?? 0) - (left.entry.score ?? 0)
			|| right.minutesWatched - left.minutesWatched
			|| getTitle(left.entry).localeCompare(getTitle(right.entry))
		)
	const topAnime = ranked.slice(0, 3)
	const flopAnime = ranked
		.toSorted((left, right) =>
			(left.entry.score ?? 0) - (right.entry.score ?? 0)
			|| right.minutesWatched - left.minutesWatched
			|| getTitle(left.entry).localeCompare(getTitle(right.entry))
		)
		.slice(0, 3)
	const longestAnime = metrics
		.filter(item => item.minutesWatched > 0)
		.toSorted((left, right) =>
			right.minutesWatched - left.minutesWatched
			|| right.episodes - left.episodes
			|| getTitle(left.entry).localeCompare(getTitle(right.entry))
		)[0] ?? null
	const seasonCounts = new Map<string, number>()

	for (const item of metrics) {
		const season = item.entry.media?.season
		if (season) seasonCounts.set(season, (seasonCounts.get(season) ?? 0) + 1)
	}

	const seasons = [...seasonCounts]
		.map(([name, count]): RewindBreakdown => ({
			name,
			count,
			meanScore: 0,
			minutesWatched: metrics
				.filter(item => item.entry.media?.season === name)
				.reduce((total, item) => total + item.minutesWatched, 0),
			entries: metrics
				.filter(item => item.entry.media?.season === name)
				.map(item => item.entry)
		}))
		.toSorted((left, right) => right.count - left.count || left.name.localeCompare(right.name))

	return {
		topAnime,
		flopAnime,
		longestAnime,
		highlight: topAnime[0] ?? longestAnime,
		seasons
	}
}
