import { describe, expect, it } from "vitest"
import { formatWatchTime } from "../../app/utils/formatTime"

describe("formatWatchTime", () => {
	it.each([null, undefined])("returns a placeholder for %s", (value) => {
		expect(formatWatchTime(value)).toBe("-")
	})

	it("formats zero and floors fractional minutes", () => {
		expect(formatWatchTime(0)).toBe("0m")
		expect(formatWatchTime(90.9)).toBe("1h 30m")
	})

	it("formats a multi-day duration in short form", () => {
		expect(formatWatchTime((2 * 24 * 60) + (3 * 60) + 30)).toBe("2d 3h 30m")
	})

	it("uses singular and plural units in long form", () => {
		expect(formatWatchTime((24 * 60) + 61, "long")).toBe("1day 1hour 1min")
		expect(formatWatchTime((2 * 24 * 60) + (3 * 60) + 30, "long")).toBe("2days 3hours 30min")
	})
})
