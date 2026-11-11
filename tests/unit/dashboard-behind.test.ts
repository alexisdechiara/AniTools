import { describe, expect, it } from "vitest"
import type {
	AniListAnimeListEntry,
	AniListMediaSummary
} from "../../shared/types/anilist"
import { selectBehindEntries } from "../../app/utils/dashboard-behind"

interface EntryOptions {
	status?: AniListAnimeListEntry["status"]
	progress?: number | null
	nextEpisode?: number | null
	title?: string | null
	episodes?: number | null
}

function entry(id: number, options: EntryOptions = {}): AniListAnimeListEntry {
	const title = options.title === undefined ? `Anime ${id}` : options.title
	const nextEpisode = options.nextEpisode === undefined ? 5 : options.nextEpisode
	const media: AniListMediaSummary = {
		id,
		idMal: null,
		type: "ANIME",
		title: title === null
			? null
			: { english: title, native: null, romaji: title, userPreferred: title },
		coverImage: null,
		bannerImage: null,
		description: null,
		format: "TV",
		status: "RELEASING",
		episodes: options.episodes === undefined ? 12 : options.episodes,
		duration: 24,
		genres: [],
		countryOfOrigin: "JP",
		season: "FALL",
		seasonYear: 2026,
		startDate: null,
		endDate: null,
		averageScore: 75,
		meanScore: 75,
		popularity: 1,
		favourites: 0,
		isFavourite: false,
		isAdult: false,
		tags: [],
		nextAiringEpisode: nextEpisode === null
			? null
			: { airingAt: 1_800_000_000, episode: nextEpisode, timeUntilAiring: 3_600 },
		siteUrl: null,
		studios: null,
		rankings: [],
		externalLinks: [],
		trailer: null,
		relations: null
	}

	return {
		id,
		status: options.status === undefined ? "CURRENT" : options.status,
		score: null,
		progress: options.progress === undefined ? 0 : options.progress,
		repeat: 0,
		priority: 0,
		updatedAt: 0,
		startedAt: null,
		completedAt: null,
		media
	}
}

describe("selectBehindEntries", () => {
	it("counts the aired episodes the user has not watched", () => {
		// Episode 5 airs next, so episodes 1 to 4 have aired and the user saw 1 and 2.
		const result = selectBehindEntries([entry(1, { nextEpisode: 5, progress: 2 })], 10)

		expect(result).toHaveLength(1)
		expect(result[0]!.behind).toBe(2)
		expect(result[0]!.entry.id).toBe(1)
	})

	it("treats a null progress as zero", () => {
		const result = selectBehindEntries([entry(1, { nextEpisode: 4, progress: null })], 10)

		expect(result.map(item => item.behind)).toEqual([3])
	})

	it("excludes titles that are up to date", () => {
		const result = selectBehindEntries([
			entry(1, { nextEpisode: 5, progress: 4 }),
			entry(2, { nextEpisode: 1, progress: 0 })
		], 10)

		expect(result).toEqual([])
	})

	it("clamps a progress ahead of the broadcast to zero and excludes it", () => {
		// A batch release or a delayed schedule can leave progress above the aired count.
		const result = selectBehindEntries([entry(1, { nextEpisode: 3, progress: 9 })], 10)

		expect(result).toEqual([])
	})

	it("ignores a negative progress", () => {
		const result = selectBehindEntries([entry(1, { nextEpisode: 4, progress: -2 })], 10)

		expect(result.map(item => item.behind)).toEqual([3])
	})

	it("excludes entries without a next airing episode", () => {
		const result = selectBehindEntries([
			entry(1, { nextEpisode: null, progress: 0 }),
			entry(2, { nextEpisode: 6, progress: 0 })
		], 10)

		expect(result.map(item => item.entry.id)).toEqual([2])
	})

	it("excludes entries without media", () => {
		const withoutMedia: AniListAnimeListEntry = { ...entry(1), media: null }

		expect(selectBehindEntries([withoutMedia], 10)).toEqual([])
	})

	it("keeps only the CURRENT status", () => {
		const result = selectBehindEntries([
			entry(1, { status: "CURRENT" }),
			entry(2, { status: "PAUSED" }),
			entry(3, { status: "PLANNING" }),
			entry(4, { status: "DROPPED" }),
			entry(5, { status: "COMPLETED" }),
			entry(6, { status: "REPEATING" }),
			entry(7, { status: null })
		], 10)

		expect(result.map(item => item.entry.id)).toEqual([1])
	})

	it("does not need the total episode count", () => {
		const result = selectBehindEntries([
			entry(1, { episodes: null, nextEpisode: 4, progress: 1 })
		], 10)

		expect(result.map(item => item.behind)).toEqual([2])
	})

	it("rejects a malformed next episode number", () => {
		const result = selectBehindEntries([
			entry(1, { nextEpisode: 0 }),
			entry(2, { nextEpisode: -3 }),
			entry(3, { nextEpisode: 3.5 })
		], 10)

		expect(result).toEqual([])
	})

	it("sorts by most behind, then by title, then by entry id", () => {
		const result = selectBehindEntries([
			entry(1, { title: "Zeta", nextEpisode: 4, progress: 0 }),
			entry(2, { title: "Alpha", nextEpisode: 4, progress: 0 }),
			entry(3, { title: "Mid", nextEpisode: 8, progress: 0 }),
			entry(5, { title: "Same", nextEpisode: 3, progress: 0 }),
			entry(4, { title: "Same", nextEpisode: 3, progress: 0 })
		], 10)

		expect(result.map(item => item.entry.id)).toEqual([3, 2, 1, 4, 5])
		expect(result.map(item => item.behind)).toEqual([7, 3, 3, 2, 2])
	})

	it("falls back to a placeholder title when the media has none", () => {
		const result = selectBehindEntries([
			entry(1, { title: null, nextEpisode: 4 }),
			entry(2, { title: "Alpha", nextEpisode: 4 })
		], 10)

		expect(result.map(item => item.entry.id)).toEqual([2, 1])
	})

	it("caps the result at the limit", () => {
		const entries = [1, 2, 3, 4].map(id => entry(id, { nextEpisode: 3 + id }))

		expect(selectBehindEntries(entries, 2).map(item => item.entry.id)).toEqual([4, 3])
		expect(selectBehindEntries(entries, 2.9)).toHaveLength(2)
	})

	it("returns nothing for a zero, negative or NaN limit", () => {
		const entries = [entry(1, { nextEpisode: 5 })]

		expect(selectBehindEntries(entries, 0)).toEqual([])
		expect(selectBehindEntries(entries, -1)).toEqual([])
		expect(selectBehindEntries(entries, Number.NaN)).toEqual([])
	})

	it("returns every match for an infinite limit", () => {
		const entries = [1, 2, 3].map(id => entry(id, { nextEpisode: 5 }))

		expect(selectBehindEntries(entries, Number.POSITIVE_INFINITY)).toHaveLength(3)
	})

	it("does not mutate its input", () => {
		const entries = [entry(1, { nextEpisode: 4 }), entry(2, { nextEpisode: 9 })]
		const snapshot = [...entries]

		selectBehindEntries(entries, 10)

		expect(entries).toEqual(snapshot)
	})
})
