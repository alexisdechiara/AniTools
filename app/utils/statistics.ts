export type StatisticMetric = "count" | "meanScore" | "minutesWatched"

type StatisticMetricRecord = Partial<Record<StatisticMetric, number | null>>

export interface ActivityDay {
	date: Date
	count: number
	opacity: number
	isCurrentMonth: boolean
}

export interface AnimeHighlightEntry {
	score?: number | null
	progress?: number | null
	repeat?: number | null
	media?: {
		duration?: number | null
		episodes?: number | null
		averageScore?: number | null
		isFavourite?: boolean | null
	} | null
}

export function sortStatistics<T extends StatisticMetricRecord>(
	items: readonly (T | null | undefined)[] | null | undefined,
	metric: StatisticMetric,
	limit = Number.POSITIVE_INFINITY
): T[] {
	if (!items?.length || limit <= 0) return []

	return items
		.filter((item): item is T => item != null)
		.toSorted((left, right) => (right[metric] ?? 0) - (left[metric] ?? 0))
		.slice(0, limit)
}

export function getEntryWatchMinutes(entry: AnimeHighlightEntry): number {
	const duration = Math.max(0, entry.media?.duration ?? 0)
	const progress = Math.max(0, entry.progress ?? 0)
	const repeat = Math.max(0, entry.repeat ?? 0)
	const completedEpisodeCount = Math.max(progress, entry.media?.episodes ?? 0)

	return duration * (progress + (repeat * completedEpisodeCount))
}

export function selectBestScoreAnime<T extends AnimeHighlightEntry>(
	entries: readonly (T | null | undefined)[] | null | undefined
): T | null {
	const validEntries = entries?.filter(
		(entry): entry is T => entry != null && entry.media != null && (entry.score ?? 0) > 0
	) ?? []

	return validEntries.toSorted((left, right) => {
		const scoreDifference = (right.score ?? 0) - (left.score ?? 0)
		if (scoreDifference !== 0) return scoreDifference

		const favouriteDifference = Number(Boolean(right.media?.isFavourite))
			- Number(Boolean(left.media?.isFavourite))
		if (favouriteDifference !== 0) return favouriteDifference

		return (right.media?.averageScore ?? 0) - (left.media?.averageScore ?? 0)
	})[0] ?? null
}

export function selectLongestWatchAnime<T extends AnimeHighlightEntry>(
	entries: readonly (T | null | undefined)[] | null | undefined
): T | null {
	return entries
		?.filter((entry): entry is T => entry != null && getEntryWatchMinutes(entry) > 0)
		.toSorted((left, right) => getEntryWatchMinutes(right) - getEntryWatchMinutes(left))[0]
		?? null
}

export function selectMostRewatchedAnime<T extends AnimeHighlightEntry>(
	entries: readonly (T | null | undefined)[] | null | undefined
): T | null {
	return entries
		?.filter((entry): entry is T => entry != null && entry.media != null && (entry.repeat ?? 0) > 0)
		.toSorted((left, right) => {
			const repeatDifference = (right.repeat ?? 0) - (left.repeat ?? 0)
			if (repeatDifference !== 0) return repeatDifference

			return getEntryWatchMinutes(right) - getEntryWatchMinutes(left)
		})[0]
		?? null
}

function formatDateKey(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

export function buildActivityGrid(
	year: number,
	countsByDate: Readonly<Record<string, number>> = {}
): ActivityDay[] {
	const normalizedYear = Number.isInteger(year) && year >= 1970 && year <= 9999
		? year
		: new Date().getFullYear()
	const startDate = new Date(normalizedYear, 0, 1)
	const endDate = new Date(normalizedYear, 11, 31)
	const startOffset = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1
	const daysInYear = Math.round(
		(new Date(normalizedYear + 1, 0, 1).getTime() - startDate.getTime()) / 86_400_000
	)
	const yearlyCounts = Object.entries(countsByDate)
		.filter(([date]) => date.startsWith(`${normalizedYear}-`))
		.map(([, count]) => Math.max(0, count))
	const maxCount = Math.max(0, ...yearlyCounts)
	const data: ActivityDay[] = []

	for (let index = 0; index < startOffset; index += 1) {
		data.push({
			date: new Date(normalizedYear, 0, index - startOffset + 1),
			count: 0,
			opacity: 0,
			isCurrentMonth: false
		})
	}

	for (let index = 0; index < daysInYear; index += 1) {
		const date = new Date(normalizedYear, 0, index + 1)
		const count = Math.max(0, countsByDate[formatDateKey(date)] ?? 0)
		const opacity = count === 0 || maxCount === 0
			? 0.12
			: 0.25 + (0.75 * count / maxCount)

		data.push({ date, count, opacity, isCurrentMonth: true })
	}

	const remainingCells = Math.ceil(data.length / 7) * 7 - data.length
	for (let index = 0; index < remainingCells; index += 1) {
		const date = new Date(endDate)
		date.setDate(endDate.getDate() + index + 1)
		data.push({ date, count: 0, opacity: 0, isCurrentMonth: false })
	}

	return data
}
