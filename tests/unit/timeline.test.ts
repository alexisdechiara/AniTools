import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import type { AniListActivity } from "../../shared/types/anilist"
import {
	getActivityText,
	getTimelineGroupLabel,
	getTimelineWindow,
	groupTimelineActivities
} from "../../app/utils/timeline"

function animeActivity(id: number, createdAt: number): AniListActivity {
	return {
		kind: "anime",
		id,
		createdAt,
		replyCount: 0,
		type: "ANIME_LIST",
		user: null,
		status: "watched episode",
		progress: "1",
		media: null
	}
}

describe("Timeline date calculations", () => {
	it("creates bounded eight-week and six-month windows", () => {
		const now = new Date("2026-07-29T12:00:00.000Z")

		expect(getTimelineWindow("weeks", now)).toEqual({
			from: Date.UTC(2026, 5, 8) / 1_000,
			to: Date.UTC(2026, 6, 29, 12) / 1_000 + 1
		})
		expect(getTimelineWindow("months", now)).toEqual({
			from: Date.UTC(2026, 1, 1) / 1_000,
			to: Date.UTC(2026, 6, 29, 12) / 1_000 + 1
		})
	})

	it("de-duplicates, sorts and groups activity into UTC calendar weeks", () => {
		const monday = Date.UTC(2026, 6, 27, 8) / 1_000
		const previousWeek = Date.UTC(2026, 6, 20, 9) / 1_000
		const groups = groupTimelineActivities([
			animeActivity(1, monday),
			animeActivity(2, previousWeek),
			animeActivity(1, monday + 60)
		], "weeks")

		expect(groups).toHaveLength(2)
		expect(groups[0]?.activities.map(activity => activity.id)).toEqual([1])
		expect(groups[1]?.activities.map(activity => activity.id)).toEqual([2])
		expect(getTimelineGroupLabel(groups[0]!, "weeks", "en")).toContain("Jul")
	})

	it("keeps AniList text as plain data and the component never uses v-html", () => {
		const activity: AniListActivity = {
			kind: "text",
			id: 1,
			createdAt: 1_800_000_000,
			replyCount: 0,
			type: "TEXT",
			user: null,
			text: "<img src=x onerror=alert(1)>"
		}
		const componentPath = fileURLToPath(new URL(
			"../../app/components/timeline/ActivityCard.vue",
			import.meta.url
		))
		const source = readFileSync(componentPath, "utf8")

		expect(getActivityText(activity)).toBe(activity.text)
		expect(source).not.toContain("v-html")
		expect(source).toContain("{{ text }}")
	})
})
