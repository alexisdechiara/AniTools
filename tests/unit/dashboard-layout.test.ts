import { describe, expect, it } from "vitest"
import {
	DEFAULT_DASHBOARD_CARD_IDS,
	addDashboardCard,
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
})
