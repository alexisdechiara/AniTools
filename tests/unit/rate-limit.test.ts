import { beforeEach, describe, expect, it } from "vitest"
import {
	checkRateLimit,
	resetRateLimitBuckets
} from "../../server/utils/rate-limit"

const options = {
	namespace: "test",
	limit: 2,
	windowMs: 1_000
}

describe("checkRateLimit", () => {
	beforeEach(() => {
		resetRateLimitBuckets()
	})

	it("blocks requests above the configured limit", () => {
		expect(checkRateLimit("client", options, 1_000)).toMatchObject({
			allowed: true,
			remaining: 1
		})
		expect(checkRateLimit("client", options, 1_100)).toMatchObject({
			allowed: true,
			remaining: 0
		})
		expect(checkRateLimit("client", options, 1_200)).toMatchObject({
			allowed: false,
			remaining: 0
		})
	})

	it("starts a fresh bucket after the window", () => {
		checkRateLimit("client", options, 1_000)
		checkRateLimit("client", options, 1_100)

		expect(checkRateLimit("client", options, 2_001)).toMatchObject({
			allowed: true,
			remaining: 1
		})
	})

	it("isolates namespaces and clients", () => {
		checkRateLimit("client-a", options, 1_000)
		checkRateLimit("client-a", options, 1_000)

		expect(checkRateLimit("client-b", options, 1_000).allowed).toBe(true)
		expect(checkRateLimit("client-a", { ...options, namespace: "other" }, 1_000).allowed).toBe(true)
	})
})
