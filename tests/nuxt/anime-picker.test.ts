import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import AnimePicker from "~/components/AnimePicker.vue"
import { useUserStore } from "~/stores/User"
import type { AniListMediaListSummary, AniListSearchPrediction } from "~~/shared/types/anilist"

function media(id: number, title: string, romaji = title): AniListMediaListSummary {
	return {
		id,
		idMal: null,
		type: "ANIME",
		title: { english: title, native: null, romaji, userPreferred: title },
		coverImage: null,
		bannerImage: null,
		description: null,
		format: "TV",
		status: "FINISHED",
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
		nextAiringEpisode: null,
		siteUrl: null,
		studios: null,
		rankings: [],
		externalLinks: [],
		trailer: null,
		relations: null
	}
}

const suggestions = [media(1, "Alpha"), media(2, "Bravo"), media(3, "Charlie")]

let predictions: AniListSearchPrediction[] = []
let searchFails = false

registerEndpoint("/api/search", () => {
	if (searchFails) throw new Error("search down")
	return { result: { predictions } }
})
registerEndpoint("/api/anilist/media", () => ({ media: media(42, "Cowboy Bebop", "Kaubooi Bibappu") }))

/** Mounts the picker the way the tier list does: a pick is confirmed by excluding its id. */
async function mountPicker(options: { multiple?: boolean, searchable?: boolean } = {}) {
	const selected: AniListMediaListSummary[] = []
	const Host = defineComponent({
		setup() {
			const excludedIds = ref<number[]>([])
			return () => h(AnimePicker, {
				suggestions,
				excludedIds: excludedIds.value,
				multiple: options.multiple ?? false,
				searchable: options.searchable ?? true,
				actionLabel: "Add",
				onSelect: (picked: AniListMediaListSummary) => {
					selected.push(picked)
					if (options.multiple) excludedIds.value = [...excludedIds.value, picked.id]
				}
			})
		}
	})
	const wrapper = await mountSuspended(Host)
	return { wrapper, selected }
}

function activeOptionText(wrapper: Awaited<ReturnType<typeof mountPicker>>["wrapper"], owner: string): string {
	const activeId = wrapper.find(owner).attributes("aria-activedescendant")
	expect(activeId).toBeTruthy()
	return wrapper.find(`[id="${activeId}"]`).text()
}

describe("AnimePicker keyboard path", () => {
	beforeEach(() => {
		useUserStore().$reset()
		predictions = []
		searchFails = false
	})

	it("exposes a combobox that controls a listbox of options with a single tab stop", async () => {
		const { wrapper } = await mountPicker()

		const input = wrapper.find("input")
		const listbox = wrapper.find('[role="listbox"]')
		expect(input.attributes("role")).toBe("combobox")
		expect(input.attributes("aria-expanded")).toBe("true")
		expect(input.attributes("aria-controls")).toBe(listbox.attributes("id"))

		const options = wrapper.findAll('[role="option"]')
		expect(options).toHaveLength(3)
		expect(new Set(options.map(option => option.attributes("id"))).size).toBe(3)
		expect(listbox.findAll("button, a, [tabindex]")).toHaveLength(0)
		expect(listbox.attributes("tabindex")).toBeUndefined()
		expect(activeOptionText(wrapper, "input")).toContain("Alpha")
	})

	it("adds the first option when Enter is pressed without moving", async () => {
		const { wrapper, selected } = await mountPicker()

		await wrapper.find("input").trigger("keydown", { key: "Enter" })
		await vi.waitFor(() => expect(selected).toHaveLength(1))

		expect(selected[0]!.id).toBe(1)
	})

	it("moves the active option with the arrow, Home and End keys", async () => {
		const { wrapper } = await mountPicker()
		const input = wrapper.find("input")

		await input.trigger("keydown", { key: "ArrowDown" })
		expect(activeOptionText(wrapper, "input")).toContain("Bravo")
		expect(wrapper.findAll('[role="option"]')[1]!.attributes("aria-selected")).toBe("true")

		await input.trigger("keydown", { key: "End" })
		expect(activeOptionText(wrapper, "input")).toContain("Charlie")
		await input.trigger("keydown", { key: "ArrowDown" })
		expect(activeOptionText(wrapper, "input")).toContain("Charlie")

		await input.trigger("keydown", { key: "ArrowUp" })
		expect(activeOptionText(wrapper, "input")).toContain("Bravo")
		await input.trigger("keydown", { key: "Home" })
		expect(activeOptionText(wrapper, "input")).toContain("Alpha")
	})

	it("adds the active option, announces it and keeps the row marked as added", async () => {
		const { wrapper, selected } = await mountPicker({ multiple: true })
		const input = wrapper.find("input")

		await input.trigger("keydown", { key: "ArrowDown" })
		await input.trigger("keydown", { key: "Enter" })
		await vi.waitFor(() =>
			expect(wrapper.find("[data-picker-status]").text()).toBe("Added Bravo")
		)

		expect(selected.map(picked => picked.id)).toEqual([2])
		const rows = wrapper.findAll('[role="option"]')
		expect(rows).toHaveLength(3)
		expect(rows[1]!.attributes("aria-disabled")).toBe("true")
		expect(rows[1]!.find("[data-picker-added]").text()).toContain("Added")
		expect(rows[0]!.attributes("aria-disabled")).toBeUndefined()

		// A second Enter on the added row does not add it twice; the next row still can be added.
		await input.trigger("keydown", { key: "Enter" })
		await input.trigger("keydown", { key: "ArrowDown" })
		await input.trigger("keydown", { key: "Enter" })
		await vi.waitFor(() =>
			expect(wrapper.find("[data-picker-status]").text()).toBe("Added Charlie")
		)
		expect(selected.map(picked => picked.id)).toEqual([2, 3])
	})

	it("still adds on click", async () => {
		const { wrapper, selected } = await mountPicker()

		await wrapper.findAll('[role="option"]')[2]!.trigger("click")
		await vi.waitFor(() => expect(selected).toHaveLength(1))

		expect(selected[0]!.id).toBe(3)
	})

	it("lets the list itself take the keys when there is no search field", async () => {
		const { wrapper, selected } = await mountPicker({ searchable: false })

		expect(wrapper.find("input").exists()).toBe(false)
		const listbox = wrapper.find('[role="listbox"]')
		expect(listbox.attributes("tabindex")).toBe("0")

		await listbox.trigger("keydown", { key: "ArrowDown" })
		expect(activeOptionText(wrapper, '[role="listbox"]')).toContain("Bravo")
		await listbox.trigger("keydown", { key: "Enter" })
		await vi.waitFor(() => expect(selected).toHaveLength(1))

		expect(selected[0]!.id).toBe(2)
	})

	it("adds the first search result when Enter is pressed before the results arrive", async () => {
		predictions = [{ id: 42, title: "Kaubooi Bibappu" }, { id: 43, title: "Cowboy Bebop: The Movie" }]
		const { wrapper, selected } = await mountPicker()
		const input = wrapper.find("input")

		await input.setValue("cowboy")
		await input.trigger("keydown", { key: "Enter" })
		expect(selected).toHaveLength(0)

		await vi.waitFor(() => expect(selected).toHaveLength(1), { timeout: 4_000 })
		expect(selected[0]!.id).toBe(42)
		// The row switches from the search endpoint's title to the shared title helper.
		expect(wrapper.findAll('[role="option"]')[0]!.text()).toContain("Cowboy Bebop")
		expect(wrapper.findAll('[role="option"]')[0]!.text()).not.toContain("Kaubooi")
	})

	it("says which search found nothing", async () => {
		const { wrapper } = await mountPicker()

		await wrapper.find("input").setValue("zzzz")

		await vi.waitFor(
			() => expect(wrapper.text()).toContain("No anime matches “zzzz”."),
			{ timeout: 4_000 }
		)
		expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
		expect(wrapper.find("input").attributes("aria-expanded")).toBe("false")
	})

	it("reports a failed search instead of an empty result", async () => {
		searchFails = true
		const { wrapper } = await mountPicker()

		await wrapper.find("input").setValue("cowboy")

		await vi.waitFor(
			() => expect(wrapper.text()).toContain("AniList search is unavailable"),
			{ timeout: 4_000 }
		)
		expect(wrapper.text()).not.toContain("No anime matches")
	})
})
