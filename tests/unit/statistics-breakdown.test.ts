import { describe, expect, it } from "vitest"
import {
	aggregateEntriesByDimension,
	getCountChange,
	getStatisticsCompletionYears,
	sortBreakdownItems,
	type StatisticsBreakdownEntry
} from "../../app/utils/statistics-breakdown"

function entry(
	id: number,
	options: {
		year?: number
		score?: number
		progress?: number
		repeat?: number
		duration?: number
		episodes?: number
		genres?: string[]
		tags?: Array<{ id: number, name: string }>
		studios?: Array<{
			id: number
			name: string
			isMain: boolean
			isAnimationStudio?: boolean
		}>
	} = {}
): StatisticsBreakdownEntry {
	return {
		id,
		score: options.score ?? 0,
		progress: options.progress ?? 0,
		repeat: options.repeat ?? 0,
		completedAt: options.year ? { year: options.year } : null,
		media: {
			id: id * 10,
			duration: options.duration ?? 24,
			episodes: options.episodes ?? 12,
			genres: options.genres ?? [],
			tags: options.tags ?? [],
			studios: {
				edges: (options.studios ?? []).map(studio => ({
					isMain: studio.isMain,
					node: {
						id: studio.id,
						name: studio.name,
						isAnimationStudio: studio.isAnimationStudio ?? true
					}
				}))
			}
		}
	}
}

describe("statistics breakdown aggregation", () => {
	it("aggregates genres with positive-score means and watched minutes", () => {
		const entries = [
			entry(1, {
				year: 2025,
				score: 80,
				progress: 12,
				genres: ["Action", "Drama"]
			}),
			entry(2, {
				year: 2025,
				score: 0,
				progress: 6,
				genres: ["Action"]
			}),
			entry(3, {
				year: 2024,
				score: 90,
				progress: 12,
				genres: ["Action"]
			})
		]

		const result = aggregateEntriesByDimension(entries, "genres", 2025)
		const action = result.find(item => item.name === "Action")

		expect(action).toMatchObject({
			count: 2,
			meanScore: 80,
			minutesWatched: 18 * 24,
			mediaIds: [10, 20]
		})
		expect(result.find(item => item.name === "Drama")?.count).toBe(1)
	})

	it("deduplicates tags and selects main animation studios", () => {
		const source = [
			entry(1, {
				tags: [
					{ id: 1, name: "Found Family" },
					{ id: 1, name: "Found Family" }
				],
				studios: [
					{ id: 10, name: "Main Studio", isMain: true },
					{ id: 20, name: "Support Studio", isMain: false },
					{
						id: 30,
						name: "Producer",
						isMain: true,
						isAnimationStudio: false
					}
				]
			})
		]

		expect(aggregateEntriesByDimension(source, "tags")).toHaveLength(1)
		expect(aggregateEntriesByDimension(source, "studios").map(item => item.name))
			.toEqual(["Main Studio"])
	})

	it("lists completion years in descending order", () => {
		expect(getStatisticsCompletionYears([
			entry(1, { year: 2023 }),
			entry(2, { year: 2025 }),
			entry(3, { year: 2023 }),
			entry(4)
		])).toEqual([2025, 2023])
	})

	it("sorts deterministically and handles comparison baselines", () => {
		const items = [
			{
				key: "b",
				name: "Beta",
				count: 2,
				meanScore: 80,
				minutesWatched: 100,
				mediaIds: []
			},
			{
				key: "a",
				name: "Alpha",
				count: 2,
				meanScore: 90,
				minutesWatched: 50,
				mediaIds: []
			}
		]

		expect(sortBreakdownItems(items, "count").map(item => item.name))
			.toEqual(["Alpha", "Beta"])
		expect(getCountChange(15, 10)).toBe(50)
		expect(getCountChange(2, 0)).toBeNull()
		expect(getCountChange(0, 0)).toBe(0)
	})
})
