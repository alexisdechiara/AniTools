import { describe, expect, it } from "vitest"
import {
	groupAnimeEntries,
	sortAnimeEntriesByScore
} from "../../app/utils/anilist-list"
import type { AniListAnimeListEntry } from "../../shared/types/anilist"

function entry(id: number, status: AniListAnimeListEntry["status"], score: number) {
	return {
		id,
		status,
		score,
		progress: 0,
		repeat: 0,
		priority: 0,
		updatedAt: 0,
		startedAt: null,
		completedAt: null,
		media: null
	} satisfies AniListAnimeListEntry
}

describe("AniList anime-list helpers", () => {
	it("groups statuses and sorts a copy by score", () => {
		const source = [
			entry(1, "CURRENT", 70),
			entry(2, "COMPLETED", 95),
			entry(3, "CURRENT", 80)
		]

		expect(groupAnimeEntries(source)).toMatchObject([
			{ name: "Watching", status: "CURRENT", entries: [source[0], source[2]] },
			{ name: "Completed", status: "COMPLETED", entries: [source[1]] }
		])
		expect(sortAnimeEntriesByScore(source).map(item => item.id)).toEqual([2, 3, 1])
		expect(source.map(item => item.id)).toEqual([1, 2, 3])
	})
})
