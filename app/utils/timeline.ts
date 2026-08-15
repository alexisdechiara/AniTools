import type {
	AniListActivity,
	AniListAnimeActivity,
	AniListActivityMedia
} from "~~/shared/types/anilist"
import type {
	TimelineGroup,
	TimelineItem,
	TimelineStackingOptions
} from "vue-timeline-chart"

export type TimelineView = "weeks" | "months"

export interface TimelineWindow {
	from: number
	to: number
}

export interface TimelineActivityGroup {
	key: string
	startedAt: number
	activities: AniListActivity[]
}

export interface TimelineMonthStats {
	updates: number
	titles: number
	activeDays: number
}

export interface TimelineMonthGroup {
	key: string
	startedAt: number
	month: string
	year: string
	stats: TimelineMonthStats
	activities: AniListAnimeActivity[]
}

export interface TimelineGanttRow {
	key: string
	kind: AniListActivity["kind"]
	section: TimelineGanttSection
	label: string
	description: string
	startedAt: number
	endedAt: number
	cover: string | null
	color: string | null
	url: string | null
	media: AniListActivityMedia | null
	activities: AniListActivity[]
}

export type TimelineGanttSection = "movies" | "series" | "text" | "message"

export interface TimelineGanttGroup extends TimelineGroup {
	kind: AniListActivity["kind"]
	section: TimelineGanttSection
	count: number
}

export type TimelineGanttItem = TimelineItem & {
	row: TimelineGanttRow
	rows: TimelineGanttRow[]
	variant: "movie-stack" | "sequence" | "activity"
}

export interface TimelineGanttChartData {
	groups: TimelineGanttGroup[]
	items: TimelineGanttItem[]
}

export interface TimelineAxisTick {
	key: string
	timestamp: number
	label: string
	position: number
}

export interface TimelineMonthSegment {
	key: string
	label: string
	position: number
	width: number
}

const DAY_SECONDS = 24 * 60 * 60
const GANTT_GROUPS: Array<{
	section: TimelineGanttSection
	kind: AniListActivity["kind"]
	label: string
}> = [
	{ section: "movies", kind: "anime", label: "Movies" },
	{ section: "series", kind: "anime", label: "Series" },
	{ section: "text", kind: "text", label: "Text posts" },
	{ section: "message", kind: "message", label: "Messages" }
]

export const TIMELINE_GANTT_STACKING = Object.freeze({
	enabled: true,
	strategy: "dataset",
	collisionWidth: 196,
	maxLanes: Number.POSITIVE_INFINITY
}) satisfies Readonly<TimelineStackingOptions>

function startOfUtcDay(timestamp: number) {
	const date = new Date(timestamp * 1_000)
	return Math.floor(Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate()
	) / 1_000)
}

function startOfUtcWeek(timestamp: number) {
	const dayStart = startOfUtcDay(timestamp)
	const weekday = new Date(dayStart * 1_000).getUTCDay()
	const daysSinceMonday = weekday === 0 ? 6 : weekday - 1
	return dayStart - daysSinceMonday * DAY_SECONDS
}

function startOfUtcMonth(timestamp: number) {
	const date = new Date(timestamp * 1_000)
	return Math.floor(Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		1
	) / 1_000)
}

function getAnimeTitle(activity: AniListActivity): string {
	if (activity.kind !== "anime") return "Anime activity"
	return activity.media?.title?.userPreferred
		?? activity.media?.title?.english
		?? activity.media?.title?.romaji
		?? "Untitled anime"
}

function getActivityActor(activity: AniListActivity): string {
	if (activity.kind === "message") {
		return activity.messenger?.name ?? activity.user?.name ?? "AniList user"
	}
	return activity.user?.name ?? "AniList user"
}

function getGanttRowKey(activity: AniListActivity): string {
	if (activity.kind === "anime" && activity.media) return `anime-${activity.media.id}`
	return `${activity.kind}-${activity.id}`
}

function getGanttRowLabel(activity: AniListActivity): string {
	if (activity.kind === "anime") return getAnimeTitle(activity)
	if (activity.kind === "text") return `Text post by ${getActivityActor(activity)}`
	return `Message from ${getActivityActor(activity)}`
}

function getGanttRowDescription(
	latestActivity: AniListActivity,
	activityCount: number
): string {
	if (latestActivity.kind !== "anime") {
		return latestActivity.kind === "text" ? "Text post" : "Message"
	}

	const latestUpdate = [latestActivity.status, latestActivity.progress]
		.filter(Boolean)
		.join(" · ")
	if (activityCount === 1) return latestUpdate || "1 update"
	return `${activityCount} updates${latestUpdate ? ` · ${latestUpdate}` : ""}`
}

function getGanttSection(activity: AniListActivity): TimelineGanttSection {
	if (activity.kind === "text") return "text"
	if (activity.kind === "message") return "message"
	return activity.media?.format === "MOVIE" ? "movies" : "series"
}

function getGanttGroupId(section: TimelineGanttSection): string {
	return `activity-${section}`
}

function getUtcDayKey(timestamp: number): string {
	return new Date(startOfUtcDay(timestamp) * 1_000).toISOString().slice(0, 10)
}

export function groupTimelineAnimeActivitiesByMonth(
	activities: readonly AniListActivity[],
	locale = "en"
): TimelineMonthGroup[] {
	const uniqueAnimeActivities = new Map<number, AniListAnimeActivity>()
	for (const activity of activities) {
		if (activity.kind === "anime") uniqueAnimeActivities.set(activity.id, activity)
	}

	const groupedActivities = new Map<number, AniListAnimeActivity[]>()
	for (const activity of uniqueAnimeActivities.values()) {
		const startedAt = startOfUtcMonth(activity.createdAt)
		const monthActivities = groupedActivities.get(startedAt) ?? []
		monthActivities.push(activity)
		groupedActivities.set(startedAt, monthActivities)
	}

	const monthFormatter = new Intl.DateTimeFormat(locale, {
		month: "long",
		timeZone: "UTC"
	})
	const yearFormatter = new Intl.DateTimeFormat(locale, {
		year: "numeric",
		timeZone: "UTC"
	})

	return [...groupedActivities.entries()]
		.toSorted(([left], [right]) => right - left)
		.map(([startedAt, monthActivities]) => {
			const sortedActivities = monthActivities.toSorted((left, right) =>
				right.createdAt - left.createdAt || right.id - left.id
			)
			const date = new Date(startedAt * 1_000)
			const titleIds = new Set(sortedActivities.flatMap(activity =>
				activity.media ? [activity.media.id] : []
			))
			const activeDays = new Set(sortedActivities.map(activity =>
				getUtcDayKey(activity.createdAt)
			))

			return {
				key: `month-${date.toISOString().slice(0, 7)}`,
				startedAt,
				month: monthFormatter.format(date),
				year: yearFormatter.format(date),
				stats: {
					updates: sortedActivities.length,
					titles: titleIds.size,
					activeDays: activeDays.size
				},
				activities: sortedActivities
			}
		})
}

export function getTimelinePosition(
	timestamp: number,
	window: TimelineWindow
): number {
	const duration = window.to - window.from
	if (duration <= 0) return 0
	return Math.min(100, Math.max(0, (timestamp - window.from) / duration * 100))
}

export function buildTimelineGanttRows(
	activities: readonly AniListActivity[]
): TimelineGanttRow[] {
	const groupedActivities = new Map<string, AniListActivity[]>()
	for (const activity of activities) {
		const key = getGanttRowKey(activity)
		const group = groupedActivities.get(key) ?? []
		if (!group.some(item => item.id === activity.id)) group.push(activity)
		groupedActivities.set(key, group)
	}

	return [...groupedActivities.entries()]
		.map(([key, grouped]) => {
			const sortedActivities = grouped.toSorted((left, right) =>
				left.createdAt - right.createdAt || left.id - right.id
			)
			const firstActivity = sortedActivities[0]!
			const latestActivity = sortedActivities.at(-1)!
			const media = latestActivity.kind === "anime" ? latestActivity.media : null

			return {
				key,
				kind: latestActivity.kind,
				section: getGanttSection(latestActivity),
				label: getGanttRowLabel(latestActivity),
				description: getGanttRowDescription(latestActivity, sortedActivities.length),
				startedAt: firstActivity.createdAt,
				endedAt: latestActivity.createdAt,
				cover: media?.coverImage?.large ?? media?.coverImage?.medium ?? null,
				color: media?.coverImage?.color ?? null,
				url: media?.siteUrl ?? null,
				media,
				activities: sortedActivities
			}
		})
		.toSorted((left, right) =>
			right.endedAt - left.endedAt || left.label.localeCompare(right.label)
		)
}

export function buildTimelineGanttChartData(
	activities: readonly AniListActivity[]
): TimelineGanttChartData {
	const rows = buildTimelineGanttRows(activities)
	const counts = new Map<TimelineGanttSection, number>()
	for (const row of rows) counts.set(row.section, (counts.get(row.section) ?? 0) + 1)

	const groups = GANTT_GROUPS
		.filter(group => counts.has(group.section))
		.map<TimelineGanttGroup>(group => ({
			id: getGanttGroupId(group.section),
			kind: group.kind,
			section: group.section,
			label: group.label,
			count: counts.get(group.section) ?? 0,
			cssVariables: {
				"--label-background": "var(--ui-bg-elevated)",
				"--group-border-top": "1px solid var(--ui-border)",
				"--group-padding-top": "0.5rem",
				"--group-padding-bottom": "0.5rem"
			}
		}))

	const movieDays = new Map<string, TimelineGanttRow[]>()
	for (const row of rows.filter(item => item.section === "movies")) {
		const key = getUtcDayKey(row.endedAt)
		const dayRows = movieDays.get(key) ?? []
		dayRows.push(row)
		movieDays.set(key, dayRows)
	}

	const movieItems = [...movieDays.entries()].map<TimelineGanttItem>(([day, dayRows]) => {
		const sortedRows = dayRows.toSorted((left, right) =>
			right.endedAt - left.endedAt || left.label.localeCompare(right.label)
		)
		const row = sortedRows[0]!
		const count = sortedRows.length

		return {
			id: `movies-${day}`,
			group: getGanttGroupId("movies"),
			start: -row.endedAt * 1_000,
			type: "point",
			title: count === 1 ? row.label : `${count} movies on ${day}`,
			row,
			rows: sortedRows,
			variant: "movie-stack",
			cssVariables: {
				"--item-background": "transparent",
				"--item-point-size": `${Math.min(6.5, 2.8 + (count - 1) * 0.7)}rem`
			}
		}
	})

	const otherItems = rows
		.filter(row => row.section !== "movies")
		.map<TimelineGanttItem>((row) => {
		// Negative timestamps mirror the chronological axis: the newest activity
		// stays on the left while older history extends to the right as it loads.
		const start = -row.endedAt * 1_000
		const end = -row.startedAt * 1_000
		const common = {
			id: row.key,
			group: getGanttGroupId(row.section),
			start,
			title: `${row.label} · ${row.description}`,
			row,
			rows: [row],
			variant: row.section === "series" ? "sequence" as const : "activity" as const,
			cssVariables: {
				"--item-background": end > start
					? row.color ?? "var(--ui-primary)"
					: "transparent"
			}
		}

		return end > start
			? { ...common, type: "range", end }
			: { ...common, type: "point" }
		})

	return {
		groups,
		items: [...movieItems, ...otherItems]
	}
}

export function getTimelineAxisTicks(
	window: TimelineWindow,
	locale = "en"
): TimelineAxisTick[] {
	const durationDays = Math.max(1, (window.to - window.from) / DAY_SECONDS)
	const stepDays = durationDays <= 21 ? 2 : durationDays <= 100 ? 7 : 28
	const firstDay = startOfUtcDay(window.from)
	let cursor = stepDays === 7
		? startOfUtcWeek(window.from)
		: firstDay
	if (cursor < window.from) cursor += stepDays * DAY_SECONDS

	const formatter = new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		timeZone: "UTC"
	})
	const ticks: TimelineAxisTick[] = []
	while (cursor <= window.to) {
		ticks.push({
			key: new Date(cursor * 1_000).toISOString(),
			timestamp: cursor,
			label: formatter.format(new Date(cursor * 1_000)),
			position: getTimelinePosition(cursor, window)
		})
		cursor += stepDays * DAY_SECONDS
	}

	return ticks
}

export function getTimelineMonthSegments(
	window: TimelineWindow,
	locale = "en"
): TimelineMonthSegment[] {
	const firstDate = new Date(window.from * 1_000)
	let monthStart = Math.floor(Date.UTC(
		firstDate.getUTCFullYear(),
		firstDate.getUTCMonth(),
		1
	) / 1_000)
	const formatter = new Intl.DateTimeFormat(locale, {
		month: "long",
		year: "numeric",
		timeZone: "UTC"
	})
	const segments: TimelineMonthSegment[] = []

	while (monthStart < window.to) {
		const monthDate = new Date(monthStart * 1_000)
		const nextMonth = Math.floor(Date.UTC(
			monthDate.getUTCFullYear(),
			monthDate.getUTCMonth() + 1,
			1
		) / 1_000)
		const visibleStart = Math.max(monthStart, window.from)
		const visibleEnd = Math.min(nextMonth, window.to)
		const position = getTimelinePosition(visibleStart, window)

		segments.push({
			key: `${monthDate.getUTCFullYear()}-${monthDate.getUTCMonth() + 1}`,
			label: formatter.format(monthDate),
			position,
			width: getTimelinePosition(visibleEnd, window) - position
		})
		monthStart = nextMonth
	}

	return segments
}

export function getTimelineWindow(
	view: TimelineView,
	now = new Date()
): TimelineWindow {
	const nowSeconds = Math.floor(now.getTime() / 1_000)

	if (view === "weeks") {
		return {
			from: startOfUtcWeek(nowSeconds) - 7 * 7 * DAY_SECONDS,
			to: nowSeconds + 1
		}
	}

	return {
		from: Math.floor(Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth() - 5,
			1
		) / 1_000),
		to: nowSeconds + 1
	}
}

export function groupTimelineActivities(
	activities: readonly AniListActivity[],
	view: TimelineView
): TimelineActivityGroup[] {
	const unique = new Map<number, AniListActivity>()
	for (const activity of activities) unique.set(activity.id, activity)

	const groups = new Map<number, AniListActivity[]>()
	for (const activity of unique.values()) {
		const startedAt = view === "weeks"
			? startOfUtcWeek(activity.createdAt)
			: startOfUtcMonth(activity.createdAt)
		const items = groups.get(startedAt) ?? []
		items.push(activity)
		groups.set(startedAt, items)
	}

	return [...groups.entries()]
		.toSorted(([left], [right]) => right - left)
		.map(([startedAt, groupActivities]) => ({
			key: view === "weeks"
				? `week-${new Date(startedAt * 1_000).toISOString().slice(0, 10)}`
				: `month-${new Date(startedAt * 1_000).toISOString().slice(0, 7)}`,
			startedAt,
			activities: groupActivities.toSorted((left, right) =>
				right.createdAt - left.createdAt || right.id - left.id
			)
		}))
}

export function getTimelineGroupLabel(
	group: Pick<TimelineActivityGroup, "startedAt">,
	view: TimelineView,
	locale = "en"
): string {
	const date = new Date(group.startedAt * 1_000)

	if (view === "weeks") {
		const end = new Date((group.startedAt + 6 * DAY_SECONDS) * 1_000)
		const formatter = new Intl.DateTimeFormat(locale, {
			day: "numeric",
			month: "short",
			timeZone: "UTC"
		})
		return `${formatter.format(date)} – ${formatter.format(end)}`
	}

	return new Intl.DateTimeFormat(locale, {
		month: "long",
		year: "numeric",
		timeZone: "UTC"
	}).format(date)
}

export function getActivityText(activity: AniListActivity): string {
	if (activity.kind === "text") return activity.text
	if (activity.kind === "message") return activity.message
	return ""
}
