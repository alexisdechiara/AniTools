import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import type {
	AniListStaffStatistic,
	AniListStaffSummary,
	AniListVoiceActorStatistic
} from "../../shared/types/anilist"
import {
	filterAndSortPeopleStatistics,
	getAniListStaffUrl,
	mapStaffStatistics,
	mapVoiceActorStatistics
} from "../../app/utils/statistics-people"

function person(
	id: number,
	name: string,
	options: {
		language?: string
		nativeName?: string
		occupations?: string[]
	} = {}
): AniListStaffSummary {
	return {
		id,
		name: {
			full: name,
			native: options.nativeName ?? null,
			userPreferred: name
		},
		language: options.language ?? null,
		image: null,
		primaryOccupations: options.occupations ?? [],
		siteUrl: `https://anilist.co/staff/${id}`
	}
}

describe("people statistics helpers", () => {
	it("maps voice actors, removes missing people and de-duplicates characters", () => {
		const statistics: AniListVoiceActorStatistic[] = [{
			count: 8,
			meanScore: 82,
			minutesWatched: 2_000,
			mediaIds: [1, 2],
			characterIds: [10, 10, 11],
			voiceActor: person(7, "Kana Example", {
				language: "Japanese",
				nativeName: "かな",
				occupations: ["Voice Actor"]
			})
		}, {
			count: 1,
			meanScore: 70,
			minutesWatched: 100,
			mediaIds: [3],
			characterIds: [],
			voiceActor: null
		}]

		expect(mapVoiceActorStatistics(statistics)).toEqual([expect.objectContaining({
			id: 7,
			name: "Kana Example",
			nativeName: "かな",
			language: "Japanese",
			characterCount: 2
		})])
	})

	it("maps staff and sorts the bounded set by the chosen metric", () => {
		const statistics: AniListStaffStatistic[] = [{
			count: 5,
			meanScore: 90,
			minutesWatched: 500,
			mediaIds: [1],
			staff: person(1, "Director Alpha", { occupations: ["Director"] })
		}, {
			count: 10,
			meanScore: 80,
			minutesWatched: 1_000,
			mediaIds: [2],
			staff: person(2, "Writer Beta", { occupations: ["Series Composition"] })
		}]
		const mapped = mapStaffStatistics(statistics)

		expect(filterAndSortPeopleStatistics(mapped, "meanScore").map(item => item.id))
			.toEqual([1, 2])
		expect(filterAndSortPeopleStatistics(mapped, "count", "composition").map(item => item.id))
			.toEqual([2])
	})

	it("constructs only positive AniList staff URLs and never renders upstream HTML", () => {
		const componentPath = fileURLToPath(new URL(
			"../../app/components/statistics/StatisticsPeoplePage.vue",
			import.meta.url
		))
		const source = readFileSync(componentPath, "utf8")

		expect(getAniListStaffUrl(42)).toBe("https://anilist.co/staff/42")
		expect(() => getAniListStaffUrl(0)).toThrow()
		expect(source).not.toContain("v-html")
		expect(source).toContain("rel=\"noopener noreferrer\"")
	})
})
