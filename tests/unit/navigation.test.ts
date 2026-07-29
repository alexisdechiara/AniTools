import { describe, expect, it } from "vitest"
import { getSafeInternalPath } from "../../app/utils/navigation"

describe("getSafeInternalPath", () => {
	it("keeps local paths and their query strings", () => {
		expect(getSafeInternalPath("/calendar?view=week")).toBe("/calendar?view=week")
		expect(getSafeInternalPath(["/tierlist", "/calendar"])).toBe("/tierlist")
	})

	it.each([
		"https://example.com",
		"//example.com/path",
		"/\\example.com",
		"/calendar\nSet-Cookie: bad",
		null
	])("rejects unsafe redirect targets", (target) => {
		expect(getSafeInternalPath(target, "/calendar")).toBe("/calendar")
	})
})
