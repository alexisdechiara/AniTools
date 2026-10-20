import { describe, expect, it } from "vitest"
import { ANILIST_SCORE_FORMATS } from "../../shared/types/anilist"
import {
	SCORE_FORMAT_DESCRIPTIONS,
	formatPersonalScore,
	formatScoreFromPercent,
	scoreToPercent
} from "../../app/utils/score-format"

describe("score format conversion", () => {
	it("treats missing and zero scores as unscored", () => {
		expect(scoreToPercent(null, "POINT_100")).toBeNull()
		expect(scoreToPercent(0, "POINT_10")).toBeNull()
		expect(formatPersonalScore(0, "POINT_10", "POINT_100")).toBe("—")
	})

	it("normalizes each source format to a percentage", () => {
		expect(scoreToPercent(83, "POINT_100")).toBe(83)
		expect(scoreToPercent(8.3, "POINT_10_DECIMAL")).toBeCloseTo(83)
		expect(scoreToPercent(8, "POINT_10")).toBe(80)
		expect(scoreToPercent(4, "POINT_5")).toBe(80)
		expect(scoreToPercent(1, "POINT_3")).toBe(30)
		expect(scoreToPercent(3, "POINT_3")).toBe(85)
	})

	it("formats a percentage in every display format", () => {
		expect(formatScoreFromPercent(83, "POINT_100")).toBe("83%")
		expect(formatScoreFromPercent(83, "POINT_10_DECIMAL")).toBe("8.3/10")
		expect(formatScoreFromPercent(83, "POINT_10")).toBe("8/10")
		expect(formatScoreFromPercent(83, "POINT_5")).toBe("4/5")
		expect(formatScoreFromPercent(83, "POINT_3")).toBe("🙂")
		expect(formatScoreFromPercent(50, "POINT_3")).toBe("😐")
		expect(formatScoreFromPercent(20, "POINT_3")).toBe("😞")
	})

	it("never rounds a scored entry down to zero", () => {
		expect(formatPersonalScore(2, "POINT_100", "POINT_5")).toBe("1/5")
		expect(formatPersonalScore(2, "POINT_100", "POINT_10")).toBe("1/10")
		expect(formatPersonalScore(0.4, "POINT_100", "POINT_10_DECIMAL")).toBe("0.1/10")
	})

	it("round-trips every format onto itself", () => {
		expect(formatPersonalScore(73, "POINT_100", "POINT_100")).toBe("73%")
		expect(formatPersonalScore(7.5, "POINT_10_DECIMAL", "POINT_10_DECIMAL")).toBe("7.5/10")
		expect(formatPersonalScore(7, "POINT_10", "POINT_10")).toBe("7/10")
		expect(formatPersonalScore(3, "POINT_5", "POINT_5")).toBe("3/5")
		expect([1, 2, 3].map(score => formatPersonalScore(score, "POINT_3", "POINT_3")))
			.toEqual(["😞", "😐", "🙂"])
	})

	it("describes each format with its actual rendering of 83%", () => {
		for (const format of ANILIST_SCORE_FORMATS) {
			expect(SCORE_FORMAT_DESCRIPTIONS[format]).toBe(formatScoreFromPercent(83, format))
		}
	})
})
