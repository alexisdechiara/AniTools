import { describe, expect, it } from "vitest"
import {
	formatRunSpan,
	formatRunUpdateTime,
	pluraliseEpisodeStatus,
	runSpansSeveralDays
} from "../../app/utils/timeline-run-format"

const at = (day: number, hour: number, minute: number) =>
	Date.UTC(2026, 10, day, hour, minute) / 1_000

/** Intl separates the time and the day period with a narrow no-break space. */
const plain = (value: string) => value.replace(/\s/g, " ")

describe("timeline run formatting", () => {
	it("prints the date once for a run within one day", () => {
		expect(plain(formatRunSpan(at(10, 20, 5), at(10, 21, 40), { timeZone: "UTC" })))
			.toBe("Nov 10, 2026, 8:05 PM – 9:40 PM")
	})

	it("prints both dates when the run crosses midnight", () => {
		expect(plain(formatRunSpan(at(10, 23, 30), at(11, 0, 20), { timeZone: "UTC" })))
			.toBe("Nov 10, 2026, 11:30 PM – Nov 11, 2026, 12:20 AM")
	})

	it("keeps a compact same-day span to the two times", () => {
		expect(plain(formatRunSpan(at(10, 20, 5), at(10, 21, 40), { compact: true, timeZone: "UTC" })))
			.toBe("8:05 PM – 9:40 PM")
	})

	it("dates both ends of a compact span that crosses midnight", () => {
		expect(plain(formatRunSpan(at(10, 23, 30), at(11, 0, 20), { compact: true, timeZone: "UTC" })))
			.toBe("Nov 10, 11:30 PM – Nov 11, 12:20 AM")
	})

	it("decides the calendar day in the given timezone", () => {
		expect(runSpansSeveralDays(at(10, 23, 30), at(11, 0, 20), "UTC")).toBe(true)
		expect(runSpansSeveralDays(at(10, 23, 30), at(11, 0, 20), "Asia/Tokyo")).toBe(false)
		expect(runSpansSeveralDays(at(10, 20, 5), at(10, 21, 40), "UTC")).toBe(false)
	})

	it("dates an update only when the run crosses midnight", () => {
		expect(plain(formatRunUpdateTime(at(10, 22, 41), false, "UTC"))).toBe("10:41 PM")
		expect(plain(formatRunUpdateTime(at(10, 22, 41), true, "UTC"))).toBe("Nov 10, 10:41 PM")
	})

	it("pluralises the episode verb", () => {
		expect(pluraliseEpisodeStatus("watched episode")).toBe("watched episodes")
		expect(pluraliseEpisodeStatus(" rewatched episode ")).toBe("rewatched episodes")
		expect(pluraliseEpisodeStatus("Watched Episode")).toBe("Watched Episodes")
		expect(pluraliseEpisodeStatus("watched")).toBe("watched episodes")
		expect(pluraliseEpisodeStatus(null)).toBe("episodes")
	})
})
