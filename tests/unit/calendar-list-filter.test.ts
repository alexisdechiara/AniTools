import { describe, expect, it } from "vitest"
import { filterCalendarEventsByListStatus } from "../../app/utils/calendar-events"

interface TestEvent {
	id: string
	media?: { id?: number | null } | null
}

function event(id: string, mediaId?: number | null): TestEvent {
	return { id, media: mediaId === undefined ? null : { id: mediaId } }
}

const statusByMediaId = new Map<number, string>([
	[1, "CURRENT"],
	[2, "PLANNING"],
	[3, "PAUSED"],
	[4, "COMPLETED"]
])

function ids(events: readonly TestEvent[]) {
	return events.map(item => item.id)
}

describe("filterCalendarEventsByListStatus", () => {
	it("keeps only events whose media status is in the selected set", () => {
		const events = [event("a", 1), event("b", 2), event("c", 3), event("d", 4)]

		expect(ids(filterCalendarEventsByListStatus(events, statusByMediaId, ["PAUSED"]))).toEqual(["c"])
	})

	it("returns every event when no status is selected", () => {
		const events = [event("a", 1), event("b", 99), event("c"), event("d", null)]

		expect(ids(filterCalendarEventsByListStatus(events, statusByMediaId, []))).toEqual(["a", "b", "c", "d"])
	})

	it("hides events whose media is not on the list", () => {
		const events = [event("a", 1), event("b", 99)]

		expect(ids(filterCalendarEventsByListStatus(events, statusByMediaId, ["CURRENT", "PLANNING"]))).toEqual(["a"])
	})

	it("hides events with no media id under an active filter", () => {
		const events = [event("a"), event("b", null), { id: "c" }, event("d", 2)]

		expect(ids(filterCalendarEventsByListStatus(events, statusByMediaId, ["CURRENT", "PLANNING"]))).toEqual(["d"])
	})

	it("treats Watching and Planning together as a union", () => {
		const events = [event("a", 1), event("b", 2), event("c", 3), event("d", 4)]

		expect(ids(filterCalendarEventsByListStatus(events, statusByMediaId, ["PLANNING", "CURRENT"]))).toEqual(["a", "b"])
	})

	it("does not mutate its input", () => {
		const events = [event("a", 1), event("b", 3), event("c", 2)]
		const snapshot = structuredClone(events)
		const statuses = ["CURRENT"]

		const filtered = filterCalendarEventsByListStatus(events, statusByMediaId, statuses)
		const unfiltered = filterCalendarEventsByListStatus(events, statusByMediaId, [])

		expect(events).toEqual(snapshot)
		expect(statuses).toEqual(["CURRENT"])
		expect(filtered).not.toBe(events)
		expect(unfiltered).not.toBe(events)
	})

	it("keeps the original order", () => {
		const events = [event("d", 2), event("a", 1), event("x", 3), event("c", 2), event("b", 1)]

		expect(ids(filterCalendarEventsByListStatus(events, statusByMediaId, ["CURRENT", "PLANNING"])))
			.toEqual(["d", "a", "c", "b"])
	})
})
