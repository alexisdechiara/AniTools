import { registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTimeline } from "~/composables/useTimeline"
import { useUserStore } from "~/stores/User"
import type {
	AniListActivitiesResponse,
	AniListAnimeActivity
} from "~~/shared/types/anilist"

const ACTIVITIES_ENDPOINT = "/api/anilist/activities"

function activity(id: number): AniListAnimeActivity {
	return {
		kind: "anime",
		id,
		createdAt: 1_700_000_000 + id,
		replyCount: 0,
		type: "ANIME_LIST",
		user: null,
		status: "watched episode",
		progress: "1",
		media: null
	}
}

function pageResponse(page: number, hasNextPage: boolean): AniListActivitiesResponse {
	return {
		source: { mode: "public", username: "timeline-alice" },
		pageInfo: { currentPage: page, hasNextPage, lastPage: 2, perPage: 50, total: 2 },
		activities: [activity(page)]
	}
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

const requestedPages: number[] = []
let pendingSecondPage: Deferred<AniListActivitiesResponse> | null = null
let unregister: (() => void) | null = null

// Page 1 answers at once; page 2 answers through the deferred when one is armed.
function serveActivities() {
	unregister?.()
	unregister = registerEndpoint(ACTIVITIES_ENDPOINT, {
		method: "GET",
		handler: (event) => {
			const page = Number(new URL(event.path, "http://localhost").searchParams.get("page"))
			requestedPages.push(page)
			if (page === 2 && pendingSecondPage) return pendingSecondPage.promise
			return pageResponse(page, page === 1)
		}
	})
}

function usePublicProfile() {
	const user = useUserStore()
	user.id = 1
	user.username = "timeline-alice"
	user.authMode = "public"
}

describe("useTimeline", () => {
	beforeEach(() => {
		useUserStore().$reset()
		requestedPages.length = 0
		pendingSecondPage = null
		serveActivities()
		usePublicProfile()
	})

	afterEach(() => {
		unregister?.()
		unregister = null
		pendingSecondPage = null
	})

	it("releases the load-more flag when a reload supersedes a pending load more", async () => {
		const timeline = useTimeline()
		await timeline.load(true)
		expect(timeline.pageInfo.value.hasNextPage).toBe(true)
		expect(timeline.activities.value.map(item => item.id)).toEqual([1])

		pendingSecondPage = deferred<AniListActivitiesResponse>()
		const stale = timeline.loadMore()
		await vi.waitFor(() => expect(requestedPages).toContain(2))
		expect(timeline.loadingMore.value).toBe(true)

		await timeline.load(true)
		expect(timeline.loadingMore.value).toBe(false)
		expect(timeline.loading.value).toBe(false)

		pendingSecondPage.resolve(pageResponse(2, false))
		await stale

		// The superseded response must not be merged, and must not flip the flags.
		expect(timeline.loadingMore.value).toBe(false)
		expect(timeline.loading.value).toBe(false)
		expect(timeline.activities.value.map(item => item.id)).toEqual([1])
		expect(timeline.pageInfo.value.currentPage).toBe(1)

		// Pagination still works afterwards.
		await timeline.loadMore()
		expect(timeline.pageInfo.value.currentPage).toBe(2)
		expect(timeline.activities.value.map(item => item.id).toSorted()).toEqual([1, 2])
	})
})
