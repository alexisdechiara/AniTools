import { registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
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
})
