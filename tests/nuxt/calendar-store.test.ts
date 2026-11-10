import { beforeEach, describe, expect, it } from "vitest"
import { useCalendarStore } from "~/stores/Calendar"

describe("Calendar store dubbing filter", () => {
	beforeEach(() => {
		useCalendarStore().$reset()
	})

	it("keeps an unticked language unticked when the available languages change", () => {
		const store = useCalendarStore()
		store.setAvailableDubbingOptions(["jp", "en", "fr"])
		expect(store.dubbing).toEqual(["jp", "en", "fr"])

		store.toggleDubbing("en")
		expect(store.dubbing).not.toContain("en")

		store.setAvailableDubbingOptions(["jp", "en", "fr", "de"])
		expect(store.dubbing).not.toContain("en")
		expect(store.dubbing).toContain("de")
	})

	it("remembers an exclusion while the language is absent from a range", () => {
		const store = useCalendarStore()
		store.setAvailableDubbingOptions(["jp", "en"])
		store.toggleDubbing("en")

		store.setAvailableDubbingOptions(["jp"])
		store.setAvailableDubbingOptions(["jp", "en"])
		expect(store.dubbing).not.toContain("en")
	})

	it("shows the language again once the user re-ticks it", () => {
		const store = useCalendarStore()
		store.setAvailableDubbingOptions(["jp", "en"])
		store.toggleDubbing("en")
		store.toggleDubbing("en")
		expect(store.dubbing).toContain("en")

		store.setAvailableDubbingOptions(["jp", "en", "fr"])
		expect(store.dubbing).toContain("en")
	})

	it("forgets exclusions on reset", () => {
		const store = useCalendarStore()
		store.setAvailableDubbingOptions(["jp", "en"])
		store.toggleDubbing("en")

		store.$reset()
		store.setAvailableDubbingOptions(["jp", "en"])
		expect(store.dubbing).toContain("jp")
		expect(store.dubbing).toContain("en")
	})
})
