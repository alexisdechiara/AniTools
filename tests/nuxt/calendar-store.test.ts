import { registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MY_LIST_STATUSES, useCalendarStore } from "~/stores/Calendar"
import { useEntriesStore } from "~/stores/Entries"
import { usePreferencesStore } from "~/stores/Preferences"
import { useUserStore } from "~/stores/User"
import type { AniListAnimeCollectionResponse } from "~~/shared/types/anilist"

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

const COLLECTION_ENDPOINT = "/api/anilist/anime-collection"

const collection: AniListAnimeCollectionResponse = {
	source: { mode: "public", username: "alice" },
	entries: [],
	truncated: false
}

describe("Calendar store My list filter", () => {
	let calls = 0
	let unregister: (() => void) | null = null

	function serve(fail = false) {
		unregister?.()
		unregister = registerEndpoint(COLLECTION_ENDPOINT, {
			method: "GET",
			handler: () => {
				calls += 1
				if (fail) throw createError({ statusCode: 502, statusMessage: "AniList request failed" })
				return collection
			}
		})
	}

	function usePublicProfile() {
		const user = useUserStore()
		user.id = 1
		user.username = "alice"
		user.authMode = "public"
	}

	beforeEach(() => {
		useUserStore().$reset()
		useEntriesStore().$reset()
		usePreferencesStore().reset()
		useCalendarStore().$reset()
		calls = 0
		serve()
	})

	afterEach(() => {
		unregister?.()
		unregister = null
	})

	it("replaces the selection with setStatuses", () => {
		const store = useCalendarStore()
		store.setStatuses(["PAUSED"])

		store.setStatuses(["CURRENT", "CURRENT", "PLANNING"])

		expect(store.currentStatus).toEqual(["CURRENT", "PLANNING"])
	})

	it("reports My list for exactly Watching and Planning, in either order", () => {
		const store = useCalendarStore()

		store.setStatuses(["CURRENT", "PLANNING"])
		expect(store.isMyListActive).toBe(true)

		store.setStatuses(["PLANNING", "CURRENT"])
		expect(store.isMyListActive).toBe(true)
	})

	it("does not report My list for a superset, a subset or an empty selection", () => {
		const store = useCalendarStore()

		store.setStatuses(["CURRENT", "PLANNING", "PAUSED"])
		expect(store.isMyListActive).toBe(false)
		expect(store.hasStatusFilter).toBe(true)

		store.setStatuses(["CURRENT"])
		expect(store.isMyListActive).toBe(false)

		store.setStatuses([])
		expect(store.isMyListActive).toBe(false)
		expect(store.hasStatusFilter).toBe(false)
	})

	it("replaces a custom selection when My list is turned on", () => {
		const store = useCalendarStore()
		store.setStatuses(["PAUSED"])

		store.setMyList(true)

		expect(store.currentStatus).toEqual([...MY_LIST_STATUSES])
		expect(store.isMyListActive).toBe(true)
	})

	it("clears every status when My list is turned off", () => {
		const store = useCalendarStore()
		store.setMyList(true)

		store.setMyList(false)

		expect(store.currentStatus).toEqual([])
		expect(store.isMyListActive).toBe(false)
	})

	it("keeps the filter but leaves My list when another status is ticked", () => {
		const store = useCalendarStore()
		store.setMyList(true)

		store.toggleStatus("PAUSED")

		expect(store.isMyListActive).toBe(false)
		expect(store.currentStatus).toEqual(["CURRENT", "PLANNING", "PAUSED"])
	})

	it("remembers the toggle, and forgets it once the selection is no longer My list", () => {
		const store = useCalendarStore()
		const preferences = usePreferencesStore()

		store.setMyList(true)
		expect(preferences.calendarMyList).toBe(true)

		store.toggleStatus("PAUSED")
		expect(preferences.calendarMyList).toBe(false)

		store.toggleStatus("PAUSED")
		expect(preferences.calendarMyList).toBe(true)

		store.setMyList(false)
		expect(preferences.calendarMyList).toBe(false)
	})

	it("keeps the remembered choice when the filter is only cleared, as on sign-out", () => {
		const store = useCalendarStore()
		store.setMyList(true)

		store.setStatuses([])

		expect(store.isMyListActive).toBe(false)
		expect(usePreferencesStore().calendarMyList).toBe(true)
	})

	it("requests the list when statuses become non-empty and not when they are cleared", async () => {
		usePublicProfile()
		const store = useCalendarStore()
		const entries = useEntriesStore()

		store.setStatuses(["CURRENT", "PLANNING"])
		await vi.waitFor(() => expect(entries.isInitialized).toBe(true))
		expect(calls).toBe(1)

		store.setStatuses([])
		await Promise.resolve()
		expect(calls).toBe(1)
		expect(store.listError).toBe(false)
	})

	it("does not request a list for a guest", async () => {
		const store = useCalendarStore()

		store.setMyList(true)
		await Promise.resolve()

		expect(calls).toBe(0)
		expect(store.listError).toBe(false)
	})

	it("exposes a failed list fetch instead of swallowing it", async () => {
		usePublicProfile()
		serve(true)
		const store = useCalendarStore()

		store.setMyList(true)

		await vi.waitFor(() => expect(store.listError).toBe(true))
		expect(useEntriesStore().isInitialized).toBe(false)

		store.setStatuses([])
		expect(store.listError).toBe(false)
	})

	it("clears the error when the list loads on a new attempt", async () => {
		usePublicProfile()
		serve(true)
		const store = useCalendarStore()
		store.setMyList(true)
		await vi.waitFor(() => expect(store.listError).toBe(true))

		serve()
		store.refreshList()

		expect(store.listError).toBe(false)
		await vi.waitFor(() => expect(useEntriesStore().isInitialized).toBe(true))
		expect(store.listError).toBe(false)
	})

	it("clears My list on reset", () => {
		const store = useCalendarStore()
		store.setMyList(true)

		store.$reset()

		expect(store.currentStatus).toEqual([])
		expect(store.isMyListActive).toBe(false)
		expect(store.listError).toBe(false)
	})
})
