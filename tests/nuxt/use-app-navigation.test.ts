import type { NavigationMenuItem } from "@nuxt/ui"
import { beforeEach, describe, expect, it } from "vitest"
import { useAppNavigation } from "~/composables/useAppNavigation"
import { useUserStore } from "~/stores/User"

function labels(group: NavigationMenuItem[] | undefined): Array<string | undefined> {
	return (group ?? []).map(item => item.label)
}

function find(groups: NavigationMenuItem[][], label: string): NavigationMenuItem {
	const item = groups.flat().find(candidate => candidate.label === label && candidate.type !== "label")
	if (!item) throw new Error(`No navigation item called "${label}"`)
	return item
}

describe("useAppNavigation", () => {
	beforeEach(() => {
		useUserStore().$reset()
	})

	it("groups the destinations under small labels", () => {
		const groups = useAppNavigation().items.value

		expect(groups.map(labels)).toEqual([
			["Your list", "Dashboard", "Statistics", "Rewind", "Timeline", "Podium", "Explore"],
			["Tools", "Calendar", "Tier list", "Create"],
			["AniTools", "Settings", "Support"]
		])
		expect(groups.map(group => group[0]?.type)).toEqual(["label", "label", "label"])
	})

	it("marks the personal pages for a guest, who still gets a link to each", () => {
		const groups = useAppNavigation().items.value

		for (const label of ["Dashboard", "Statistics", "Rewind", "Timeline", "Podium", "Explore"]) {
			const item = find(groups, label)
			expect(item.slot).toBe("locked")
			expect(item.to).toMatch(/^\//)
			expect(item.disabled).toBe(false)
		}
		for (const label of ["Calendar", "Tier list", "Create", "Settings", "Support"]) {
			expect(find(groups, label).slot).toBeUndefined()
		}
		// The sub-pages would only bounce to the login too.
		expect(find(groups, "Statistics").children).toBeUndefined()
	})

	it("drops the marks and lists the statistics views once a profile is connected", () => {
		const user = useUserStore()
		const { items } = useAppNavigation()

		user.id = 7
		user.authMode = "public"

		expect(items.value.flat().some(item => item.slot === "locked")).toBe(false)
		expect(labels(find(items.value, "Statistics").children)).toEqual([
			"Overview",
			"Genres",
			"Tags",
			"Voice Actors",
			"Studios",
			"Staff"
		])
	})

	it("opens Rewind on the year it is given", () => {
		const groups = useAppNavigation({ rewindYear: 2025 }).items.value

		expect(find(groups, "Rewind").to).toBe("/rewind/2025")
	})
})
