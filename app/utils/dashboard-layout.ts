import {
	DASHBOARD_CARD_IDS,
	type DashboardCardId
} from "~/config/components"

export const DASHBOARD_LAYOUT_STORAGE_KEY = "anitools:dashboard-layout:v1"

export const DEFAULT_DASHBOARD_CARD_IDS: readonly DashboardCardId[] = [
	"watch-time",
	"anime-count",
	"episode-count",
	"mean-score",
	"status",
	"next-episodes",
	"current-anime",
	"recent-updates"
]

const VALID_CARD_IDS = new Set<DashboardCardId>(DASHBOARD_CARD_IDS)

export interface DashboardDropTargetBounds {
	bottom: number
	left: number
	right: number
	top: number
}

export function isDashboardDeleteTargetHit(
	point: { x: number, y: number },
	bounds: DashboardDropTargetBounds | null,
	padding = 16
): boolean {
	if (!bounds) return false
	const safePadding = Math.max(0, padding)

	return point.x >= bounds.left - safePadding
		&& point.x <= bounds.right + safePadding
		&& point.y >= bounds.top - safePadding
		&& point.y <= bounds.bottom + safePadding
}

export function getDashboardDeleteAttractionOffset(
	cardBounds: DashboardDropTargetBounds | null,
	targetBounds: DashboardDropTargetBounds | null
): { x: number, y: number } | null {
	if (!cardBounds || !targetBounds) return null

	return {
		x: (targetBounds.left + targetBounds.right - cardBounds.left - cardBounds.right) / 2,
		y: (targetBounds.top + targetBounds.bottom - cardBounds.top - cardBounds.bottom) / 2
	}
}

export function isDashboardCardId(value: unknown): value is DashboardCardId {
	return typeof value === "string"
		&& VALID_CARD_IDS.has(value as DashboardCardId)
}

export function normalizeDashboardCardIds(
	value: unknown,
	fallback: readonly DashboardCardId[] = DEFAULT_DASHBOARD_CARD_IDS
): DashboardCardId[] {
	if (!Array.isArray(value)) return [...fallback]

	const normalized: DashboardCardId[] = []
	const seen = new Set<DashboardCardId>()

	for (const candidate of value) {
		if (!isDashboardCardId(candidate) || seen.has(candidate)) continue
		seen.add(candidate)
		normalized.push(candidate)
		if (normalized.length === VALID_CARD_IDS.size) break
	}

	return normalized
}

export function addDashboardCard(
	cardIds: readonly DashboardCardId[],
	cardId: DashboardCardId
): DashboardCardId[] {
	return cardIds.includes(cardId) ? [...cardIds] : [...cardIds, cardId]
}

export function removeDashboardCard(
	cardIds: readonly DashboardCardId[],
	cardId: DashboardCardId
): DashboardCardId[] {
	return cardIds.filter(id => id !== cardId)
}

export function moveDashboardCard(
	cardIds: readonly DashboardCardId[],
	cardId: DashboardCardId,
	direction: -1 | 1
): DashboardCardId[] {
	const currentIndex = cardIds.indexOf(cardId)
	const targetIndex = currentIndex + direction

	if (
		currentIndex < 0
		|| targetIndex < 0
		|| targetIndex >= cardIds.length
	) {
		return [...cardIds]
	}

	const reordered = [...cardIds]
	const [card] = reordered.splice(currentIndex, 1)
	if (!card) return reordered

	reordered.splice(targetIndex, 0, card)
	return reordered
}
