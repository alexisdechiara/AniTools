import { describe, expect, it } from "vitest"
import { buildCreateStatTiles } from "../../app/utils/create-stats"

describe("Create stats tiles", () => {
	it("builds four labelled tiles from a stats snapshot", () => {
		const tiles = buildCreateStatTiles({
			count: 128,
			meanScore: 76.4,
			minutesWatched: 4_215,
			episodesWatched: 987
		})

		expect(tiles).toEqual([
			{ label: "Anime watched", value: "128" },
			{ label: "Episodes watched", value: "987" },
			{ label: "Watch time", value: "2d 22h 15m" },
			{ label: "Mean score", value: "76%" }
		])
	})

	it("clamps negative or fractional counts to a safe non-negative integer", () => {
		const tiles = buildCreateStatTiles({
			count: -3,
			meanScore: 0,
			minutesWatched: 0,
			episodesWatched: 4.7
		})

		expect(tiles[0]).toEqual({ label: "Anime watched", value: "0" })
		expect(tiles[1]).toEqual({ label: "Episodes watched", value: "5" })
	})
})
