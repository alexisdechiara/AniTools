import { describe, expect, it } from "vitest"
import { getApiErrorMessage } from "../../app/utils/api-error"

const fallback = "Unable to load the AniList anime list."

function fetchError(statusCode: number, statusMessage?: string) {
	return Object.assign(new Error(`[GET] "/api/anilist/anime-list?username=someone&page=9": ${statusCode}`), {
		statusCode,
		statusMessage,
		data: statusMessage ? { statusMessage } : null
	})
}

describe("API error messages", () => {
	it("never exposes the request URL from ofetch", () => {
		const message = getApiErrorMessage(fetchError(400, "Invalid AniList query"), fallback)

		expect(message).toBe("Invalid AniList query.")
		expect(message).not.toContain("/api/")
	})

	it("turns quota and upstream failures into instructions", () => {
		expect(getApiErrorMessage(fetchError(429, "AniList request budget reached"), fallback))
			.toBe("AniList is limiting requests right now. Wait a minute, then try again.")
		expect(getApiErrorMessage(fetchError(502, "Unable to reach AniList"), fallback))
			.toBe("AniList didn't answer. Wait a few seconds, then try again.")
	})

	it("reports a lost connection", () => {
		expect(getApiErrorMessage(new TypeError("Failed to fetch"), fallback))
			.toBe("Unable to reach AniTools. Check your connection, then try again.")
	})

	it("falls back when there is nothing readable", () => {
		expect(getApiErrorMessage(fetchError(400), fallback)).toBe(fallback)
		expect(getApiErrorMessage("boom", fallback)).toBe(fallback)
	})
})
