import { registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useEntriesStore } from "~/stores/Entries"
import { useStatisticsStore } from "~/stores/Statistics"
import { useUserStore } from "~/stores/User"
import type {
	AniListStatistics,
	AniListStatisticsResponse
} from "~~/shared/types/anilist"

const STATISTICS_ENDPOINT = "/api/anilist/statistics"

function statisticsWith(count: number): AniListStatistics {
	return {
		count,
		meanScore: 75,
		minutesWatched: count * 240,
		episodesWatched: count * 12,
		statuses: [],
		scores: [],
		formats: [],
		countries: [],
		genres: [],
		tags: [],
		startYears: [],
		releaseYears: [],
		studios: [],
		voiceActors: [],
		staff: [],
		lengths: []
	}
}

function responseFor(username: string, count: number): AniListStatisticsResponse {
	return {
		source: { mode: "public", username },
		statistics: statisticsWith(count)
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

let calls = 0
let unregister: (() => void) | null = null

function serve(answer: () => AniListStatisticsResponse | Promise<AniListStatisticsResponse>) {
	unregister?.()
	unregister = registerEndpoint(STATISTICS_ENDPOINT, {
		method: "GET",
		handler: () => {
			calls += 1
			return answer()
		}
	})
}

function usePublicProfile() {
	const user = useUserStore()
	user.id = 1
	user.username = "alice"
	user.authMode = "public"
}

describe("Statistics store", () => {
	beforeEach(() => {
		useUserStore().$reset()
		useEntriesStore().$reset()
		useStatisticsStore().$reset()
		calls = 0
		serve(() => responseFor("alice", 10))
	})

	afterEach(() => {
		unregister?.()
		unregister = null
	})

	it("loads once per identity", async () => {
		usePublicProfile()
		const statistics = useStatisticsStore()

		await expect(statistics.fetchStatistics()).resolves.toBe(true)
		await expect(statistics.fetchStatistics()).resolves.toBe(true)

		expect(statistics.statistics?.count).toBe(10)
		expect(statistics.isInitialized).toBe(true)
		expect(calls).toBe(1)
	})

	it("clears the statistics as soon as the identity changes", async () => {
		usePublicProfile()
		const statistics = useStatisticsStore()
		await statistics.fetchStatistics()
		expect(statistics.statistics).not.toBeNull()

		useUserStore().username = "bob"
		await nextTick()

		expect(statistics.statistics).toBeNull()
		expect(statistics.isInitialized).toBe(false)
	})

	it("discards a late response for the previous identity", async () => {
		const aliceResponse = deferred<AniListStatisticsResponse>()
		serve(() => aliceResponse.promise)
		usePublicProfile()
		const statistics = useStatisticsStore()
		const aliceLoad = statistics.fetchStatistics()
		await vi.waitFor(() => expect(calls).toBe(1))

		useUserStore().username = "bob"
		serve(() => responseFor("bob", 42))
		await expect(statistics.fetchStatistics()).resolves.toBe(true)
		expect(statistics.statistics?.count).toBe(42)

		aliceResponse.resolve(responseFor("alice", 10))
		await aliceLoad

		expect(statistics.statistics?.count).toBe(42)
		expect(statistics.source?.username).toBe("bob")
		expect(statistics.loading).toBe(false)
	})

	it("refetches once after invalidate()", async () => {
		usePublicProfile()
		const statistics = useStatisticsStore()
		await statistics.fetchStatistics()
		expect(calls).toBe(1)

		statistics.invalidate()
		await statistics.fetchStatistics()
		expect(calls).toBe(2)

		await statistics.fetchStatistics()
		expect(calls).toBe(2)
	})
})
