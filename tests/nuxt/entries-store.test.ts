import { registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useEntriesStore } from "~/stores/Entries"
import { useUserStore } from "~/stores/User"
import type {
	AniListAnimeCollectionResponse,
	AniListAnimeListEntry
} from "~~/shared/types/anilist"

const COLLECTION_ENDPOINT = "/api/anilist/anime-collection"

function entry(id: number): AniListAnimeListEntry {
	return {
		id,
		status: "COMPLETED",
		score: 80,
		progress: 12,
		repeat: 0,
		priority: 0,
		updatedAt: 1_700_000_000,
		startedAt: null,
		completedAt: null,
		media: null
	}
}

const collection: AniListAnimeCollectionResponse = {
	source: { mode: "public", username: "alice" },
	entries: [entry(1), entry(2)],
	truncated: false
}

let calls = 0
let unregister: (() => void) | null = null

function serveCollection() {
	unregister?.()
	unregister = registerEndpoint(COLLECTION_ENDPOINT, {
		method: "GET",
		handler: () => {
			calls += 1
			return collection
		}
	})
}

function serveFailure() {
	unregister?.()
	unregister = registerEndpoint(COLLECTION_ENDPOINT, {
		method: "GET",
		handler: () => {
			calls += 1
			throw createError({ statusCode: 502, statusMessage: "AniList request failed" })
		}
	})
}

function usePublicProfile() {
	const user = useUserStore()
	user.id = 1
	user.username = "alice"
	user.authMode = "public"
}

interface Deferred<T> {
	promise: Promise<T>
	resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
	let resolve: (value: T) => void = () => undefined
	const promise = new Promise<T>((done) => {
		resolve = done
	})
	return { promise, resolve }
}

function collectionFor(username: string, ids: number[]): AniListAnimeCollectionResponse {
	return {
		source: { mode: "public", username },
		entries: ids.map(entry),
		truncated: false
	}
}

function serveDeferred(pending: Deferred<AniListAnimeCollectionResponse>) {
	unregister?.()
	unregister = registerEndpoint(COLLECTION_ENDPOINT, {
		method: "GET",
		handler: () => {
			calls += 1
			return pending.promise
		}
	})
}

function serveImmediately(response: AniListAnimeCollectionResponse) {
	unregister?.()
	unregister = registerEndpoint(COLLECTION_ENDPOINT, {
		method: "GET",
		handler: () => {
			calls += 1
			return response
		}
	})
}

describe("Entries store", () => {
	beforeEach(() => {
		useUserStore().$reset()
		useEntriesStore().$reset()
		calls = 0
		serveCollection()
	})

	afterEach(() => {
		unregister?.()
		unregister = null
	})

	it("returns an empty list without calling the API when nobody is identified", async () => {
		const entries = useEntriesStore()

		await expect(entries.fetchAllAnimes()).resolves.toEqual([])

		expect(entries.isInitialized).toBe(false)
		expect(calls).toBe(0)
	})

	it("loads a public profile's list", async () => {
		usePublicProfile()
		const entries = useEntriesStore()

		const loaded = await entries.fetchAllAnimes()

		expect(loaded.map(item => item.id)).toEqual([1, 2])
		expect(entries.isInitialized).toBe(true)
		expect(entries.error).toBeNull()
		expect(calls).toBe(1)
	})

	it("does not refetch for the same identity unless forced", async () => {
		usePublicProfile()
		const entries = useEntriesStore()
		await entries.fetchAllAnimes()

		await entries.fetchAllAnimes()
		expect(calls).toBe(1)

		await entries.fetchAllAnimes(true)
		expect(calls).toBe(2)
	})

	it("clears the list and records an error when the API fails", async () => {
		serveFailure()
		usePublicProfile()
		const entries = useEntriesStore()

		await expect(entries.fetchAllAnimes()).rejects.toBeDefined()

		// $fetch (ofetch) retries a failed GET once on a 502 by default, so the count is not pinned.
		expect(calls).toBeGreaterThanOrEqual(1)
		expect(entries.entries).toEqual([])
		expect(entries.isInitialized).toBe(false)
		expect(typeof entries.error).toBe("string")
		expect(entries.error).not.toBe("")
	})

	it("empties the list on $reset after a successful load", async () => {
		usePublicProfile()
		const entries = useEntriesStore()
		await entries.fetchAllAnimes()
		expect(entries.entries).toHaveLength(2)

		entries.$reset()

		expect(entries.entries).toEqual([])
		expect(entries.isInitialized).toBe(false)
	})

	it("drops the previous profile's list as soon as the identity changes", async () => {
		usePublicProfile()
		const entries = useEntriesStore()
		await entries.fetchAllAnimes()
		expect(entries.entries).toHaveLength(2)

		useUserStore().username = "bob"
		await nextTick()

		expect(entries.entries).toEqual([])
		expect(entries.isInitialized).toBe(false)
	})

	it("drops the list when the profile is forgotten", async () => {
		usePublicProfile()
		const entries = useEntriesStore()
		await entries.fetchAllAnimes()

		useUserStore().$reset()
		await nextTick()

		expect(entries.entries).toEqual([])
		expect(entries.isInitialized).toBe(false)
	})

	it("discards a late response for the previous identity", async () => {
		const aliceResponse = deferred<AniListAnimeCollectionResponse>()
		serveDeferred(aliceResponse)
		usePublicProfile()
		const entries = useEntriesStore()
		const aliceLoad = entries.fetchAllAnimes()
		await vi.waitFor(() => expect(calls).toBe(1))

		useUserStore().username = "bob"
		serveImmediately(collectionFor("bob", [7, 8, 9]))
		await entries.fetchAllAnimes()
		expect(entries.entries.map(item => item.id)).toEqual([7, 8, 9])

		aliceResponse.resolve(collectionFor("alice", [1, 2]))
		await aliceLoad

		expect(entries.entries.map(item => item.id)).toEqual([7, 8, 9])
		expect(entries.isInitialized).toBe(true)
		expect(entries.loading).toBe(false)
	})

	it("keeps the store empty when it is reset during a request", async () => {
		const pending = deferred<AniListAnimeCollectionResponse>()
		serveDeferred(pending)
		usePublicProfile()
		const entries = useEntriesStore()
		const load = entries.fetchAllAnimes()
		await vi.waitFor(() => expect(calls).toBe(1))

		entries.$reset()
		pending.resolve(collection)
		await load

		expect(entries.entries).toEqual([])
		expect(entries.isInitialized).toBe(false)
		expect(entries.loading).toBe(false)
	})

	it("refetches once after invalidate()", async () => {
		usePublicProfile()
		const entries = useEntriesStore()
		await entries.fetchAllAnimes()
		expect(calls).toBe(1)

		entries.invalidate()
		await entries.fetchAllAnimes()
		expect(calls).toBe(2)

		await entries.fetchAllAnimes()
		expect(calls).toBe(2)
	})
})
