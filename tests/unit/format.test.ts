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

	it("honours an explicit zone and clock for an airing", () => {
		const airing = new Date("2026-10-22T12:00:00Z")
		// Intl separates the time and the day period with a narrow no-break space.
		const plain = (value: string) => value.replace(/\s/g, " ")

		expect(formatAiringTime(airing, now, { timeZone: "Asia/Tokyo", hourCycle: "h23" }))
			.toBe("in 2 days · Thu 21:00")
		expect(formatAiringTime(airing, now, { timeZone: "UTC", hourCycle: "h23" }))
			.toBe("in 2 days · Thu 12:00")
		expect(plain(formatAiringTime(airing, now, { timeZone: "America/New_York", hourCycle: "h12" })))
			.toBe("in 2 days · Thu 8:00 AM")
		expect(plain(formatAiringTime(new Date("2026-10-22T16:30:00Z"), now, { timeZone: "Asia/Tokyo", hourCycle: "h12" })))
			.toBe("in 2 days · Fri 1:30 AM")
	})

	it("passes a zone and a clock to any date format", () => {
		const date = new Date("2026-10-19T23:30:00Z")

		expect(formatDateTime(date, { weekday: "short" }, { timeZone: "Asia/Tokyo" })).toBe("Tue")
		expect(formatDateTime(date, { weekday: "short" }, { timeZone: "UTC" })).toBe("Mon")
	})
})
