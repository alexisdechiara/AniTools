import { describe, expect, it } from "vitest"
import { sanitizeReturnTo } from "../../server/utils/anilist-auth"

describe("sanitizeReturnTo", () => {
	it.each([
		["/", "/"],
		["/calendar", "/calendar"],
		["/tierlist?mode=franchise#editor", "/tierlist?mode=franchise#editor"],
		["/settings/../calendar?view=week", "/calendar?view=week"]
	])("keeps the safe local destination %s", (value, expected) => {
		expect(sanitizeReturnTo(value)).toBe(expected)
	})

	it.each([
		undefined,
		null,
		42,
		"",
		"calendar",
		"https://example.com",
		"//example.com/path",
		"/\\example.com/path"
	])("rejects the unsafe destination %s", (value) => {
		expect(sanitizeReturnTo(value)).toBe("/")
	})
})
