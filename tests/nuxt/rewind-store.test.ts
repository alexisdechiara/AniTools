import { registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildRewindActivityRequest, useRewindStore } from "~/stores/Rewind"
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
		createdAt: 1_700_000_000,
		replyCount: 0,
		type: "ANIME_LIST",
		user: null,
		status: "watched episode",
		progress: "1",
		media: null
	}
}

// A single page with no next page ends the collection; the activity id names the year.
function pageFor(year: number): AniListActivitiesResponse {
	return {
		source: { mode: "public", username: "alice" },
		pageInfo: { currentPage: 1, hasNextPage: false, lastPage: 1, perPage: 50, total: 1 },
		activities: [activity(year)]
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

// One page of a year that spans several activity pages; activity ids are unique per page.
function pageOf(year: number, page: number, lastPage: number): AniListActivitiesResponse {
	return {
		source: { mode: "public", username: "alice" },
		pageInfo: { currentPage: page, hasNextPage: page < lastPage, lastPage, perPage: 50, total: lastPage },
		activities: [activity(year * 100 + page)]
	}
}

const requestedYears: number[] = []
const requestedPages: number[] = []
const pagedYears = new Map<number, number>()
const pendingYears = new Map<number, Deferred<AniListActivitiesResponse>>()
let unregister: (() => void) | null = null

// Years with a deferred answer through it; every other year answers at once.
function serveActivities() {
	unregister?.()
	unregister = registerEndpoint(ACTIVITIES_ENDPOINT, {
		method: "GET",
		handler: (event) => {
			const params = new URL(event.path, "http://localhost").searchParams
			const year = Number(params.get("year"))
			const page = Number(params.get("page"))
			requestedYears.push(year)
			requestedPages.push(page)
			const lastPage = pagedYears.get(year)
			if (lastPage) return pageOf(year, page, lastPage)
			return pendingYears.get(year)?.promise ?? pageFor(year)
		}
	})
}

function holdYear(year: number): Deferred<AniListActivitiesResponse> {
	const pending = deferred<AniListActivitiesResponse>()
	pendingYears.set(year, pending)
	return pending
}

function usePublicProfile() {
	const user = useUserStore()
	user.id = 1
	user.username = "alice"
	user.authMode = "public"
}

describe("Rewind store", () => {
	beforeEach(() => {
		useUserStore().$reset()
		useRewindStore().$reset()
		requestedYears.length = 0
		requestedPages.length = 0
		pendingYears.clear()
		pagedYears.clear()
		serveActivities()
	})

	afterEach(() => {
		unregister?.()
		unregister = null
	})

	it("requests each activity page once when the page mount and the route watcher both ask", async () => {
		pagedYears.set(2025, 7)
		usePublicProfile()
		const rewind = useRewindStore()

		// `/rewind/[year]` calls fetchYear from onMounted and again from its route watcher.
		const fromMount = rewind.fetchYear(2025)
		const fromWatcher = rewind.fetchYear(2025)
		await Promise.all([fromMount, fromWatcher])

		expect(requestedPages).toEqual([1, 2, 3, 4, 5, 6, 7])
		expect(rewind.activities).toHaveLength(7)
		expect(rewind.truncated).toBe(false)
	})

	it("does not request a loaded year again", async () => {
		pagedYears.set(2025, 3)
		usePublicProfile()
		const rewind = useRewindStore()

		await rewind.fetchYear(2025)
		await rewind.fetchYear(2025)
		await rewind.fetchYear(2024)
		await rewind.fetchYear(2025)

		expect(requestedPages).toEqual([1, 2, 3, 1])
		expect(requestedYears).toEqual([2025, 2025, 2025, 2024])
	})

	it("asks for each page once, past the browser HTTP cache", async () => {
		// The duplicate requests seen on /rewind were not a second store call: public reads are
		// served with stale-while-revalidate, so the browser answered a reopened year from its
		// HTTP cache and refreshed every page in the background. `no-store` leaves one request.
		expect(buildRewindActivityRequest(2025, 3, "alice")).toEqual({
			query: { username: "alice", kind: "anime", year: 2025, page: 3, perPage: 50 },
			cache: "no-store"
		})
		expect(buildRewindActivityRequest(2025, 1).query).not.toHaveProperty("username")

		pagedYears.set(2025, 4)
		usePublicProfile()
		const rewind = useRewindStore()
		await Promise.all([rewind.fetchYear(2025), rewind.fetchYear(2025)])

		expect(requestedPages).toEqual([1, 2, 3, 4])
	})

	it("keeps the newest year when an older request finishes last", async () => {
		const year2024 = holdYear(2024)
		const year2025 = holdYear(2025)
		usePublicProfile()
		const rewind = useRewindStore()

		const first = rewind.fetchYear(2024)
		const second = rewind.fetchYear(2025)
		await vi.waitFor(() => expect(requestedYears).toEqual(expect.arrayContaining([2024, 2025])))

		year2025.resolve(pageFor(2025))
		await second
		year2024.resolve(pageFor(2024))
		await first

		expect(rewind.year).toBe(2025)
		expect(rewind.activities.map(item => item.id)).toEqual([2025])
		expect(rewind.loading).toBe(false)
	})

	it("keeps a cached year chosen while another year is still loading", async () => {
		usePublicProfile()
		const rewind = useRewindStore()
		await rewind.fetchYear(2025)
		const year2024 = holdYear(2024)

		const slow = rewind.fetchYear(2024)
		await vi.waitFor(() => expect(requestedYears).toContain(2024))
		await rewind.fetchYear(2025)
		year2024.resolve(pageFor(2024))
		await slow

		expect(rewind.year).toBe(2025)
		expect(rewind.activities.map(item => item.id)).toEqual([2025])
		expect(rewind.loading).toBe(false)
	})

	it("clears the activities as soon as the identity changes", async () => {
		usePublicProfile()
		const rewind = useRewindStore()
		await rewind.fetchYear(2025)
		expect(rewind.activities).toHaveLength(1)

		useUserStore().username = "bob"
		await nextTick()

		expect(rewind.activities).toEqual([])
		expect(rewind.year).toBeNull()
	})

	it("refetches a year for the new identity instead of reusing the previous one's cache", async () => {
		usePublicProfile()
		const rewind = useRewindStore()
		await rewind.fetchYear(2025)
		expect(requestedYears).toEqual([2025])

		useUserStore().username = "bob"
		await rewind.fetchYear(2025)

		expect(requestedYears).toEqual([2025, 2025])
	})
})
