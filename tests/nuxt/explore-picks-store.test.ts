import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EXPLORE_PICKS_WRITE_DELAY_MS, useExplorePicksStore } from "~/stores/ExplorePicks"
import { useUserStore } from "~/stores/User"
import {
	EXPLORE_PICKS_STORAGE_KEY,
	parseExplorePicksState,
	serializeExplorePicksState,
	type ExplorePickMedia,
	type ExplorePicksState
} from "~/utils/explore-picks"

function pick(id: number): ExplorePickMedia {
	return {
		id,
		title: { english: null, native: null, romaji: null, userPreferred: `Anime ${id}` },
		coverImage: null,
		siteUrl: `https://anilist.co/anime/${id}`,
		format: "TV",
		seasonYear: 2025,
		isAdult: false,
		relations: null
	}
}

function useProfile(username: string, mode: "oauth" | "public" = "public") {
	const user = useUserStore()
	user.id = username.length
	user.username = username
	user.authMode = mode
}

function stored(): ExplorePicksState {
	return parseExplorePicksState(localStorage.getItem(EXPLORE_PICKS_STORAGE_KEY))
}

function seed(state: ExplorePicksState) {
	localStorage.setItem(EXPLORE_PICKS_STORAGE_KEY, serializeExplorePicksState(state))
}

const aliceSaved: ExplorePicksState = {
	version: 1,
	profiles: {
		"public:alice": { updatedAt: 10, interested: [pick(1)], passed: [2] }
	}
}

describe("ExplorePicks store", () => {
	beforeEach(() => {
		localStorage.clear()
		setActivePinia(createPinia())
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
		localStorage.clear()
	})

	it("loads nothing and writes nothing before hydration", () => {
		seed(aliceSaved)
		useProfile("alice")
		const picks = useExplorePicksStore()

		expect(picks.isHydrated).toBe(false)
		expect(picks.interested).toEqual([])
		expect(picks.passed).toEqual([])

		picks.pass(99)
		picks.flush()

		expect(stored()).toEqual(aliceSaved)

		picks.load()

		expect(picks.isHydrated).toBe(true)
		expect(picks.interested.map(media => media.id)).toEqual([1])
		expect(picks.passed).toEqual([2])
		expect([...picks.decidedIds].toSorted()).toEqual([1, 2])
	})

	it("stores a pick for a right swipe and a pass for a left swipe", () => {
		useProfile("alice")
		const picks = useExplorePicksStore()
		picks.load()

		picks.pick(pick(1))
		picks.pass(2)
		picks.flush()

		const profile = stored().profiles["public:alice"]
		expect(profile?.interested.map(media => media.id)).toEqual([1])
		expect(profile?.passed).toEqual([2])
		expect([...picks.decidedIds].toSorted()).toEqual([1, 2])
	})

	it("stores only a pass for a left swipe", () => {
		useProfile("alice")
		const picks = useExplorePicksStore()
		picks.load()

		picks.pass(2)
		picks.flush()

		expect(stored().profiles["public:alice"]).toMatchObject({ interested: [], passed: [2] })
		expect(picks.interested).toEqual([])
	})

	it("removes a decision from both lists on restore", () => {
		seed(aliceSaved)
		useProfile("alice")
		const picks = useExplorePicksStore()
		picks.load()

		picks.restore(1)
		picks.restore(2)
		picks.flush()

		expect(picks.interested).toEqual([])
		expect(picks.passed).toEqual([])
		expect(picks.decidedIds.size).toBe(0)
		// An empty profile leaves nothing behind.
		expect(localStorage.getItem(EXPLORE_PICKS_STORAGE_KEY)).toBeNull()
	})

	it("debounces the write", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
		useProfile("alice")
		const picks = useExplorePicksStore()
		picks.load()

		picks.pass(1)
		picks.pass(2)
		vi.advanceTimersByTime(EXPLORE_PICKS_WRITE_DELAY_MS - 1)
		expect(localStorage.getItem(EXPLORE_PICKS_STORAGE_KEY)).toBeNull()

		vi.advanceTimersByTime(1)
		expect(stored().profiles["public:alice"]?.passed).toEqual([1, 2])
	})

	it("shows the other profile's picks on an identity switch and never merges", () => {
		seed({
			version: 1,
			profiles: {
				...aliceSaved.profiles,
				"public:bob": { updatedAt: 20, interested: [pick(7)], passed: [8] }
			}
		})
		useProfile("alice")
		const picks = useExplorePicksStore()
		picks.load()
		picks.pass(3)

		// The store follows the user store: no explicit load is needed.
		useProfile("bob")

		expect(picks.loadedIdentity).toBe("public:bob")
		expect(picks.interested.map(media => media.id)).toEqual([7])
		expect(picks.passed).toEqual([8])

		picks.pick(pick(9))
		picks.flush()

		const state = stored()
		// Alice's pending swipe was saved under her own profile before the switch.
		expect(state.profiles["public:alice"]?.passed).toEqual([2, 3])
		expect(state.profiles["public:alice"]?.interested.map(media => media.id)).toEqual([1])
		expect(state.profiles["public:bob"]?.interested.map(media => media.id)).toEqual([7, 9])
		expect(state.profiles["public:bob"]?.passed).toEqual([8])
	})

	it("keeps an OAuth session and a public profile of the same name apart", () => {
		seed(aliceSaved)
		useProfile("alice", "oauth")
		const picks = useExplorePicksStore()
		picks.load()

		expect(picks.loadedIdentity).toBe("oauth:alice")
		expect(picks.interested).toEqual([])
	})

	it("shows nothing and stops writing once signed out", () => {
		seed(aliceSaved)
		useProfile("alice")
		const picks = useExplorePicksStore()
		picks.load()

		const user = useUserStore()
		user.id = undefined
		user.username = ""
		user.authMode = null

		expect(picks.isHydrated).toBe(false)
		expect(picks.interested).toEqual([])

		picks.pass(5)
		picks.flush()

		expect(stored()).toEqual(aliceSaved)
	})

	it("drops the picks that are now on the list", () => {
		seed({
			version: 1,
			profiles: {
				"public:alice": { updatedAt: 10, interested: [pick(1), pick(2)], passed: [3] }
			}
		})
		useProfile("alice")
		const picks = useExplorePicksStore()
		picks.load()

		picks.removeListed(new Set([2, 3]))
		picks.flush()

		expect(picks.interested.map(media => media.id)).toEqual([1])
		expect(stored().profiles["public:alice"]?.interested.map(media => media.id)).toEqual([1])
		expect(stored().profiles["public:alice"]?.passed).toEqual([3])
	})

	it("forgets the passes and keeps the picks on clearPassed", () => {
		seed(aliceSaved)
		useProfile("alice")
		const picks = useExplorePicksStore()
		picks.load()

		picks.clearPassed()
		picks.flush()

		expect(picks.passed).toEqual([])
		expect(stored().profiles["public:alice"]).toMatchObject({ interested: [pick(1)], passed: [] })
	})

	it("empties the current profile only on clear", () => {
		const bob = { updatedAt: 20, interested: [pick(7)], passed: [8] }
		seed({ version: 1, profiles: { ...aliceSaved.profiles, "public:bob": bob } })
		useProfile("alice")
		const picks = useExplorePicksStore()
		picks.load()

		picks.clear()

		expect(picks.interested).toEqual([])
		expect(picks.passed).toEqual([])
		expect(stored().profiles).toEqual({ "public:bob": bob })
	})

	it("forgets every profile on clearAll, even before a load", () => {
		seed({
			version: 1,
			profiles: {
				...aliceSaved.profiles,
				"public:bob": { updatedAt: 20, interested: [pick(7)], passed: [8] }
			}
		})
		const picks = useExplorePicksStore()

		picks.clearAll()

		expect(localStorage.getItem(EXPLORE_PICKS_STORAGE_KEY)).toBeNull()
		expect(picks.interested).toEqual([])
	})

	it("starts empty when the stored value is corrupted", () => {
		localStorage.setItem(EXPLORE_PICKS_STORAGE_KEY, "{not json")
		useProfile("alice")
		const picks = useExplorePicksStore()

		picks.load()

		expect(picks.isHydrated).toBe(true)
		expect(picks.interested).toEqual([])
	})

	it("keeps working for the session when storage throws", () => {
		const failure = () => {
			throw new DOMException("Storage is unavailable", "SecurityError")
		}
		vi.stubGlobal("localStorage", {
			getItem: failure,
			setItem: failure,
			removeItem: failure,
			clear: () => undefined
		})
		useProfile("alice")
		const picks = useExplorePicksStore()

		expect(() => picks.load()).not.toThrow()
		expect(() => {
			picks.pick(pick(1))
			picks.pass(2)
			picks.flush()
			picks.restore(2)
			picks.clearPassed()
		}).not.toThrow()
		expect(picks.interested.map(media => media.id)).toEqual([1])

		expect(() => picks.clear()).not.toThrow()
		expect(() => picks.clearAll()).not.toThrow()
		expect(picks.interested).toEqual([])
	})
})
