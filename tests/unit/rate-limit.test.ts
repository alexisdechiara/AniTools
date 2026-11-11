import { beforeEach, describe, expect, it } from "vitest"
import {
	checkRateLimit,
	checkUpstreamBudget,
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

describe("checkUpstreamBudget", () => {
	beforeEach(() => {
		resetRateLimitBuckets()
	})

	it("is not evicted by a flood of per-visitor buckets", () => {
		const now = 10_000
		const budget = { namespace: "anilist-upstream", limit: 2, windowMs: 60_000 }

		expect(checkUpstreamBudget("public", budget, now).allowed).toBe(true)

		for (let index = 0; index < 5_001; index += 1) {
			checkRateLimit(`visitor-${index}`, options, now)
		}

		expect(checkUpstreamBudget("public", budget, now).allowed).toBe(true)
		expect(checkUpstreamBudget("public", budget, now).allowed).toBe(false)
	})
})
