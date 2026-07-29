import type {
	AniListAnimeListEntry,
	AniListMediaSummary
} from "~~/shared/types/anilist"

export interface ExploreSeed {
	media: AniListMediaSummary
	score: number
}

export interface ExploreStudioOption {
	id: number
	name: string
	count: number
	bestScore: number
}

export interface ExploreMediaFilters {
	excludedMediaIds?: ReadonlySet<number>
	format?: string
	genre?: string
	minimumScore?: number
}

export function selectExploreSeeds(
	entries: readonly AniListAnimeListEntry[],
	limit = 8
): ExploreSeed[] {
	const candidates = new Map<number, ExploreSeed>()

	for (const entry of entries) {
		if (
			!entry.media
			|| entry.media.isAdult === true
			|| ((entry.score ?? 0) <= 0 && !entry.media.isFavourite)
		) continue
		const existing = candidates.get(entry.media.id)
		const candidate = {
			media: entry.media,
			score: entry.score ?? 0
		}

		if (!existing || candidate.score > existing.score) {
			candidates.set(entry.media.id, candidate)
		}
	}

	return [...candidates.values()]
		.toSorted((left, right) =>
			right.score - left.score
			|| (right.media.averageScore ?? 0) - (left.media.averageScore ?? 0)
			|| left.media.id - right.media.id
		)
		.slice(0, Math.max(1, limit))
}

export function collectExploreStudios(
	entries: readonly AniListAnimeListEntry[],
	limit = 12
): ExploreStudioOption[] {
	const studios = new Map<number, ExploreStudioOption>()

	for (const entry of entries) {
		if (
			!entry.media
			|| entry.media.isAdult === true
			|| ((entry.score ?? 0) <= 0 && !entry.media.isFavourite)
		) continue

		for (const edge of entry.media.studios?.edges ?? []) {
			if (!edge.isMain || !edge.node.isAnimationStudio) continue
			const current = studios.get(edge.node.id)
			studios.set(edge.node.id, {
				id: edge.node.id,
				name: edge.node.name,
				count: (current?.count ?? 0) + 1,
				bestScore: Math.max(current?.bestScore ?? 0, entry.score ?? 0)
			})
		}
	}

	return [...studios.values()]
		.toSorted((left, right) =>
			right.count - left.count
			|| right.bestScore - left.bestScore
			|| left.name.localeCompare(right.name)
		)
		.slice(0, Math.max(1, limit))
}

export function filterExploreMedia(
	media: readonly AniListMediaSummary[],
	filters: ExploreMediaFilters
): AniListMediaSummary[] {
	return media.filter((item) => {
		if (item.isAdult === true) return false
		if (filters.excludedMediaIds?.has(item.id)) return false
		if (filters.genre && !item.genres.includes(filters.genre)) return false
		if (filters.format && item.format !== filters.format) return false
		return (item.averageScore ?? item.meanScore ?? 0) >= (filters.minimumScore ?? 0)
	})
}

export function getExploreTitle(media: AniListMediaSummary): string {
	return media.title?.userPreferred
		?? media.title?.english
		?? media.title?.romaji
		?? media.title?.native
		?? "Untitled anime"
}
