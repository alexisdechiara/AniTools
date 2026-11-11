import { describe, expect, it } from "vitest"
import {
	buildCalendarEvents,
	buildCalendarEventsFromResponse,
	expandCalendarResponse
} from "../../app/utils/calendar-events"
import type {
	CalendarAiringSchedule,
	CalendarApiResponse,
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

describe("deduplicated calendar response", () => {
	const airingAt = Date.parse("2026-07-29T18:00:00.000Z") / 1000
	const other: CalendarMedia = { id: 2, countryOfOrigin: "CN", duration: 20, title: { english: "Other anime" } }
	const response: CalendarApiResponse = {
		media: { 1: media, 2: other },
		airings: [
			{ airingAt, episode: 3, mediaId: 1, timeUntilAiring: 60 },
			{ airingAt: airingAt + 7 * 86_400, episode: 4, mediaId: 1 },
			{ airingAt, episode: 9, mediaId: 404 }
		],
		simuldubs: [createSimuldub({ anilist_media_id: 2, id: "dub-2", start_date: "2026-07-30T12:00:00.000Z" })],
		warnings: []
	}

	it("gives every airing its anime back and drops the ones without", () => {
		const { airingSchedules, mediaById } = expandCalendarResponse(response)

		expect(airingSchedules).toEqual([
			{ airingAt, episode: 3, timeUntilAiring: 60, media },
			{ airingAt: airingAt + 7 * 86_400, episode: 4, timeUntilAiring: undefined, media }
		])
		// One object per anime, shared by its episodes.
		expect(airingSchedules[1]?.media).toBe(airingSchedules[0]?.media)
		expect([...mediaById.keys()]).toEqual([1, 2])
	})

	it("builds the same events as the per-airing media shape did", () => {
		const { airingSchedules } = expandCalendarResponse(response)
		const legacy = buildCalendarEvents(airingSchedules, response.simuldubs, new Map([[2, other]]))
		const events = buildCalendarEventsFromResponse(response)

		expect(events).toEqual(legacy)
		expect(events.map(event => [event.media.id, event.episode, event.languages])).toEqual([
			[1, 3, ["jp"]],
			[2, 3, ["en"]],
			[1, 4, ["jp"]]
		])
	})

	it("tolerates an empty response", () => {
		expect(buildCalendarEventsFromResponse({ media: {}, airings: [], simuldubs: [] })).toEqual([])
	})
})
