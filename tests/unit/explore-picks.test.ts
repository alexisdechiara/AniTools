import { describe, expect, it } from "vitest"
import type { AniListMediaSummary } from "../../shared/types/anilist"
import { getExploreRelationBadge } from "../../app/utils/explore"
import {
	EXPLORE_PICKS_STORAGE_KEY,
	MAX_EXPLORE_INTERESTED,
	MAX_EXPLORE_PASSED,
	MAX_EXPLORE_PICKS_CHARACTERS,
	MAX_EXPLORE_PROFILES,
	addExplorePass,
	addExplorePick,
	buildExplorePicksExport,
	buildExplorePicksLinks,
	compactExploreMedia,
	createEmptyExplorePicksProfile,
	createEmptyExplorePicksState,
	dropListedExplorePicks,
	getExplorePicksExportFilename,
	getExplorePicksProfile,
	getProfileIdentityKey,
	normalizeExplorePicksProfile,
	normalizeExplorePicksState,
	parseExplorePicksState,
	restoreExploreDecision,
	serializeExplorePicksState,
	setExplorePicksProfile,
	type ExplorePickMedia,
	type ExplorePicksProfile,
	type ExplorePicksState
} from "../../app/utils/explore-picks"

type RelationEdges = NonNullable<AniListMediaSummary["relations"]>["edges"]

function relationEdge(relationType: string, id: number, title: string): RelationEdges[number] {
	return {
		relationType,
		node: {
			id,
			format: "TV",
			title: { english: null, native: null, romaji: null, userPreferred: title }
		}
	}
}

function media(id: number, overrides: Partial<AniListMediaSummary> = {}): AniListMediaSummary {
	return {
		id,
		idMal: id + 1_000,
		type: "ANIME",
		title: { english: null, native: null, romaji: null, userPreferred: `Anime ${id}` },
		coverImage: {
			color: "#ffffff",
			extraLarge: `https://img.example/${id}-xl.jpg`,
			large: `https://img.example/${id}-l.jpg`,
			medium: `https://img.example/${id}-m.jpg`
		},
		bannerImage: "https://img.example/banner.jpg",
		description: "A long description that must not be stored.",
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
		tags: [{
			id: 1,
			name: "Tag",
			category: null,
			rank: 90,
			isAdult: false,
			isGeneralSpoiler: false,
			isMediaSpoiler: false
		}],
		nextAiringEpisode: null,
		siteUrl: `https://anilist.co/anime/${id}`,
		studios: null,
		rankings: [],
		externalLinks: [],
		trailer: null,
		relations: null,
		...overrides
	}
}

function pick(id: number): ExplorePickMedia {
	return compactExploreMedia(media(id))
}

function profile(overrides: Partial<ExplorePicksProfile> = {}): ExplorePicksProfile {
	return { ...createEmptyExplorePicksProfile(1), ...overrides }
}

function state(profiles: Record<string, ExplorePicksProfile>): ExplorePicksState {
	return { version: 1, profiles }
}

function range(length: number, start = 1): number[] {
	return Array.from({ length }, (_, index) => start + index)
}

describe("explore picks", () => {
	it("uses the versioned storage key", () => {
		expect(EXPLORE_PICKS_STORAGE_KEY).toBe("anitools:explore-picks:v1")
	})

	describe("identity key", () => {
		it("builds the key the Entries store uses", () => {
			expect(getProfileIdentityKey({ isAuthenticated: true, authMode: "oauth", username: "alice" }))
				.toBe("oauth:alice")
			expect(getProfileIdentityKey({ isAuthenticated: true, authMode: "public", username: "alice" }))
				.toBe("public:alice")
			expect(getProfileIdentityKey({ isAuthenticated: true, authMode: null, username: "alice" }))
				.toBe("anonymous:alice")
		})

		it("has no key without a signed-in or public profile", () => {
			expect(getProfileIdentityKey({ isAuthenticated: false, authMode: "oauth", username: "alice" }))
				.toBeNull()
			expect(getProfileIdentityKey({ isAuthenticated: true, authMode: "oauth", username: null }))
				.toBeNull()
			expect(getProfileIdentityKey({ isAuthenticated: true, authMode: "oauth", username: "" }))
				.toBeNull()
		})
	})

	describe("compact media", () => {
		it("keeps only the whitelisted fields", () => {
			const compact = compactExploreMedia(media(7))

			expect(compact).toEqual({
				id: 7,
				title: { english: null, native: null, romaji: null, userPreferred: "Anime 7" },
				coverImage: {
					extraLarge: "https://img.example/7-xl.jpg",
					large: "https://img.example/7-l.jpg",
					medium: "https://img.example/7-m.jpg"
				},
				siteUrl: "https://anilist.co/anime/7",
				format: "TV",
				seasonYear: 2025,
				isAdult: false,
				relations: null
			})
		})

		it("keeps the single relation edge the badge needs", () => {
			const full = media(7, {
				relations: {
					edges: [
						relationEdge("CHARACTER", 70, "Crossover"),
						relationEdge("SEQUEL", 71, "Season 2"),
						relationEdge("PREQUEL", 72, "Season 0")
					]
				}
			})

			const compact = compactExploreMedia(full)

			expect(compact.relations?.edges).toEqual([relationEdge("PREQUEL", 72, "Season 0")])
			expect(getExploreRelationBadge(compact)).toEqual(getExploreRelationBadge(full))
			expect(getExploreRelationBadge(compact)).toEqual({
				label: "Sequel",
				description: "Sequel to Season 0"
			})
		})

		it("is stable when applied twice", () => {
			const compact = compactExploreMedia(media(7, {
				relations: { edges: [relationEdge("ADAPTATION", 70, "Manga")] }
			}))

			expect(compactExploreMedia(compact)).toEqual(compact)
		})

		it("drops links that are not https", () => {
			const compact = compactExploreMedia(media(7, {
				siteUrl: "javascript:alert(1)",
				coverImage: { color: null, extraLarge: "http://img.example/x.jpg", large: null, medium: null }
			}))

			expect(compact.siteUrl).toBeNull()
			expect(compact.coverImage).toEqual({ extraLarge: null, large: null, medium: null })
		})
	})

	describe("decisions", () => {
		it("adds a pick as the newest one and removes it from the passes", () => {
			const next = addExplorePick(profile({ interested: [pick(1)], passed: [2, 3] }), media(2), 50)

			expect(next.interested.map(item => item.id)).toEqual([1, 2])
			expect(next.passed).toEqual([3])
			expect(next.updatedAt).toBe(50)
			expect(next.interested[1]).not.toHaveProperty("description")
		})

		it("adds a pass and removes the title from the picks", () => {
			const next = addExplorePass(profile({ interested: [pick(1), pick(2)], passed: [3] }), 1, 50)

			expect(next.interested.map(item => item.id)).toEqual([2])
			expect(next.passed).toEqual([3, 1])
		})

		it("restores a decision from both lists", () => {
			const current = profile({ interested: [pick(1)], passed: [2] })

			expect(restoreExploreDecision(current, 1, 50)).toEqual({ updatedAt: 50, interested: [], passed: [2] })
			expect(restoreExploreDecision(current, 2, 50).passed).toEqual([])
			expect(restoreExploreDecision(current, 99, 50)).toBe(current)
		})

		it("drops interested titles already on the list", () => {
			const current = profile({ interested: [pick(1), pick(2), pick(3)], passed: [4] })

			const next = dropListedExplorePicks(current, new Set([2, 4]), 50)

			expect(next.interested.map(item => item.id)).toEqual([1, 3])
			expect(next.passed).toEqual([4])
			expect(dropListedExplorePicks(current, new Set([9]), 50)).toBe(current)
		})
	})

	describe("caps", () => {
		it("dedupes ids and keeps the newest occurrence", () => {
			const next = normalizeExplorePicksProfile(profile({
				interested: [pick(1), pick(2), pick(1)],
				passed: [5, 6, 5, 7]
			}))

			expect(next.interested.map(item => item.id)).toEqual([2, 1])
			expect(next.passed).toEqual([6, 5, 7])
		})

		it("ignores a pick whose id is also passed", () => {
			const next = normalizeExplorePicksProfile(profile({
				interested: [pick(1), pick(2)],
				passed: [2]
			}))

			expect(next.interested.map(item => item.id)).toEqual([1])
			expect(next.passed).toEqual([2])
		})

		it("caps interested titles at 100 and keeps the newest", () => {
			let current = profile()
			for (const id of range(MAX_EXPLORE_INTERESTED + 5)) {
				current = addExplorePick(current, media(id), id)
			}

			expect(current.interested).toHaveLength(100)
			expect(current.interested[0]?.id).toBe(6)
			expect(current.interested.at(-1)?.id).toBe(105)
		})

		it("caps passed ids at 1,000 and keeps the newest", () => {
			const current = addExplorePass(profile({ passed: range(MAX_EXPLORE_PASSED) }), 5_000, 10)

			expect(current.passed).toHaveLength(1_000)
			expect(current.passed[0]).toBe(2)
			expect(current.passed.at(-1)).toBe(5_000)
		})

		it("keeps at most 5 profiles and drops the least recently updated", () => {
			const profiles = Object.fromEntries(range(MAX_EXPLORE_PROFILES + 2).map(index =>
				[`public:user${index}`, profile({ updatedAt: index * 10, passed: [index] })]
			))

			const normalized = normalizeExplorePicksState(state(profiles))

			expect(Object.keys(normalized.profiles).toSorted()).toEqual([
				"public:user3",
				"public:user4",
				"public:user5",
				"public:user6",
				"public:user7"
			])
		})

		it("replaces one profile without touching the others and removes an empty one", () => {
			const initial = state({
				"public:alice": profile({ passed: [1] }),
				"public:bob": profile({ passed: [2] })
			})

			const replaced = setExplorePicksProfile(initial, "public:alice", profile({ passed: [9] }))
			expect(getExplorePicksProfile(replaced, "public:alice").passed).toEqual([9])
			expect(getExplorePicksProfile(replaced, "public:bob").passed).toEqual([2])

			const emptied = setExplorePicksProfile(replaced, "public:alice", profile())
			expect(Object.keys(emptied.profiles)).toEqual(["public:bob"])
			expect(getExplorePicksProfile(emptied, "public:alice")).toEqual(createEmptyExplorePicksProfile())
		})

		it("trims to the character budget, oldest profile and oldest picks first", () => {
			const longTitle = "x".repeat(450)
			const heavy = (id: number) => compactExploreMedia(media(id, {
				title: { english: longTitle, native: longTitle, romaji: longTitle, userPreferred: longTitle }
			}))
			const input = state({
				"public:old": profile({ updatedAt: 1, interested: range(100).map(heavy) }),
				"public:new": profile({ updatedAt: 2, interested: range(60, 1_000).map(heavy), passed: [1, 2] })
			})
			expect(JSON.stringify(input).length).toBeGreaterThan(MAX_EXPLORE_PICKS_CHARACTERS)

			const serialized = serializeExplorePicksState(input)
			const parsed = parseExplorePicksState(serialized)

			expect(serialized.length).toBeLessThanOrEqual(MAX_EXPLORE_PICKS_CHARACTERS)
			// The newer profile is intact; the older one lost its oldest picks only.
			expect(parsed.profiles["public:new"]).toEqual(input.profiles["public:new"])
			const oldIds = parsed.profiles["public:old"]?.interested.map(item => item.id) ?? []
			expect(oldIds.length).toBeGreaterThan(0)
			expect(oldIds.length).toBeLessThan(100)
			expect(oldIds.at(-1)).toBe(100)
			expect(oldIds).toEqual(range(oldIds.length, 101 - oldIds.length))
			// The caller's state is not mutated.
			expect(input.profiles["public:old"]?.interested).toHaveLength(100)
		})
	})

	describe("serialize and parse", () => {
		it("round-trips a state", () => {
			const input = state({
				"oauth:alice": profile({
					updatedAt: 1_700_000_000_000,
					interested: [
						compactExploreMedia(media(1, {
							relations: { edges: [relationEdge("PREQUEL", 10, "Season 1")] }
						})),
						pick(2)
					],
					passed: [3, 4]
				}),
				"public:bob": profile({ updatedAt: 5, passed: [9] })
			})

			expect(parseExplorePicksState(serializeExplorePicksState(input))).toEqual(input)
		})

		it("falls back to an empty state on a wrong version", () => {
			const text = JSON.stringify({ version: 2, profiles: { "public:alice": profile({ passed: [1] }) } })

			expect(parseExplorePicksState(text)).toEqual(createEmptyExplorePicksState())
		})

		it.each([
			["null", null],
			["undefined", undefined],
			["an empty string", ""],
			["invalid JSON", "{not json"],
			["a non-object", "42"],
			["an array", "[]"],
			["a JSON null", "null"],
			["profiles that are not a record", JSON.stringify({ version: 1, profiles: [] })],
			["a profile with a wrong shape", JSON.stringify({
				version: 1,
				profiles: { "public:alice": { updatedAt: 1, interested: "nope", passed: [] } }
			})],
			["a passed id that is not a positive integer", JSON.stringify({
				version: 1,
				profiles: { "public:alice": { updatedAt: 1, interested: [], passed: [1.5] } }
			})],
			["a pick with an unsafe link", JSON.stringify({
				version: 1,
				profiles: {
					"public:alice": {
						updatedAt: 1,
						interested: [{ ...pick(1), siteUrl: "javascript:alert(1)" }],
						passed: []
					}
				}
			})]
		])("falls back to an empty state on %s", (_label, value) => {
			expect(() => parseExplorePicksState(value)).not.toThrow()
			expect(parseExplorePicksState(value)).toEqual(createEmptyExplorePicksState())
		})

		it("falls back to an empty state on oversized input", () => {
			const text = JSON.stringify({
				version: 1,
				profiles: { "public:alice": profile({ passed: [1] }) },
				padding: "x".repeat(MAX_EXPLORE_PICKS_CHARACTERS)
			})

			expect(parseExplorePicksState(text)).toEqual(createEmptyExplorePicksState())
		})

		it("ignores unknown fields and re-applies the caps on read", () => {
			const text = JSON.stringify({
				version: 1,
				profiles: {
					"public:alice": {
						updatedAt: 1,
						interested: [{ ...pick(1), description: "extra" }, pick(1)],
						passed: range(MAX_EXPLORE_PASSED + 10, 100)
					}
				}
			})

			const parsed = parseExplorePicksState(text).profiles["public:alice"]

			expect(parsed?.interested).toEqual([pick(1)])
			expect(parsed?.passed).toHaveLength(MAX_EXPLORE_PASSED)
			expect(parsed?.passed[0]).toBe(110)
		})

		it("does not let a stored key reach the object prototype", () => {
			const text = `{"version":1,"profiles":{"__proto__":{"updatedAt":1,"interested":[],"passed":[1]}}}`

			const parsed = parseExplorePicksState(text)

			expect(Object.getPrototypeOf(parsed.profiles)).toBe(Object.prototype)
			expect(getExplorePicksProfile(parsed, "toString")).toEqual(createEmptyExplorePicksProfile())
		})
	})

	describe("export", () => {
		const exportedAt = new Date("2026-11-11T10:20:30.000Z")

		it("builds the JSON document with AniList links", () => {
			const picks = [pick(1), { ...pick(2), siteUrl: null }]

			expect(buildExplorePicksExport(picks, exportedAt)).toEqual({
				kind: "anitools-explore-picks",
				version: 1,
				exportedAt: "2026-11-11T10:20:30.000Z",
				media: [
					{ id: 1, title: "Anime 1", url: "https://anilist.co/anime/1" },
					{ id: 2, title: "Anime 2", url: "https://anilist.co/anime/2" }
				]
			})
		})

		it("uses the title getter it is given", () => {
			const document = buildExplorePicksExport([pick(1)], exportedAt, item => `#${item.id}`)

			expect(document.media[0]?.title).toBe("#1")
		})

		it("builds a newline list of AniList links", () => {
			expect(buildExplorePicksLinks([pick(1), { ...pick(2), siteUrl: null }]))
				.toBe("https://anilist.co/anime/1\nhttps://anilist.co/anime/2")
			expect(buildExplorePicksLinks([])).toBe("")
		})

		it("names the download after the export date", () => {
			expect(getExplorePicksExportFilename(exportedAt)).toBe("anitools-explore-picks-2026-11-11.json")
		})
	})
})
