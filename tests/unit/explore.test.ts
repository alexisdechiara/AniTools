import { describe, expect, it } from "vitest"
import type {
	AniListAnimeListEntry,
	AniListMediaSummary
} from "../../shared/types/anilist"
import {
	collectExploreStudios,
	filterExploreMedia,
	getExploreRelationBadge,
	getExploreTitle,
	selectExploreSeeds
} from "../../app/utils/explore"

function media(
	id: number,
	options: {
		averageScore?: number
		format?: string
		isFavourite?: boolean
		genres?: string[]
		studioId?: number
		studioName?: string
		title?: string
	} = {}
): AniListMediaSummary {
	return {
		id,
		idMal: null,
		type: "ANIME",
		title: {
			english: null,
			native: null,
			romaji: null,
			userPreferred: options.title ?? `Anime ${id}`
		},
		coverImage: null,
		bannerImage: null,
		description: null,
		format: options.format ?? "TV",
		status: "FINISHED",
		episodes: 12,
		duration: 24,
		genres: options.genres ?? ["Adventure"],
		countryOfOrigin: "JP",
		season: "SPRING",
		seasonYear: 2025,
		startDate: null,
		endDate: null,
		averageScore: options.averageScore ?? 80,
		meanScore: options.averageScore ?? 80,
		popularity: 1_000,
		favourites: 100,
		isFavourite: options.isFavourite ?? false,
		isAdult: false,
		tags: [],
		nextAiringEpisode: null,
		siteUrl: `https://anilist.co/anime/${id}`,
		studios: options.studioId
			? {
					edges: [{
						isMain: true,
						node: {
							id: options.studioId,
							name: options.studioName ?? `Studio ${options.studioId}`,
							isAnimationStudio: true,
							siteUrl: null
						}
					}]
				}
			: null,
		rankings: [],
		externalLinks: [],
		trailer: null,
		relations: null
	}
}

function entry(
	id: number,
	score: number,
	entryMedia: AniListMediaSummary | null
): AniListAnimeListEntry {
	return {
		id,
		status: "COMPLETED",
		score,
		progress: 12,
		repeat: 0,
		priority: 0,
		updatedAt: 1_800_000_000,
		startedAt: null,
		completedAt: null,
		media: entryMedia
	}
}

describe("Explore discovery helpers", () => {
	it("selects stable, unique seeds from positively rated anime", () => {
		const duplicated = media(1, { averageScore: 75 })
		const result = selectExploreSeeds([
			entry(1, 70, duplicated),
			entry(2, 90, media(2, { averageScore: 82 })),
			entry(3, 95, null),
			entry(4, 0, media(4)),
			entry(5, 85, duplicated),
			entry(6, 0, media(6, { isFavourite: true }))
		])

		expect(result.map(seed => [seed.media.id, seed.score])).toEqual([
			[2, 90],
			[1, 85],
			[6, 0]
		])
	})

	it("ranks main animation studios by liked-title frequency", () => {
		const result = collectExploreStudios([
			entry(1, 90, media(1, { studioId: 10, studioName: "Bones" })),
			entry(2, 80, media(2, { studioId: 10, studioName: "Bones" })),
			entry(3, 100, media(3, { studioId: 20, studioName: "Madhouse" }))
		])

		expect(result).toEqual([
			{ id: 10, name: "Bones", count: 2, bestScore: 90 },
			{ id: 20, name: "Madhouse", count: 1, bestScore: 100 }
		])
	})

	it("applies score, format, genre and existing-list filters together", () => {
		const result = filterExploreMedia([
			media(1, { averageScore: 90, format: "TV", genres: ["Action"] }),
			media(2, { averageScore: 75, format: "TV", genres: ["Action"] }),
			media(3, { averageScore: 90, format: "MOVIE", genres: ["Action"] }),
			media(4, { averageScore: 90, format: "TV", genres: ["Comedy"] })
		], {
			excludedMediaIds: new Set([4]),
			format: "TV",
			genre: "Action",
			minimumScore: 80
		})

		expect(result.map(item => item.id)).toEqual([1])
		expect(getExploreTitle(result[0]!)).toBe("Anime 1")
	})

	it("describes relations from the displayed anime point of view", () => {
		const sequel = media(10, { title: "Second season" })
		sequel.relations = {
			edges: [{
				relationType: "PREQUEL",
				node: {
					id: 9,
					format: "TV",
					title: {
						english: "First season",
						native: null,
						romaji: null,
						userPreferred: "First season"
					}
				}
			}]
		}

		expect(getExploreRelationBadge(sequel)).toEqual({
			label: "Sequel",
			description: "Sequel to First season"
		})
	})
})
