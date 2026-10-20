import type {
	AniListAnimeListEntry,
	AniListListStatus
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
