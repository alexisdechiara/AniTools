import type {
	AniListAnimeListEntry,
	AniListAnimeListResponse,
	AniListListStatus,
	AniListSource
} from "~~/shared/types/anilist"

export interface AnimeListGroup {
	name: string
	status: AniListListStatus
	entries: AniListAnimeListEntry[]
}

const STATUS_LABELS: Readonly<Record<AniListListStatus, string>> = {
	CURRENT: "Watching",
	PLANNING: "Planning",
	COMPLETED: "Completed",
	DROPPED: "Dropped",
	PAUSED: "Paused",
	REPEATING: "Rewatching"
}

export async function collectAniListAnimeEntries(
	fetchPage: (page: number) => Promise<AniListAnimeListResponse>,
	maxPages = 100
): Promise<{
	entries: AniListAnimeListEntry[]
	source: AniListSource | null
}> {
	const uniqueEntries = new Map<number, AniListAnimeListEntry>()
	let page = 1
	let hasNextPage = true
	let source: AniListSource | null = null

	while (hasNextPage && page <= Math.max(1, maxPages)) {
		const response = await fetchPage(page)
		source = response.source

		for (const entry of response.entries) {
			uniqueEntries.set(entry.id, entry)
		}

		hasNextPage = response.pageInfo.hasNextPage
		page += 1
	}

	return {
		entries: [...uniqueEntries.values()],
		source
	}
}

export function groupAnimeEntries(
	entries: readonly AniListAnimeListEntry[]
): AnimeListGroup[] {
	const grouped = new Map<AniListListStatus, AniListAnimeListEntry[]>()

	for (const entry of entries) {
		if (!entry.status) continue
		const group = grouped.get(entry.status) ?? []
		group.push(entry)
		grouped.set(entry.status, group)
	}

	return [...grouped.entries()].map(([status, groupEntries]) => ({
		name: STATUS_LABELS[status],
		status,
		entries: groupEntries
	}))
}

export function sortAnimeEntriesByScore(
	entries: readonly AniListAnimeListEntry[]
): AniListAnimeListEntry[] {
	return entries.toSorted((left, right) => (right.score ?? 0) - (left.score ?? 0))
}
