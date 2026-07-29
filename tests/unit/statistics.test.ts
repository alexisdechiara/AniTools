import { describe, expect, it } from "vitest"
import {
	buildActivityGrid,
	getEntryWatchMinutes,
	selectBestScoreAnime,
	selectLongestWatchAnime,
	selectMostRewatchedAnime,
	sortStatistics
} from "../../app/utils/statistics"

describe("statistics helpers", () => {
	it("sorts a copy without mutating source statistics", () => {
		const source = [
			{ name: "Drama", count: 2, meanScore: 91 },
			{ name: "Comedy", count: 7, meanScore: 74 },
			{ name: "Action", count: 4, meanScore: 82 }
		]

		expect(sortStatistics(source, "count", 2).map(item => item.name)).toEqual([
			"Comedy",
			"Action"
		])
		expect(source.map(item => item.name)).toEqual(["Drama", "Comedy", "Action"])
	})

	it("ignores zero scores and uses deterministic tie breakers", () => {
		const entries = [
			{ score: 0, media: { averageScore: 99, isFavourite: true } },
			{ score: 90, media: { averageScore: 85, isFavourite: false } },
			{ score: 90, media: { averageScore: 80, isFavourite: true } }
		]

		expect(selectBestScoreAnime(entries)).toBe(entries[2])
	})

	it("includes completed rewatches in watched time", () => {
		const entry = {
			progress: 12,
			repeat: 2,
			media: { duration: 24, episodes: 12 }
		}

		expect(getEntryWatchMinutes(entry)).toBe(36 * 24)
	})

	it("selects longest and most rewatched entries independently", () => {
		const entries = [
			{ progress: 100, repeat: 0, media: { duration: 24, episodes: 100 } },
			{ progress: 12, repeat: 3, media: { duration: 24, episodes: 12 } },
			{ progress: 24, repeat: 1, media: { duration: 60, episodes: 24 } }
		]

		expect(selectLongestWatchAnime(entries)).toBe(entries[2])
		expect(selectMostRewatchedAnime(entries)).toBe(entries[1])
	})
})

describe("activity grid", () => {
	it("is deterministic and pads a leap year to complete weeks", () => {
		const counts = {
			"2024-01-01": 2,
			"2024-01-02": 4
		}
		const first = buildActivityGrid(2024, counts)
		const second = buildActivityGrid(2024, counts)

		expect(first).toEqual(second)
		expect(first).toHaveLength(371)
		expect(first.length % 7).toBe(0)
		expect(first[0]).toMatchObject({
			count: 2,
			opacity: 0.625,
			isCurrentMonth: true
		})
		expect(first[1]).toMatchObject({ count: 4, opacity: 1 })
	})

	it("uses a stable empty state instead of random activity", () => {
		const grid = buildActivityGrid(2025)
		const currentDays = grid.filter(day => day.isCurrentMonth)

		expect(currentDays).toHaveLength(365)
		expect(new Set(currentDays.map(day => day.opacity))).toEqual(new Set([0.12]))
	})
})
