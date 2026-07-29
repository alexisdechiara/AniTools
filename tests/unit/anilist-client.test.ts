import { describe, expect, it, vi } from "vitest"
import {
	ANILIST_ALLOWED_OPERATIONS,
	fetchAniListProfile,
	getAniListActivitiesResponse,
	getAniListAnimeListResponse,
	getAniListStatisticsResponse,
	parseAniListActivitiesQuery,
	parseAniListAnimeListQuery,
	parseAniListProfileQuery,
	resolveAniListAccess
} from "../../server/utils/anilist-client"

const publicAccess = {
	mode: "public" as const,
	username: "Alexis"
}

const oauthAccess = {
	mode: "oauth" as const,
	username: "Alexis",
	userId: 42,
	accessToken: "secret-access-token"
}

const profile = {
	id: 42,
	name: "Alexis",
	about: null,
	avatar: {
		large: "https://s4.anilist.co/file/anilistcdn/user/avatar/large/default.png",
		medium: "https://s4.anilist.co/file/anilistcdn/user/avatar/medium/default.png"
	},
	bannerImage: null,
	createdAt: 1_500_000_000,
	siteUrl: "https://anilist.co/user/Alexis",
	updatedAt: 1_800_000_000,
	options: {
		displayAdultContent: false,
		profileColor: "blue",
		timezone: "Europe/Paris",
		titleLanguage: "ENGLISH"
	},
	mediaListOptions: {
		rowOrder: "score",
		scoreFormat: "POINT_100"
	}
}

function jsonResponse(
	body: unknown,
	status = 200,
	headers: Record<string, string> = {}
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...headers
		}
	})
}

function fetchMock(
	implementation: (...args: Parameters<typeof fetch>) => Promise<Response>
) {
	return vi.fn(implementation) as unknown as typeof fetch
}

describe("AniList endpoint query validation", () => {
	it("only exposes the fixed operation allowlist", () => {
		expect(ANILIST_ALLOWED_OPERATIONS).toEqual([
			"profile",
			"anime-list",
			"statistics",
			"activities",
			"recommendations",
			"studio-media"
		])
	})

	it("normalizes the public username and pagination defaults", () => {
		expect(parseAniListProfileQuery({ username: "  Alexis  " })).toEqual({
			username: "Alexis"
		})
		expect(parseAniListAnimeListQuery({ username: "Alexis" })).toEqual({
			username: "Alexis",
			page: 1,
			perPage: 25,
			sort: "updated"
		})
		expect(parseAniListActivitiesQuery({ username: "Alexis" })).toEqual({
			username: "Alexis",
			page: 1,
			perPage: 20,
			kind: "anime"
		})
	})

	it("selects public mode explicitly when a username is provided", async () => {
		await expect(resolveAniListAccess(
			{} as Parameters<typeof resolveAniListAccess>[0],
			"Alexis"
		)).resolves.toEqual(publicAccess)
	})

	it.each([
		{ username: "a" },
		{ username: "Alexis", perPage: "51" },
		{ username: "Alexis", page: "101" },
		{ username: "Alexis", sort: "arbitrary" },
		{ username: "Alexis", extra: "query" }
	])("rejects invalid or unbounded list inputs", (query) => {
		expect(() => parseAniListAnimeListQuery(query)).toThrow()
	})

	it("rejects unsupported activity kinds and excessive page sizes", () => {
		expect(() => parseAniListActivitiesQuery({
			username: "Alexis",
			kind: "following"
		})).toThrow()
		expect(() => parseAniListActivitiesQuery({
			username: "Alexis",
			perPage: 51
		})).toThrow()
	})
})

describe("AniList allowlisted client", () => {
	it("sends public usernames only as GraphQL variables", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: { User: profile }
		}))

		await expect(fetchAniListProfile(publicAccess, {
			fetch: requester
		})).resolves.toEqual(profile)

		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}

		expect(body.query).toContain("query AniToolsPublicProfile")
		expect(body.query).not.toContain(publicAccess.username)
		expect(body.variables).toEqual({ username: publicAccess.username })
		expect(new Headers(request?.headers).has("Authorization")).toBe(false)
	})

	it("uses Viewer and sends the OAuth token only in the upstream header", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: { Viewer: profile }
		}))

		await fetchAniListProfile(oauthAccess, { fetch: requester })

		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}
		const headers = new Headers(request?.headers)

		expect(body.query).toContain("query AniToolsViewerProfile")
		expect(body.query).not.toContain(oauthAccess.accessToken)
		expect(body.variables).toEqual({})
		expect(headers.get("Authorization")).toBe(`Bearer ${oauthAccess.accessToken}`)
	})

	it("uses a fixed paginated anime-list query and normalizes nullable nodes", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				Page: {
					pageInfo: {
						currentPage: 2,
						hasNextPage: false,
						lastPage: 2,
						perPage: 10,
						total: 11
					},
					mediaList: [null]
				}
			}
		}))

		const result = await getAniListAnimeListResponse(publicAccess, {
			page: 2,
			perPage: 10,
			sort: "score",
			status: "COMPLETED"
		}, { fetch: requester })
		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}

		expect(result.entries).toEqual([])
		expect(result.pageInfo).toEqual({
			currentPage: 2,
			hasNextPage: false,
			lastPage: 2,
			perPage: 10,
			total: 11
		})
		expect(body.query).toContain("query AniToolsAnimeList")
		expect(body.variables).toMatchObject({
			username: "Alexis",
			page: 2,
			perPage: 10,
			sort: ["SCORE_DESC"],
			status: "COMPLETED"
		})
	})

	it("normalizes the fixed statistics response into bounded arrays", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				User: {
					statistics: {
						anime: {
							count: 12,
							meanScore: 81.5,
							minutesWatched: 3_600,
							episodesWatched: 144,
							statuses: null,
							scores: null,
							formats: null,
							countries: null,
							genres: [{
								count: 12,
								meanScore: 81.5,
								minutesWatched: 3_600,
								mediaIds: [null, 42],
								genre: "Adventure"
							}],
							tags: null,
							startYears: null,
							releaseYears: null,
							studios: null,
							lengths: null
						}
					}
				}
			}
		}))

		const result = await getAniListStatisticsResponse(publicAccess, {
			fetch: requester
		})

		expect(result.source).toEqual(publicAccess)
		expect(result.statistics).toMatchObject({
			count: 12,
			meanScore: 81.5,
			genres: [{
				count: 12,
				meanScore: 81.5,
				minutesWatched: 3_600,
				mediaIds: [42],
				genre: "Adventure"
			}],
			tags: [],
			studios: []
		})
		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
		}
		expect(body.query).toContain("query AniToolsAnimeStatistics")
	})

	it("returns only validated activities with bounded pagination", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				Page: {
					pageInfo: {
						currentPage: 1,
						hasNextPage: true,
						lastPage: 3,
						perPage: 20,
						total: 41
					},
					activities: [{
						__typename: "ListActivity",
						id: 123,
						type: "ANIME_LIST",
						status: "watched episode",
						progress: "1",
						createdAt: 1_800_000_000,
						replyCount: 0,
						user: null,
						media: null
					}]
				}
			}
		}))

		const result = await getAniListActivitiesResponse(oauthAccess, {
			page: 1,
			perPage: 20,
			kind: "anime"
		}, { fetch: requester })

		expect(result.activities).toEqual([{
			kind: "anime",
			id: 123,
			type: "ANIME_LIST",
			status: "watched episode",
			progress: "1",
			createdAt: 1_800_000_000,
			replyCount: 0,
			user: null,
			media: null
		}])
		expect(result.pageInfo.hasNextPage).toBe(true)
		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}
		expect(body.query).toContain("query AniToolsActivities")
		expect(body.variables).toMatchObject({
			userId: 42,
			type: "ANIME_LIST",
			page: 1,
			perPage: 20
		})
	})

	it("converts AniList rate limiting into a bounded 429 error", async () => {
		const requester = fetchMock(async () => jsonResponse(
			{ errors: [{ message: "Too many requests", status: 429 }] },
			429,
			{ "Retry-After": "15" }
		))

		await expect(fetchAniListProfile(publicAccess, {
			fetch: requester
		})).rejects.toMatchObject({
			statusCode: 429,
			data: {
				code: "ANILIST_RATE_LIMITED",
				retryAfter: 15
			}
		})
	})

	it("maps unknown users to a stable 404 error", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: { User: null },
			errors: [{ message: "User not found.", status: 404 }]
		}))

		await expect(fetchAniListProfile(publicAccess, {
			fetch: requester
		})).rejects.toMatchObject({
			statusCode: 404,
			data: {
				code: "ANILIST_USER_NOT_FOUND"
			}
		})
	})

	it("aborts slow upstream requests and reports a timeout", async () => {
		const requester = fetchMock((_url, request) => new Promise((_resolve, reject) => {
			request?.signal?.addEventListener("abort", () => {
				reject(new DOMException("Aborted", "AbortError"))
			})
		}))

		await expect(fetchAniListProfile(publicAccess, {
			fetch: requester,
			timeoutMs: 5
		})).rejects.toMatchObject({
			statusCode: 504,
			data: {
				code: "ANILIST_TIMEOUT"
			}
		})
	})

	it("rejects malformed successful payloads instead of trusting them", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				User: {
					id: "not-an-id",
					name: "Alexis"
				}
			}
		}))

		await expect(fetchAniListProfile(publicAccess, {
			fetch: requester
		})).rejects.toMatchObject({
			statusCode: 502,
			data: {
				code: "ANILIST_INVALID_DATA"
			}
		})
	})
})
