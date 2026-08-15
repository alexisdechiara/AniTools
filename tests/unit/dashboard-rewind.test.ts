import { describe, expect, it } from "vitest"
import type {
	AniListAnimeListEntry,
	AniListMediaSummary
} from "../../shared/types/anilist"
import { buildAllTimeRewindSummary } from "../../app/utils/dashboard-rewind"

function entry(
	id: number,
	score: number,
	season: string,
	progress = 12,
	status: AniListAnimeListEntry["status"] = "COMPLETED"
): AniListAnimeListEntry {
	const media: AniListMediaSummary = {
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
		duration: 24,
		genres: [],
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
		siteUrl: null,
		studios: null,
		rankings: [],
		externalLinks: [],
		trailer: null,
		relations: null
	}

	return {
		id,
		status,
		score,
		progress,
		repeat: 0,
		priority: 0,
		updatedAt: 0,
		startedAt: null,
		completedAt: null,
		media
	}
}

describe("all-time dashboard Rewind", () => {
	it("builds deterministic rankings and excludes planning entries", () => {
		const entries = [
			entry(1, 95, "SPRING"),
			entry(2, 40, "WINTER"),
			entry(3, 80, "SPRING"),
			entry(4, 10, "SUMMER", 0, "PLANNING")
		]
		const summary = buildAllTimeRewindSummary(entries)

		expect(summary.topAnime.map(item => item.entry.id)).toEqual([1, 3, 2])
		expect(summary.flopAnime.map(item => item.entry.id)).toEqual([2, 3, 1])
		expect(summary.highlight?.entry.id).toBe(1)
		expect(summary.seasons.map(item => [item.name, item.count])).toEqual([
			["SPRING", 2],
			["WINTER", 1]
		])
	})
})
