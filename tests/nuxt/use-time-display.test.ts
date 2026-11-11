import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { useTimeDisplay } from "~/composables/useTimeDisplay"
import { usePreferencesStore } from "~/stores/Preferences"
import { useUserStore } from "~/stores/User"
import type { HourCycleChoice } from "~/utils/time-display"

// Half past noon UTC on a Friday: the same weekday in Tokyo and in New York.
const FRIDAY = new Date("2026-11-13T12:30:00Z")
const plain = (value: string) => value.replace(/\s/g, " ")

function signIn(mode: "oauth" | "public", timezone: string | null) {
	const user = useUserStore()
	user.id = 1
	user.authMode = mode
	user.options.timezone = timezone
	return user
}

describe("useTimeDisplay", () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it("starts without a profile zone and resolves to the browser for a guest", () => {
		const { display, browserTimeZone, ready } = useTimeDisplay()

		expect(useUserStore().options.timezone).toBeNull()
		expect(ready.value).toBe(true)
		expect(browserTimeZone.value).toBeTruthy()
		expect(display.value.source).toBe("browser")
		expect(display.value.timeZone).toBe(browserTimeZone.value)
		expect(display.value.profileZoneUsable).toBe(false)
	})

	it("defaults to the profile zone for an OAuth user with a valid zone", () => {
		signIn("oauth", "Asia/Tokyo")
		const { display } = useTimeDisplay()

		expect(display.value).toMatchObject({
			timeZone: "Asia/Tokyo",
			source: "profile",
			profileZoneUsable: true
		})
	})

	it("defaults to the browser for a public profile, whose owner is not the visitor", () => {
		signIn("public", "Asia/Tokyo")
		const { display, browserTimeZone } = useTimeDisplay()

		expect(display.value.source).toBe("browser")
		expect(display.value.timeZone).toBe(browserTimeZone.value)
		expect(display.value.profileZoneUsable).toBe(false)
	})

	it("falls back to the browser when the OAuth profile stores an offset", () => {
		signIn("oauth", "-05:00")
		const { display, browserTimeZone } = useTimeDisplay()

		expect(display.value.source).toBe("browser")
		expect(display.value.timeZone).toBe(browserTimeZone.value)
		expect(display.value.profileZoneUsable).toBe(false)
	})

	it("lets a chosen zone and clock win, and reacts to changes", () => {
		signIn("oauth", "Asia/Tokyo")
		const preferences = usePreferencesStore()
		const { display, formatClockTime, formatAiringTime } = useTimeDisplay()

		preferences.setTimeZoneChoice("America/New_York")
		preferences.setHourCycle("h12")
		expect(display.value).toMatchObject({
			timeZone: "America/New_York",
			hourCycle: "h12",
			source: "chosen"
		})
		expect(plain(formatClockTime(FRIDAY))).toBe("7:30 AM")

		preferences.setHourCycle("h23")
		expect(formatClockTime(FRIDAY)).toBe("07:30")
		expect(formatAiringTime(FRIDAY, new Date("2026-11-11T12:30:00Z"))).toBe("in 2 days · Fri 07:30")

		preferences.setTimeZoneChoice("browser")
		expect(display.value.source).toBe("browser")
	})

	it("ignores an invalid zone or clock", () => {
		const preferences = usePreferencesStore()
		preferences.setTimeZoneChoice("Asia/Tokyo")
		preferences.setHourCycle("h12")

		preferences.setTimeZoneChoice("-05:00")
		preferences.setTimeZoneChoice("")
		preferences.setHourCycle("h24" as HourCycleChoice)

		expect(preferences.timeZoneChoice).toBe("Asia/Tokyo")
		expect(preferences.hourCycle).toBe("h12")
	})

	it("restores the defaults on reset", () => {
		signIn("oauth", "Asia/Tokyo")
		const preferences = usePreferencesStore()
		const { display } = useTimeDisplay()
		preferences.setTimeZoneChoice("America/New_York")
		preferences.setHourCycle("h12")

		preferences.reset()

		expect(preferences.timeZoneChoice).toBe("auto")
		expect(preferences.hourCycle).toBe("auto")
		expect(display.value).toMatchObject({ timeZone: "Asia/Tokyo", source: "profile" })
	})

	it("forgets the profile zone when the user store is reset", () => {
		const user = signIn("oauth", "Asia/Tokyo")

		user.$reset()

		expect(user.options.timezone).toBeNull()
		expect(useTimeDisplay().display.value.source).toBe("browser")
	})
})
