import {
	DASHBOARD_CARDS,
	type DashboardCardId
} from "~/config/components"
import {
	DASHBOARD_LAYOUT_STORAGE_KEY,
	DASHBOARD_ONBOARDING_STORAGE_KEY,
	DEFAULT_DASHBOARD_CARD_IDS,
	addDashboardCard,
	insertDashboardCard,
	moveDashboardCard,
	normalizeDashboardCardIds,
	normalizeDashboardOnboarding,
	removeDashboardCard,
	type DashboardOnboardingState
} from "~/utils/dashboard-layout"

export function useDashboardCards() {
	const cardIds = useState<DashboardCardId[]>(
		"dashboard-card-ids",
		() => [...DEFAULT_DASHBOARD_CARD_IDS]
	)
	const isHydrated = useState("dashboard-card-preferences-hydrated", () => false)

	const cards = computed(() =>
		cardIds.value.map(id =>
			DASHBOARD_CARDS.find(definition => definition.id === id)
		).filter((definition): definition is typeof DASHBOARD_CARDS[number] =>
			definition !== undefined
		)
	)
	const availableCards = computed(() =>
		DASHBOARD_CARDS.filter(definition => !cardIds.value.includes(definition.id))
	)

	function persist() {
		if (!import.meta.client || !isHydrated.value) return

		try {
			localStorage.setItem(
				DASHBOARD_LAYOUT_STORAGE_KEY,
				JSON.stringify(cardIds.value)
			)
		} catch {
			// The layout remains usable when storage is unavailable or full.
		}
	}

	function hydrate() {
		if (!import.meta.client || isHydrated.value) return

		try {
			const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)
			if (savedLayout !== null) {
				cardIds.value = normalizeDashboardCardIds(JSON.parse(savedLayout))
			}
		} catch {
			cardIds.value = [...DEFAULT_DASHBOARD_CARD_IDS]
		}

		isHydrated.value = true
		persist()
	}

	function add(cardId: DashboardCardId) {
		cardIds.value = addDashboardCard(cardIds.value, cardId)
		persist()
	}

	/** Removes a card and returns the position it held, or -1 when it was not on the dashboard. */
	function remove(cardId: DashboardCardId): number {
		const index = cardIds.value.indexOf(cardId)
		if (index < 0) return -1

		cardIds.value = removeDashboardCard(cardIds.value, cardId)
		persist()
		return index
	}

	/** Undoes a removal: the card returns to the position `remove` reported. */
	function restore(cardId: DashboardCardId, index: number) {
		cardIds.value = insertDashboardCard(cardIds.value, cardId, index)
		persist()
	}

	function move(cardId: DashboardCardId, direction: -1 | 1) {
		cardIds.value = moveDashboardCard(cardIds.value, cardId, direction)
		persist()
	}

	function reorder(nextCardIds: readonly DashboardCardId[]) {
		cardIds.value = normalizeDashboardCardIds(nextCardIds, cardIds.value)
		persist()
	}

	function reset() {
		cardIds.value = [...DEFAULT_DASHBOARD_CARD_IDS]
		persist()
	}

	onMounted(hydrate)

	return {
		cardIds: readonly(cardIds),
		cards,
		availableCards,
		isHydrated: readonly(isHydrated),
		add,
		remove,
		restore,
		move,
		reorder,
		reset
	}
}

/**
 * First-run state of the dashboard, kept in this browser only: whether it was opened before
 * (the greeting says "Welcome back" from the second visit on) and whether the "Start here"
 * row was dismissed.
 */
export function useDashboardOnboarding() {
	const stored = useState<DashboardOnboardingState>(
		"dashboard-onboarding",
		() => ({ seen: false, startHereDismissed: false })
	)
	// What storage said when this page load began: the visit that sets `seen` stays a first visit.
	const isReturningVisitor = useState("dashboard-onboarding-returning", () => false)
	const isHydrated = useState("dashboard-onboarding-hydrated", () => false)

	function persist() {
		if (!import.meta.client || !isHydrated.value) return

		try {
			localStorage.setItem(DASHBOARD_ONBOARDING_STORAGE_KEY, JSON.stringify(stored.value))
		} catch {
			// Without storage the row simply comes back on the next visit.
		}
	}

	function hydrate() {
		if (!import.meta.client || isHydrated.value) return

		try {
			const saved = localStorage.getItem(DASHBOARD_ONBOARDING_STORAGE_KEY)
			stored.value = normalizeDashboardOnboarding(saved === null ? null : JSON.parse(saved))
		} catch {
			stored.value = normalizeDashboardOnboarding(null)
		}

		isReturningVisitor.value = stored.value.seen
		isHydrated.value = true
		if (!stored.value.seen) {
			stored.value = { ...stored.value, seen: true }
			persist()
		}
	}

	function dismissStartHere() {
		stored.value = { ...stored.value, startHereDismissed: true }
		persist()
	}

	onMounted(hydrate)

	return {
		isHydrated: readonly(isHydrated),
		isReturningVisitor: readonly(isReturningVisitor),
		showStartHere: computed(() => isHydrated.value && !stored.value.startHereDismissed),
		dismissStartHere
	}
}

/**
 * Forgets the first-run state, so the next dashboard visit greets and guides like a first one.
 * Unlike `useDashboardOnboarding`, calling it from another page does not record a visit.
 */
export function resetDashboardOnboarding() {
	useState<DashboardOnboardingState>("dashboard-onboarding").value = normalizeDashboardOnboarding(null)
	useState<boolean>("dashboard-onboarding-returning").value = false
	// The next dashboard visit reads storage again.
	useState<boolean>("dashboard-onboarding-hydrated").value = false
	if (!import.meta.client) return

	try {
		localStorage.removeItem(DASHBOARD_ONBOARDING_STORAGE_KEY)
	} catch {
		// Nothing to forget when storage is unavailable.
	}
}
