import { describe, expect, it } from "vitest"
import { reconcileStatusStatistics } from "../../app/utils/dashboard-status"

function entry(status: "CURRENT" | "COMPLETED" | "PLANNING" | "REPEATING" | null, progress = 0) {
	return { status, progress, repeat: 0, media: { duration: 24, episodes: 12 } }
}

describe("status statistics reconciled with the live list", () => {
	// The contradiction seen on the dashboard: AniList's statistics snapshot still counted two
	// titles as watching after both were completed, while the list had nobody in progress.
	it("uses the live list when the statistics snapshot lags behind it", () => {
		const snapshot = [
			{ status: "COMPLETED", count: 10, meanScore: 78, minutesWatched: 2_880 },
			{ status: "CURRENT", count: 2, meanScore: 70, minutesWatched: 240 }
		]
		const list = [
			...Array.from({ length: 12 }, () => entry("COMPLETED", 12))
		]

		expect(reconcileStatusStatistics(snapshot, list)).toEqual([
			{ status: "COMPLETED", count: 12, meanScore: 78, minutesWatched: 2_880 }
		])
	})

	it("adds a status the snapshot does not know yet, with the watch time of its entries", () => {
		const snapshot = [{ status: "COMPLETED", count: 1, meanScore: 80, minutesWatched: 288 }]
		const list = [entry("COMPLETED", 12), entry("REPEATING", 5), entry("PLANNING")]

		expect(reconcileStatusStatistics(snapshot, list)).toEqual([
			{ status: "COMPLETED", count: 1, meanScore: 80, minutesWatched: 288 },
			{ status: "REPEATING", count: 1, minutesWatched: 120 },
			{ status: "PLANNING", count: 1, minutesWatched: 0 }
		])
	})

	it("builds the split from the list alone when AniList has no statistics yet", () => {
		expect(reconcileStatusStatistics([], [entry("CURRENT", 3), entry("CURRENT", 1)])).toEqual([
			{ status: "CURRENT", count: 2, minutesWatched: 96 }
		])
		expect(reconcileStatusStatistics(undefined, [])).toEqual([])
	})

	it("keeps the snapshot while the list is unknown", () => {
		const snapshot = [
			{ status: "CURRENT", count: 2, meanScore: 70, minutesWatched: 240 },
			{ status: null, count: 1, meanScore: 0, minutesWatched: 0 }
		]

		expect(reconcileStatusStatistics(snapshot, null)).toEqual([
			{ status: "CURRENT", count: 2, meanScore: 70, minutesWatched: 240 }
		])
	})

	it("ignores list entries without a status", () => {
		expect(reconcileStatusStatistics([], [entry(null, 4)])).toEqual([])
	})
})
