import { describe, expect, it } from "vitest"
import { getProgressiveLoadingPhase } from "../../app/utils/loading-state"

describe("progressive loading state", () => {
	it("keeps the page loader while layout hydration is incomplete", () => {
		expect(getProgressiveLoadingPhase({
			allowPartial: true,
			layoutReady: false,
			minimumElapsed: true,
			partialRevealElapsed: true,
			readyStates: [true, true]
		})).toBe("page")
	})

	it("keeps the loader for its minimum display duration", () => {
		expect(getProgressiveLoadingPhase({
			allowPartial: true,
			layoutReady: true,
			minimumElapsed: false,
			partialRevealElapsed: true,
			readyStates: [true, true]
		})).toBe("page")
	})

	it("reveals complete content after the minimum duration", () => {
		expect(getProgressiveLoadingPhase({
			allowPartial: true,
			layoutReady: true,
			minimumElapsed: true,
			partialRevealElapsed: false,
			readyStates: [true, true]
		})).toBe("content")
	})

	it("reveals ready widgets when only one data source remains slow", () => {
		expect(getProgressiveLoadingPhase({
			allowPartial: true,
			layoutReady: true,
			minimumElapsed: true,
			partialRevealElapsed: true,
			readyStates: [true, false]
		})).toBe("content")
	})

	it("does not partially reveal content when progressive rendering is disabled", () => {
		expect(getProgressiveLoadingPhase({
			allowPartial: false,
			layoutReady: true,
			minimumElapsed: true,
			partialRevealElapsed: true,
			readyStates: [true, false]
		})).toBe("page")
	})
})
