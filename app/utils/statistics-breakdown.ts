import type { AniListScoreFormat } from "~~/shared/types/anilist"
import { scoreToPercent } from "~/utils/score-format"
import { getEntryWatchMinutes, type StatisticMetric } from "~/utils/statistics"

export type StatisticsDimension = "genres" | "tags" | "studios"

export interface StatisticsBreakdownItem {
	key: string
	name: string
	count: number
	/** Mean of the scored entries on AniList's 0-100 scale; 0 when nothing is scored. */
	meanScore: number
	minutesWatched: number
	mediaIds: number[]
}

export interface StatisticsBreakdownEntry {
	id: number
	/** Raw list score, expressed in the owning profile's score format. */
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

/**
 * Aggregates list entries by genre, tag or studio.
 *
 * List scores arrive in the profile's own format (`sourceFormat`). They are
 * converted to a 0-100 percentage here, so the resulting means share the scale
 * of AniList's own statistics and can be sorted and formatted the same way.
 */
export function aggregateEntriesByDimension(
	entries: readonly StatisticsBreakdownEntry[],
	dimension: StatisticsDimension,
	completedYear?: number,
	sourceFormat: AniListScoreFormat = "POINT_100"
): StatisticsBreakdownItem[] {
	const aggregated = new Map<string, MutableBreakdownItem>()

	for (const entry of entries) {
		if (completedYear !== undefined && entry.completedAt?.year !== completedYear) {
			continue
		}

		const score = scoreToPercent(entry.score, sourceFormat) ?? 0
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

export type CountComparisonTone = "positive" | "negative" | "neutral"

export interface CountComparison {
	text: string
	tone: CountComparisonTone
}

/** Below this many titles in the base period, a percentage reads as noise. */
const SMALL_COMPARISON_BASE = 10

/**
 * Words the change in title count against a previous period.
 *
 * Percentages are whole numbers and only used when the base is large enough to
 * make them meaningful; otherwise the absolute difference is stated.
 */
export function describeCountComparison(
	currentCount: number,
	previousCount: number,
	previousLabel: string
): CountComparison {
	const current = Math.max(0, Math.round(currentCount))
	const previous = Math.max(0, Math.round(previousCount))
	const difference = current - previous

	if (difference === 0) {
		return { text: `Same as ${previousLabel}`, tone: "neutral" }
	}

	if (previous === 0) {
		return { text: `New compared with ${previousLabel}`, tone: "neutral" }
	}

	const tone: CountComparisonTone = difference > 0 ? "positive" : "negative"
	const direction = difference > 0 ? "more" : "fewer"
	const percent = Math.round((Math.abs(difference) / previous) * 100)

	if (previous < SMALL_COMPARISON_BASE || percent === 0) {
		return {
			text: `${Math.abs(difference)} ${direction} than ${previousLabel}`,
			tone
		}
	}

	return {
		text: `${percent}% ${direction} titles than ${previousLabel}`,
		tone
	}
}
