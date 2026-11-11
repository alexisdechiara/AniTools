import { registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useExplore } from "~/composables/useExplore"
import { useEntriesStore } from "~/stores/Entries"
import { useUserStore } from "~/stores/User"
import type {
	AniListAnimeCollectionResponse,
	AniListAnimeListEntry,
	AniListMediaSummary,
	AniListRecommendationsResponse,
	AniListStudioMediaResponse
} from "~~/shared/types/anilist"

const SOURCE = { mode: "public", username: "alice" } as const
const EMPTY_PAGE_INFO = {
	currentPage: 1,
	hasNextPage: false,
	lastPage: 1,
	perPage: 12,
	total: 0
}

function media(id: number): AniListMediaSummary {
	return {
		id,
		idMal: null,
		type: "ANIME",
		title: { english: null, native: null, romaji: null, userPreferred: `Anime ${id}` },
		coverImage: null,
		bannerImage: null,
		description: null,
		format: "TV",
		status: "FINISHED",
		episodes: 12,
		duration: 24,
		genres: ["Adventure"],
		countryOfOrigin: "JP",
		season: "SPRING",
		seasonYear: 2025,
		startDate: null,
		endDate: null,
		averageScore: 80,
		meanScore: 80,
		popularity: 1_000,
		favourites: 100,
		isFavourite: false,
		isAdult: false,
		tags: [],
		nextAiringEpisode: null,
		siteUrl: `https://anilist.co/anime/${id}`,
		studios: {
			edges: [{
				isMain: true,
				node: { id: 500, name: "Studio", isAnimationStudio: true, siteUrl: null }
			}]
		},
		rankings: [],
		externalLinks: [],
		trailer: null,
		relations: null
	}
}

function entry(id: number, score: number): AniListAnimeListEntry {
	return {
		id,
		status: "COMPLETED",
		score,
		progress: 12,
		repeat: 0,
		priority: 0,
		updatedAt: 1_700_000_000,
		startedAt: null,
		completedAt: null,
		media: media(id)
	}
}

let collection: AniListAnimeCollectionResponse
const calls: Record<string, number> = {}
const unregisters: Array<() => void> = []

function serve(path: string, answer: () => unknown) {
	calls[path] = 0
	unregisters.push(registerEndpoint(path, {
		method: "GET",
		handler: () => {
			calls[path] = (calls[path] ?? 0) + 1
			return answer()
		}
	}))
}

function usePublicProfile() {
	const user = useUserStore()
	user.id = 1
	user.username = "alice"
	user.publicUsername = "alice"
	user.authMode = "public"
}

describe("useExplore", () => {
	beforeEach(() => {
		useUserStore().$reset()
		useEntriesStore().$reset()
		collection = {
			source: SOURCE,
			entries: [entry(11, 90), entry(12, 80), entry(13, 70)],
			truncated: false
		}
		serve("/api/anilist/anime-collection", () => collection)
		serve("/api/anilist/anime-list", () => ({ source: SOURCE, entries: [], pageInfo: EMPTY_PAGE_INFO }))
		serve("/api/anilist/anime-list-ids", () => ({ source: SOURCE, mediaIds: [] }))
		serve("/api/anilist/recommendations", (): AniListRecommendationsResponse => ({
			source: SOURCE,
			seedMediaId: 11,
			pageInfo: EMPTY_PAGE_INFO,
			recommendations: []
		}))
		serve("/api/anilist/studio-media", (): AniListStudioMediaResponse => ({
			source: SOURCE,
			studio: { id: 500, name: "Studio", isAnimationStudio: true, siteUrl: null },
			pageInfo: EMPTY_PAGE_INFO,
			media: []
		}))
	})

	afterEach(() => {
		for (const unregister of unregisters.splice(0)) unregister()
	})

	it("derives its list data from the Entries store without the list endpoints", async () => {
		usePublicProfile()
		const explore = useExplore()

		await explore.initialize()

		expect(calls["/api/anilist/anime-collection"]).toBe(1)
		expect(calls["/api/anilist/anime-list"]).toBe(0)
		expect(calls["/api/anilist/anime-list-ids"]).toBe(0)
		expect([...explore.existingMediaIds.value].sort()).toEqual([11, 12, 13])
		expect(explore.seeds.value.length).toBeGreaterThan(0)
		expect(explore.listError.value).toBeNull()
	})

	it("refuses to recommend from a truncated list", async () => {
		collection = { ...collection, truncated: true }
		usePublicProfile()
		const explore = useExplore()

		await explore.initialize()

		expect(typeof explore.listError.value).toBe("string")
		expect(explore.listError.value).not.toBe("")
		expect(calls["/api/anilist/recommendations"]).toBe(0)
	})
})
