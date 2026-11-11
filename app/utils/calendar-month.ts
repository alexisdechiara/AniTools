export interface CalendarMonthEvent {
	start: Date
	status?: string
	title?: string
	media?: {
		id?: number | null
		coverImage?: { color?: string | null } | null
	} | null
}

export interface CalendarDayTitle {
	mediaId: number
	title: string
	/** The cover colour AniList extracted, or `null` when it has none. */
	color: string | null
	onList: boolean
}

export interface CalendarDaySummary {
	/** Local calendar day, `YYYY-MM-DD`. */
	key: string
	/** Episodes airing that day, cancelled ones left out. */
	episodes: number
	/** Up to `maxTitles` distinct anime, the ones on the visitor's list first. */
	titles: CalendarDayTitle[]
	/** Distinct anime that did not fit in `titles`. */
	moreTitles: number
	/** Episodes of anime on the visitor's Watching or Planning list. */
	onListEpisodes: number
}

export interface CalendarDaySummaryOptions {
	/** Media ids on the visitor's list; leave out when the list is not loaded. */
	onListMediaIds?: ReadonlySet<number>
	maxTitles?: number
}

/** The local calendar day of a date, as `YYYY-MM-DD`: the key of a month cell. */
export function getCalendarDayKey(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, "0")
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * What each day of the month view says: how many episodes air, which anime (a few of them)
 * and how many belong to the visitor's list. Events are counted on the local day they start.
 * Pass the events already narrowed by the search and the filters.
 */
export function summariseCalendarDays(
	events: readonly CalendarMonthEvent[],
	options: CalendarDaySummaryOptions = {}
): Map<string, CalendarDaySummary> {
	const maxTitles = Math.max(0, Math.trunc(options.maxTitles ?? 3))
	const onList = options.onListMediaIds
	const days = new Map<string, { summary: CalendarDaySummary, titles: Map<number, CalendarDayTitle> }>()

	for (const event of events) {
		if (event.status === "cancelled") continue
		if (!(event.start instanceof Date) || !Number.isFinite(event.start.getTime())) continue

		const key = getCalendarDayKey(event.start)
		let day = days.get(key)
		if (!day) {
			day = {
				summary: { key, episodes: 0, titles: [], moreTitles: 0, onListEpisodes: 0 },
				titles: new Map()
			}
			days.set(key, day)
		}

		const mediaId = event.media?.id
		const isOnList = typeof mediaId === "number" && Boolean(onList?.has(mediaId))
		day.summary.episodes += 1
		if (isOnList) day.summary.onListEpisodes += 1

		if (typeof mediaId === "number" && !day.titles.has(mediaId)) {
			day.titles.set(mediaId, {
				mediaId,
				title: event.title ?? "",
				color: event.media?.coverImage?.color || null,
				onList: isOnList
			})
		}
	}

	const summaries = new Map<string, CalendarDaySummary>()
	for (const [key, day] of days) {
		// Stable sort: list titles first, each group in the order the events were given.
		const ordered = [...day.titles.values()].sort((left, right) =>
			Number(right.onList) - Number(left.onList)
		)
		day.summary.titles = ordered.slice(0, maxTitles)
		day.summary.moreTitles = ordered.length - day.summary.titles.length
		summaries.set(key, day.summary)
	}
	return summaries
}

/** "14 episodes" or "No episodes": the count of a month cell spelled out. */
export function formatDayEpisodeCount(summary: CalendarDaySummary | undefined): string {
	const count = summary?.episodes ?? 0
	if (count === 0) return "No episodes"
	return `${count} ${count === 1 ? "episode" : "episodes"}`
}

/**
 * The accessible name of a month cell, which opens the week it belongs to:
 * "Open week of November 12, 14 episodes, 2 on your list".
 */
export function getMonthCellLabel(
	dayLabel: string,
	summary: CalendarDaySummary | undefined,
	options: { today?: boolean } = {}
): string {
	const parts = [
		`Open week of ${dayLabel}${options.today ? " (today)" : ""}`,
		formatDayEpisodeCount(summary).replace(/^No/, "no")
	]
	if (summary && summary.onListEpisodes > 0) parts.push(`${summary.onListEpisodes} on your list`)
	return parts.join(", ")
}
