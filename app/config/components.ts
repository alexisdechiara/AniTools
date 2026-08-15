import { defineAsyncComponent, type Component } from "vue"

export const DASHBOARD_CARD_IDS = [
	"watch-time",
	"anime-count",
	"episode-count",
	"mean-score",
	"status",
	"next-episodes",
	"current-anime",
	"recent-updates",
	"statistics-genres",
	"statistics-tags",
	"statistics-studios",
	"statistics-highlights",
	"statistics-countries",
	"statistics-watch-years",
	"statistics-release-years",
	"statistics-formats",
	"rewind-seasons",
	"rewind-highlights",
	"rewind-top-anime",
	"rewind-flop-anime"
] as const

export type DashboardCardId = typeof DASHBOARD_CARD_IDS[number]
export type DashboardCardGroup = "dashboard" | "statistics" | "rewind"
export type DashboardCardLoadingSource = "entries" | "statistics"
export type DashboardCardSkeleton = "chart" | "list" | "media" | "metric"

export interface DashboardCardDefinition {
	id: DashboardCardId
	label: string
	description: string
	icon: string
	component: Component
	group: DashboardCardGroup
	size: { w: number, h: number }
	loadingSource: DashboardCardLoadingSource
	skeleton: DashboardCardSkeleton
}

const allTimeRewindComponent = () => import("~/components/dashboard/AllTimeRewindCard.vue")

export const DASHBOARD_CARDS: readonly DashboardCardDefinition[] = [
	{
		id: "watch-time",
		label: "Watch time",
		description: "Total time spent watching anime.",
		icon: "i-lucide-clock-3",
		component: defineAsyncComponent(() => import("~/components/cards/WatchTimeCard.vue")),
		group: "dashboard",
		size: { w: 3, h: 1 },
		loadingSource: "statistics",
		skeleton: "metric"
	},
	{
		id: "anime-count",
		label: "Anime watched",
		description: "Number of titles in your anime list.",
		icon: "i-lucide-tv",
		component: defineAsyncComponent(() => import("~/components/cards/AnimesWatchedCard.vue")),
		group: "dashboard",
		size: { w: 3, h: 1 },
		loadingSource: "statistics",
		skeleton: "metric"
	},
	{
		id: "episode-count",
		label: "Episodes watched",
		description: "Total episodes marked as watched.",
		icon: "i-lucide-list-video",
		component: defineAsyncComponent(() => import("~/components/cards/EpisodesWatchedCard.vue")),
		group: "dashboard",
		size: { w: 3, h: 1 },
		loadingSource: "statistics",
		skeleton: "metric"
	},
	{
		id: "mean-score",
		label: "Score distribution",
		description: "Your score distribution by title or watch time.",
		icon: "i-lucide-chart-column",
		component: defineAsyncComponent(() => import("~/components/cards/MeanScoreBarCard.vue")),
		group: "dashboard",
		size: { w: 9, h: 3 },
		loadingSource: "statistics",
		skeleton: "chart"
	},
	{
		id: "status",
		label: "List status",
		description: "How your list is split by AniList status.",
		icon: "i-lucide-chart-pie",
		component: defineAsyncComponent(() => import("~/components/cards/StatusDonutCard.vue")),
		group: "dashboard",
		size: { w: 3, h: 4 },
		loadingSource: "statistics",
		skeleton: "chart"
	},
	{
		id: "next-episodes",
		label: "Next episodes",
		description: "Upcoming episodes for titles on your list.",
		icon: "i-lucide-calendar-clock",
		component: defineAsyncComponent(() => import("~/components/cards/NextEpisodesCard.vue")),
		group: "dashboard",
		size: { w: 4, h: 3 },
		loadingSource: "entries",
		skeleton: "list"
	},
	{
		id: "current-anime",
		label: "Anime in progress",
		description: "Titles currently marked as watching or repeating.",
		icon: "i-lucide-play",
		component: defineAsyncComponent(() => import("~/components/cards/CurrentAnimeCard.vue")),
		group: "dashboard",
		size: { w: 4, h: 3 },
		loadingSource: "entries",
		skeleton: "list"
	},
	{
		id: "recent-updates",
		label: "Recent list updates",
		description: "The latest changes reported by your AniList list.",
		icon: "i-lucide-history",
		component: defineAsyncComponent(() => import("~/components/cards/RecentListUpdatesCard.vue")),
		group: "dashboard",
		size: { w: 4, h: 3 },
		loadingSource: "entries",
		skeleton: "list"
	},
	{
		id: "statistics-genres",
		label: "Genres",
		description: "Your most watched and highest-rated genres.",
		icon: "i-lucide-shapes",
		component: defineAsyncComponent(() => import("~/components/cards/GenresCard.vue")),
		group: "statistics",
		size: { w: 4, h: 3 },
		loadingSource: "statistics",
		skeleton: "list"
	},
	{
		id: "statistics-tags",
		label: "Tags",
		description: "Recurring themes across your anime list.",
		icon: "i-lucide-tags",
		component: defineAsyncComponent(() => import("~/components/cards/TagsCard.vue")),
		group: "statistics",
		size: { w: 4, h: 3 },
		loadingSource: "statistics",
		skeleton: "list"
	},
	{
		id: "statistics-studios",
		label: "Studios",
		description: "The animation studios represented in your list.",
		icon: "i-lucide-building-2",
		component: defineAsyncComponent(() => import("~/components/cards/StudiosCard.vue")),
		group: "statistics",
		size: { w: 4, h: 3 },
		loadingSource: "statistics",
		skeleton: "list"
	},
	{
		id: "statistics-highlights",
		label: "Anime highlights",
		description: "Best rated, longest and most rewatched anime.",
		icon: "i-lucide-sparkles",
		component: defineAsyncComponent(() => import("~/components/cards/HighlightCard.vue")),
		group: "statistics",
		size: { w: 8, h: 3 },
		loadingSource: "entries",
		skeleton: "media"
	},
	{
		id: "statistics-countries",
		label: "Countries of origin",
		description: "Where the anime in your list were produced.",
		icon: "i-lucide-globe-2",
		component: defineAsyncComponent(() => import("~/components/cards/CountriesDonutCard.vue")),
		group: "statistics",
		size: { w: 4, h: 3 },
		loadingSource: "statistics",
		skeleton: "chart"
	},
	{
		id: "statistics-watch-years",
		label: "Watch years",
		description: "How your viewing is distributed by year.",
		icon: "i-lucide-calendar-range",
		component: defineAsyncComponent(() => import("~/components/cards/WatchYearLineCard.vue")),
		group: "statistics",
		size: { w: 6, h: 3 },
		loadingSource: "statistics",
		skeleton: "chart"
	},
	{
		id: "statistics-release-years",
		label: "Release years",
		description: "Release-year distribution for your anime.",
		icon: "i-lucide-chart-no-axes-combined",
		component: defineAsyncComponent(() => import("~/components/cards/ReleaseYearsLineCard.vue")),
		group: "statistics",
		size: { w: 6, h: 3 },
		loadingSource: "statistics",
		skeleton: "chart"
	},
	{
		id: "statistics-formats",
		label: "Formats",
		description: "TV, movie, OVA and other format distribution.",
		icon: "i-lucide-panels-top-left",
		component: defineAsyncComponent(() => import("~/components/cards/FormatsDonutCard.vue")),
		group: "statistics",
		size: { w: 4, h: 3 },
		loadingSource: "statistics",
		skeleton: "chart"
	},
	{
		id: "rewind-seasons",
		label: "Anime by season",
		description: "All-time viewing split between winter, spring, summer and fall.",
		icon: "i-lucide-sun-snow",
		component: defineAsyncComponent(allTimeRewindComponent),
		group: "rewind",
		size: { w: 4, h: 3 },
		loadingSource: "entries",
		skeleton: "list"
	},
	{
		id: "rewind-highlights",
		label: "All-time Rewind highlights",
		description: "Your all-time selection and longest watch.",
		icon: "i-lucide-award",
		component: defineAsyncComponent(allTimeRewindComponent),
		group: "rewind",
		size: { w: 8, h: 3 },
		loadingSource: "entries",
		skeleton: "media"
	},
	{
		id: "rewind-top-anime",
		label: "Top 3 anime",
		description: "Your three highest-rated anime across all time.",
		icon: "i-lucide-trophy",
		component: defineAsyncComponent(allTimeRewindComponent),
		group: "rewind",
		size: { w: 6, h: 4 },
		loadingSource: "entries",
		skeleton: "media"
	},
	{
		id: "rewind-flop-anime",
		label: "Flop 3 anime",
		description: "Your three lowest-rated scored anime across all time.",
		icon: "i-lucide-thumbs-down",
		component: defineAsyncComponent(allTimeRewindComponent),
		group: "rewind",
		size: { w: 6, h: 4 },
		loadingSource: "entries",
		skeleton: "media"
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
