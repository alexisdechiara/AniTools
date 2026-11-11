import { describe, expect, it } from "vitest"
import { clockTimeOptions, formatDateTime } from "../../app/utils/format"
import {
	getDateFormatter,
	isValidTimeZone,
	listTimeZones,
	normaliseHourCycle,
	resolveTimeDisplay,
	type TimeDisplay,
	type TimeDisplayContext,
	type TimeDisplayPreferences
} from "../../app/utils/time-display"

const AUTO: TimeDisplayPreferences = { timeZoneChoice: "auto", hourCycle: "auto" }

function context(overrides: Partial<TimeDisplayContext> = {}): TimeDisplayContext {
	return {
		profileTimeZone: null,
		profileIsOwn: false,
		browserTimeZone: "Europe/Paris",
		...overrides
	}
}

/** Intl separates the time and the day period with a narrow no-break space. */
const plain = (value: string) => value.replace(/\s/g, " ")

function clock(iso: string, display: TimeDisplay): string {
	return plain(formatDateTime(new Date(iso), clockTimeOptions(display), display))
}

describe("time zone validation", () => {
	it("accepts named zones only", () => {
		expect(isValidTimeZone("Europe/Paris")).toBe(true)
		expect(isValidTimeZone("UTC")).toBe(true)
		expect(isValidTimeZone("-05:00")).toBe(false)
		expect(isValidTimeZone("+01:00")).toBe(false)
		expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false)
		expect(isValidTimeZone("")).toBe(false)
		expect(isValidTimeZone(" Europe/Paris ")).toBe(false)
		expect(isValidTimeZone(null)).toBe(false)
		expect(isValidTimeZone(undefined)).toBe(false)
		expect(isValidTimeZone(60)).toBe(false)
	})
})

describe("resolveTimeDisplay", () => {
	it("resolves the browser zone by default for a guest", () => {
		expect(resolveTimeDisplay(AUTO, context())).toEqual({
			timeZone: "Europe/Paris",
			hourCycle: undefined,
			source: "browser",
			profileZoneUsable: false
		})
	})

	it("resolves the profile zone by default for an own profile with a valid zone", () => {
		const resolved = resolveTimeDisplay(AUTO, context({
			profileTimeZone: "Asia/Tokyo",
			profileIsOwn: true
		}))

		expect(resolved).toMatchObject({
			timeZone: "Asia/Tokyo",
			source: "profile",
			profileZoneUsable: true
		})
	})

	it("ignores the zone of a public profile, whose owner is not the visitor", () => {
		const resolved = resolveTimeDisplay(AUTO, context({
			profileTimeZone: "Asia/Tokyo",
			profileIsOwn: false
		}))

		expect(resolved).toMatchObject({
			timeZone: "Europe/Paris",
			source: "browser",
			profileZoneUsable: false
		})
	})

	it.each([
		["null", null],
		["empty", ""],
		["an offset string", "-05:00"],
		["unknown", "Mars/Olympus_Mons"]
	])("falls back to the browser zone when the profile zone is %s", (_label, profileTimeZone) => {
		const resolved = resolveTimeDisplay(AUTO, context({ profileTimeZone, profileIsOwn: true }))

		expect(resolved).toMatchObject({
			timeZone: "Europe/Paris",
			source: "browser",
			profileZoneUsable: false
		})
	})

	it("falls back to UTC when the profile and the browser zones are both invalid", () => {
		const resolved = resolveTimeDisplay(AUTO, context({
			profileTimeZone: "-05:00",
			profileIsOwn: true,
			browserTimeZone: null
		}))

		expect(resolved).toMatchObject({ timeZone: "UTC", source: "utc", profileZoneUsable: false })
		expect(resolveTimeDisplay(AUTO, context({ browserTimeZone: "Nowhere/Land" })).timeZone)
			.toBe("UTC")
	})

	it("uses the browser zone when it is chosen, even with a usable profile zone", () => {
		const resolved = resolveTimeDisplay(
			{ timeZoneChoice: "browser", hourCycle: "auto" },
			context({ profileTimeZone: "Asia/Tokyo", profileIsOwn: true })
		)

		expect(resolved).toMatchObject({
			timeZone: "Europe/Paris",
			source: "browser",
			profileZoneUsable: true
		})
	})

	it("lets a chosen zone win over the profile and the browser", () => {
		const resolved = resolveTimeDisplay(
			{ timeZoneChoice: "America/New_York", hourCycle: "auto" },
			context({ profileTimeZone: "Asia/Tokyo", profileIsOwn: true })
		)

		expect(resolved).toMatchObject({ timeZone: "America/New_York", source: "chosen" })
	})

	it("falls back like the default when the chosen zone is invalid", () => {
		const invalid: TimeDisplayPreferences = { timeZoneChoice: "+02:00", hourCycle: "auto" }

		expect(resolveTimeDisplay(invalid, context({ profileTimeZone: "Asia/Tokyo", profileIsOwn: true })))
			.toMatchObject({ timeZone: "Asia/Tokyo", source: "profile" })
		expect(resolveTimeDisplay(invalid, context()))
			.toMatchObject({ timeZone: "Europe/Paris", source: "browser" })
		expect(resolveTimeDisplay(invalid, context({ browserTimeZone: undefined })))
			.toMatchObject({ timeZone: "UTC", source: "utc" })
	})

	it("maps automatic, 24-hour and 12-hour to undefined, h23 and h12", () => {
		const cycle = (hourCycle: TimeDisplayPreferences["hourCycle"]) =>
			resolveTimeDisplay({ timeZoneChoice: "auto", hourCycle }, context()).hourCycle

		expect(cycle("auto")).toBeUndefined()
		expect(cycle("h23")).toBe("h23")
		expect(cycle("h12")).toBe("h12")
	})

	it("lets automatic follow the browser's clock when it is known", () => {
		const cycle = (hourCycle: TimeDisplayPreferences["hourCycle"]) => resolveTimeDisplay(
			{ timeZoneChoice: "auto", hourCycle },
			context({ browserHourCycle: "h23" })
		).hourCycle

		expect(cycle("auto")).toBe("h23")
		expect(cycle("h12")).toBe("h12")
		expect(cycle("nope" as TimeDisplayPreferences["hourCycle"])).toBe("h23")
	})

	it("reduces Intl's four hour cycles to two", () => {
		expect(normaliseHourCycle("h23")).toBe("h23")
		expect(normaliseHourCycle("h24")).toBe("h23")
		expect(normaliseHourCycle("h12")).toBe("h12")
		expect(normaliseHourCycle("h11")).toBe("h12")
		expect(normaliseHourCycle(undefined)).toBeUndefined()
	})
})

describe("formatting with a time display", () => {
	it("formats the same instant in Asia/Tokyo and America/New_York", () => {
		const instant = "2026-11-13T12:30:00Z"

		expect(clock(instant, { timeZone: "Asia/Tokyo", hourCycle: "h23" })).toBe("21:30")
		expect(clock(instant, { timeZone: "America/New_York", hourCycle: "h23" })).toBe("07:30")
		expect(clock(instant, { timeZone: "Europe/Paris", hourCycle: "h23" })).toBe("13:30")
	})

	it("uses the right offset on both sides of the US daylight-saving change", () => {
		const newYork: TimeDisplay = { timeZone: "America/New_York", hourCycle: "h23" }

		// 2026-03-08: clocks jump from 02:00 EST (UTC-5) to 03:00 EDT (UTC-4).
		expect(clock("2026-03-08T06:30:00Z", newYork)).toBe("01:30")
		expect(clock("2026-03-08T07:30:00Z", newYork)).toBe("03:30")
		expect(clock("2026-03-07T17:00:00Z", newYork)).toBe("12:00")
		expect(clock("2026-03-09T17:00:00Z", newYork)).toBe("13:00")
	})

	it("shows AM/PM on a 12-hour clock and no marker on a 24-hour clock", () => {
		const instant = "2026-11-13T12:30:00Z"

		expect(clock(instant, { timeZone: "America/New_York", hourCycle: "h12" })).toBe("7:30 AM")
		expect(clock(instant, { timeZone: "Asia/Tokyo", hourCycle: "h12" })).toBe("9:30 PM")
		expect(clock(instant, { timeZone: "Asia/Tokyo", hourCycle: "h23" })).not.toMatch(/[AP]M/)
	})

	it("prints half past midnight as 00:30 and 12:30 AM", () => {
		const instant = "2026-11-13T00:30:00Z"

		expect(clock(instant, { timeZone: "UTC", hourCycle: "h23" })).toBe("00:30")
		expect(clock(instant, { timeZone: "UTC", hourCycle: "h12" })).toBe("12:30 AM")
	})

	it("applies the cycle to style-based options too", () => {
		const date = new Date("2026-11-10T20:05:00Z")

		expect(plain(formatDateTime(date, { timeStyle: "short" }, { timeZone: "UTC", hourCycle: "h23" })))
			.toBe("20:05")
		expect(plain(formatDateTime(date, { timeStyle: "short" }, { timeZone: "UTC", hourCycle: "h12" })))
			.toBe("8:05 PM")
	})

	it("lets explicit options win over the display", () => {
		const date = new Date("2026-11-13T12:30:00Z")
		const display: TimeDisplay = { timeZone: "Asia/Tokyo", hourCycle: "h12" }

		expect(formatDateTime(date, { hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false }, display))
			.toBe("12:30")
	})
})

describe("formatter cache", () => {
	it("returns the same formatter for the same key and another one for another zone", () => {
		const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
		const tokyo = getDateFormatter("en", options, { timeZone: "Asia/Tokyo", hourCycle: "h23" })

		expect(getDateFormatter("en", { minute: "2-digit", hour: "2-digit" }, { timeZone: "Asia/Tokyo", hourCycle: "h23" }))
			.toBe(tokyo)
		expect(getDateFormatter("en", options, { timeZone: "America/New_York", hourCycle: "h23" }))
			.not.toBe(tokyo)
		expect(getDateFormatter("en", options, { timeZone: "Asia/Tokyo", hourCycle: "h12" }))
			.not.toBe(tokyo)
		expect(getDateFormatter("en", { ...options, weekday: "short" }, { timeZone: "Asia/Tokyo", hourCycle: "h23" }))
			.not.toBe(tokyo)
		expect(getDateFormatter("en", options)).toBe(getDateFormatter("en", options))
	})
})

describe("listTimeZones", () => {
	it("always offers UTC and the known valid zones, sorted and without duplicates", () => {
		const zones = listTimeZones(["Europe/Paris", "-05:00", null, "Europe/Paris"])

		expect(zones).toContain("UTC")
		expect(zones).toContain("Europe/Paris")
		expect(zones).not.toContain("-05:00")
		expect(new Set(zones).size).toBe(zones.length)
		expect([...zones].sort((left, right) => left.localeCompare(right, "en"))).toEqual(zones)
	})
})
