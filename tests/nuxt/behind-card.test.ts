import { mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import BehindCard from "~/components/cards/BehindCard.vue"
import { useEntriesStore } from "~/stores/Entries"
import { useUserStore } from "~/stores/User"
import type { AniListAnimeListEntry } from "~~/shared/types/anilist"

interface EntryOptions {
	status?: AniListAnimeListEntry["status"]
	progress?: number
	nextEpisode?: number
	title?: string
}

function entry(id: number, options: EntryOptions = {}): AniListAnimeListEntry {
	const title = options.title ?? `Anime ${id}`

	return {
		id,
		status: options.status ?? "CURRENT",
		score: null,
		progress: options.progress ?? 0,
		repeat: 0,
		priority: 0,
		updatedAt: 0,
		startedAt: null,
		completedAt: null,
		media: {
			id,
			idMal: null,
			type: "ANIME",
			title: { english: title, native: null, romaji: title, userPreferred: title },
			coverImage: null,
			bannerImage: null,
			description: null,
			format: "TV",
			status: "RELEASING",
			episodes: 12,
			duration: 24,
			genres: [],
			countryOfOrigin: "JP",
			season: "FALL",
			seasonYear: 2026,
			startDate: null,
			endDate: null,
			averageScore: 75,
			meanScore: 75,
			popularity: 1,
			favourites: 0,
			isFavourite: false,
			isAdult: false,
			tags: [],
			nextAiringEpisode: {
				airingAt: 1_800_000_000,
				episode: options.nextEpisode ?? 5,
				timeUntilAiring: 3_600
			},
			siteUrl: null,
			studios: null,
			rankings: [],
			externalLinks: [],
			trailer: null,
			relations: null
		}
	}
}

describe("BehindCard", () => {
	beforeEach(() => {
		useUserStore().$reset()
		useEntriesStore().$reset()
	})

	it("lists the titles that are behind and marks the paused one", async () => {
		const store = useEntriesStore()
		store.entries = [
			entry(1, { title: "Watching show", nextEpisode: 10, progress: 1 }),
			entry(2, { title: "Paused show", status: "PAUSED", nextEpisode: 6, progress: 2 }),
			entry(3, { title: "Up to date show", nextEpisode: 5, progress: 4 }),
			entry(4, { title: "Rewatched show", status: "REPEATING", nextEpisode: 9, progress: 1 })
		]

		const wrapper = await mountSuspended(BehindCard)
		const rows = wrapper.findAll("li")

		expect(rows).toHaveLength(2)
		expect(rows[0]!.text()).toContain("Watching show")
		expect(rows[0]!.text()).toContain("Watched 1 · aired 9")
		expect(rows[0]!.text()).toContain("8 behind")
		expect(rows[0]!.text()).not.toContain("Paused")
		expect(rows[1]!.text()).toContain("Paused show")
		expect(rows[1]!.text()).toContain("Paused")
		expect(rows[1]!.text()).toContain("Watched 2 · aired 5")
		expect(rows[1]!.text()).toContain("3 behind")
		expect(wrapper.text()).not.toContain("You are all caught up.")
		expect(wrapper.text()).not.toContain("partly loaded")
	})

	it("shows at most five rows", async () => {
		const store = useEntriesStore()
		store.entries = [1, 2, 3, 4, 5, 6, 7].map(id => entry(id, { nextEpisode: 3 + id }))

		const wrapper = await mountSuspended(BehindCard)

		expect(wrapper.findAll("li")).toHaveLength(5)
	})

	it("says the visitor is caught up when nothing is behind", async () => {
		const store = useEntriesStore()
		store.entries = [entry(1, { nextEpisode: 5, progress: 4 })]

		const wrapper = await mountSuspended(BehindCard)

		expect(wrapper.findAll("li")).toHaveLength(0)
		expect(wrapper.text()).toContain("You are all caught up.")
		expect(wrapper.text()).not.toContain("Your list could not be loaded")
	})

	it("reports a failed list instead of claiming the visitor is caught up", async () => {
		const store = useEntriesStore()
		store.error = "Unable to load the AniList anime list."
		const fetchAllAnimes = vi.spyOn(store, "fetchAllAnimes").mockResolvedValue([])

		const wrapper = await mountSuspended(BehindCard)

		expect(wrapper.text()).toContain("Your list could not be loaded")
		expect(wrapper.text()).not.toContain("You are all caught up.")

		const retry = wrapper.find("button")
		expect(retry.text()).toContain("Try again")
		await retry.trigger("click")

		expect(fetchAllAnimes).toHaveBeenCalledExactlyOnceWith(true)
	})

	it("warns that titles may be missing when the list was truncated", async () => {
		const store = useEntriesStore()
		store.entries = [entry(1, { nextEpisode: 10, progress: 1 })]
		store.truncated = true

		const wrapper = await mountSuspended(BehindCard)

		expect(wrapper.findAll("li")).toHaveLength(1)
		expect(wrapper.text()).toContain(
			"Your list was only partly loaded, so some titles may be missing here."
		)
	})
})
