import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import TimelineActivityCard from "~/components/timeline/ActivityCard.vue"
import { useTimeDisplay } from "~/composables/useTimeDisplay"
import { formatRunSpan } from "~/utils/timeline-run-format"
import { mergeConsecutiveEpisodeActivities } from "~/utils/timeline-runs"
import type { AniListAnimeActivity } from "~~/shared/types/anilist"

// Midday UTC: the three updates share a calendar day in every timezone.
const NOON = Date.UTC(2026, 10, 8, 12) / 1_000
const MINUTE = 60

function activity(id: number, createdAt: number, progress: string): AniListAnimeActivity {
	return {
		kind: "anime",
		id,
		createdAt,
		replyCount: 0,
		type: "ANIME_LIST",
		user: null,
		status: "watched episode",
		progress,
		media: {
			id: 42,
			title: {
				english: "Frieren",
				native: null,
				romaji: "Frieren",
				userPreferred: "Frieren"
			},
			coverImage: null,
			format: "TV",
			siteUrl: null
		}
	}
}

function singleRun(activities: AniListAnimeActivity[]) {
	const runs = mergeConsecutiveEpisodeActivities(activities)
	expect(runs).toHaveLength(1)
	return runs[0]!
}

describe("TimelineActivityCard", () => {
	it("shows the range, the span and a collapsed toggle for a run of three", async () => {
		const run = singleRun([
			activity(1, NOON, "3"),
			activity(2, NOON + 25 * MINUTE, "4"),
			activity(3, NOON + 49 * MINUTE, "5")
		])
		const card = await mountSuspended(TimelineActivityCard, {
			props: { activity: run.activity, run }
		})

		expect(card.text()).toContain("3 anime updates")
		expect(card.get("[data-timeline-run-range]").text().replace(/\s+/g, " "))
			.toBe("Watched episodes 3 → 5")
		// The card prints the span with the visitor's zone and clock.
		expect(card.get("[data-timeline-run-span]").text())
			.toBe(formatRunSpan(run.startedAt, run.endedAt, {
				display: useTimeDisplay().activeDisplay.value
			}))
		expect(card.get("[data-timeline-run-span]").attributes("datetime"))
			.toBe(new Date(NOON * 1_000).toISOString())

		const toggle = card.get("[data-timeline-run-toggle]")
		expect(toggle.element.tagName).toBe("BUTTON")
		expect(toggle.text()).toBe("Show 3 updates")
		expect(toggle.attributes("aria-expanded")).toBe("false")

		// The controlled list always exists, hidden while collapsed.
		const list = card.get("ol")
		expect(list.attributes("id")).toBe(toggle.attributes("aria-controls"))
		expect(list.attributes("style")).toContain("display: none")
	})

	it("toggles aria-expanded and the list of updates, newest first", async () => {
		const run = singleRun([
			activity(1, NOON, "3"),
			activity(2, NOON + 25 * MINUTE, "4"),
			activity(3, NOON + 49 * MINUTE, "5")
		])
		const card = await mountSuspended(TimelineActivityCard, {
			props: { activity: run.activity, run, compact: true }
		})
		const toggle = card.get("[data-timeline-run-toggle]")

		await toggle.trigger("click")
		expect(toggle.attributes("aria-expanded")).toBe("true")
		expect(toggle.text()).toBe("Hide 3 updates")

		const list = card.get("ol")
		expect(list.attributes("id")).toBe(toggle.attributes("aria-controls"))
		expect(list.attributes("style") ?? "").not.toContain("display: none")
		expect(list.findAll("li").map(item => item.get("span").text())).toEqual([
			"Watched episode · 5",
			"Watched episode · 4",
			"Watched episode · 3"
		])
		expect(list.findAll("time").map(time => time.attributes("datetime"))).toEqual([
			new Date((NOON + 49 * MINUTE) * 1_000).toISOString(),
			new Date((NOON + 25 * MINUTE) * 1_000).toISOString(),
			new Date(NOON * 1_000).toISOString()
		])

		await toggle.trigger("click")
		expect(toggle.attributes("aria-expanded")).toBe("false")
		expect(card.get("ol").attributes("style")).toContain("display: none")
	})

	it("shows the time of a single update unless the timestamp is turned off", async () => {
		const single = activity(1, NOON, "1122")
		const card = await mountSuspended(TimelineActivityCard, {
			props: { activity: single }
		})
		const time = card.get("time")
		expect(time.attributes("datetime")).toBe(new Date(NOON * 1_000).toISOString())
		expect(time.text()).not.toBe("")

		const hidden = await mountSuspended(TimelineActivityCard, {
			props: { activity: single, showTimestamp: false }
		})
		expect(hidden.find("time").exists()).toBe(false)

		const run = singleRun([
			activity(1, NOON, "3"),
			activity(2, NOON + 25 * MINUTE, "4")
		])
		const hiddenRun = await mountSuspended(TimelineActivityCard, {
			props: { activity: run.activity, run, showTimestamp: false }
		})
		expect(hiddenRun.find("[data-timeline-run-span]").exists()).toBe(false)
	})

	it("renders a run of one as a plain card without a toggle", async () => {
		const run = singleRun([activity(1, NOON, "1122")])
		const card = await mountSuspended(TimelineActivityCard, {
			props: { activity: run.activity, run }
		})

		expect(card.find("[data-timeline-run-toggle]").exists()).toBe(false)
		expect(card.find("[data-timeline-run-range]").exists()).toBe(false)
		expect(card.find("[data-timeline-run-span]").exists()).toBe(false)
		expect(card.text()).toContain("Anime update")
		expect(card.text().replace(/\s+/g, " ")).toContain("Watched episode · 1122")

		const plain = await mountSuspended(TimelineActivityCard, {
			props: { activity: run.activity }
		})
		expect(plain.html()).toBe(card.html())
	})

	it("keeps one tab stop per anime: the cover link is hidden from keyboard and screen readers", async () => {
		const single = {
			...activity(1, NOON, "7"),
			status: "plans to watch",
			progress: null
		}
		single.media = {
			...single.media!,
			coverImage: { color: "#123456", large: "/og-default.svg", medium: "/og-default.svg" }
		}
		const card = await mountSuspended(TimelineActivityCard, {
			props: { activity: single, compact: true }
		})

		const links = card.findAll("a")
		expect(links).toHaveLength(2)
		expect(links[0]!.attributes("tabindex")).toBe("-1")
		expect(links[0]!.attributes("aria-hidden")).toBe("true")
		expect(links[1]!.attributes("tabindex")).toBeUndefined()
		expect(links[1]!.text()).toBe("Frieren")
		expect(links[1]!.attributes("href")).toBe(links[0]!.attributes("href"))
		for (const image of card.findAll("img")) {
			expect(image.attributes("width")).toBeTruthy()
			expect(image.attributes("height")).toBeTruthy()
			expect(image.attributes("loading")).toBe("lazy")
		}
		expect(card.text()).toContain("Plans to watch")
	})
})
