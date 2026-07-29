import { describe, expect, it, vi } from "vitest"
import {
	collectAniListAnimeEntries,
	groupAnimeEntries,
	sortAnimeEntriesByScore
} from "../../app/utils/anilist-list"
import type {
	AniListAnimeListEntry,
	AniListAnimeListResponse
} from "../../shared/types/anilist"

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

function page(
	currentPage: number,
	hasNextPage: boolean,
	entries: AniListAnimeListEntry[]
): AniListAnimeListResponse {
	return {
		source: { mode: "public", username: "Alexis" },
		pageInfo: {
			currentPage,
			hasNextPage,
			lastPage: hasNextPage ? currentPage + 1 : currentPage,
			perPage: 50,
			total: entries.length
		},
		entries
	}
}

describe("AniList anime-list helpers", () => {
	it("collects every page and de-duplicates list entry ids", async () => {
		const fetchPage = vi.fn(async (pageNumber: number) =>
			page(
				pageNumber,
				pageNumber === 1,
				pageNumber === 1
					? [entry(1, "CURRENT", 80), entry(2, "PLANNING", 0)]
					: [entry(1, "CURRENT", 90), entry(3, "COMPLETED", 100)]
			)
		)

		const result = await collectAniListAnimeEntries(fetchPage)

		expect(fetchPage).toHaveBeenCalledTimes(2)
		expect(result.entries.map(item => [item.id, item.score])).toEqual([
			[1, 90],
			[2, 0],
			[3, 100]
		])
		expect(result.source).toEqual({ mode: "public", username: "Alexis" })
	})

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

	it("honours the page safety cap", async () => {
		const fetchPage = vi.fn(async (pageNumber: number) =>
			page(pageNumber, true, [entry(pageNumber, "CURRENT", pageNumber)])
		)

		const result = await collectAniListAnimeEntries(fetchPage, 2)

		expect(fetchPage).toHaveBeenCalledTimes(2)
		expect(result.entries).toHaveLength(2)
	})
})
