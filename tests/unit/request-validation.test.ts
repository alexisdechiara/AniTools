import { describe, expect, it } from "vitest"
import {
	parseCalendarQuery,
	parseSearchQuery
} from "../../server/utils/request-validation"

const day = 24 * 60 * 60

describe("parseCalendarQuery", () => {
	it("normalizes a valid query", () => {
		const result = parseCalendarQuery({
			airingAtGreater: "1785283200",
			airingAtLesser: String(1785283200 + (7 * day)),
			rangeStart: "2026-07-29T00:00:00.000Z",
			rangeEnd: "2026-08-05T00:00:00.000Z"
		})

		expect(result.airingAtGreater).toBe(1785283200)
		expect(result.airingAtLesser).toBe(1785283200 + (7 * day))
	})

	it.each([
		{
			airingAtGreater: "100",
			airingAtLesser: "99",
			rangeStart: "2026-07-29T00:00:00.000Z",
			rangeEnd: "2026-08-05T00:00:00.000Z"
		},
		{
			airingAtGreater: "100",
			airingAtLesser: String(100 + (43 * day)),
			rangeStart: "2026-01-01T00:00:00.000Z",
			rangeEnd: "2026-02-13T00:00:00.000Z"
		},
		{
			airingAtGreater: "100",
			airingAtLesser: String(100 + day),
			rangeStart: "not-a-date",
			rangeEnd: "2026-08-05T00:00:00.000Z"
		},
		{
			airingAtGreater: "1785283200",
			airingAtLesser: String(1785283200 + (7 * day)),
			rangeStart: "2026-07-30T00:00:00.000Z",
			rangeEnd: "2026-08-06T00:00:00.000Z"
		},
		{
			airingAtGreater: String(2_147_483_648),
			airingAtLesser: String(2_147_483_648 + day),
			rangeStart: "2038-01-19T03:14:08.000Z",
			rangeEnd: "2038-01-20T03:14:08.000Z"
		}
	])("rejects invalid and excessive ranges", (query) => {
		expect(() => parseCalendarQuery(query)).toThrow()
	})
})

describe("parseSearchQuery", () => {
	it("trims a search query", () => {
		expect(parseSearchQuery({ q: "  Frieren  " })).toEqual({ q: "Frieren" })
	})

	it("uses an empty search by default", () => {
		expect(parseSearchQuery({})).toEqual({ q: "" })
	})

	it("rejects unbounded input", () => {
		expect(() => parseSearchQuery({ q: "a".repeat(101) })).toThrow()
	})
})
