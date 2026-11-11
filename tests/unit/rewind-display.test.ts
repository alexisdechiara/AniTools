import { describe, expect, it } from "vitest"
import type { AniListAnimeListEntry } from "../../shared/types/anilist"
import {
	buildRewindHeadline,
	buildRewindSupportingLine,
	formatRewindDuration,
	getPreviousRewindYear,
	getRewindSelectionKind,
	getRewindTruncationNote,
	getRewindUnmatchedNote,
	type RewindHeadlineInput,
	type RewindHeadlinePart
} from "../../app/utils/rewind-display"
import { MAX_REWIND_ACTIVITY_PAGES, MIN_REWIND_YEAR } from "../../app/utils/rewind"

function sentence(parts: readonly RewindHeadlinePart[]): string {
	return parts.map(part => part.text).join("")
}

function figures(parts: readonly RewindHeadlinePart[]): string[] {
	return parts.filter(part => part.emphasis).map(part => part.text)
}

function headline(overrides: Partial<RewindHeadlineInput> = {}): RewindHeadlinePart[] {
	return buildRewindHeadline({
		year: 2025,
		minutesWatched: 0,
		animeCount: 0,
		episodesWatched: 0,
		activityCount: 0,
		...overrides
	})
}

function entry(score: number | null): Pick<AniListAnimeListEntry, "score"> {
	return { score }
}

describe("formatRewindDuration", () => {
	it("has nothing to say when nothing was watched", () => {
		expect(formatRewindDuration(0)).toBeNull()
		expect(formatRewindDuration(-30)).toBeNull()
		expect(formatRewindDuration(Number.NaN)).toBeNull()
		expect(formatRewindDuration(0.4)).toBeNull()
	})

	it("uses minutes under an hour", () => {
		expect(formatRewindDuration(1)).toEqual({ value: "1", unit: "minute" })
		expect(formatRewindDuration(59)).toEqual({ value: "59", unit: "minutes" })
	})

	it("uses rounded hours under two days", () => {
		expect(formatRewindDuration(60)).toEqual({ value: "1", unit: "hour" })
		expect(formatRewindDuration(24 * 24)).toEqual({ value: "10", unit: "hours" })
		expect(formatRewindDuration(2 * 24 * 60 - 1)).toEqual({ value: "48", unit: "hours" })
	})

	it("uses days from two days, with one decimal under ten", () => {
		expect(formatRewindDuration(2 * 24 * 60)).toEqual({ value: "2", unit: "days" })
		expect(formatRewindDuration(4.5 * 24 * 60)).toEqual({ value: "4.5", unit: "days" })
		expect(formatRewindDuration(12.4 * 24 * 60)).toEqual({ value: "12", unit: "days" })
		expect(formatRewindDuration(1_234 * 24 * 60)).toEqual({ value: "1,234", unit: "days" })
	})
})

describe("buildRewindHeadline", () => {
	it("leads with watch time and the number of anime", () => {
		const parts = headline({ minutesWatched: 12 * 24 * 60, animeCount: 87, episodesWatched: 720, activityCount: 300 })

		expect(sentence(parts)).toBe("In 2025 you spent about 12 days watching 87 anime.")
		expect(figures(parts)).toEqual(["12 days", "87 anime"])
	})

	it("falls back to episodes when no watch time could be estimated", () => {
		const parts = headline({ animeCount: 3, episodesWatched: 1, activityCount: 4 })

		expect(sentence(parts)).toBe("In 2025 you watched 1 episode across 3 anime.")
		expect(figures(parts)).toEqual(["1 episode", "3 anime"])
	})

	it("falls back to the number of anime alone", () => {
		expect(sentence(headline({ animeCount: 1_200, activityCount: 5 })))
			.toBe("In 2025 you watched 1,200 anime.")
	})

	it("falls back to list updates when no anime was watched", () => {
		expect(sentence(headline({ activityCount: 1 }))).toBe("In 2025 you updated your list once.")
		expect(sentence(headline({ activityCount: 12 }))).toBe("In 2025 you updated your list 12 times.")
	})

	it("ignores watch time that belongs to no anime", () => {
		expect(sentence(headline({ minutesWatched: 600, activityCount: 2 })))
			.toBe("In 2025 you updated your list 2 times.")
	})

	it("returns nothing for a year without activity", () => {
		expect(headline()).toEqual([])
	})
})

describe("buildRewindSupportingLine", () => {
	it("names the top title and the top genre", () => {
		expect(buildRewindSupportingLine({ topTitle: "Frieren", topGenre: "Adventure" }))
			.toBe("Frieren was your highest-rated title, and Adventure your most-watched genre.")
	})

	it("degrades when one of them is missing", () => {
		expect(buildRewindSupportingLine({ topTitle: "Frieren", topGenre: null }))
			.toBe("Frieren was your highest-rated title.")
		expect(buildRewindSupportingLine({ topTitle: "  ", topGenre: "Adventure" }))
			.toBe("Adventure was your most-watched genre.")
		expect(buildRewindSupportingLine({})).toBeNull()
	})
})

describe("Rewind notes", () => {
	it("states how many activity pages a truncated Rewind is based on", () => {
		expect(getRewindTruncationNote())
			.toBe(`Based on the most recent ${MAX_REWIND_ACTIVITY_PAGES} activity pages; older updates are not counted.`)
		expect(getRewindTruncationNote(5))
			.toBe("Based on the most recent 5 activity pages; older updates are not counted.")
	})

	it("counts the anime that are no longer on the list", () => {
		expect(getRewindUnmatchedNote(10, 10)).toBeNull()
		expect(getRewindUnmatchedNote(3, 5)).toBeNull()
		expect(getRewindUnmatchedNote(10, 9)).toContain("1 anime from this year's activity is no longer")
		expect(getRewindUnmatchedNote(10, 6)).toContain("4 anime from this year's activity are no longer")
	})
})

describe("getRewindSelectionKind", () => {
	it("tells a scored selection from the longest-watch fallback", () => {
		expect(getRewindSelectionKind(null)).toBeNull()
		expect(getRewindSelectionKind({ entry: entry(85) as AniListAnimeListEntry })).toBe("highest-rated")
		expect(getRewindSelectionKind({ entry: entry(0) as AniListAnimeListEntry })).toBe("longest-watch")
		expect(getRewindSelectionKind({ entry: entry(null) as AniListAnimeListEntry })).toBe("longest-watch")
	})
})

describe("getPreviousRewindYear", () => {
	it("stops at the first supported year", () => {
		expect(getPreviousRewindYear(2025)).toBe(2024)
		expect(getPreviousRewindYear(MIN_REWIND_YEAR + 1)).toBe(MIN_REWIND_YEAR)
		expect(getPreviousRewindYear(MIN_REWIND_YEAR)).toBeNull()
	})
})
