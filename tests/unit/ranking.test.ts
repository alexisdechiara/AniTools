import { describe, expect, it } from "vitest"
import { competitionRanks, isTiedRank } from "../../app/utils/ranking"

describe("competition ranking", () => {
	it("gives distinct values consecutive ranks", () => {
		expect(competitionRanks([97, 96, 95])).toEqual([1, 2, 3])
	})

	it("lets equal values share the first rank of their group", () => {
		expect(competitionRanks([100, 100, 100])).toEqual([1, 1, 1])
		expect(competitionRanks([90, 80, 80])).toEqual([1, 2, 2])
		expect(competitionRanks([90, 90, 80])).toEqual([1, 1, 3])
	})

	it("flags tied positions only", () => {
		const values = [90, 80, 80]

		expect(isTiedRank(values, 0)).toBe(false)
		expect(isTiedRank(values, 1)).toBe(true)
		expect(isTiedRank(values, 2)).toBe(true)
		expect(isTiedRank(values, 5)).toBe(false)
	})
})
