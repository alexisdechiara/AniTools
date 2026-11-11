import { describe, expect, it } from "vitest"
import { getSafeInternalPath } from "../../app/utils/navigation"

describe("getSafeInternalPath", () => {
	it("keeps local paths and their query strings", () => {
		expect(getSafeInternalPath("/calendar?view=week")).toBe("/calendar?view=week")
		expect(getSafeInternalPath(["/tierlist", "/calendar"])).toBe("/tierlist")
		expect(getSafeInternalPath("/settings/../calendar?view=week")).toBe("/calendar?view=week")
		expect(getSafeInternalPath("/authors")).toBe("/authors")
		expect(getSafeInternalPath("/login-help")).toBe("/login-help")
	})

	it.each([
		"https://example.com",
		"//example.com/path",
		"/a/..//example.com/path",
		"/.//example.com/path",
		"/%2e//example.com/path",
		"/\\example.com",
		"/calendar\nSet-Cookie: bad",
		"/auth/anilist",
		"/auth/anilist?returnTo=/",
		"/login",
		"/login?redirect=/calendar",
		null
	])("rejects unsafe redirect targets", (target) => {
		expect(getSafeInternalPath(target, "/calendar")).toBe("/calendar")
	})
})
