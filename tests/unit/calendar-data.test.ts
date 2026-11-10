import { describe, expect, it } from "vitest"
import {
	InvalidCalendarUpstreamResponse,
	isRetryableAniListError,
	parseSimuldubItems
} from "../../server/utils/calendar-data"

const validRecord = {
	anilist_media_id: "123",
	end_date: "2026-07-29T18:24:00.000Z",
	episode: "3",
	id: "simuldub-1",
	languages: ["English"],
	start_date: "2026-07-29T18:00:00.000Z",
	status: "published",
	streaming: ["Crunchyroll"],
	title: "Example anime"
}

describe("parseSimuldubItems", () => {
	it("normalizes valid Directus records", () => {
		expect(parseSimuldubItems([validRecord])).toEqual([{
			...validRecord,
			episode: 3
		}])
	})

	it("drops malformed records when usable records remain", () => {
		expect(parseSimuldubItems([
			validRecord,
			{ ...validRecord, id: "bad", start_date: "not-a-date" }
		])).toHaveLength(1)
	})

	it("rejects wholly invalid or oversized responses", () => {
		expect(() => parseSimuldubItems([{ status: "draft" }]))
			.toThrow(InvalidCalendarUpstreamResponse)
		expect(() => parseSimuldubItems(Array.from({ length: 501 })))
			.toThrow(InvalidCalendarUpstreamResponse)
	})

	it("rejects an end date that precedes the start date", () => {
		expect(() => parseSimuldubItems([{
			...validRecord,
			end_date: "2026-07-29T17:00:00.000Z"
		}])).toThrow(InvalidCalendarUpstreamResponse)
	})
})

describe("isRetryableAniListError", () => {
	it.each([
		"ANILIST_TIMEOUT",
		"ANILIST_UNAVAILABLE",
		"ANILIST_UPSTREAM_ERROR"
	])("retries a transient upstream failure (%s)", (code) => {
		expect(isRetryableAniListError({ data: { code } })).toBe(true)
	})

	it.each([
		{ data: { code: "ANILIST_INVALID_DATA" } },
		{ data: { code: "ANILIST_RATE_LIMITED" } },
		new Error("boom"),
		null,
		"ANILIST_TIMEOUT"
	])("does not retry %o", (error) => {
		expect(isRetryableAniListError(error)).toBe(false)
	})
})
