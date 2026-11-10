import { describe, expect, it } from "vitest"
import { hasMediaDetails } from "../../app/utils/media-details"

const DETAIL_FIELDS = ["description", "externalLinks", "rankings", "trailer", "studios"] as const

function completeMedia(): Record<string, unknown> {
	return {
		id: 1,
		title: { romaji: "Example", english: null, native: null, userPreferred: "Example" },
		description: "A description",
		externalLinks: [{ id: 1, site: "Official", url: "https://example.com" }],
		rankings: [],
		trailer: { id: "abc", site: "youtube", thumbnail: null },
		studios: { nodes: [] }
	}
}

describe("hasMediaDetails", () => {
	it("rejects missing media", () => {
		expect(hasMediaDetails(null)).toBe(false)
		expect(hasMediaDetails(undefined)).toBe(false)
	})

	it("rejects a reduced media object without detail fields", () => {
		expect(hasMediaDetails({ id: 1, title: { userPreferred: "Example" } })).toBe(false)
	})

	it("accepts a media object carrying every detail field", () => {
		expect(hasMediaDetails(completeMedia())).toBe(true)
	})

	it("counts null and empty values as present", () => {
		expect(hasMediaDetails({
			id: 1,
			title: { userPreferred: "Example" },
			description: null,
			externalLinks: [],
			rankings: [],
			trailer: null,
			studios: null
		})).toBe(true)
	})

	it.each(DETAIL_FIELDS)("rejects a media object missing %s", (field) => {
		const media = completeMedia()
		delete media[field]
		expect(hasMediaDetails(media)).toBe(false)
	})
})
