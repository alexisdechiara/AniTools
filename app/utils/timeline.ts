import type { AniListActivity } from "~~/shared/types/anilist"

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

const DAY_SECONDS = 24 * 60 * 60

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
