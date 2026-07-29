import { afterEach, describe, expect, it, vi } from "vitest"
import { withTimeout } from "../../server/utils/with-timeout"

describe("withTimeout", () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it("returns a request that completes in time", async () => {
		await expect(withTimeout(Promise.resolve("ok"), 100, "timeout")).resolves.toBe("ok")
	})

	it("rejects a request that exceeds the deadline", async () => {
		vi.useFakeTimers()
		const result = withTimeout(new Promise<string>(() => undefined), 100, "Upstream timed out")
		const expectation = expect(result).rejects.toMatchObject({
			statusCode: 504,
			statusMessage: "Upstream timed out"
		})

		await vi.advanceTimersByTimeAsync(100)
		await expectation
	})
})
