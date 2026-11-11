import { describe, expect, it } from "vitest"
import { sanitizeReturnTo } from "../../server/utils/anilist-auth"

describe("sanitizeReturnTo", () => {
	it.each([
		["/", "/"],
		["/calendar", "/calendar"],
		["/tierlist?mode=franchise#editor", "/tierlist?mode=franchise#editor"],
		["/settings/../calendar?view=week", "/calendar?view=week"],
		["/./calendar", "/calendar"],
		["/statistics/genres?sort=count#top", "/statistics/genres?sort=count#top"],
		["/authors", "/authors"],
		["/login-help", "/login-help"]
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
		"/a/..//example.com/path",
		"/.//example.com/path",
		"/%2e//example.com/path",
		"/\\example.com/path",
		"/auth/anilist",
		"/auth/anilist?returnTo=/",
		"/login",
		"/login?redirect=/calendar",
		`/${"a".repeat(2048)}`
	])("rejects the unsafe destination %s", (value) => {
		expect(sanitizeReturnTo(value)).toBe("/")
	})
})
