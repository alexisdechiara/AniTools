import { describe, expect, it, vi } from "vitest"
import type {
	AniListActivitiesResponse,
	AniListAnimeActivity,
	AniListAnimeListEntry,
	AniListMediaSummary
} from "../../shared/types/anilist"
import {
	buildRewindSummary,
	collectRewindActivities,
	getActivityEpisodeIncrement,
	getRewindYears,
	normalizeRewindYear
} from "../../app/utils/rewind"

function media(
	id: number,
	genres: string[],
	season: string,
	duration: number
): AniListMediaSummary {
	return {
		id,
		idMal: null,
		type: "ANIME",
		title: {
			english: `Anime ${id}`,
			native: null,
			romaji: `Anime ${id}`,
			userPreferred: `Anime ${id}`
		},
		coverImage: null,
		bannerImage: null,
		description: null,
		format: "TV",
		status: "FINISHED",
		episodes: 12,
		duration,
		genres,
		countryOfOrigin: "JP",
		season,
		seasonYear: 2025,
		startDate: null,
		endDate: null,
		averageScore: 75,
		meanScore: 75,
		popularity: 1,
		favourites: 0,
		isFavourite: false,
		isAdult: false,
		tags: [],
		nextAiringEpisode: null,
		siteUrl: `https://anilist.co/anime/${id}`,
		studios: null,
		rankings: [],
		externalLinks: [],
		trailer: null,
		relations: null
	}
}

function entry(
	id: number,
	score: number,
	status: AniListAnimeListEntry["status"],
	anime: AniListMediaSummary
): AniListAnimeListEntry {
	return {
		id,
		score,
		status,
		progress: 0,
		repeat: 0,
		priority: 0,
		updatedAt: 0,
		startedAt: null,
		completedAt: null,
		media: anime
	}
}

function activity(
	id: number,
	mediaId: number,
	date: string,
	progress: string,
	status = "watched episode"
): AniListAnimeActivity {
	return {
		kind: "anime",
		id,
		type: "ANIME_LIST",
		status,
		progress,
		createdAt: Math.floor(new Date(date).getTime() / 1000),
		replyCount: 0,
		user: null,
		media: {
			id: mediaId,
			title: null,
			coverImage: null,
			format: "TV",
			siteUrl: null
		}
	}
}

function activityPage(
	page: number,
	hasNextPage: boolean,
	activities: AniListAnimeActivity[]
): AniListActivitiesResponse {
	return {
		source: { mode: "public", username: "Alexis" },
		pageInfo: {
			currentPage: page,
			hasNextPage,
			lastPage: hasNextPage ? page + 1 : page,
			perPage: 50,
			total: activities.length
		},
		activities
	}
}

describe("Rewind year helpers", () => {
	it("accepts only supported complete years", () => {
		expect(normalizeRewindYear("2025", 2026)).toBe(2025)
		expect(normalizeRewindYear("25", 2026)).toBeNull()
		expect(normalizeRewindYear("2027", 2026)).toBeNull()
		expect(normalizeRewindYear(1999, 2026)).toBeNull()
		expect(getRewindYears(2002)).toEqual([2002, 2001, 2000])
	})
})

describe("Rewind episode reconstruction", () => {
	it("counts ranges, deltas and rewatch resets without inflating the first update", () => {
		expect(getActivityEpisodeIncrement({
			status: "watched episode",
			progress: "8"
		})).toEqual({ episodes: 1, progress: 8 })
		expect(getActivityEpisodeIncrement({
			status: "watched episodes",
			progress: "9 - 11"
		}, 8)).toEqual({ episodes: 3, progress: 11 })
		expect(getActivityEpisodeIncrement({
			status: "watched episode",
			progress: "11"
		}, 11)).toEqual({ episodes: 0, progress: 11 })
		expect(getActivityEpisodeIncrement({
			status: "rewatched episode",
			progress: "1"
		}, 11)).toEqual({ episodes: 1, progress: 1 })
		expect(getActivityEpisodeIncrement({
			status: "completed",
			progress: null
		}, 1)).toEqual({ episodes: 0, progress: 1 })
	})
})

describe("Rewind aggregation", () => {
	it("builds annual metrics from real list activity and current media metadata", () => {
		const firstMedia = media(1, ["Action", "Comedy"], "WINTER", 24)
		const secondMedia = media(2, ["Action", "Drama"], "SPRING", 20)
		const entries = [
			entry(101, 90, "COMPLETED", firstMedia),
			entry(102, 55, "DROPPED", secondMedia)
		]
		const activities = [
			activity(1, 1, "2025-01-01T12:00:00Z", "1"),
			activity(2, 1, "2025-01-02T12:00:00Z", "2 - 4"),
			activity(3, 1, "2025-01-03T12:00:00Z", "4"),
			activity(4, 2, "2025-02-01T12:00:00Z", "5"),
			activity(5, 2, "2024-12-31T23:59:59Z", "4")
		]

		const summary = buildRewindSummary(2025, activities, entries)

		expect(summary.activityCount).toBe(4)
		expect(summary.animeCount).toBe(2)
		expect(summary.episodesWatched).toBe(5)
		expect(summary.minutesWatched).toBe(116)
		expect(summary.genres[0]).toMatchObject({
			name: "Action",
			count: 2,
			meanScore: 72.5,
			minutesWatched: 116
		})
		expect(summary.seasons.map(item => item.name)).toEqual(["WINTER", "SPRING"])
		expect(summary.topAnime.map(item => item.entry.id)).toEqual([101, 102])
		expect(summary.flopAnime.map(item => item.entry.id)).toEqual([102, 101])
		expect(summary.longestAnime?.entry.id).toBe(101)
		expect(summary.activityCounts).toEqual({
			"2025-01-01": 1,
			"2025-01-02": 1,
			"2025-01-03": 1,
			"2025-02-01": 1
		})
	})

	it("tracks feed anime missing from the current list", () => {
		const summary = buildRewindSummary(
			2025,
			[activity(1, 999, "2025-06-01T12:00:00Z", "1")],
			[]
		)

		expect(summary.animeCount).toBe(1)
		expect(summary.matchedAnimeCount).toBe(0)
		expect(summary.minutesWatched).toBe(0)
	})

	it("does not count planning-only updates as watched anime", () => {
		const summary = buildRewindSummary(
			2025,
			[activity(
				1,
				999,
				"2025-06-01T12:00:00Z",
				"",
				"plans to watch"
			)],
			[]
		)

		expect(summary.activityCount).toBe(1)
		expect(summary.animeCount).toBe(0)
		expect(summary.episodesWatched).toBe(0)
	})
})

describe("Rewind pagination", () => {
	it("de-duplicates activities and reports the safety cap", async () => {
		const fetchPage = vi.fn(async (page: number) =>
			activityPage(
				page,
				true,
				[activity(page, 1, `2025-01-0${page}T12:00:00Z`, String(page))]
			)
		)

		const result = await collectRewindActivities(fetchPage, 2)

		expect(fetchPage).toHaveBeenCalledTimes(2)
		expect(result.activities.map(item => item.id)).toEqual([2, 1])
		expect(result.truncated).toBe(true)
	})
})
