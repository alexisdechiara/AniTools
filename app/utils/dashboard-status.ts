import type {
	AniListAnimeListEntry,
	AniListStatisticMetric
} from "~~/shared/types/anilist"
import { getEntryWatchMinutes } from "~/utils/statistics"

export type StatusStatistic = Pick<AniListStatisticMetric, "count" | "meanScore" | "minutesWatched"> & {
	status: string | null
}

export interface ReconciledStatusStatistic {
	status: string
	count: number
	meanScore?: number
	minutesWatched?: number
}

type StatusEntry = Pick<AniListAnimeListEntry, "status" | "progress" | "repeat"> & {
	media: Pick<NonNullable<AniListAnimeListEntry["media"]>, "duration" | "episodes"> | null
}

/**
 * AniList serves the status split from precomputed statistics, a snapshot it refreshes on its
 * own schedule, while the list is live. The two disagree until the next refresh: a title finished
 * yesterday can still be counted as "Watching" there. The live list is what every list card on
 * the dashboard shows, so its counts win; the snapshot only supplies the score and watch time of
 * a status it already knows.
 *
 * `entries` is null while the list is unknown (not loaded, failed or truncated): the snapshot is
 * then returned as it is.
 */
export function reconcileStatusStatistics(
	statistics: readonly StatusStatistic[] | null | undefined,
	entries: readonly StatusEntry[] | null
): ReconciledStatusStatistic[] {
	const known = (statistics ?? []).filter(
		(item): item is StatusStatistic & { status: string } => Boolean(item.status)
	)
	if (entries === null) {
		return known.map(item => ({
			status: item.status,
			count: item.count,
			meanScore: item.meanScore,
			minutesWatched: item.minutesWatched
		}))
	}

	const live = new Map<string, { count: number, minutesWatched: number }>()
	for (const entry of entries) {
		if (!entry.status) continue
		const totals = live.get(entry.status) ?? { count: 0, minutesWatched: 0 }
		totals.count += 1
		totals.minutesWatched += getEntryWatchMinutes(entry)
		live.set(entry.status, totals)
	}

	const reconciled: ReconciledStatusStatistic[] = []
	for (const item of known) {
		const totals = live.get(item.status)
		if (!totals) continue
		reconciled.push({
			status: item.status,
			count: totals.count,
			meanScore: item.meanScore,
			minutesWatched: item.minutesWatched
		})
		live.delete(item.status)
	}
	// Statuses the snapshot has not caught up with yet: no mean score is known for them.
	for (const [status, totals] of live) {
		reconciled.push({ status, count: totals.count, minutesWatched: totals.minutesWatched })
	}

	return reconciled
}
