import { mountSuspended } from "@nuxt/test-utils/runtime"
import { clearNuxtState } from "#imports"
import { beforeEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useDashboardCards, useDashboardOnboarding } from "~/composables/useDashboardCards"
import {
	DASHBOARD_LAYOUT_STORAGE_KEY,
	DASHBOARD_ONBOARDING_STORAGE_KEY,
	DEFAULT_DASHBOARD_CARD_IDS
} from "~/utils/dashboard-layout"

type DashboardCards = ReturnType<typeof useDashboardCards>
type DashboardOnboarding = ReturnType<typeof useDashboardOnboarding>

/** The composables hydrate from localStorage in onMounted, so they need a mounted host. */
async function mountCards(): Promise<DashboardCards> {
	let cards: DashboardCards | undefined
	await mountSuspended(defineComponent({
		setup() {
			cards = useDashboardCards()
			return () => h("div")
		}
	}))
	if (!cards) throw new Error("useDashboardCards did not run")
	return cards
}

async function mountOnboarding(): Promise<DashboardOnboarding> {
	let onboarding: DashboardOnboarding | undefined
	await mountSuspended(defineComponent({
		setup() {
			onboarding = useDashboardOnboarding()
			return () => h("div")
		}
	}))
	if (!onboarding) throw new Error("useDashboardOnboarding did not run")
	return onboarding
}

function savedLayout(): unknown {
	return JSON.parse(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) ?? "null")
}

/** Simulates a new page load: the in-memory state is gone, only localStorage remains. */
function reload() {
	clearNuxtState()
}

describe("useDashboardCards", () => {
	beforeEach(() => {
		localStorage.clear()
		reload()
	})

	it("starts a new dashboard on the default layout and saves it as a plain id array", async () => {
		const cards = await mountCards()

		expect(cards.isHydrated.value).toBe(true)
		expect(cards.cardIds.value).toEqual(DEFAULT_DASHBOARD_CARD_IDS)
		expect(savedLayout()).toEqual(DEFAULT_DASHBOARD_CARD_IDS)
	})

	it("leaves a saved layout untouched, whatever the current default is", async () => {
		const legacy = ["watch-time", "anime-count", "mean-score", "status", "next-episodes"]
		localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(legacy))

		const cards = await mountCards()

		expect(cards.cardIds.value).toEqual(legacy)
		expect(savedLayout()).toEqual(legacy)
	})

	it("moves a card earlier or later and persists the new order", async () => {
		localStorage.setItem(
			DASHBOARD_LAYOUT_STORAGE_KEY,
			JSON.stringify(["watch-time", "status", "current-anime"])
		)
		const cards = await mountCards()

		cards.move("status", -1)
		expect(cards.cardIds.value).toEqual(["status", "watch-time", "current-anime"])

		cards.move("status", 1)
		cards.move("status", 1)
		expect(cards.cardIds.value).toEqual(["watch-time", "current-anime", "status"])
		expect(savedLayout()).toEqual(["watch-time", "current-anime", "status"])

		// Already last: nothing moves.
		cards.move("status", 1)
		expect(cards.cardIds.value).toEqual(["watch-time", "current-anime", "status"])
	})

	it("removes a card, reports where it was and persists the removal", async () => {
		localStorage.setItem(
			DASHBOARD_LAYOUT_STORAGE_KEY,
			JSON.stringify(["watch-time", "status", "current-anime"])
		)
		const cards = await mountCards()

		expect(cards.remove("status")).toBe(1)
		expect(cards.cardIds.value).toEqual(["watch-time", "current-anime"])
		expect(savedLayout()).toEqual(["watch-time", "current-anime"])
		expect(cards.remove("status")).toBe(-1)
	})

	it("undoes a removal at the same position, and the restored layout survives a reload", async () => {
		localStorage.setItem(
			DASHBOARD_LAYOUT_STORAGE_KEY,
			JSON.stringify(["watch-time", "status", "current-anime"])
		)
		const cards = await mountCards()

		const index = cards.remove("status")
		cards.restore("status", index)

		expect(cards.cardIds.value).toEqual(["watch-time", "status", "current-anime"])
		expect(savedLayout()).toEqual(["watch-time", "status", "current-anime"])

		reload()
		const reloaded = await mountCards()
		expect(reloaded.cardIds.value).toEqual(["watch-time", "status", "current-anime"])
	})

	it("restores a card at the end when the layout shrank, and never duplicates it", async () => {
		localStorage.setItem(
			DASHBOARD_LAYOUT_STORAGE_KEY,
			JSON.stringify(["watch-time", "status", "current-anime"])
		)
		const cards = await mountCards()

		const index = cards.remove("current-anime")
		cards.remove("status")
		cards.restore("current-anime", index)
		expect(cards.cardIds.value).toEqual(["watch-time", "current-anime"])

		cards.restore("current-anime", 0)
		expect(cards.cardIds.value).toEqual(["watch-time", "current-anime"])
	})
})

describe("useDashboardOnboarding", () => {
	beforeEach(() => {
		localStorage.clear()
		reload()
	})

	it("treats the first visit as a first visit, then remembers the dashboard was seen", async () => {
		const first = await mountOnboarding()

		expect(first.isReturningVisitor.value).toBe(false)
		expect(first.showStartHere.value).toBe(true)
		expect(JSON.parse(localStorage.getItem(DASHBOARD_ONBOARDING_STORAGE_KEY) ?? "null")).toEqual({
			seen: true,
			startHereDismissed: false
		})

		reload()
		const second = await mountOnboarding()

		expect(second.isReturningVisitor.value).toBe(true)
		expect(second.showStartHere.value).toBe(true)
	})

	it("keeps the Start here row dismissed for good", async () => {
		const onboarding = await mountOnboarding()

		onboarding.dismissStartHere()
		expect(onboarding.showStartHere.value).toBe(false)

		reload()
		const reloaded = await mountOnboarding()

		expect(reloaded.showStartHere.value).toBe(false)
		expect(reloaded.isReturningVisitor.value).toBe(true)
	})

	it("falls back to a first visit when the stored value is unreadable", async () => {
		localStorage.setItem(DASHBOARD_ONBOARDING_STORAGE_KEY, "{not json")

		const onboarding = await mountOnboarding()

		expect(onboarding.isReturningVisitor.value).toBe(false)
		expect(onboarding.showStartHere.value).toBe(true)
	})

	it("does not touch the saved card layout", async () => {
		const layout = ["status", "watch-time"]
		localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout))

		const onboarding = await mountOnboarding()
		onboarding.dismissStartHere()

		expect(savedLayout()).toEqual(layout)
	})
})
