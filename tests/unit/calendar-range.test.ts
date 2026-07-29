import { describe, expect, it } from "vitest"
import { getCalendarRange } from "../../app/utils/calendarRange"

describe("getCalendarRange", () => {
	it("returns a Monday-based week with an exclusive end", () => {
		const input = new Date(2026, 6, 29, 15, 45, 30)
		const range = getCalendarRange("week", input)

		expect(range.start).toEqual(new Date(2026, 6, 27, 0, 0, 0, 0))
		expect(range.end).toEqual(new Date(2026, 7, 3, 0, 0, 0, 0))
		expect(input).toEqual(new Date(2026, 6, 29, 15, 45, 30))
	})

	it("moves a Sunday back to the previous Monday", () => {
		const range = getCalendarRange("week", new Date(2026, 0, 4, 12))

		expect(range.start).toEqual(new Date(2025, 11, 29))
		expect(range.end).toEqual(new Date(2026, 0, 5))
	})

	it("returns calendar-month boundaries, including leap years", () => {
		const range = getCalendarRange("month", new Date(2024, 1, 29, 23, 59))

		expect(range.start).toEqual(new Date(2024, 1, 1))
		expect(range.end).toEqual(new Date(2024, 2, 1))
	})

	it("returns calendar-year boundaries", () => {
		const range = getCalendarRange("year", new Date(2026, 10, 15))

		expect(range.start).toEqual(new Date(2026, 0, 1))
		expect(range.end).toEqual(new Date(2027, 0, 1))
	})
})
