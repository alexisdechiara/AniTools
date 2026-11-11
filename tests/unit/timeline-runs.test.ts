import { describe, expect, it } from "vitest"
import type { AniListAnimeActivity } from "../../shared/types/anilist"
import {
	DEFAULT_RUN_MAX_GAP_SECONDS,
	mergeConsecutiveEpisodeActivities
} from "../../app/utils/timeline-runs"

const HOUR = 60 * 60
const DAY = 24 * HOUR
const MARCH_10 = Date.UTC(2026, 2, 10, 12) / 1_000

function activity(
	id: number,
	createdAt: number,
	mediaId: number | null,
	progress: string | null,
	status: string | null = "watched episode"
): AniListAnimeActivity {
	return {
		kind: "anime",
		id,
		createdAt,
		replyCount: 0,
		type: "ANIME_LIST",
		user: null,
		status,
		progress,
		media: mediaId === null
			? null
			: {
					id: mediaId,
					title: {
						english: `Anime ${mediaId}`,
						native: null,
						romaji: `Anime ${mediaId}`,
						userPreferred: `Anime ${mediaId}`
					},
					coverImage: null,
					format: "TV",
					siteUrl: null
				}
	}
}

describe("mergeConsecutiveEpisodeActivities", () => {
	it("returns nothing for no activity", () => {
		expect(mergeConsecutiveEpisodeActivities([])).toEqual([])
	})

	it("keeps a lone update as a run of one", () => {
		const [run, ...rest] = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "3")
		])

		expect(rest).toEqual([])
		expect(run!.activities.map(item => item.id)).toEqual([1])
		expect(run!.firstEpisode).toBe(3)
		expect(run!.lastEpisode).toBe(3)
		expect(run!.startedAt).toBe(MARCH_10)
		expect(run!.endedAt).toBe(MARCH_10)
		expect(run!.activity.id).toBe(1)
	})

	it("merges contiguous episodes of one anime watched in one sitting", () => {
		const [run, ...rest] = mergeConsecutiveEpisodeActivities([
			activity(3, MARCH_10 + 2 * HOUR, 7, "17"),
			activity(1, MARCH_10, 7, "15"),
			activity(2, MARCH_10 + HOUR, 7, "16")
		])

		expect(rest).toEqual([])
		expect(run!.firstEpisode).toBe(15)
		expect(run!.lastEpisode).toBe(17)
		expect(run!.activities.map(item => item.id)).toEqual([3, 2, 1])
		expect(run!.activity.id).toBe(3)
		expect(run!.startedAt).toBe(MARCH_10)
		expect(run!.endedAt).toBe(MARCH_10 + 2 * HOUR)
		expect(run!.key).toBe("run-3")
	})

	it("extends a run through an AniList range such as 15 - 18", () => {
		const [run, ...rest] = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "15 - 18"),
			activity(2, MARCH_10 + HOUR, 7, "19")
		])

		expect(rest).toEqual([])
		expect(run!.firstEpisode).toBe(15)
		expect(run!.lastEpisode).toBe(19)
	})

	it("reports the span of a single range activity", () => {
		const [run] = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "15 - 18")
		])

		expect(run!.activities).toHaveLength(1)
		expect(run!.firstEpisode).toBe(15)
		expect(run!.lastEpisode).toBe(18)
	})

	it("does not merge when an episode is skipped", () => {
		const runs = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "3"),
			activity(2, MARCH_10 + HOUR, 7, "5")
		])

		expect(runs.map(run => run.activities.map(item => item.id))).toEqual([[2], [1]])
	})

	it("does not merge a repeated or older episode", () => {
		const repeated = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "3"),
			activity(2, MARCH_10 + HOUR, 7, "3")
		])
		const older = mergeConsecutiveEpisodeActivities([
			activity(3, MARCH_10, 7, "5"),
			activity(4, MARCH_10 + HOUR, 7, "2")
		])

		expect(repeated).toHaveLength(2)
		expect(older).toHaveLength(2)
	})

	it("does not merge updates further apart than the gap", () => {
		const justInside = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "3"),
			activity(2, MARCH_10 + DEFAULT_RUN_MAX_GAP_SECONDS, 7, "4")
		])
		const justOutside = mergeConsecutiveEpisodeActivities([
			activity(3, MARCH_10, 8, "3"),
			activity(4, MARCH_10 + DEFAULT_RUN_MAX_GAP_SECONDS + 1, 8, "4")
		])

		expect(justInside).toHaveLength(1)
		expect(justOutside).toHaveLength(2)
	})

	it("measures the gap between neighbours, so a long binge stays one run", () => {
		const [run, ...rest] = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "1"),
			activity(2, MARCH_10 + 20 * HOUR, 7, "2"),
			activity(3, MARCH_10 + 40 * HOUR, 7, "3")
		])

		expect(rest).toEqual([])
		expect(run!.lastEpisode).toBe(3)
	})

	it("honours a custom gap", () => {
		const runs = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "1"),
			activity(2, MARCH_10 + 3 * HOUR, 7, "2")
		], { maxGapSeconds: 2 * HOUR })

		expect(runs).toHaveLength(2)
	})

	it("never merges across a UTC month boundary", () => {
		const lastMinuteOfMarch = Date.UTC(2026, 2, 31, 23, 59) / 1_000
		const firstMinuteOfApril = Date.UTC(2026, 3, 1, 0, 1) / 1_000
		const runs = mergeConsecutiveEpisodeActivities([
			activity(1, lastMinuteOfMarch, 7, "11"),
			activity(2, firstMinuteOfApril, 7, "12")
		])

		expect(runs.map(run => run.activities.map(item => item.id))).toEqual([[2], [1]])
	})

	it("keeps a rewatch apart from the first watch", () => {
		const runs = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "12", "watched episode"),
			activity(2, MARCH_10 + HOUR, 7, "13", "rewatched episode"),
			activity(3, MARCH_10 + 2 * HOUR, 7, "14", "rewatched episode")
		])

		expect(runs.map(run => run.activities.map(item => item.id))).toEqual([[3, 2], [1]])
		expect(runs[0]!.firstEpisode).toBe(13)
		expect(runs[0]!.lastEpisode).toBe(14)
	})

	it("matches the episode verb regardless of case and spacing", () => {
		const [run, ...rest] = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "1", "Watched episode"),
			activity(2, MARCH_10 + HOUR, 7, "2", " watched episode ")
		])

		expect(rest).toEqual([])
		expect(run!.activities).toHaveLength(2)
	})

	it("lets other anime interleave without breaking a run", () => {
		const runs = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "1"),
			activity(2, MARCH_10 + HOUR, 8, "9"),
			activity(3, MARCH_10 + 2 * HOUR, 7, "2"),
			activity(4, MARCH_10 + 3 * HOUR, 8, "10")
		])

		expect(runs.map(run => run.activities.map(item => item.id))).toEqual([[4, 2], [3, 1]])
	})

	it("closes a run when another update of the same anime comes between", () => {
		const runs = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "11"),
			activity(2, MARCH_10 + HOUR, 7, null, "paused watching"),
			activity(3, MARCH_10 + 2 * HOUR, 7, "12")
		])

		expect(runs.map(run => run.activities.map(item => item.id))).toEqual([[3], [2], [1]])
	})

	it("leaves non-episode and unreadable updates as runs of one", () => {
		const runs = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, null, "completed"),
			activity(2, MARCH_10 + HOUR, 7, null, null),
			activity(3, MARCH_10 + 2 * HOUR, 7, "ep 3"),
			activity(4, MARCH_10 + 3 * HOUR, 7, "18 - 15"),
			activity(5, MARCH_10 + 4 * HOUR, 7, "4", "plans to watch")
		])

		expect(runs).toHaveLength(5)
		expect(runs.every(run => run.activities.length === 1)).toBe(true)
		expect(runs.every(run => run.firstEpisode === null && run.lastEpisode === null)).toBe(true)
	})

	it("never merges activities that have no media", () => {
		const runs = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, null, "1"),
			activity(2, MARCH_10 + HOUR, null, "2")
		])

		expect(runs).toHaveLength(2)
	})

	it("ignores duplicated activity ids", () => {
		const runs = mergeConsecutiveEpisodeActivities([
			activity(1, MARCH_10, 7, "1"),
			activity(1, MARCH_10, 7, "1"),
			activity(2, MARCH_10 + HOUR, 7, "2")
		])

		expect(runs).toHaveLength(1)
		expect(runs[0]!.activities.map(item => item.id)).toEqual([2, 1])
	})

	it("sorts runs newest first and breaks ties by activity id", () => {
		const runs = mergeConsecutiveEpisodeActivities([
			activity(10, MARCH_10, 7, "1"),
			activity(11, MARCH_10, 8, "1"),
			activity(12, MARCH_10 - DAY * 2, 9, "1")
		])

		expect(runs.map(run => run.activity.id)).toEqual([11, 10, 12])
	})

	it("does not depend on the input order or mutate the input", () => {
		const input = [
			activity(3, MARCH_10 + 2 * HOUR, 7, "3"),
			activity(1, MARCH_10, 7, "1"),
			activity(2, MARCH_10 + HOUR, 7, "2")
		]
		const snapshot = [...input]

		const forward = mergeConsecutiveEpisodeActivities(input)
		const reversed = mergeConsecutiveEpisodeActivities(input.toReversed())

		expect(input).toEqual(snapshot)
		expect(forward).toEqual(reversed)
	})
})
