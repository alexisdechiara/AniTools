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

/** Column count of each grid-layout-plus breakpoint; card sizes are authored for `lg`. */
export const DASHBOARD_GRID_COLUMNS = { lg: 12, md: 8, sm: 4, xs: 2, xxs: 1 } as const
export type DashboardGridBreakpoint = keyof typeof DASHBOARD_GRID_COLUMNS

export interface DashboardGridSize {
	w: number
	h: number
}

export interface DashboardGridItem extends DashboardGridSize {
	i: DashboardCardId
	x: number
	y: number
}

/**
 * Narrows a 12-column card width to a smaller grid. Mid-size grids snap to quarters, rounding
 * up so a third-width card becomes a half rather than an awkward three eighths. On four columns
 * or fewer only single-row metric cards sit side by side; lists and charts need the full width.
 */
export function scaleDashboardCardWidth(width: number, columns: number, height = 1): number {
	if (columns >= 12) return Math.min(columns, Math.max(1, width))
	if (columns <= 1) return 1
	if (columns <= 4) return width < 6 && height <= 1 ? Math.ceil(columns / 2) : columns
	const quarter = columns / 4
	return Math.min(columns, Math.max(quarter, Math.ceil(width / 3) * quarter))
}

/** Places cards in reading order, each in the first free slot, so no row leaves a gap it could fill. */
export function packDashboardLayout(
	cards: ReadonlyArray<{ id: DashboardCardId, size: DashboardGridSize }>,
	columns: number = DASHBOARD_GRID_COLUMNS.lg
): DashboardGridItem[] {
	const occupied = new Set<string>()
	const isFree = (x: number, y: number, size: DashboardGridSize) => {
		for (let row = y; row < y + size.h; row += 1) {
			for (let column = x; column < x + size.w; column += 1) {
				if (occupied.has(`${column}:${row}`)) return false
			}
		}
		return true
	}

	const firstFreeSlot = (size: DashboardGridSize) => {
		// Terminates: rows below every placed card are always free.
		for (let y = 0; ; y += 1) {
			for (let x = 0; x <= columns - size.w; x += 1) {
				if (isFree(x, y, size)) return { x, y }
			}
		}
	}

	const occupy = (item: DashboardGridItem) => {
		for (let row = item.y; row < item.y + item.h; row += 1) {
			for (let column = item.x; column < item.x + item.w; column += 1) {
				occupied.add(`${column}:${row}`)
			}
		}
	}

	const items = cards.map(({ id, size: authoredSize }) => {
		const size = { w: scaleDashboardCardWidth(authoredSize.w, columns, authoredSize.h), h: authoredSize.h }
		const item = { ...firstFreeSlot(size), ...size, i: id }
		occupy(item)
		return item
	})

	if (columns >= DASHBOARD_GRID_COLUMNS.lg) return items

	// On narrower grids, scaled widths rarely add up to a full row: let a card that ends a row
	// grow into the empty columns after it instead of leaving a hole at the edge.
	for (const item of items) {
		while (item.x + item.w < columns && isFree(item.x + item.w, item.y, { w: 1, h: item.h })) {
			item.w += 1
			occupy(item)
		}
	}

	return items
}

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
