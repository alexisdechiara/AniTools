import { describe, expect, it } from "vitest"
// @ts-expect-error plain ESM script without type declarations
import { findBlockingAdvisories } from "../../scripts/audit-gate.mjs"

const high = {
	severity: "high",
	url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc"
}

describe("findBlockingAdvisories", () => {
	it("returns a high advisory that is not allowlisted", () => {
		expect(findBlockingAdvisories({ pkg: [high] }, [])).toEqual([
			{ packageName: "pkg", id: "GHSA-aaaa-bbbb-cccc", severity: "high" }
		])
	})

	it("ignores an allowlisted advisory", () => {
		const allowlist = [{ id: "GHSA-aaaa-bbbb-cccc" }]
		expect(findBlockingAdvisories({ pkg: [high] }, allowlist)).toEqual([])
	})

	it("never returns moderate or low advisories", () => {
		const report = {
			pkg: [
				{ severity: "moderate", url: "https://github.com/advisories/GHSA-1111-1111-1111" },
				{ severity: "low", url: "https://github.com/advisories/GHSA-2222-2222-2222" }
			]
		}
		expect(findBlockingAdvisories(report, [])).toEqual([])
	})

	it("returns an empty list for an empty report", () => {
		expect(findBlockingAdvisories({}, [])).toEqual([])
	})
})
