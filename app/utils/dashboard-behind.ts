import type { AniListAnimeListEntry } from "~~/shared/types/anilist"

export interface BehindEntry {
	entry: AniListAnimeListEntry
	/** Episodes already aired that the user has not marked as watched. Always at least 1. */
	behind: number
}

function getTitle(entry: AniListAnimeListEntry): string {
	return entry.media?.title?.userPreferred
		?? entry.media?.title?.english
		?? entry.media?.title?.romaji
		?? "Untitled anime"
}

function getBehind(entry: AniListAnimeListEntry): number {
	// Only titles the user is actively watching: paused, dropped, planned and completed
	// entries are not "behind" in any sense the user acts on.
	if (entry.status !== "CURRENT") return 0

	// AniList reports no next episode once a title has finished airing (or when it has no
	// schedule), so there is nothing to compare the progress against.
	const nextEpisode = entry.media?.nextAiringEpisode?.episode
	if (nextEpisode === undefined || !Number.isInteger(nextEpisode) || nextEpisode < 1) return 0

	// The next episode has not aired yet, so the last aired one is nextEpisode - 1.
	const progress = entry.progress !== null && entry.progress > 0 ? entry.progress : 0
	return Math.max(0, nextEpisode - 1 - progress)
}

/**
 * The titles the user is watching that have aired more episodes than they have seen,
 * most behind first, then by title. `limit` caps the result; a non-positive limit gives [].
 */
export function selectBehindEntries(
	entries: readonly AniListAnimeListEntry[],
	limit: number
): BehindEntry[] {
	if (!(limit > 0)) return []

	return entries
		.flatMap((entry): BehindEntry[] => {
			const behind = getBehind(entry)
			return behind > 0 ? [{ entry, behind }] : []
		})
		.toSorted((left, right) =>
			right.behind - left.behind
			|| getTitle(left.entry).localeCompare(getTitle(right.entry), "en")
			|| left.entry.id - right.entry.id
		)
		.slice(0, Math.floor(limit))
}
