import { afterEach, describe, expect, it } from "vitest"
import {
	aniListInFlightRequests,
	aniListMemoryCache,
	buildAniListCacheKey,
	createAniListMemoryCache,
	getAniListWriteEpoch,
	invalidateAniListViewer,
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

	it("prefixes every key with its viewer", () => {
		const oauthKey = buildAniListCacheKey(query, { username: "a" }, "oauth:42")
		const publicKey = buildAniListCacheKey(query, { username: "a" }, "public")

		expect(oauthKey.startsWith("oauth:42:")).toBe(true)
		expect(publicKey.startsWith("public:")).toBe(true)
		expect(oauthKey).not.toBe(publicKey)
		expect(oauthKey).toMatch(/^oauth:42:[0-9a-f]{64}$/)
	})

	it("deletes only the entries that match a viewer prefix", () => {
		const cache = createAniListMemoryCache()
		const viewer42 = buildAniListCacheKey(query, { username: "a" }, "oauth:42")
		const viewer42Other = buildAniListCacheKey(query, { username: "b" }, "oauth:42")
		const viewer4 = buildAniListCacheKey(query, { username: "a" }, "oauth:4")
		const viewer420 = buildAniListCacheKey(query, { username: "a" }, "oauth:420")
		const publicKey = buildAniListCacheKey(query, { username: "a" }, "public")
		for (const key of [viewer42, viewer42Other, viewer4, viewer420, publicKey]) {
			cache.set(key, key, 10_000, 0)
		}

		expect(cache.deleteByPrefix("oauth:42:")).toBe(2)
		expect(cache.get(viewer42, 1)).toBeUndefined()
		expect(cache.get(viewer42Other, 1)).toBeUndefined()
		expect(cache.get(viewer4, 1)).toBe(viewer4)
		expect(cache.get(viewer420, 1)).toBe(viewer420)
		expect(cache.get(publicKey, 1)).toBe(publicKey)

		expect(cache.deleteByPrefix("oauth:4:")).toBe(1)
		expect(cache.get(viewer420, 1)).toBe(viewer420)
		expect(cache.deleteByPrefix("oauth:4:")).toBe(0)
		expect(cache.size).toBe(2)
	})

	describe("viewer invalidation", () => {
		afterEach(() => {
			aniListMemoryCache.clear()
			aniListInFlightRequests.clear()
		})

		it("drops one viewer's reads and in-flight promises and bumps the write epoch", () => {
			const viewer42 = buildAniListCacheKey(query, { username: "a" }, "oauth:42")
			const viewer4 = buildAniListCacheKey(query, { username: "a" }, "oauth:4")
			const publicKey = buildAniListCacheKey(query, { username: "a" }, "public")
			for (const key of [viewer42, viewer4, publicKey]) {
				aniListMemoryCache.set(key, key, 60_000)
				aniListInFlightRequests.set(key, Promise.resolve(key))
			}
			const epoch = getAniListWriteEpoch()

			invalidateAniListViewer("oauth:42")

			expect(getAniListWriteEpoch()).toBe(epoch + 1)
			expect(aniListMemoryCache.get(viewer42)).toBeUndefined()
			expect(aniListInFlightRequests.has(viewer42)).toBe(false)
			expect(aniListMemoryCache.get(viewer4)).toBe(viewer4)
			expect(aniListInFlightRequests.has(viewer4)).toBe(true)
			expect(aniListMemoryCache.get(publicKey)).toBe(publicKey)
			expect(aniListInFlightRequests.has(publicKey)).toBe(true)
		})

		it("bumps the epoch even when the viewer had nothing cached", () => {
			const epoch = getAniListWriteEpoch()

			invalidateAniListViewer("oauth:7")

			expect(getAniListWriteEpoch()).toBe(epoch + 1)
		})
	})
})
