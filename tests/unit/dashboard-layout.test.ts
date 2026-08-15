import { describe, expect, it } from "vitest"
import {
	DEFAULT_DASHBOARD_CARD_IDS,
	addDashboardCard,
	getDashboardDeleteAttractionOffset,
	isDashboardDeleteTargetHit,
	moveDashboardCard,
	normalizeDashboardCardIds,
	removeDashboardCard
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
