import {
	DASHBOARD_CARDS,
	type DashboardCardId
} from "~/config/components"
import {
	DASHBOARD_LAYOUT_STORAGE_KEY,
	DEFAULT_DASHBOARD_CARD_IDS,
	addDashboardCard,
	moveDashboardCard,
	normalizeDashboardCardIds,
	removeDashboardCard
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

	function remove(cardId: DashboardCardId) {
		cardIds.value = removeDashboardCard(cardIds.value, cardId)
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
		move,
		reorder,
		reset
	}
}
