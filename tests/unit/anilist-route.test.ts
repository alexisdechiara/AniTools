import { IncomingMessage, ServerResponse } from "node:http"
import { Socket } from "node:net"
import { createError, createEvent } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineAniListRoute } from "../../server/utils/anilist/route"
import { resetRateLimitBuckets } from "../../server/utils/rate-limit"

function createTestEvent(url = "/api/anilist/profile?username=Alexis") {
	const request = new IncomingMessage(new Socket())
	request.url = url
	const response = new ServerResponse(request)
	return { event: createEvent(request, response), response }
}

describe("defineAniListRoute", () => {
	afterEach(() => {
		resetRateLimitBuckets()
	})

	it("enforces the rate limit before parsing the query", async () => {
		const parse = vi.fn(() => {
			throw createError({ statusCode: 400, statusMessage: "Invalid AniList query" })
		})
		const run = vi.fn(async () => ({ ok: true }))
		const handler = defineAniListRoute({
			namespace: "test-anilist-route-limit",
			limit: 0,
			parse,
			run
		})
		const { event, response } = createTestEvent()

		await expect(handler(event)).rejects.toMatchObject({ statusCode: 429 })
		expect(parse).not.toHaveBeenCalled()
		expect(run).not.toHaveBeenCalled()
		expect(response.getHeader("retry-after")).toBeDefined()
	})

	it("sets a public cache header for public access and passes the parsed query", async () => {
		const query = { username: "Alexis" }
		const parse = vi.fn(() => query)
		const run = vi.fn(async () => ({ ok: true }))
		const handler = defineAniListRoute({
			namespace: "test-anilist-route-public",
			limit: 5,
			publicMaxAge: 300,
			parse,
			run
		})
		const { event, response } = createTestEvent()

		await expect(handler(event)).resolves.toEqual({ ok: true })
		expect(parse).toHaveBeenCalledWith({ username: "Alexis" })
		expect(run).toHaveBeenCalledWith({ mode: "public", username: "Alexis" }, query)
		expect(response.getHeader("cache-control"))
			.toBe("public, max-age=300, stale-while-revalidate=1500")
	})

	it("answers private, no-store when the operation fails", async () => {
		const failure = createError({ statusCode: 502, statusMessage: "AniList request failed" })
		const handler = defineAniListRoute({
			namespace: "test-anilist-route-error",
			limit: 5,
			publicMaxAge: 300,
			parse: () => ({ username: "Alexis" }),
			run: async () => {
				throw failure
			}
		})
		const { event, response } = createTestEvent()

		await expect(handler(event)).rejects.toBe(failure)
		expect(response.getHeader("cache-control")).toBe("private, no-store")
	})
})
