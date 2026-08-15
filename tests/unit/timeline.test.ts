import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import type { AniListActivity } from "../../shared/types/anilist"
import {
	buildTimelineGanttChartData,
	buildTimelineGanttRows,
	getActivityText,
	getTimelineAxisTicks,
	getTimelineGroupLabel,
	getTimelineMonthSegments,
	getTimelinePosition,
	getTimelineWindow,
	groupTimelineAnimeActivitiesByMonth,
	groupTimelineActivities,
	TIMELINE_GANTT_STACKING
} from "../../app/utils/timeline"

function animeActivity(id: number, createdAt: number): AniListActivity {
	return {
		kind: "anime",
		id,
		createdAt,
		replyCount: 0,
		type: "ANIME_LIST",
		user: null,
		status: "watched episode",
		progress: "1",
		media: null
	}
}

function animeActivityWithMedia(
	id: number,
	createdAt: number,
	mediaId: number,
	title: string,
	format = "TV"
): AniListActivity {
	return {
		...animeActivity(id, createdAt),
		media: {
			id: mediaId,
			title: {
				romaji: title,
				english: title,
				native: title,
				userPreferred: title
			},
			coverImage: {
				color: "#7c3aed",
				large: "https://example.com/large.jpg",
				medium: "https://example.com/medium.jpg"
			},
			format,
			siteUrl: `https://anilist.co/anime/${mediaId}`
		}
	}
}

describe("Timeline date calculations", () => {
	it("creates bounded eight-week and six-month windows", () => {
		const now = new Date("2026-07-29T12:00:00.000Z")

		expect(getTimelineWindow("weeks", now)).toEqual({
			from: Date.UTC(2026, 5, 8) / 1_000,
			to: Date.UTC(2026, 6, 29, 12) / 1_000 + 1
		})
		expect(getTimelineWindow("months", now)).toEqual({
			from: Date.UTC(2026, 1, 1) / 1_000,
			to: Date.UTC(2026, 6, 29, 12) / 1_000 + 1
		})
	})

	it("de-duplicates, sorts and groups activity into UTC calendar weeks", () => {
		const monday = Date.UTC(2026, 6, 27, 8) / 1_000
		const previousWeek = Date.UTC(2026, 6, 20, 9) / 1_000
		const groups = groupTimelineActivities([
			animeActivity(1, monday),
			animeActivity(2, previousWeek),
			animeActivity(1, monday + 60)
		], "weeks")

		expect(groups).toHaveLength(2)
		expect(groups[0]?.activities.map(activity => activity.id)).toEqual([1])
		expect(groups[1]?.activities.map(activity => activity.id)).toEqual([2])
		expect(getTimelineGroupLabel(groups[0]!, "weeks", "en")).toContain("Jul")
	})

	it("groups anime updates by month with deterministic summary stats", () => {
		const julyFirst = Date.UTC(2026, 6, 7, 8) / 1_000
		const julySecond = Date.UTC(2026, 6, 8, 9) / 1_000
		const june = Date.UTC(2026, 5, 30, 20) / 1_000
		const groups = groupTimelineAnimeActivitiesByMonth([
			animeActivityWithMedia(1, julyFirst, 100, "Frieren"),
			animeActivityWithMedia(2, julyFirst + 60, 100, "Frieren"),
			animeActivityWithMedia(3, julySecond, 200, "Dungeon Meshi"),
			animeActivityWithMedia(4, june, 300, "Apothecary Diaries")
		], "en")

		expect(groups.map(group => group.key)).toEqual([
			"month-2026-07",
			"month-2026-06"
		])
		expect(groups[0]).toMatchObject({
			month: "July",
			year: "2026",
			stats: {
				updates: 3,
				titles: 2,
				activeDays: 2
			}
		})
		expect(groups[0]?.activities.map(activity => activity.id)).toEqual([3, 2, 1])
	})

	it("builds deterministic Gantt rows grouped by anime", () => {
		const firstUpdate = Date.UTC(2026, 6, 20, 9) / 1_000
		const latestUpdate = Date.UTC(2026, 6, 27, 9) / 1_000
		const rows = buildTimelineGanttRows([
			animeActivityWithMedia(1, firstUpdate, 100, "Frieren"),
			animeActivityWithMedia(2, latestUpdate, 100, "Frieren"),
			animeActivityWithMedia(3, firstUpdate + 60, 200, "Dungeon Meshi"),
			animeActivityWithMedia(2, latestUpdate, 100, "Frieren")
		])

		expect(rows).toHaveLength(2)
		expect(rows[0]).toMatchObject({
			key: "anime-100",
			section: "series",
			label: "Frieren",
			startedAt: firstUpdate,
			endedAt: latestUpdate
		})
		expect(rows[0]?.activities.map(activity => activity.id)).toEqual([1, 2])
		expect(rows[0]?.description).toContain("2 updates")
		expect(rows[0]?.cover).toBe("https://example.com/large.jpg")
	})

	it("places several anime in one group and keeps stacking uncapped", () => {
		const timestamp = Date.UTC(2026, 6, 27, 9) / 1_000
		const data = buildTimelineGanttChartData([
			animeActivityWithMedia(1, timestamp, 100, "Frieren"),
			animeActivityWithMedia(2, timestamp, 200, "Dungeon Meshi"),
			animeActivityWithMedia(3, timestamp + 60, 300, "Apothecary Diaries")
		])

		expect(data.groups).toMatchObject([{
			id: "activity-series",
			kind: "anime",
			section: "series",
			count: 3
		}])
		expect(data.items).toHaveLength(3)
		expect(new Set(data.items.map(item => item.group))).toEqual(new Set(["activity-series"]))
		expect(data.items.every(item => item.type === "point")).toBe(true)
		expect(TIMELINE_GANTT_STACKING).toMatchObject({
			enabled: true,
			strategy: "dataset",
			collisionWidth: 196,
			maxLanes: Number.POSITIVE_INFINITY
		})
	})

	it("puts movies first and overlaps movies from the same day in one stack", () => {
		const morning = Date.UTC(2026, 6, 27, 9) / 1_000
		const evening = Date.UTC(2026, 6, 27, 19) / 1_000
		const data = buildTimelineGanttChartData([
			animeActivityWithMedia(1, morning, 100, "Movie A", "MOVIE"),
			animeActivityWithMedia(2, evening, 200, "Movie B", "MOVIE"),
			animeActivityWithMedia(3, evening, 300, "Series A")
		])

		expect(data.groups.map(group => group.id)).toEqual([
			"activity-movies",
			"activity-series"
		])
		const movieItem = data.items.find(item => item.variant === "movie-stack")
		expect(movieItem?.rows.map(row => row.label)).toEqual(["Movie B", "Movie A"])
	})

	it("keeps the newest activity on the left while older history extends right", () => {
		const olderUpdate = Date.UTC(2026, 6, 20, 9) / 1_000
		const newestUpdate = Date.UTC(2026, 6, 27, 9) / 1_000
		const data = buildTimelineGanttChartData([
			animeActivityWithMedia(1, olderUpdate, 100, "Frieren"),
			animeActivityWithMedia(2, newestUpdate, 100, "Frieren")
		])
		const item = data.items[0]

		expect(item?.start).toBe(-newestUpdate * 1_000)
		expect(item?.end).toBe(-olderUpdate * 1_000)
	})

	it("positions calendar ticks and month bands inside the Gantt window", () => {
		const window = {
			from: Date.UTC(2026, 6, 20) / 1_000,
			to: Date.UTC(2026, 7, 17) / 1_000
		}
		const ticks = getTimelineAxisTicks(window, "en")
		const months = getTimelineMonthSegments(window, "en")

		expect(getTimelinePosition(window.from, window)).toBe(0)
		expect(getTimelinePosition(window.to, window)).toBe(100)
		expect(ticks.map(tick => tick.label)).toEqual([
			"Jul 20",
			"Jul 27",
			"Aug 3",
			"Aug 10",
			"Aug 17"
		])
		expect(months.map(month => month.label)).toEqual(["July 2026", "August 2026"])
		expect(months.reduce((total, month) => total + month.width, 0)).toBeCloseTo(100)
	})

	it("keeps AniList text as plain data and the component never uses v-html", () => {
		const activity: AniListActivity = {
			kind: "text",
			id: 1,
			createdAt: 1_800_000_000,
			replyCount: 0,
			type: "TEXT",
			user: null,
			text: "<img src=x onerror=alert(1)>"
		}
		const componentPath = fileURLToPath(new URL(
			"../../app/components/timeline/ActivityCard.vue",
			import.meta.url
		))
		const source = readFileSync(componentPath, "utf8")

		expect(getActivityText(activity)).toBe(activity.text)
		expect(source).not.toContain("v-html")
		expect(source).toContain("{{ text }}")
	})
})
