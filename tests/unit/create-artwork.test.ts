import { describe, expect, it } from "vitest"
import type {
	AniListAnimeListEntry,
	AniListMediaSummary
} from "../../shared/types/anilist"
import {
	CREATE_PRESETS,
	calculateCoverCrop,
	getCreateExportFilename,
	getCreateMediaImage,
	getCreateMediaTitle,
	getCreateMimeType,
	sanitizeCreateFilename,
	selectCreateContentEntries,
	selectCreateContentEntry,
	wrapCreateText
} from "../../app/utils/create-artwork"

function media(
	id: number,
	popularity: number,
	isFavourite = false
): AniListMediaSummary {
	return {
		id,
		idMal: null,
		type: "ANIME",
		title: {
			english: `English ${id}`,
			native: `Native ${id}`,
			romaji: `Romaji ${id}`,
			userPreferred: `Preferred ${id}`
		},
		coverImage: {
			color: null,
			extraLarge: `https://example.com/cover-${id}.jpg`,
			large: null,
			medium: null
		},
		bannerImage: `https://example.com/banner-${id}.jpg`,
		description: null,
		format: "TV",
		status: "FINISHED",
		episodes: 12,
		duration: 24,
		genres: [],
		countryOfOrigin: "JP",
		season: null,
		seasonYear: null,
		startDate: null,
		endDate: null,
		averageScore: null,
		meanScore: null,
		popularity,
		favourites: null,
		isFavourite,
		isAdult: false,
		tags: [],
		nextAiringEpisode: null,
		siteUrl: null,
		studios: null,
		rankings: [],
		externalLinks: [],
		trailer: {
			id: null,
			site: null,
			thumbnail: `https://example.com/thumbnail-${id}.jpg`
		},
		relations: null
	}
}

function entry(
	id: number,
	score: number,
	popularity: number,
	progress: number,
	repeat: number,
	isFavourite = false
): AniListAnimeListEntry {
	return {
		id,
		score,
		status: "COMPLETED",
		progress,
		repeat,
		priority: 0,
		updatedAt: 0,
		startedAt: null,
		completedAt: null,
		media: media(id, popularity, isFavourite)
	}
}

describe("Create artwork presets", () => {
	it("defines every planned output with positive exact dimensions", () => {
		expect(Object.values(CREATE_PRESETS).map(preset => [
			preset.id,
			preset.width,
			preset.height
		])).toEqual([
			["story", 1080, 1920],
			["square", 1080, 1080],
			["anilist-thumbnail", 1200, 630],
			["banner", 1500, 500]
		])
	})

	it("selects the requested title language and artwork source", () => {
		const anime = media(1, 100)

		expect(getCreateMediaTitle(anime, "english")).toBe("English 1")
		expect(getCreateMediaTitle(anime, "native")).toBe("Native 1")
		expect(getCreateMediaImage(anime, "cover"))
			.toBe("https://example.com/cover-1.jpg")
		expect(getCreateMediaImage(anime, "banner"))
			.toBe("https://example.com/banner-1.jpg")
	})

	it("derives Statistics-style content deterministically", () => {
		const entries = [
			entry(1, 95, 100, 4, 0),
			entry(2, 40, 900, 24, 1),
			entry(3, 80, 500, 6, 3, true)
		]

		expect(selectCreateContentEntry(entries, "best-rated")?.id).toBe(1)
		expect(selectCreateContentEntry(entries, "flop")?.id).toBe(2)
		expect(selectCreateContentEntry(entries, "most-popular")?.id).toBe(2)
		expect(selectCreateContentEntry(entries, "longest-watch")?.id).toBe(2)
		expect(selectCreateContentEntry(entries, "most-rewatched")?.id).toBe(3)
		expect(selectCreateContentEntry(entries, "favourite")?.id).toBe(3)
	})

	it("offers up to ten deterministic candidates for automatic content", () => {
		const entries = Array.from({ length: 12 }, (_, index) =>
			entry(index + 1, index + 1, 100 - index, index + 1, index)
		)
		const candidates = selectCreateContentEntries(entries, "best-rated")

		expect(candidates).toHaveLength(10)
		expect(candidates.map(candidate => candidate.id)).toEqual([
			12, 11, 10, 9, 8, 7, 6, 5, 4, 3
		])
	})
})

describe("Create artwork crop", () => {
	it("centres and zooms a landscape image into a square", () => {
		expect(calculateCoverCrop(2000, 1000, 1000, 1000)).toEqual({
			sourceX: 500,
			sourceY: 0,
			sourceWidth: 1000,
			sourceHeight: 1000
		})
		expect(calculateCoverCrop(2000, 1000, 1000, 1000, 2)).toEqual({
			sourceX: 750,
			sourceY: 250,
			sourceWidth: 500,
			sourceHeight: 500
		})
	})

	it("clamps zoom and focal positions", () => {
		const crop = calculateCoverCrop(1000, 2000, 1500, 500, 99, -1, 2)

		expect(crop.sourceX).toBe(0)
		expect(crop.sourceY).toBeCloseTo(1888.8889)
		expect(crop.sourceWidth).toBeCloseTo(333.3333)
		expect(crop.sourceHeight).toBeCloseTo(111.1111)
	})
})

describe("Create artwork exports", () => {
	it("creates safe filenames and matching image MIME types", () => {
		expect(sanitizeCreateFilename("L'été d'Alexis / 2026")).toBe("l-ete-d-alexis-2026")
		expect(getCreateExportFilename("Top Anime", "story", "jpeg"))
			.toBe("top-anime-story.jpg")
		expect(getCreateMimeType("webp")).toBe("image/webp")
	})

	it("wraps text deterministically and marks truncation", () => {
		const measure = (value: string) => value.length

		expect(wrapCreateText("one two three four", 9, measure, 2))
			.toEqual(["one two", "three…"])
		expect(wrapCreateText("   ", 20, measure)).toEqual([])
	})
})
