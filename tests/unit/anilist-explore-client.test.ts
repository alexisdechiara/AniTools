import { describe, expect, it, vi } from "vitest"
import {
	getAniListRecommendationsResponse,
	getAniListStudioMediaResponse,
	parseAniListRecommendationsQuery,
	parseAniListStudioMediaQuery
} from "../../server/utils/anilist-client"

const publicAccess = {
	mode: "public" as const,
	username: "Alexis"
}

const mediaPayload = {
	id: 42,
	idMal: null,
	type: "ANIME",
	title: {
		romaji: "Test Anime",
		english: null,
		native: null,
		userPreferred: "Test Anime"
	},
	coverImage: {
		extraLarge: null,
		large: null,
		medium: null,
		color: null
	},
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
	startDate: { year: 2025, month: 4, day: 1 },
	endDate: { year: 2025, month: 6, day: 17 },
	averageScore: 82,
	meanScore: 81,
	popularity: 10_000,
	favourites: 500,
	isFavourite: false,
	isAdult: false,
	tags: [],
	nextAiringEpisode: null,
	siteUrl: "https://anilist.co/anime/42",
	studios: { edges: [] },
	rankings: [],
	externalLinks: [],
	trailer: null,
	relations: { edges: [] }
}

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json" }
	})
}

describe("AniList Explore query validation", () => {
	it("coerces bounded pagination and rejects unknown parameters", () => {
		expect(parseAniListRecommendationsQuery({
			username: "Alexis",
			mediaId: "42"
		})).toEqual({
			username: "Alexis",
			mediaId: 42,
			page: 1,
			perPage: 12
		})
		expect(parseAniListStudioMediaQuery({
			studioId: "7",
			page: "2",
			perPage: "20"
		})).toMatchObject({
			studioId: 7,
			page: 2,
			perPage: 20
		})
		expect(() => parseAniListRecommendationsQuery({
			mediaId: 42,
			perPage: 21
		})).toThrow()
		expect(() => parseAniListStudioMediaQuery({
			studioId: 7,
			arbitraryQuery: "{ Viewer { id } }"
		})).toThrow()
	})
})

describe("AniList Explore allowlisted operations", () => {
	it("uses only the fixed recommendation document and normalizes media", async () => {
		const requester = vi.fn(async () => jsonResponse({
			data: {
				Page: {
					pageInfo: {
						currentPage: 1,
						hasNextPage: false,
						lastPage: 1,
						perPage: 12,
						total: 1
					},
					recommendations: [{
						id: 9,
						rating: 125,
						mediaRecommendation: mediaPayload
					}]
				}
			}
		})) as unknown as typeof fetch

		const result = await getAniListRecommendationsResponse(publicAccess, {
			mediaId: 1,
			page: 1,
			perPage: 12
		}, { fetch: requester })
		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}

		expect(body.query).toContain("query AniToolsRecommendations")
		expect(body.variables).toEqual({ mediaId: 1, page: 1, perPage: 12 })
		expect(result.recommendations[0]).toMatchObject({
			id: 9,
			rating: 125,
			media: { id: 42, type: "ANIME" }
		})
	})

	it("uses a fixed main-studio query and omits non-anime nodes", async () => {
		const requester = vi.fn(async () => jsonResponse({
			data: {
				Studio: {
					id: 7,
					name: "Studio Test",
					isAnimationStudio: true,
					siteUrl: "https://anilist.co/studio/7",
					media: {
						pageInfo: {
							currentPage: 1,
							hasNextPage: false,
							lastPage: 1,
							perPage: 12,
							total: 2
						},
						nodes: [
							mediaPayload,
							{ ...mediaPayload, id: 43, type: "MANGA" }
						]
					}
				}
			}
		})) as unknown as typeof fetch

		const result = await getAniListStudioMediaResponse(publicAccess, {
			studioId: 7,
			page: 1,
			perPage: 12
		}, { fetch: requester })
		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}

		expect(body.query).toContain("query AniToolsStudioMedia")
		expect(body.query).toContain("isMain: true")
		expect(body.variables).toMatchObject({
			studioId: 7,
			page: 1,
			perPage: 12
		})
		expect(result.media.map(media => media.id)).toEqual([42])
	})
})
