import { describe, expect, it } from "vitest"
import {
	DASHBOARD_GRID_COLUMNS,
	DEFAULT_DASHBOARD_CARD_IDS,
	addDashboardCard,
	getDashboardDeleteAttractionOffset,
	isDashboardDeleteTargetHit,
	moveDashboardCard,
	normalizeDashboardCardIds,
	packDashboardLayout,
	removeDashboardCard,
	scaleDashboardCardWidth
} from "../../app/utils/dashboard-layout"

describe("dashboard layout preferences", () => {
	it("normalizes stored values without duplicates or unknown cards", () => {
		expect(normalizeDashboardCardIds([
			"status",
			"unknown",
			"status",
			"watch-time",
			42
		])).toEqual(["status", "watch-time"])
	})

	it("uses defaults only when the stored value is invalid", () => {
		expect(normalizeDashboardCardIds(null)).toEqual(DEFAULT_DASHBOARD_CARD_IDS)
		expect(normalizeDashboardCardIds([])).toEqual([])
	})

	it("adds and removes cards without mutating the current order", () => {
		const source = ["watch-time", "status"] as const

		expect(addDashboardCard(source, "current-anime")).toEqual([
			"watch-time",
			"status",
			"current-anime"
		])
		expect(addDashboardCard(source, "status")).toEqual(source)
		expect(removeDashboardCard(source, "watch-time")).toEqual(["status"])
		expect(source).toEqual(["watch-time", "status"])
	})

	it("moves a card within bounds and ignores invalid moves", () => {
		const source = ["watch-time", "status", "current-anime"] as const

		expect(moveDashboardCard(source, "status", -1)).toEqual([
			"status",
			"watch-time",
			"current-anime"
		])
		expect(moveDashboardCard(source, "watch-time", -1)).toEqual(source)
		expect(moveDashboardCard(source, "current-anime", 1)).toEqual(source)
	})

	it("detects the dashboard delete target with a forgiving drop margin", () => {
		const bounds = { top: 100, right: 180, bottom: 180, left: 100 }

		expect(isDashboardDeleteTargetHit({ x: 140, y: 140 }, bounds)).toBe(true)
		expect(isDashboardDeleteTargetHit({ x: 90, y: 140 }, bounds)).toBe(true)
		expect(isDashboardDeleteTargetHit({ x: 70, y: 140 }, bounds)).toBe(false)
		expect(isDashboardDeleteTargetHit({ x: 140, y: 70 }, null)).toBe(false)
	})

	it("calculates the translation that pulls a card into the delete target", () => {
		expect(getDashboardDeleteAttractionOffset(
			{ top: 100, right: 300, bottom: 300, left: 100 },
			{ top: 700, right: 580, bottom: 780, left: 500 }
		)).toEqual({ x: 340, y: 540 })
		expect(getDashboardDeleteAttractionOffset(null, null)).toBeNull()
	})
})

describe("dashboard grid packing", () => {
	const metric = { w: 3, h: 1 }
	const wide = { w: 9, h: 3 }
	const tall = { w: 3, h: 4 }

	it("packs the default 12-column layout without gaps", () => {
		const layout = packDashboardLayout([
			{ id: "watch-time", size: metric },
			{ id: "anime-count", size: metric },
			{ id: "episode-count", size: metric },
			{ id: "status", size: tall },
			{ id: "mean-score", size: wide }
		])

		expect(layout.map(({ i, x, y }) => [i, x, y])).toEqual([
			["watch-time", 0, 0],
			["anime-count", 3, 0],
			["episode-count", 6, 0],
			["status", 9, 0],
			["mean-score", 0, 1]
		])
	})

	it("narrows cards proportionally on the 8-column tablet grid", () => {
		const layout = packDashboardLayout([
			{ id: "watch-time", size: metric },
			{ id: "anime-count", size: metric },
			{ id: "episode-count", size: metric },
			{ id: "status", size: metric }
		], 8)

		expect(layout.map(({ x, y, w }) => [x, y, w])).toEqual([
			[0, 0, 2],
			[2, 0, 2],
			[4, 0, 2],
			[6, 0, 2]
		])
	})

	it("turns third-width cards into halves and lets the last one fill its row", () => {
		const third = { w: 4, h: 3 }
		const layout = packDashboardLayout([
			{ id: "next-episodes", size: third },
			{ id: "current-anime", size: third },
			{ id: "recent-updates", size: third }
		], 8)

		expect(layout.map(({ x, y, w }) => [x, y, w])).toEqual([
			[0, 0, 4],
			[4, 0, 4],
			[0, 3, 8]
		])
	})

	it("keeps authored widths on the full 12-column grid", () => {
		const layout = packDashboardLayout([{ id: "watch-time", size: metric }])

		expect(layout[0]?.w).toBe(3)
	})

	it("snaps to half or full width on narrow grids", () => {
		expect(scaleDashboardCardWidth(3, DASHBOARD_GRID_COLUMNS.sm)).toBe(2)
		expect(scaleDashboardCardWidth(9, DASHBOARD_GRID_COLUMNS.sm)).toBe(4)
		expect(scaleDashboardCardWidth(3, DASHBOARD_GRID_COLUMNS.xs)).toBe(1)
		expect(scaleDashboardCardWidth(6, DASHBOARD_GRID_COLUMNS.xs)).toBe(2)
		expect(scaleDashboardCardWidth(9, DASHBOARD_GRID_COLUMNS.xxs)).toBe(1)
	})

	it("gives lists and charts the full width on phone grids", () => {
		expect(scaleDashboardCardWidth(4, DASHBOARD_GRID_COLUMNS.xs, 3)).toBe(2)
		expect(scaleDashboardCardWidth(3, DASHBOARD_GRID_COLUMNS.xs, 4)).toBe(2)
		expect(scaleDashboardCardWidth(3, DASHBOARD_GRID_COLUMNS.xs, 1)).toBe(1)
	})

	it("never places a card outside the grid", () => {
		for (const columns of Object.values(DASHBOARD_GRID_COLUMNS)) {
			const layout = packDashboardLayout([
				{ id: "watch-time", size: metric },
				{ id: "mean-score", size: wide },
				{ id: "status", size: tall }
			], columns)

			for (const item of layout) {
				expect(item.x + item.w).toBeLessThanOrEqual(columns)
			}
		}
	})
})
