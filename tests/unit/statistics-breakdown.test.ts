import { describe, expect, it } from "vitest"
import { ANILIST_SCORE_FORMATS, type AniListScoreFormat } from "../../shared/types/anilist"
import { formatMeanScore } from "../../app/utils/score-format"
import {
	aggregateEntriesByDimension,
	describeCountComparison,
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
	})
})

describe("statistics breakdown mean scores", () => {
	/** The same three ratings (95%, 100%, 100%) written in each AniList score format. */
	const POINT_100_SCORES = [95, 100, 100]

	function scoredEntries(scores: readonly number[]): StatisticsBreakdownEntry[] {
		return scores.map((score, index) => entry(index + 1, {
			year: 2025,
			score,
			genres: ["Action"]
		}))
	}

	function actionMean(scores: readonly number[], sourceFormat: AniListScoreFormat): number {
		const [action] = aggregateEntriesByDimension(
			scoredEntries(scores),
			"genres",
			2025,
			sourceFormat
		)
		return action?.meanScore ?? Number.NaN
	}

	it("matches the all-time AniList statistic for a 10-point decimal profile", () => {
		// AniList reports statistics means on its 0-100 scale whatever the profile format.
		const aniListMean = POINT_100_SCORES.reduce((total, score) => total + score, 0)
			/ POINT_100_SCORES.length
		const periodMean = actionMean([9.5, 10, 10], "POINT_10_DECIMAL")

		expect(periodMean).toBeCloseTo(aniListMean, 2)
		for (const displayFormat of ANILIST_SCORE_FORMATS) {
			expect(formatMeanScore(periodMean, displayFormat))
				.toBe(formatMeanScore(aniListMean, displayFormat))
		}
		expect(formatMeanScore(periodMean, "POINT_10_DECIMAL")).toBe("9.8/10")
		expect(formatMeanScore(periodMean, "POINT_100")).toBe("98%")
	})

	it("normalises every profile format to a percentage", () => {
		expect(actionMean([70, 80, 90], "POINT_100")).toBe(80)
		expect(actionMean([7, 8, 9], "POINT_10")).toBe(80)
		expect(actionMean([7.5, 8.5], "POINT_10_DECIMAL")).toBe(80)
		expect(actionMean([3, 5], "POINT_5")).toBe(80)
		expect(actionMean([3, 3], "POINT_3")).toBe(85)
		expect(actionMean([1, 3], "POINT_3")).toBe(57.5)
	})

	it("displays each profile format in its own notation", () => {
		expect(formatMeanScore(actionMean([70, 80, 90], "POINT_100"), "POINT_100")).toBe("80%")
		expect(formatMeanScore(actionMean([7, 8, 9], "POINT_10"), "POINT_10")).toBe("8/10")
		expect(formatMeanScore(actionMean([7.5, 8.5], "POINT_10_DECIMAL"), "POINT_10_DECIMAL"))
			.toBe("8.0/10")
		expect(formatMeanScore(actionMean([3, 5], "POINT_5"), "POINT_5")).toBe("4/5")
		expect(formatMeanScore(actionMean([3, 3], "POINT_3"), "POINT_3")).toBe("🙂")
		expect(formatMeanScore(actionMean([1, 2], "POINT_3"), "POINT_3")).toBe("😐")
		expect(formatMeanScore(actionMean([1, 1], "POINT_3"), "POINT_3")).toBe("😞")
	})

	it("ignores unscored entries and shows a dash when nothing is scored", () => {
		expect(actionMean([0, 8], "POINT_10")).toBe(80)

		const unscored = actionMean([0, 0], "POINT_10")
		expect(unscored).toBe(0)
		for (const displayFormat of ANILIST_SCORE_FORMATS) {
			expect(formatMeanScore(unscored, displayFormat)).toBe("—")
		}
		expect(formatMeanScore(null, "POINT_100")).toBe("—")
		expect(formatMeanScore(Number.NaN, "POINT_100")).toBe("—")
	})

	it("never prints more than one decimal", () => {
		const mean = actionMean([7.3, 8.1, 9.4], "POINT_10_DECIMAL")

		expect(formatMeanScore(mean, "POINT_10_DECIMAL")).toBe("8.3/10")
		expect(formatMeanScore(mean, "POINT_100")).toBe("83%")
	})

	it("sorts on the normalised mean, whatever format each mean came from", () => {
		const period = aggregateEntriesByDimension([
			entry(1, { score: 9.5, genres: ["Drama"] }),
			entry(2, { score: 6, genres: ["Comedy"] })
		], "genres", undefined, "POINT_10_DECIMAL")
		const allTime = {
			key: "action",
			name: "Action",
			count: 4,
			meanScore: 81,
			minutesWatched: 0,
			mediaIds: []
		}

		expect(sortBreakdownItems([...period, allTime], "meanScore").map(item => item.name))
			.toEqual(["Drama", "Action", "Comedy"])
	})
})

describe("count comparison copy", () => {
	it("states the absolute difference when the base is small", () => {
		expect(describeCountComparison(10, 3, "2024"))
			.toEqual({ text: "7 more than 2024", tone: "positive" })
		expect(describeCountComparison(6, 3, "2024"))
			.toEqual({ text: "3 more than 2024", tone: "positive" })
		expect(describeCountComparison(1, 4, "2024"))
			.toEqual({ text: "3 fewer than 2024", tone: "negative" })
	})

	it("uses whole percentages once the base is large enough", () => {
		expect(describeCountComparison(40, 12, "2024"))
			.toEqual({ text: "233% more titles than 2024", tone: "positive" })
		expect(describeCountComparison(15, 10, "2024"))
			.toEqual({ text: "50% more titles than 2024", tone: "positive" })
		expect(describeCountComparison(20, 30, "2024"))
			.toEqual({ text: "33% fewer titles than 2024", tone: "negative" })
	})

	it("never rounds a real change down to 0%", () => {
		expect(describeCountComparison(301, 300, "2024"))
			.toEqual({ text: "1 more than 2024", tone: "positive" })
	})

	it("is neutral when nothing changed or there is no base", () => {
		expect(describeCountComparison(12, 12, "2024"))
			.toEqual({ text: "Same as 2024", tone: "neutral" })
		expect(describeCountComparison(0, 0, "2024"))
			.toEqual({ text: "Same as 2024", tone: "neutral" })
		expect(describeCountComparison(2, 0, "2024"))
			.toEqual({ text: "New compared with 2024", tone: "neutral" })
	})
})
