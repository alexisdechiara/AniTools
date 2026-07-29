import { describe, expect, it } from "vitest"
import { buildCalendarEvents } from "../../app/utils/calendar-events"
import type {
	CalendarAiringSchedule,
	CalendarMedia,
	CalendarSimuldubItem
} from "../../app/types/calendar"

const media: CalendarMedia = {
	id: 1,
	countryOfOrigin: "JP",
	duration: 24,
	format: "TV",
	title: {
		english: "Example anime"
	}
}

function createSimuldub(
	overrides: Partial<CalendarSimuldubItem> = {}
): CalendarSimuldubItem {
	return {
		anilist_media_id: 1,
		episode: 3,
		id: "dub-1",
		languages: ["English"],
		start_date: "2026-07-29T18:00:00.000Z",
		status: "published",
		streaming: ["Crunchyroll"],
		...overrides
	}
}

describe("buildCalendarEvents", () => {
	it("merges an exact simuldub into an airing event without mutating input", () => {
		const airingAt = Date.parse("2026-07-29T18:00:00.000Z") / 1000
		const schedules: CalendarAiringSchedule[] = [{
			airingAt,
			episode: 3,
			media
		}]
		const simuldubs = [createSimuldub()]

		const events = buildCalendarEvents(schedules, simuldubs)

		expect(events).toHaveLength(1)
		expect(events[0]).toMatchObject({
			episode: 3,
			languages: ["jp", "en"],
			streaming: ["Crunchyroll"]
		})
		expect(simuldubs[0]?.languages).toEqual(["English"])
	})

	it("creates a separate event when the simuldub airs at another time", () => {
		const schedules: CalendarAiringSchedule[] = [{
			airingAt: Date.parse("2026-07-29T18:00:00.000Z") / 1000,
			episode: 3,
			media
		}]

		const events = buildCalendarEvents(schedules, [
			createSimuldub({
				id: "dub-later",
				start_date: "2026-07-30T12:00:00.000Z"
			})
		])

		expect(events).toHaveLength(2)
		expect(events[1]).toMatchObject({
			languages: ["en"],
			status: "published",
			title: "Example anime"
		})
		expect(events[1]?.end.getTime() - events[1]!.start.getTime()).toBe(24 * 60 * 1000)
	})

	it("uses fetched media for a simuldub without an airing schedule", () => {
		const events = buildCalendarEvents(
			[],
			[createSimuldub()],
			new Map([[media.id, media]])
		)

		expect(events).toHaveLength(1)
		expect(events[0]?.media.id).toBe(media.id)
	})

	it("skips malformed schedules and orphan simuldubs", () => {
		const events = buildCalendarEvents(
			[
				{ airingAt: Number.NaN, episode: 1, media },
				{ airingAt: 1_785_283_200, episode: 0, media }
			],
			[
				createSimuldub({ anilist_media_id: null }),
				createSimuldub({ start_date: "not-a-date" })
			]
		)

		expect(events).toEqual([])
	})
})
