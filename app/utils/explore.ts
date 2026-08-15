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

export interface ExploreRelationBadge {
	label: string
	description: string
}

const EXPLORE_RELATION_LABELS: Readonly<Record<string, string>> = {
	PREQUEL: "Sequel",
	SEQUEL: "Prequel",
	PARENT: "Spin-off",
	ADAPTATION: "Adaptation",
	SOURCE: "Source material",
	SPIN_OFF: "Related series",
	SIDE_STORY: "Main story",
	ALTERNATIVE: "Alternative version",
	SUMMARY: "Full story",
	CHARACTER: "Shared characters",
	OTHER: "Related anime"
}

const EXPLORE_RELATION_PRIORITY = [
	"PREQUEL",
	"PARENT",
	"ADAPTATION",
	"SEQUEL",
	"SPIN_OFF",
	"SIDE_STORY",
	"ALTERNATIVE",
	"SUMMARY",
	"SOURCE",
	"CHARACTER",
	"OTHER"
] as const

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

export function getExploreRelationBadge(
	media: AniListMediaSummary
): ExploreRelationBadge | null {
	const edges = media.relations?.edges ?? []
	for (const relationType of EXPLORE_RELATION_PRIORITY) {
		const edge = edges.find(item => item.relationType === relationType && item.node)
		if (!edge?.node) continue
		const relatedTitle = edge.node.title?.userPreferred
			?? edge.node.title?.english
			?? edge.node.title?.romaji
			?? edge.node.title?.native
			?? "a related anime"
		const label = EXPLORE_RELATION_LABELS[relationType] ?? "Related anime"

		if (relationType === "PREQUEL") {
			return { label, description: `Sequel to ${relatedTitle}` }
		}
		if (relationType === "SEQUEL") {
			return { label, description: `Precedes ${relatedTitle}` }
		}
		if (relationType === "ADAPTATION") {
			return { label, description: `Adapted from ${relatedTitle}` }
		}

		return { label, description: `${label} · ${relatedTitle}` }
	}

	return null
}
