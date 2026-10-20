import { describe, expect, it } from "vitest"
import {
	buildAniListCacheKey,
	createAniListMemoryCache,
	isAniListMutation,
	resolveAniListDevCacheMode
} from "../../server/utils/anilist-request-cache"

const query = "query AniToolsProfile($username: String) { User(name: $username) { id } }"

describe("AniList request cache", () => {
	it("only records in development, and honours the off and replay settings", () => {
		expect(resolveAniListDevCacheMode(false, "replay")).toBe("off")
		expect(resolveAniListDevCacheMode(true, undefined)).toBe("record")
		expect(resolveAniListDevCacheMode(true, "off")).toBe("off")
		expect(resolveAniListDevCacheMode(true, "replay")).toBe("replay")
		expect(resolveAniListDevCacheMode(true, "anything")).toBe("record")
	})

	it("never caches mutations", () => {
		expect(isAniListMutation("  mutation Save($mediaId: Int) { SaveMediaListEntry { id } }")).toBe(true)
		expect(isAniListMutation(query)).toBe(false)
	})

	it("keys reads by query, variables and viewer, whatever the variable order", () => {
		const key = buildAniListCacheKey(query, { username: "a", page: 1 }, "public")

		expect(buildAniListCacheKey(query, { page: 1, username: "a" }, "public")).toBe(key)
		expect(buildAniListCacheKey(`  ${query.replace(" ", "\n")}  `, { page: 1, username: "a" }, "public")).toBe(key)
		expect(buildAniListCacheKey(query, { username: "b", page: 1 }, "public")).not.toBe(key)
		expect(buildAniListCacheKey(query, { username: "a", page: 1 }, "oauth:42")).not.toBe(key)
		expect(buildAniListCacheKey(query, { username: "a", page: 1, status: undefined }, "public")).toBe(key)
	})

	it("expires entries after their TTL", () => {
		const cache = createAniListMemoryCache()
		cache.set("key", { id: 1 }, 1_000, 0)

		expect(cache.get("key", 999)).toEqual({ id: 1 })
		expect(cache.get("key", 1_000)).toBeUndefined()
	})

	it("evicts the least recently used entry beyond its size", () => {
		const cache = createAniListMemoryCache(2)
		cache.set("a", 1, 10_000, 0)
		cache.set("b", 2, 10_000, 0)
		cache.get("a", 1)
		cache.set("c", 3, 10_000, 2)

		expect(cache.get("a", 3)).toBe(1)
		expect(cache.get("b", 3)).toBeUndefined()
		expect(cache.get("c", 3)).toBe(3)
		expect(cache.size).toBe(2)
	})
})
