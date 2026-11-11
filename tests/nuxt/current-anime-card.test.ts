import { mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it } from "vitest"
import CurrentAnimeCard from "~/components/cards/CurrentAnimeCard.vue"
import { useEntriesStore } from "~/stores/Entries"
import { useUserStore } from "~/stores/User"
import type { AniListAnimeListEntry } from "~~/shared/types/anilist"

function entry(id: number, status: AniListAnimeListEntry["status"]): AniListAnimeListEntry {
	return {
		id,
		status,
		score: null,
		progress: 3,
		repeat: 0,
		priority: 0,
		updatedAt: id,
		startedAt: null,
		completedAt: null,
		media: null
	}
}

describe("CurrentAnimeCard", () => {
	beforeEach(() => {
		useUserStore().$reset()
		useEntriesStore().$reset()
	})

	it("titles the card with a level-two heading", async () => {
		const wrapper = await mountSuspended(CurrentAnimeCard)

		expect(wrapper.find("h2").text()).toBe("Anime in progress")
	})

	it("lists the watching and rewatching entries", async () => {
		const store = useEntriesStore()
		store.entries = [entry(1, "CURRENT"), entry(2, "REPEATING"), entry(3, "COMPLETED")]

		const wrapper = await mountSuspended(CurrentAnimeCard)

		expect(wrapper.findAll("li")).toHaveLength(2)
		expect(wrapper.text()).toContain("Rewatching")
	})

	it("says nothing is in progress only when the loaded list says so", async () => {
		const store = useEntriesStore()
		store.entries = [entry(1, "COMPLETED")]

		const wrapper = await mountSuspended(CurrentAnimeCard)

		expect(wrapper.findAll("li")).toHaveLength(0)
		expect(wrapper.text()).toContain("Nothing on this list is marked as watching or rewatching.")
	})

	it("does not claim the list is empty when it failed to load or is partial", async () => {
		const store = useEntriesStore()
		store.error = "Unable to load the AniList anime list."

		const failed = await mountSuspended(CurrentAnimeCard)
		expect(failed.text()).toContain("Your list could not be loaded")
		expect(failed.text()).not.toContain("Nothing on this list")

		store.error = null
		store.truncated = true

		const partial = await mountSuspended(CurrentAnimeCard)
		expect(partial.text()).toContain("in the part of your list that was loaded")
	})
})
