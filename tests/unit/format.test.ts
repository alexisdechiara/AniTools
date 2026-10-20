import { describe, expect, it } from "vitest"
import {
	formatAiringTime,
	formatDateTime,
	formatNumber,
	formatRelativeTime
} from "../../app/utils/format"

const now = new Date("2026-10-20T12:00:00Z")

describe("interface formatting", () => {
	it("groups numbers with the interface locale", () => {
		expect(formatNumber(5307)).toBe("5,307")
		expect(formatNumber(null)).toBe("-")
		expect(formatNumber(Number.NaN)).toBe("-")
	})

	it("formats dates in English whatever the browser locale", () => {
		const date = new Date("2026-10-19T12:00:00Z")

		expect(formatDateTime(date, { weekday: "short", timeZone: "UTC" })).toBe("Mon")
	})

	it("picks the coarsest natural relative unit", () => {
		expect(formatRelativeTime(new Date("2026-10-20T12:30:00Z"), now)).toBe("in 30 minutes")
		expect(formatRelativeTime(new Date("2026-10-20T15:00:00Z"), now)).toBe("in 3 hours")
		expect(formatRelativeTime(new Date("2026-10-21T12:00:00Z"), now)).toBe("tomorrow")
		expect(formatRelativeTime(new Date("2026-10-25T12:00:00Z"), now)).toBe("in 5 days")
		expect(formatRelativeTime(new Date("2026-10-19T12:00:00Z"), now)).toBe("yesterday")
	})

	it("shows an airing as a relative distance plus the exact slot", () => {
		const airing = formatAiringTime(new Date("2026-10-22T12:00:00Z"), now)

		expect(airing.startsWith("in 2 days · ")).toBe(true)
		expect(airing).toMatch(/^in 2 days · [A-Z][a-z]{2} \d{2}:\d{2}$/)
	})
})
