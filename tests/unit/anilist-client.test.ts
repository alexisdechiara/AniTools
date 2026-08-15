import { describe, expect, it, vi } from "vitest"
import {
	ANILIST_ALLOWED_OPERATIONS,
	fetchAniListProfile,
	getAniListActivitiesResponse,
	getAniListAiringSchedulesPage,
	getAniListAnimeListIdsResponse,
	getAniListAnimeListResponse,
	getAniListMediaByIds,
	getAniListMediaResponse,
	getAniListSearchResponse,
	getAniListStatisticsResponse,
	parseAniListActivitiesQuery,
	parseAniListAnimeListQuery,
	parseAniListMediaQuery,
	parseAniListProfileQuery,
	parseAniListSaveMediaListEntryBody,
	resolveAniListAccess,
	saveAniListMediaListEntry
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

const media = {
	id: 7,
	idMal: 5114,
	type: "ANIME",
	title: {
		romaji: "Hagane no Renkinjutsushi: Fullmetal Alchemist",
		english: "Fullmetal Alchemist: Brotherhood",
		native: "鋼の錬金術師 FULLMETAL ALCHEMIST",
		userPreferred: "Fullmetal Alchemist: Brotherhood"
	},
	coverImage: {
		extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx5114.jpg",
		large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/b5114.jpg",
		medium: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/b5114.jpg",
		color: "#e4a15d"
	},
	bannerImage: null,
	description: "Two brothers search for the Philosopher's Stone.",
	format: "TV",
	status: "FINISHED",
	episodes: 64,
	duration: 24,
	genres: ["Action", null],
	countryOfOrigin: "JP",
	season: "SPRING",
	seasonYear: 2009,
	startDate: {
		year: 2009,
		month: 4,
		day: 5
	},
	endDate: {
		year: 2010,
		month: 7,
		day: 4
	},
	averageScore: 90,
	meanScore: 90,
	popularity: 900_000,
	favourites: 200_000,
	isFavourite: false,
	isAdult: false,
	tags: null,
	nextAiringEpisode: null,
	siteUrl: "https://anilist.co/anime/5114",
	studios: null,
	rankings: null,
	externalLinks: null,
	trailer: null,
	relations: null
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
			"anime-list-ids",
			"statistics",
			"activities",
			"recommendations",
			"studio-media",
			"search",
			"media",
			"airing-schedules",
			"media-by-ids",
			"save-media-list-entry"
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

	it("accepts only a bounded positive media id", () => {
		expect(parseAniListMediaQuery({ id: "7" })).toEqual({ id: 7 })

		for (const query of [
			{},
			{ id: 0 },
			{ id: -1 },
			{ id: 1.5 },
			{ id: 10_000_001 },
			{ id: 7, extra: "query" }
		]) {
			expect(() => parseAniListMediaQuery(query)).toThrow()
		}
	})

	it("accepts only a fixed bounded media-list update body", () => {
		expect(parseAniListSaveMediaListEntryBody({ mediaId: 7 })).toEqual({ mediaId: 7 })
		expect(() => parseAniListSaveMediaListEntryBody({ mediaId: 0 })).toThrow()
		expect(() => parseAniListSaveMediaListEntryBody({ mediaId: 7, status: "DROPPED" })).toThrow()
	})
})

describe("AniList allowlisted client", () => {
	it("uses a fixed anonymous search query and preserves the public response contract", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				Page: {
					media: [
						null,
						{
							id: 7,
							title: {
								romaji: "Hagane no Renkinjutsushi",
								english: "Fullmetal Alchemist",
								native: "鋼の錬金術師",
								userPreferred: "Fullmetal Alchemist"
							}
						}
					]
				}
			}
		}))

		await expect(getAniListSearchResponse("  fullmetal  ", {
			fetch: requester
		})).resolves.toEqual({
			result: {
				predictions: [{
					id: 7,
					title: "Fullmetal Alchemist"
				}]
			}
		})

		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}
		expect(body.query).toContain("query AniToolsSearch")
		expect(body.query).not.toContain("fullmetal")
		expect(body.variables).toEqual({ search: "fullmetal" })
		expect(new Headers(request?.headers).has("Authorization")).toBe(false)
	})

	it("loads a non-adult anime through the fixed media operation", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: { Media: media }
		}))

		const result = await getAniListMediaResponse({ id: 7 }, {
			fetch: requester
		})

		expect(result.media).toMatchObject({
			id: 7,
			type: "ANIME",
			genres: ["Action"],
			tags: [],
			rankings: [],
			externalLinks: []
		})

		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}
		expect(body.query).toContain("query AniToolsMedia")
		expect(body.variables).toEqual({ mediaId: 7 })
		expect(new Headers(request?.headers).has("Authorization")).toBe(false)
	})

	it("does not expose adult media through the public media operation", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				Media: {
					...media,
					isAdult: true
				}
			}
		}))

		await expect(getAniListMediaResponse({ id: 7 }, {
			fetch: requester
		})).rejects.toMatchObject({
			statusCode: 404,
			data: {
				code: "ANILIST_MEDIA_NOT_FOUND"
			}
		})
	})

	it("adds an anime to planning through the fixed authenticated mutation", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				SaveMediaListEntry: {
					id: 99,
					mediaId: 7,
					status: "PLANNING"
				}
			}
		}))

		await expect(saveAniListMediaListEntry(oauthAccess, { mediaId: 7 }, {
			fetch: requester
		})).resolves.toEqual({
			entry: { id: 99, mediaId: 7, status: "PLANNING" }
		})

		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}
		expect(body.query).toContain("mutation AniToolsSaveMediaListEntry")
		expect(body.query).toContain("status: PLANNING")
		expect(body.variables).toEqual({ mediaId: 7 })
		expect(new Headers(request?.headers).get("Authorization")).toBe(
			"Bearer secret-access-token"
		)
	})

	it("rejects media-list mutations for public profiles", async () => {
		await expect(saveAniListMediaListEntry(publicAccess, { mediaId: 7 }))
			.rejects.toMatchObject({ statusCode: 403 })
	})

	it("loads a validated airing page through a fixed anonymous operation", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				Page: {
					pageInfo: { hasNextPage: true },
					airingSchedules: [{
						airingAt: 1_800_000_000,
						episode: 12,
						timeUntilAiring: 600,
						media
					}]
				}
			}
		}))

		const result = await getAniListAiringSchedulesPage({
			page: 2,
			airingAtGreater: 1_799_000_000,
			airingAtLesser: 1_801_000_000
		}, { fetch: requester })

		expect(result).toMatchObject({
			hasNextPage: true,
			airingSchedules: [{
				airingAt: 1_800_000_000,
				episode: 12,
				media: {
					id: 7,
					genres: ["Action"]
				}
			}]
		})

		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}
		expect(body.query).toContain("query AniToolsAiringSchedules")
		expect(body.variables).toEqual({
			page: 2,
			perPage: 50,
			airingAtGreater: 1_799_000_000,
			airingAtLesser: 1_801_000_000
		})
		expect(new Headers(request?.headers).has("Authorization")).toBe(false)
	})

	it("de-duplicates and validates batched media hydration", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				Page: {
					media: [
						media,
						{ ...media, id: 99 },
						{ ...media, id: 8, isAdult: true }
					]
				}
			}
		}))

		const result = await getAniListMediaByIds([7, 7, 8], {
			fetch: requester
		})

		expect(result.map(item => item.id)).toEqual([7])
		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}
		expect(body.query).toContain("query AniToolsMediaByIds")
		expect(body.variables).toEqual({
			mediaIds: [7, 8],
			perPage: 2
		})
	})

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
			username: "Alexis",
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

	it("loads every bounded anime-list ID chunk and de-duplicates the result", async () => {
		let requestIndex = 0
		const requester = fetchMock(async () => {
			requestIndex += 1
			return jsonResponse({
				data: {
					MediaListCollection: {
						hasNextChunk: requestIndex === 1,
						lists: [{
							entries: requestIndex === 1
								? [{ mediaId: 30 }, { mediaId: 10 }]
								: [{ mediaId: 20 }, { mediaId: 30 }]
						}]
					}
				}
			})
		})

		const result = await getAniListAnimeListIdsResponse(publicAccess, {
			fetch: requester
		})
		const requestBodies = requester.mock.calls.map(([, request]) =>
			JSON.parse(String(request?.body)) as {
				query: string
				variables: Record<string, unknown>
			}
		)

		expect(result.mediaIds).toEqual([10, 20, 30])
		expect(requestBodies).toHaveLength(2)
		expect(requestBodies[0]?.query).toContain("query AniToolsAnimeListIds")
		expect(requestBodies.map(body => body.variables.chunk)).toEqual([1, 2])
		expect(requestBodies[0]?.variables).toMatchObject({
			username: "Alexis",
			perChunk: 500
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
							voiceActors: [{
								count: 8,
								meanScore: 84,
								minutesWatched: 2_400,
								mediaIds: [42, null],
								characterIds: [101, null],
								voiceActor: {
									id: 7,
									name: {
										full: "Voice Actor",
										native: "声優",
										userPreferred: "Voice Actor"
									},
									languageV2: "Japanese",
									image: {
										large: "https://s4.anilist.co/file/anilistcdn/staff/large/n7.jpg",
										medium: null
									},
									primaryOccupations: ["Voice Actor", null],
									siteUrl: "https://anilist.co/staff/7"
								}
							}],
							staff: [{
								count: 5,
								meanScore: 88,
								minutesWatched: 1_800,
								mediaIds: [42],
								staff: {
									id: 9,
									name: {
										full: "Series Director",
										native: null,
										userPreferred: "Series Director"
									},
									languageV2: null,
									image: null,
									primaryOccupations: ["Director"],
									siteUrl: "https://anilist.co/staff/9"
								}
							}],
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
			studios: [],
			voiceActors: [{
				count: 8,
				mediaIds: [42],
				characterIds: [101],
				voiceActor: {
					id: 7,
					language: "Japanese",
					primaryOccupations: ["Voice Actor"]
				}
			}],
			staff: [{
				count: 5,
				staff: {
					id: 9,
					primaryOccupations: ["Director"]
				}
			}]
		})
		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
		}
		expect(body.query).toContain("query AniToolsAnimeStatistics")
		expect(body.query).toContain("voiceActors(limit: 100, sort: COUNT_DESC)")
		expect(body.query).toContain("staff(limit: 100, sort: COUNT_DESC)")
	})

	it("rejects unsafe URL schemes in people statistics", async () => {
		const requester = fetchMock(async () => jsonResponse({
			data: {
				User: {
					statistics: {
						anime: {
							count: 1,
							meanScore: 80,
							minutesWatched: 24,
							episodesWatched: 1,
							statuses: null,
							scores: null,
							formats: null,
							countries: null,
							genres: null,
							tags: null,
							startYears: null,
							releaseYears: null,
							studios: null,
							voiceActors: null,
							staff: [{
								count: 1,
								meanScore: 80,
								minutesWatched: 24,
								mediaIds: [42],
								staff: {
									id: 9,
									name: {
										full: "Unsafe URL",
										native: null,
										userPreferred: "Unsafe URL"
									},
									languageV2: null,
									image: null,
									primaryOccupations: [],
									siteUrl: "javascript:alert(1)"
								}
							}],
							lengths: null
						}
					}
				}
			}
		}))

		await expect(getAniListStatisticsResponse(publicAccess, {
			fetch: requester
		})).rejects.toMatchObject({
			statusCode: 502,
			data: {
				code: "ANILIST_INVALID_DATA"
			}
		})
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
