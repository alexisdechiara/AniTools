import { getEntryWatchMinutes, type StatisticMetric } from "~/utils/statistics"

export type StatisticsDimension = "genres" | "tags" | "studios"

export interface StatisticsBreakdownItem {
	key: string
	name: string
	count: number
	meanScore: number
	minutesWatched: number
	mediaIds: number[]
}

export interface StatisticsBreakdownEntry {
	id: number
	score?: number | null
	progress?: number | null
	repeat?: number | null
	completedAt?: {
		year?: number | null
	} | null
	media?: {
		id: number
		duration?: number | null
		episodes?: number | null
		genres: readonly string[]
		tags: ReadonlyArray<{
			id: number
			name: string
		}>
		studios?: {
			edges: ReadonlyArray<{
				isMain: boolean
				node: {
					id: number
					name: string
					isAnimationStudio: boolean
				}
			}>
		} | null
	} | null
}

interface MutableBreakdownItem {
	key: string
	name: string
	count: number
	scoreTotal: number
	scoreCount: number
	minutesWatched: number
	mediaIds: Set<number>
}

interface EntryCategory {
	key: string
	name: string
}

function getEntryCategories(
	entry: StatisticsBreakdownEntry,
	dimension: StatisticsDimension
): EntryCategory[] {
	if (!entry.media) return []

	if (dimension === "genres") {
		return entry.media.genres.map(genre => ({
			key: genre.toLocaleLowerCase(),
			name: genre
		}))
	}

	if (dimension === "tags") {
		return entry.media.tags.map(tag => ({
			key: String(tag.id),
			name: tag.name
		}))
	}

	const edges = entry.media.studios?.edges ?? []
	const mainAnimationStudios = edges.filter(edge =>
		edge.isMain && edge.node.isAnimationStudio
	)
	const relevantStudios = mainAnimationStudios.length
		? mainAnimationStudios
		: edges.filter(edge => edge.node.isAnimationStudio)

	return relevantStudios.map(edge => ({
		key: String(edge.node.id),
		name: edge.node.name
	}))
}

export function getStatisticsCompletionYears(
	entries: readonly StatisticsBreakdownEntry[]
): number[] {
	return entries
		.map(entry => entry.completedAt?.year)
		.filter((year): year is number =>
			year !== null && year !== undefined && Number.isInteger(year)
		)
		.filter((year, index, years) => years.indexOf(year) === index)
		.toSorted((left, right) => right - left)
}

export function aggregateEntriesByDimension(
	entries: readonly StatisticsBreakdownEntry[],
	dimension: StatisticsDimension,
	completedYear?: number
): StatisticsBreakdownItem[] {
	const aggregated = new Map<string, MutableBreakdownItem>()

	for (const entry of entries) {
		if (completedYear !== undefined && entry.completedAt?.year !== completedYear) {
			continue
		}

		const score = Math.max(0, entry.score ?? 0)
		const watchMinutes = getEntryWatchMinutes(entry)
		const categories = getEntryCategories(entry, dimension)
		const seenCategories = new Set<string>()

		for (const category of categories) {
			if (!category.name || seenCategories.has(category.key)) continue
			seenCategories.add(category.key)

			const current = aggregated.get(category.key) ?? {
				key: category.key,
				name: category.name,
				count: 0,
				scoreTotal: 0,
				scoreCount: 0,
				minutesWatched: 0,
				mediaIds: new Set<number>()
			}

			current.count += 1
			current.minutesWatched += watchMinutes
			current.mediaIds.add(entry.media?.id ?? entry.id)
			if (score > 0) {
				current.scoreTotal += score
				current.scoreCount += 1
			}

			aggregated.set(category.key, current)
		}
	}

	return [...aggregated.values()].map(item => ({
		key: item.key,
		name: item.name,
		count: item.count,
		meanScore: item.scoreCount > 0
			? Number((item.scoreTotal / item.scoreCount).toFixed(2))
			: 0,
		minutesWatched: item.minutesWatched,
		mediaIds: [...item.mediaIds]
	}))
}

export function sortBreakdownItems(
	items: readonly StatisticsBreakdownItem[],
	metric: StatisticMetric
): StatisticsBreakdownItem[] {
	return items.toSorted((left, right) => {
		const difference = right[metric] - left[metric]
		if (difference !== 0) return difference
		return left.name.localeCompare(right.name)
	})
}

export function getCountChange(
	currentCount: number,
	previousCount: number
): number | null {
	if (previousCount === 0) return currentCount === 0 ? 0 : null
	return Number((((currentCount - previousCount) / previousCount) * 100).toFixed(2))
}
