import { defineAsyncComponent, type Component } from "vue"

export const DASHBOARD_CARD_IDS = [
	"watch-time",
	"anime-count",
	"episode-count",
	"mean-score",
	"status",
	"next-episodes",
	"current-anime",
	"recent-updates"
] as const

export type DashboardCardId = typeof DASHBOARD_CARD_IDS[number]

export interface DashboardCardDefinition {
	id: DashboardCardId
	label: string
	description: string
	icon: string
	component: Component
	gridClass: string
	minHeightClass: string
}

export const DASHBOARD_CARDS: readonly DashboardCardDefinition[] = [
	{
		id: "watch-time",
		label: "Watch time",
		description: "Total time spent watching anime.",
		icon: "i-lucide-clock-3",
		component: defineAsyncComponent(() => import("~/components/cards/WatchTimeCard.vue")),
		gridClass: "sm:col-span-1 xl:col-span-3",
		minHeightClass: "min-h-32"
	},
	{
		id: "anime-count",
		label: "Anime watched",
		description: "Number of titles in your anime list.",
		icon: "i-lucide-tv",
		component: defineAsyncComponent(() => import("~/components/cards/AnimesWatchedCard.vue")),
		gridClass: "sm:col-span-1 xl:col-span-3",
		minHeightClass: "min-h-32"
	},
	{
		id: "episode-count",
		label: "Episodes watched",
		description: "Total episodes marked as watched.",
		icon: "i-lucide-list-video",
		component: defineAsyncComponent(() => import("~/components/cards/EpisodesWatchedCard.vue")),
		gridClass: "sm:col-span-1 xl:col-span-3",
		minHeightClass: "min-h-32"
	},
	{
		id: "mean-score",
		label: "Score distribution",
		description: "Your score distribution by title or watch time.",
		icon: "i-lucide-chart-column",
		component: defineAsyncComponent(() => import("~/components/cards/MeanScoreBarCard.vue")),
		gridClass: "sm:col-span-2 xl:col-span-8",
		minHeightClass: "min-h-88"
	},
	{
		id: "status",
		label: "List status",
		description: "How your list is split by AniList status.",
		icon: "i-lucide-chart-pie",
		component: defineAsyncComponent(() => import("~/components/cards/StatusDonutCard.vue")),
		gridClass: "sm:col-span-1 xl:col-span-4",
		minHeightClass: "min-h-88"
	},
	{
		id: "next-episodes",
		label: "Next episodes",
		description: "Upcoming episodes for titles on your list.",
		icon: "i-lucide-calendar-clock",
		component: defineAsyncComponent(() => import("~/components/cards/NextEpisodesCard.vue")),
		gridClass: "sm:col-span-1 xl:col-span-4",
		minHeightClass: "min-h-80"
	},
	{
		id: "current-anime",
		label: "Anime in progress",
		description: "Titles currently marked as watching or repeating.",
		icon: "i-lucide-play",
		component: defineAsyncComponent(() => import("~/components/cards/CurrentAnimeCard.vue")),
		gridClass: "sm:col-span-1 xl:col-span-4",
		minHeightClass: "min-h-80"
	},
	{
		id: "recent-updates",
		label: "Recent list updates",
		description: "The latest changes reported by your AniList list.",
		icon: "i-lucide-history",
		component: defineAsyncComponent(() => import("~/components/cards/RecentListUpdatesCard.vue")),
		gridClass: "sm:col-span-2 xl:col-span-4",
		minHeightClass: "min-h-80"
	}
] as const

const DASHBOARD_CARD_MAP = new Map(
	DASHBOARD_CARDS.map(definition => [definition.id, definition])
)

export function getDashboardCard(id: DashboardCardId): DashboardCardDefinition {
	const definition = DASHBOARD_CARD_MAP.get(id)
	if (!definition) {
		throw new Error(`Unknown dashboard card: ${id}`)
	}

	return definition
}
