import { describe, expect, it } from "vitest"
import {
	formatDayEpisodeCount,
	getCalendarDayKey,
	getMonthCellLabel,
	summariseCalendarDays,
	type CalendarMonthEvent
} from "../../app/utils/calendar-month"

function event(
	mediaId: number,
	day: number,
	hour: number,
	overrides: Partial<CalendarMonthEvent> = {}
): CalendarMonthEvent {
	return {
		// Local time on purpose: the month grid is laid out in the browser's zone.
		start: new Date(2026, 10, day, hour),
		title: `Anime ${mediaId}`,
		media: { id: mediaId, coverImage: { color: `#00000${mediaId}` } },
		...overrides
	}
}

describe("getCalendarDayKey", () => {
	it("pads the local day so keys sort and compare as text", () => {
		expect(getCalendarDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05")
		expect(getCalendarDayKey(new Date(2026, 10, 12))).toBe("2026-11-12")
	})
})

describe("summariseCalendarDays", () => {
	it("counts the episodes of each local day and leaves empty days out", () => {
		const days = summariseCalendarDays([
			event(1, 12, 9),
			event(2, 12, 23),
			event(1, 13, 0)
		])

		expect([...days.keys()]).toEqual(["2026-11-12", "2026-11-13"])
		expect(days.get("2026-11-12")?.episodes).toBe(2)
		expect(days.get("2026-11-13")?.episodes).toBe(1)
		expect(days.get("2026-11-14")).toBeUndefined()
	})

	it("keeps three distinct anime and reports the others as a remainder", () => {
		const days = summariseCalendarDays([
			event(1, 12, 8),
			event(1, 12, 9),
			event(2, 12, 10),
			event(3, 12, 11),
			event(4, 12, 12),
			event(5, 12, 13)
		])
		const day = days.get("2026-11-12")!

		expect(day.episodes).toBe(6)
		expect(day.titles.map(title => title.mediaId)).toEqual([1, 2, 3])
		expect(day.titles[0]).toEqual({ mediaId: 1, title: "Anime 1", color: "#000001", onList: false })
		expect(day.moreTitles).toBe(2)
	})

	it("honours a custom number of titles", () => {
		const day = summariseCalendarDays(
			[event(1, 12, 8), event(2, 12, 9)],
			{ maxTitles: 1 }
		).get("2026-11-12")!

		expect(day.titles).toHaveLength(1)
		expect(day.moreTitles).toBe(1)
	})

	it("puts the anime of the visitor's list first and counts their episodes", () => {
		const day = summariseCalendarDays(
			[event(1, 12, 8), event(2, 12, 9), event(3, 12, 10), event(4, 12, 11), event(4, 12, 12)],
			{ onListMediaIds: new Set([4, 2]) }
		).get("2026-11-12")!

		expect(day.onListEpisodes).toBe(3)
		expect(day.titles.map(title => [title.mediaId, title.onList])).toEqual([
			[2, true],
			[4, true],
			[1, false]
		])
		expect(day.moreTitles).toBe(1)
	})

	it("marks nothing when the list is not loaded", () => {
		const day = summariseCalendarDays([event(1, 12, 8)]).get("2026-11-12")!

		expect(day.onListEpisodes).toBe(0)
		expect(day.titles[0]?.onList).toBe(false)
	})

	it("ignores cancelled and undated events, and counts an event without media", () => {
		const days = summariseCalendarDays([
			event(1, 12, 8, { status: "cancelled" }),
			event(2, 12, 9, { start: new Date(Number.NaN) }),
			event(3, 12, 10, { media: null }),
			event(4, 12, 11, { media: { id: 4, coverImage: null } })
		])
		const day = days.get("2026-11-12")!

		expect(days.size).toBe(1)
		expect(day.episodes).toBe(2)
		expect(day.titles).toEqual([{ mediaId: 4, title: "Anime 4", color: null, onList: false }])
	})
})

describe("month cell wording", () => {
	const summary = summariseCalendarDays(
		Array.from({ length: 14 }, (_, index) => event(index + 1, 12, 8)),
		{ onListMediaIds: new Set([3, 9]) }
	).get("2026-11-12")

	it("spells the episode count", () => {
		expect(formatDayEpisodeCount(summary)).toBe("14 episodes")
		expect(formatDayEpisodeCount(summariseCalendarDays([event(1, 12, 8)]).get("2026-11-12")))
			.toBe("1 episode")
		expect(formatDayEpisodeCount(undefined)).toBe("No episodes")
	})

	it("names the cell after the week it opens, its count and the list", () => {
		expect(getMonthCellLabel("November 12", summary))
			.toBe("Open week of November 12, 14 episodes, 2 on your list")
		expect(getMonthCellLabel("November 12", summariseCalendarDays([event(1, 12, 8)]).get("2026-11-12")))
			.toBe("Open week of November 12, 1 episode")
		expect(getMonthCellLabel("November 13", undefined))
			.toBe("Open week of November 13, no episodes")
		expect(getMonthCellLabel("November 11", undefined, { today: true }))
			.toBe("Open week of November 11 (today), no episodes")
	})
})
