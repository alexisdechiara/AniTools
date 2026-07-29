import { describe, expect, it } from "vitest"
import type {
	TierlistEntry,
	TierlistTier
} from "../../app/types/tierlist"
import { matchesTierlistFilters } from "../../app/utils/TierListEntryFilter"
import {
	findMatchingTierIds,
	findOverlappingTierRanges,
	matchesTierlistImportFilters,
	selectFranchiseRepresentatives
} from "../../app/utils/tierlist-ranking"

function entry(
	id: number,
	options: {
		score?: number
		status?: string
		year?: number
		relations?: Array<{ relationType: string, id: number }>
	} = {}
): TierlistEntry {
	return {
		status: options.status ?? "CURRENT",
		score: options.score ?? 80,
		media: {
			id,
			title: { userPreferred: `Anime ${id}` },
			startDate: {
				year: options.year ?? 2020,
				month: 1,
				day: 1
			},
			season: "WINTER",
			format: "TV",
			genres: ["Action"],
			relations: {
				edges: options.relations?.map(relation => ({
					relationType: relation.relationType,
					node: { id: relation.id }
				})) ?? []
			}
		}
	}
}

function tier(id: string, range: [number, number]): TierlistTier {
	return {
		id,
		name: id,
		color: "bg-neutral-500",
		range,
		entries: []
	}
}

describe("tierlist filters and score ranking", () => {
	it("matches AniList CURRENT for the Watching filter", () => {
		expect(matchesTierlistImportFilters(entry(1), {
			score: [0, 100],
			statuses: ["CURRENT"],
			genres: [],
			years: [],
			seasons: [],
			formats: []
		})).toBe(true)
		expect(matchesTierlistImportFilters(entry(1), {
			score: [0, 100],
			statuses: ["WATCHING"],
			genres: [],
			years: [],
			seasons: [],
			formats: []
		})).toBe(false)
	})

	it("treats zero as a valid range boundary", () => {
		const scoreless = entry(1, { score: 0 })
		expect(findMatchingTierIds(scoreless, [
			tier("zero", [0, 0]),
			tier("positive", [1, 100])
		])).toEqual(["zero"])
	})

	it("detects overlaps without replacing zero by a fallback", () => {
		expect(findOverlappingTierRanges([
			tier("zero", [0, 0]),
			tier("positive", [1, 100])
		])).toEqual([])
		expect(findOverlappingTierRanges([
			tier("first", [0, 0]),
			tier("second", [0, 0])
		])).toHaveLength(1)
	})

	it("applies the interactive title, genre, date, format and score filters", () => {
		expect(matchesTierlistFilters(entry(1), {
			title: "anime 1",
			genres: ["Action"],
			years: [2020],
			seasons: ["WINTER"],
			formats: ["TV"],
			score: [80, 80]
		})).toBe(true)
		expect(matchesTierlistFilters(entry(1), {
			title: "",
			genres: ["Drama"],
			years: [],
			seasons: [],
			formats: [],
			score: [0, 100]
		})).toBe(false)
	})
})

describe("franchise representatives", () => {
	it("keeps the earliest matching title in each prequel/sequel component", () => {
		const first = entry(1, {
			year: 2018,
			relations: [{ relationType: "SEQUEL", id: 2 }]
		})
		const second = entry(2, {
			year: 2020,
			relations: [
				{ relationType: "PREQUEL", id: 1 },
				{ relationType: "SEQUEL", id: 3 }
			]
		})
		const third = entry(3, {
			year: 2022,
			relations: [{ relationType: "PREQUEL", id: 2 }]
		})
		const unrelated = entry(4, { year: 2019 })

		expect(
			selectFranchiseRepresentatives(
				[first, second, third, unrelated],
				[first, second, third, unrelated]
			).map(item => item.media.id)
		).toEqual([1, 4])
	})

	it("selects the earliest candidate when the franchise root is filtered out", () => {
		const first = entry(1, {
			year: 2018,
			relations: [{ relationType: "SEQUEL", id: 2 }]
		})
		const second = entry(2, {
			year: 2020,
			relations: [{ relationType: "PREQUEL", id: 1 }]
		})

		expect(
			selectFranchiseRepresentatives([first, second], [second])
				.map(item => item.media.id)
		).toEqual([2])
	})

	it("does not merge spin-offs into the season chain", () => {
		const main = entry(1, {
			relations: [{ relationType: "SPIN_OFF", id: 2 }]
		})
		const spinOff = entry(2, { year: 2021 })
		expect(
			selectFranchiseRepresentatives([main, spinOff], [main, spinOff])
		).toHaveLength(2)
	})
})
