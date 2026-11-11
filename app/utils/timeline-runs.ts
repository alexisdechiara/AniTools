import type { AniListAnimeActivity } from "~~/shared/types/anilist"

/** Two updates further apart than this are separate sittings, not one binge. */
export const DEFAULT_RUN_MAX_GAP_SECONDS = 24 * 60 * 60

export interface TimelineEpisodeRun {
	/** Stable for a given newest activity: safe as a v-for key. */
	key: string
	/** The newest activity of the run: the one the feed would have shown on its own. */
	activity: AniListAnimeActivity
	/** Every activity of the run, newest first. A single update gives one item. */
	activities: AniListAnimeActivity[]
	/** First and last episode covered, or null when the progress is not an episode number. */
	firstEpisode: number | null
	lastEpisode: number | null
	/** `createdAt` of the oldest and of the newest activity, in seconds. */
	startedAt: number
	endedAt: number
}

export interface MergeEpisodeRunsOptions {
	maxGapSeconds?: number
}

interface ParsedEpisodes {
	first: number
	last: number
}

interface OpenRun {
	activities: AniListAnimeActivity[]
	status: string | null
	firstEpisode: number | null
	lastEpisode: number | null
}

function startOfUtcMonth(timestamp: number): number {
	const date = new Date(timestamp * 1_000)
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
}

/** "watched episode" and "rewatched episode" are different verbs and never merge. */
function getEpisodeStatus(activity: AniListAnimeActivity): string | null {
	const status = activity.status?.trim().toLocaleLowerCase("en") ?? ""
	return status.includes("episode") ? status : null
}

/** Understands "15" and the "15 - 18" ranges AniList writes itself. */
function parseEpisodes(progress: string | null): ParsedEpisodes | null {
	const match = progress?.match(/^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/)
	if (!match) return null

	const first = Number(match[1])
	const last = match[2] === undefined ? first : Number(match[2])
	if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || last < first) return null

	return { first, last }
}

function toRun(run: OpenRun): TimelineEpisodeRun {
	const activities = run.activities.toReversed()
	const newest = activities[0]!
	const oldest = activities.at(-1)!

	return {
		key: `run-${newest.id}`,
		activity: newest,
		activities,
		firstEpisode: run.firstEpisode,
		lastEpisode: run.lastEpisode,
		startedAt: oldest.createdAt,
		endedAt: newest.createdAt
	}
}

/**
 * Folds the episode updates of one anime that follow each other into a single run
 * ("episode 15 to 18"), and leaves every other activity as a run of one.
 *
 * Two updates of the same anime join a run only when all of these hold:
 * - nothing else about that anime happened between them (a "completed", "paused" or
 *   unreadable update closes the run);
 * - they use the same verb, so a rewatch never merges into a first watch;
 * - the second starts at the episode after the first one ended (no gap, no repeat);
 * - they are at most `maxGapSeconds` apart (one day by default);
 * - they fall in the same UTC month, which is how the timeline groups its months.
 *
 * Updates of other anime in between do not break a run. The result is sorted newest
 * first, like the timeline feed.
 */
export function mergeConsecutiveEpisodeActivities(
	activities: readonly AniListAnimeActivity[],
	options: MergeEpisodeRunsOptions = {}
): TimelineEpisodeRun[] {
	const maxGapSeconds = options.maxGapSeconds ?? DEFAULT_RUN_MAX_GAP_SECONDS
	const unique = new Map<number, AniListAnimeActivity>()
	for (const activity of activities) unique.set(activity.id, activity)

	const chronological = [...unique.values()].toSorted((left, right) =>
		left.createdAt - right.createdAt || left.id - right.id
	)
	const runs: OpenRun[] = []
	const openByMedia = new Map<number, OpenRun>()

	for (const activity of chronological) {
		const mediaId = activity.media?.id
		const status = getEpisodeStatus(activity)
		const episodes = status === null ? null : parseEpisodes(activity.progress)

		if (mediaId === undefined) {
			runs.push({ activities: [activity], status, firstEpisode: null, lastEpisode: null })
			continue
		}

		if (episodes === null) {
			openByMedia.delete(mediaId)
			runs.push({ activities: [activity], status, firstEpisode: null, lastEpisode: null })
			continue
		}

		const open = openByMedia.get(mediaId)
		const previous = open?.activities.at(-1)
		if (
			open
			&& previous
			&& open.status === status
			&& open.lastEpisode !== null
			&& episodes.first === open.lastEpisode + 1
			&& activity.createdAt - previous.createdAt <= maxGapSeconds
			&& startOfUtcMonth(activity.createdAt) === startOfUtcMonth(previous.createdAt)
		) {
			open.activities.push(activity)
			open.lastEpisode = episodes.last
			continue
		}

		const run: OpenRun = {
			activities: [activity],
			status,
			firstEpisode: episodes.first,
			lastEpisode: episodes.last
		}
		runs.push(run)
		openByMedia.set(mediaId, run)
	}

	return runs
		.map(toRun)
		.toSorted((left, right) =>
			right.endedAt - left.endedAt || right.activity.id - left.activity.id
		)
}
